import Notification from '../schemas/Notification';
import User from '../models/User';

class NotificationController {
  async index(request, response) {
    // Verifica se o usuário autenticado é um prestador de serviço.
    const checkIsProvider = await User.findOne({
      where: { id: request.userId, provider: true },
    });

    if (!checkIsProvider) {
      return response.status(401).json({
        error:
          'Apenas prestadores de serviço possuem notificações de agendamento!',
      });
    }

    const notifications = await Notification.find({
      user: request.userId,
    })
      .sort({ createdAt: 'desc' })
      .limit(20);

    return response.json(notifications);
  }
}

export default new NotificationController();
