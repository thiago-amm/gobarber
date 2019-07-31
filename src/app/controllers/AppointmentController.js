import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore, format, subHours } from 'date-fns';
import pt from 'date-fns/locale/pt';

import Appointment from '../models/Appointment';
import User from '../models/User';
import File from '../models/File';
import Notification from '../schemas/Notification';

import Mail from '../../lib/Mail';

class AppointmentController {
  async index(request, response) {
    const { page = 1 } = request.query;
    const appointments = await Appointment.findAll({
      where: {
        user_id: request.userId,
        canceled_at: null,
      },
      order: ['date'],
      attributes: ['id', 'date'],
      limit: 20,
      offset: (page - 1) * 20,
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['id', 'name'],
          include: [
            {
              model: File,
              as: 'avatar',
              attributes: ['id', 'path', 'url'],
            },
          ],
        },
      ],
    });
    return response.json(appointments);
  }

  async store(request, response) {
    const schema = Yup.object().shape({
      provider_id: Yup.number().required(),
      date: Yup.date().required(),
    });

    if (!(await schema.isValid(request.body))) {
      return response.status(400).json({ error: 'A validação falhou!' });
    }

    const { provider_id, date } = request.body;

    // Verifica se o provider_id é de um usuário prestador de serviço (provider)
    const checkIsProvider = await User.findOne({
      where: { id: provider_id, provider: true },
    });

    const hourStart = startOfHour(parseISO(date));

    // Verifica se a data do agendamento não é passada.
    if (isBefore(hourStart, new Date())) {
      return response.status(400).json({
        error: 'Não é possível criar um agendamento com data passada!',
      });
    }

    // Verifica se a data do agendamento está disponível
    const checkAvailability = await Appointment.findOne({
      where: {
        provider_id,
        canceled_at: null,
        date: hourStart,
      },
    });

    if (checkAvailability) {
      return response
        .status(400)
        .json({ error: 'Data indisponível para agendamento!' });
    }

    if (!checkIsProvider) {
      return response.status(401).json({
        error: 'Só se pode agendar com usuários prestadores de serviço!',
      });
    }

    const appointment = await Appointment.create({
      user_id: request.userId,
      provider_id,
      date,
    });

    const user = await User.findByPk(request.userId);
    const formattedDate = format(
      hourStart,
      "'dia' dd 'de' MMMM', às' H:mm'h'",
      { locale: pt }
    );

    // Notificar o prestador sobre o agendamento realizado.
    await Notification.create({
      content: `Novo agendamento de ${user.name} para ${formattedDate} `,
      user: provider_id,
    });

    return response.json(appointment);
  }

  async delete(request, response) {
    const appointment = await Appointment.findByPk(request.params.id, {
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['name', 'email'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['name'],
        },
      ],
    });

    // Verifica se o usuário autenticado é o dono do agendamento.
    if (appointment.user_id !== request.userId) {
      return response.status(401).json({
        error: 'Você não têm permissão para cancelar este agendamento!',
      });
    }

    // Verifica a data limite para cancelamento do agendamento.
    const dateWithSub = subHours(appointment.date, 2);
    if (isBefore(dateWithSub, new Date())) {
      return response.status(401).json({
        error: 'Você só pode cancelar agendamentos com 2 horas de antecedência',
      });
    }

    appointment.canceled_at = new Date();

    await appointment.save();

    await Mail.sendMail({
      to: `${appointment.provider.name} <${appointment.provider.email}>`,
      subject: 'Agendamento cancelado',
      template: 'cancellation',
      context: {
        provider: appointment.provider.name,
        user: appointment.user.name,
        date: format(appointment.date, "'dia' dd 'de' MMM', às' H:mm'h'", {
          locale: pt,
        }),
      },
    });

    return response.json(appointment);
  }
}

export default new AppointmentController();
