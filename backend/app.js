import dotenv from "dotenv";
dotenv.config();
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import sequelize from "./db.js";
import session from 'express-session';
import authRouter from "./routes/auth.js";
import { ensureAuthenticated } from "./middleware/auth.js";

// Модели
import Metric from "./models/Metric.js";
import Trackable from "./models/Trackable.js";
import MetricValue from "./models/MetricValue.js";

const app = express();
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Сессии с куки для кросс-доменных запросов
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    sameSite: 'lax',  // разрешаем отправку куки с фронта на порт 5000
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 100
  }
}));

// Passport
import { initializePassport, passport } from "./dependencies.js";
app.use(passport.initialize());
app.use(passport.session());
initializePassport();
app.use("/auth", authRouter);

// Синхронизация БД
sequelize.sync({ force: true })
  .then(() => console.log('DB synced successfully'))
  .catch(err => console.error('Error syncing DB:', err));

// 1) Список всех метрик
app.get('/metrics', ensureAuthenticated, async (req, res) => {
  try {
    // Lazy‐создаём обе метрики при первом обращении к списку
    await Promise.all([
      Metric.findOrCreate({ where: { name: 'LOAD_AVERAGE' }, defaults: { name: 'LOAD_AVERAGE' } }),
      Metric.findOrCreate({ where: { name: 'NODE_CPU_SECONDS_TOTAL' }, defaults: { name: 'NODE_CPU_SECONDS_TOTAL' } }),
      Metric.findOrCreate({ where: { name: 'NODE_MEMORY_MEMFREE_BYTES' }, defaults: { name: 'NODE_MEMORY_MEMFREE_BYTES' } })
    ]);

    const metrics = await Metric.findAll({ attributes: ['id', 'name'] });
    res.json(metrics);
  } catch (err) {
    console.error('Error fetching metrics:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2) LOAD_AVERAGE (как было)
app.get('/metrics/load_average', ensureAuthenticated, async (req, res) => {
  try {
    const [metric] = await Metric.findOrCreate({
      where: { name: 'LOAD_AVERAGE' },
      defaults: { name: 'LOAD_AVERAGE' }
    });
    const track = await Trackable.findOne({ where: { user_id: req.user.id, metric_id: metric.id } });
    const response = await fetch('http://127.0.0.1:9090/api/v1/query?query=node_load1');
    const data = await response.json();
    if (data.status === 'success' && data.data.result.length > 0) {
      const val = parseFloat(data.data.result[0].value[1]);
      if (track) await MetricValue.create({ value: val, metric_id: metric.id });
      return res.json({ load_average: val });
    }
    res.status(500).json({ error: 'No data returned from Prometheus' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// 3) NODE_MEMORY_DIRTY_BYTES (новая метрика)
app.get('/metrics/node_cpu_seconds_total', ensureAuthenticated, async (req, res) => {
  try {
    const [metric] = await Metric.findOrCreate({
      where: { name: 'NODE_CPU_SECONDS_TOTAL' },
      defaults: { name: 'NODE_CPU_SECONDS_TOTAL' }
    });
    const track = await Trackable.findOne({ where: { user_id: req.user.id, metric_id: metric.id } });
    const response = await fetch('http://127.0.0.1:9090/api/v1/query?query=node_cpu_seconds_total');
    const data = await response.json();
    if (data.status === 'success' && data.data.result.length > 0) {
      const val = parseFloat(data.data.result[0].value[1]);
      if (track) await MetricValue.create({ value: val, metric_id: metric.id });
      return res.json({ node_cpu_seconds_total: val });
    }
    res.status(500).json({ error: 'No data returned from Prometheus' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

app.get('/metrics/node_memory_memfree_bytes', ensureAuthenticated, async (req, res) => {
  try {
    const [metric] = await Metric.findOrCreate({
      where: { name: 'NODE_MEMORY_MEMFREE_BYTES' },
      defaults: { name: 'NODE_MEMORY_MEMFREE_BYTES' }
    });
    const track = await Trackable.findOne({ where: { user_id: req.user.id, metric_id: metric.id } });
    const response = await fetch('http://127.0.0.1:9090/api/v1/query?query=node_memory_MemFree_bytes');
    const data = await response.json();
    if (data.status === 'success' && data.data.result.length > 0) {
      const val = parseFloat(data.data.result[0].value[1]);
      if (track) await MetricValue.create({ value: val, metric_id: metric.id });
      return res.json({ node_memory_MemFree_bytes: val });
    }
    res.status(500).json({ error: 'No data returned from Prometheus' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

app.post('/metrics/:metric_id/track', ensureAuthenticated, async (req, res) => {
  try {
    const metricId = req.params.metric_id;
    const userId   = req.user.id;

    // Проверяем, что метрика существует
    const metric = await Metric.findByPk(metricId);
    if (!metric) {
      return res.status(404).json({ error: 'Metric not found' });
    }

    // Находим или создаём запись Trackable
    const [trackable, created] = await Trackable.findOrCreate({
      where:  { user_id: userId, metric_id: metricId },
      defaults:{ user_id: userId, metric_id: metricId }
    });

    return res
      .status(created ? 201 : 200)
      .json({
        message: created
          ? 'Metric is now being tracked'
          : 'Metric was already tracked',
        trackable
      });
  } catch (err) {
    console.error('Error in POST /metrics/:metric_id/track:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 2) Удаление из избранного
app.delete('/metrics/:metric_id/track', ensureAuthenticated, async (req, res) => {
  try {
    const metricId = req.params.metric_id;
    const userId   = req.user.id;

    // Проверяем, что метрика существует
    const metric = await Metric.findByPk(metricId);
    if (!metric) {
      return res.status(404).json({ error: 'Metric not found' });
    }

    // Удаляем запись Trackable
    const deletedCount = await Trackable.destroy({
      where: { user_id: userId, metric_id: metricId }
    });

    if (deletedCount === 0) {
      // Ничего не удалилось — значило, не было в избранном
      return res
        .status(404)
        .json({ message: 'Metric was not in tracked list' });
    }

    return res
      .status(200)
      .json({ message: 'Metric has been untracked' });
  } catch (err) {
    console.error('Error in DELETE /metrics/:metric_id/track:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 3) Получение списка всех отслеживаемых метрик пользователя
app.get('/metrics/tracked', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;

    // Находим все записи Trackable для юзера
    const tracked = await Trackable.findAll({
      where: { user_id: userId },
      include: [{ model: Metric, attributes: ['id', 'name'] }]
    });

    // Формируем ответ вида [{ id, name }, …]
    const result = tracked.map(t => ({
      id: t.Metric.id,
      name: t.Metric.name
    }));

    return res.json(result);
  } catch (err) {
    console.error('Error in GET /metrics/tracked:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));