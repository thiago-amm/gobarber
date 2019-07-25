import * as Yup from 'yup';

import User from '../models/User';

class UserController {
  async store(request, response) {
    const schema = Yup.object().shape({
      name: Yup.string().requestuired(),
      email: Yup.string()
        .email()
        .requestuired(),
      password: Yup.string()
        .requestuired()
        .min(6),
    });

    if (!(await schema.isValid(request.body))) {
      return response.status(400).json({ error: 'Dados inválidos!' });
    }

    const userExists = await User.findOne({
      where: {
        email: request.body.email,
      },
    });

    if (userExists) {
      return response
        .status(400)
        .json({ error: 'Já existe um usuário cadastrado com esse e-mail!' });
    }

    const { id, name, email, provider } = await User.create(request.body);

    return response.json({
      id,
      name,
      email,
      provider,
    });
  }

  async update(request, response) {
    const schema = Yup.object().shape({
      name: Yup.string(),
      email: Yup.string().email(),
      oldPassword: Yup.string().min(6),
      password: Yup.string()
        .min(6)
        .when('oldPassword', (oldPassword, field) =>
          oldPassword ? field.required() : field
        ),
      confirmPassword: Yup.string().when('password', (password, field) =>
        password ? field.required().oneOf([Yup.ref('password')]) : field
      ),
    });

    if (!(await schema.isValid(request.body))) {
      return response.status(400).json({ error: 'Dados inválidos!' });
    }

    const { email, oldPassword } = request.body;
    const user = await User.findByPk(request.userId);
    if (email !== user.email) {
      const userExists = await User.findOne({ where: { email } });
      if (userExists) {
        return response.status(400).json({
          error: 'Já existe usuário cadastrado com o e-mail informado!',
        });
      }
    }
    if (oldPassword && !(await user.checkPassword(oldPassword))) {
      return response.status(401).json({ error: 'Senha incorreta!' });
    }
    const { id, name, provider } = await user.update(request.body);
    return response.json({ id, name, email, provider });
  }
}

export default new UserController();
