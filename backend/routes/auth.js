import express from 'express';
import passport from 'passport';
import User from '../models/User.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { ensureAuthenticated } from '../middleware/auth.js';

const router = express.Router();

// Helper function to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id,
      username: user.username,
      role: user.role,
      email: user.email
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );
};

// Login
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({ error: info?.message || 'Invalid credentials' });
    }
    
    const token = generateToken(user);
    const { id, username, role, email } = user;
    res.json({ id, username, role, email, token });
  })(req, res, next);
});

// Register
router.post('/register', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const exists = await User.findOne({ where: { username } });
    if (exists) return res.status(400).json({ error: 'Username taken' });

    const salt = crypto.randomBytes(16).toString('hex');
    crypto.pbkdf2(password, salt, 310000, 32, 'sha256', async (err, hash) => {
      if (err) return next(err);
      const newUser = await User.create({ username, salt, password: hash });
      const token = generateToken(newUser);
      const { id, username: newUsername, role, email } = newUser;
      res.status(201).json({ id, username: newUsername, role, email, token });
    });
  } catch (err) {
    next(err);
  }
});

// Current user
router.get('/me', ensureAuthenticated, (req, res) => {
  res.json(req.user);
});

// Logout - No longer needed with JWT, but keeping for frontend compatibility
router.post('/logout', (req, res) => {
  res.json({ message: 'Logout successful' });
});

// Update user settings
router.put('/settings', ensureAuthenticated, async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      const existingUser = await User.findOne({ where: { email } });
      if (existingUser && existingUser.id !== user.id) {
        return res.status(400).json({ error: 'This email is already in use' });
      }

      user.email = email;
    }

    await user.save();

    const updatedUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    // Generate new token with updated user data
    const token = generateToken(updatedUser);

    res.json({ ...updatedUser, token });
  } catch (err) {
    console.error('Error updating user settings:', err);
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'This email is already in use' });
    }
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;
