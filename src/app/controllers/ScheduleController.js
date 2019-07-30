import { startOfDay, endOfDay, parseISO } from 'date-fns';
import { Op } from 'sequelize';

import Appointment from '../models/Appointment';
import User from '../models/User';

class ScheduleController {
  async index(request, response) {
    const checkUserProvider = await User.findOne({
      where: {
        id: request.userId,
        provider: true,
      },
    });

    // Verificar se o usuário autenticado é um prestador de serviço.
    if (!checkUserProvider) {
      return response
        .status(401)
        .json({ error: 'O usuário não é um prestador de serviço!' });
    }

    // Recuperar os agendamentos do dia.
    const { date } = request.query;
    const parsedDate = parseISO(date);

    const appointments = await Appointment.findAll({
      where: {
        provider_id: request.userId, // pretador is usuário autenticado
        canceled_at: null,
        date: {
          [Op.between]: [startOfDay(parsedDate), endOfDay(parsedDate)],
        },
      },
    });

    return response.json(appointments);
  }
}

export default new ScheduleController();
