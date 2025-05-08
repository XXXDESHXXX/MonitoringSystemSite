import express  from 'express';
import passport from 'passport';
import User     from '../models/User.js';
import crypto   from 'crypto';
import { ensureAuthenticated } from '../middleware/auth.js';

const router = express.Router();

// Логин
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({ error: info?.message || 'Invalid credentials' });
    }
    req.logIn(user, err => {
      if (err) return next(err);
      // возвращаем роль
      const { id, username, role, email } = user;
      res.json({ id, username, role, email });
    });
  })(req, res, next);
});

// Регистрация
router.post('/register', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    // ... ваша валидация ...
    const exists = await User.findOne({ where: { username } });
    if (exists) return res.status(400).json({ error: 'Username taken' });

    const salt = crypto.randomBytes(16).toString('hex');
    crypto.pbkdf2(password, salt, 310000, 32, 'sha256', async (err, hash) => {
      if (err) return next(err);
      const newUser = await User.create({ username, salt, password: hash });
      req.logIn(newUser, err => {
        if (err) return next(err);
        const { id, username, role, email } = newUser;
        res.status(201).json({ id, username, role, email });
      });
    });
  } catch (err) {
    next(err);
  }
});

// Текущий пользователь
router.get('/me', ensureAuthenticated, (req, res) => {
  const { id, username, role, email } = req.user;
  res.json({ id, username, role, email });
});

// Logout
router.post('/logout', (req, res) => {
  req.logout(err => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.json({ message: 'Logout successful' });
  });
});

export default router;
