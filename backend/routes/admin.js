import express from 'express';
import { ensureAuthenticated } from '../middleware/auth.js';
import { ensureAdmin } from '../middleware/admin.js';
import Tag from '../models/Tag.js';
import User from '../models/User.js';
import bcrypt from 'bcrypt';

const router = express.Router();
router.use(ensureAuthenticated, ensureAdmin);

// Теги
router.get('/tags', async (req, res) => {
  const tags = await Tag.findAll();
  res.json(tags);
});
router.post('/tags', async (req, res) => {
  const { name, color } = req.body;
  const tag = await Tag.create({ name, color });
  res.status(201).json(tag);
});
router.delete('/tags/:id', async (req, res) => {
  await Tag.destroy({ where: { id: req.params.id } });
  res.json({ message: 'Deleted' });
});

// Пользователи
router.get('/users', async (req, res) => {
  const users = await User.findAll({ attributes: ['id','username','email','role'] });
  res.json(users);
});
router.post('/users', async (req, res) => {
  const { username, password, email, role } = req.body;
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  const user = await User.create({ username, password: hash, salt, email, role });
  res.status(201).json({ id: user.id, username, email, role });
});
router.delete('/users/:id', async (req, res) => {
  await User.destroy({ where: { id: req.params.id } });
  res.json({ message: 'Deleted' });
});

export default router;