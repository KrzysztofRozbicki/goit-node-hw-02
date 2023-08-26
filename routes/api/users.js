import express from 'express';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

import { usersService } from '../../models/users.js';
import { auth } from '../../config/config-passport.js';
import { uploadImage } from '../../config/config-multer.js';
import { signUpUserMiddleware } from '../../middleware/middlewareUsers.js';

dotenv.config();
const secret = 'GOIT2023';
const { getUser, addUser, loginUser, patchUser, patchAvatar } = usersService;

export const usersRouter = express.Router();

usersRouter.get('/current', auth, async (req, res, next) => {
  const { id: userId } = req.user;
  try {
    const user = await getUser(userId);
    if (!user) {
      return res.status(404).json(`Error! User not found!`);
    }
    const { email, subscription } = user;
    return res.status(200).json({
      status: 'success',
      code: 200,
      data: { email, subscription },
    });
  } catch (err) {
    res.status(500).json(`An error occurred while getting the contact: ${err}`);
  }
});

usersRouter.post('/signup', signUpUserMiddleware(addUser));

usersRouter.post('/login', async (req, res, next) => {
  const { body } = req;

  if (!('email' in body) || !('password' in body)) {
    return res.status(400).json('Error! Missing password or email field!');
  }

  try {
    const user = await loginUser(body);

    if (!user) {
      return res.status(400).json(`Error! Email or password is wrong!`);
    }

    const payload = {
      id: user.id,
      username: user.email,
    };

    const token = jwt.sign(payload, secret, { expiresIn: '1h' });

    user.token = token;
    await user.save();

    const { email, subscription } = user;

    res.status(200).json({
      status: 'success',
      code: 200,
      token: token,
      user: { email, subscription },
    });
  } catch (err) {
    res.status(500).json(`An error occurred while logging the user! ${err}`);
  }
});

usersRouter.post('/logout', auth, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await getUser(userId);

    if (!user) {
      return res.status(401).json({
        status: 'error',
        code: 401,
        message: 'Unauthorized',
      });
    }

    user.token = null;
    await user.save();

    res.status(204).json();
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'An error occurred during logout.',
    });
  }
});

usersRouter.patch('/', auth, async (req, res, next) => {
  const { id: userId } = req.user;
  const { body } = req;
  const { subscription } = body;

  if (!('subscription' in body)) {
    return res.status(400).json('Error! Missing field subscription!');
  }

  try {
    const updatedStatus = await patchUser(subscription, userId);
    if (updatedStatus === 400) {
      return res.status(400).json('Error! Invalid subscription type!');
    }
    return res.json({
      status: 'success',
      code: 200,
      data: { updatedStatus },
    });
  } catch (err) {
    res.status(500).json(`An error occurred while updating the contact: ${err}`);
  }
});

usersRouter.patch('/avatars', auth, uploadImage.single('avatar'), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json('Error! Missing file!');
  }
  const { path } = file;
  const { id: userId } = req.user;
  try {
    const newAvatarPath = await patchAvatar(path, userId);
    return res.json({
      status: 'success',
      code: 200,
      avatarURL: newAvatarPath,
    });
  } catch (err) {
    res.status(500).json(`An error occurred while updating the avatar: ${err}`);
  }
});
