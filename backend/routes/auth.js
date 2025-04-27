import passport from "passport";
import express from "express";
import crypto from "crypto";
import User from "../models/User.js";
import {ensureAuthenticated} from "../middleware/auth.js";

const router = express.Router();

router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    req.logIn(user, (err) => {
      if (err) return next(err);
      return res.json({ message: 'Login successful' });
    });
  })(req, res, next);
});


router.get('/me', ensureAuthenticated, (req, res) => {
  res.json({ username: req.user.username, id: req.user.id });
});

router.post("/register", async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Валидация
    if (typeof username !== 'string' || username.length > 16) {
      return res.status(400).json({ error: 'Username must be 16 characters max' });
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 64) {
      return res.status(400).json({ error: 'Password must be 8-64 characters long' });
    }

    // Проверка на существующего пользователя
    const existing = await User.findOne({ where: { username } });
    if (existing) {
      return res.status(400).json({ error: "Username already taken" });
    }

    // Генерация соли и хеша пароля
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.pbkdf2(password, salt, 310000, 32, "sha256", async (err, derivedKey) => {
      if (err) return next(err);

      const user = await User.create({
        username,
        salt,
        password: derivedKey
      });

      // Сразу логиним пользователя после регистрации
      req.logIn(user, (err) => {
        if (err) return next(err);
        res.status(201).json({ message: "User registered and logged in" });
      });
    });
  } catch (err) {
    next(err);
  }
});

router.get('/auth/check', (req, res) => {
  if (req.isAuthenticated()) {
    res.status(200).json({ authenticated: true });
  } else {
    res.status(401).json({ authenticated: false });
  }
});

router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.status(200).json({ message: 'Logout successful' });
  });
});

export default router;
