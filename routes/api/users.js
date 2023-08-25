import express from 'express';
import dotenv from 'dotenv';

import { getUser, addUser, loginUser, patchUser, patchAvatar } from '../../models/users.js';
import { auth } from '../../config/config-passport.js';
import { uploadImage } from '../../config/config-multer.js';
import { signupMiddleware, loginMiddleware } from './users.middleware.js';

dotenv.config();
const secret = process.env.SECRET;

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

usersRouter.post('/signup', signupMiddleware(addUser));

usersRouter.post('/login', loginMiddleware(loginUser));

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
