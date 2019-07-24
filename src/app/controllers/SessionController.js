import jwt from 'jsonwebtoken';

import User from '../models/User';

import authConfig from '../../config/auth';

class SessionController {
  async store(request, response) {
    const { email, password } = request.body;
    const user = await User.findOne({ where: { email } });
    // 1. Verifica se o usuário já foi cadastrado.
    if (!user) {
      return response.status(401).json({ error: 'Usuário não encontrado!' });
    }
    // 2. Verifica se a senha informada está correta.
    if (!(await user.checkPassword(password))) {
      return response
        .status(401)
        .json({ error: 'A senha informada está incorreta!' });
    }
    const { id, name } = user;
    return response.json({
      user: {
        id,
        name,
        email,
      },
      // Payload, Private Key
      token: jwt.sign({ id }, authConfig.secret, {
        expiresIn: authConfig.expiresIn,
      }),
    });
  }
}

export default new SessionController();
