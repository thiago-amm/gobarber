import * as Yup from 'yup';

import Appointment from '../models/Appointment';
import User from '../models/User';

class AppointmentController {
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

    return response.json(appointment);
  }
}

export default new AppointmentController();
