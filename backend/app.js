import dotenv from "dotenv";
dotenv.config();
import express from "express";
import { createServer } from "http";
import fetch from "node-fetch";
import cors from "cors";
import sequelize from "./db.js";
import session from 'express-session';
import authRouter from "./routes/auth.js";
import { ensureAuthenticated } from "./middleware/auth.js";
import { ensureAdmin } from './middleware/admin.js';
import adminRouter from './routes/admin.js';
import db from './models/index.js';
import { Server as SocketIO } from "socket.io";
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465, // true для 465, иначе false
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});


async function sendHourlyNotifications() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  // берём все трекабельные метрики вместе с пользователем
  const trackables = await Trackable.findAll({
    where: {},
    include: [
      { model: User, attributes: ['email','username'] },
      { model: Metric, attributes: ['name'] }
    ]
  });

  for (let tr of trackables) {
    const { User: user, Metric: metric } = tr;
    if (!user.email) continue; // если нет почты — пропускаем

    // находим последнее значение этой метрики за последний час
    const latest = await MetricValue.findOne({
      where: {
        metric_id: tr.metric_id,
        createdAt: { [Op.gte]: oneHourAgo }
      },
      order: [['createdAt','DESC']]
    });

    if (!latest) continue; // если за час не было записей — ничего не отправляем

    // готовим текст письма
    const subject = `Обновление метрики ${metric.name}`;
    const text = `
Привет, ${user.username}!

За последний час метрика "${metric.name}" изменилась, последнее значение:
  ${latest.value}
  (время измерения: ${latest.createdAt.toLocaleString()})

Спасибо, что пользуетесь нашим сервисом!
`;

    try {
      await transporter.sendMail({
        from: process.env.FROM_EMAIL,
        to: user.email,
        subject,
        text
      });
      console.log(`[MAIL] Отправлено ${metric.name} -> ${user.email}`);
    } catch (err) {
      console.error(`[MAIL_ERROR] Не удалось отправить ${metric.name} пользователю ${user.email}:`, err);
    }
  }
}


setInterval(sendHourlyNotifications, 60 * 60 * 1000);

// Модели
import Metric from "./models/Metric.js";
import Trackable from "./models/Trackable.js";
import MetricValue from "./models/MetricValue.js";
import Tag from './models/Tag.js';
import MetricTag from './models/MetricTag.js';
import Comment from './models/Comment.js';
import User    from './models/User.js';

import { Op } from 'sequelize';

const app = express();
const httpServer = createServer(app);
const io = new SocketIO(httpServer, {
  cors: { origin: "http://localhost:3000", credentials: true }
});
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Сессии с куки для кросс-доменных запросов
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: true,
  saveUninitialized: true,
  cookie: {
    sameSite: 'lax',
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 часа
  }
}));

// Passport
import { initializePassport, passport } from "./dependencies.js";
app.use(passport.initialize());
app.use(passport.session());
initializePassport();
app.use("/auth", authRouter);
app.use('/admin', ensureAuthenticated, ensureAdmin, adminRouter);
// Socket.IO — подписка на комнаты по метрике
io.on("connection", socket => {
  socket.on("subscribe", ({ metricId }) => {
    socket.join(`metric-${metricId}`);
  });
  socket.on("unsubscribe", ({ metricId }) => {
    socket.leave(`metric-${metricId}`);
  });
});

// При создании новых значений — эмитим событие
async function fetchAndEmit(metricName, promQuery, jsonKey) {
  const [metric] = await Metric.findOrCreate({ where: { name: metricName } });
  const track = await Trackable.findOne({
    where: { user_id: null, metric_id: metric.id } // отслеживаем для всех, но можно усложнить
  });
  const response = await fetch(`http://127.0.0.1:9090/api/v1/query?query=${promQuery}`);
  const data = await response.json();
  if (data.status === "success" && data.data.result.length) {
    const val = parseFloat(data.data.result[0].value[1]);
    await MetricValue.create({ value: val, metric_id: metric.id });
    // шлём всем в комнате этого metricId
    io.to(`metric-${metric.id}`).emit("newValue", {
      metricId: metric.id,
      value: val,
      date: new Date().toISOString()
    });
  }
}

(async () => {
  try {
    await db.sequelize.authenticate();
    await db.sequelize.sync({ alter: true });
    console.log('База данных подключена и таблички синхронизированы');
  } catch (err) {
    console.error('Ошибка инициализации БД:', err);
  }
})();

// 1) Список всех метрик
app.get('/metrics', ensureAuthenticated, async (req, res) => {
  try {
    // 1) Убедимся, что базовые метрики есть
    await Promise.all([
      Metric.findOrCreate({ where: { name: 'LOAD_AVERAGE' } }),
      Metric.findOrCreate({ where: { name: 'NODE_CPU_SECONDS_TOTAL' } }),
      Metric.findOrCreate({ where: { name: 'NODE_MEMORY_MEMFREE_BYTES' } }),
      Metric.findOrCreate({ where: { name: 'NODE_MEMORY_TOTAL_BYTES' } }),
      Metric.findOrCreate({ where: { name: 'NODE_CPU_USAGE_PERCENT' } }),
      Metric.findOrCreate({ where: { name: 'NODE_DISK_READ_BYTES' } }),
      Metric.findOrCreate({ where: { name: 'NODE_DISK_WRITE_BYTES' } }),
      Metric.findOrCreate({ where: { name: 'NODE_MEMORY_CACHED_BYTES' } }),
      Metric.findOrCreate({ where: { name: 'NODE_DISK_IO_TIME' } }),
      Metric.findOrCreate({ where: { name: 'NODE_UPTIME' } }),
    ]);

    // 2) Считаем параметры из query
    const { search, tags } = req.query;

    // 3) WHERE по имени (search)
    const where = {};
    if (search && search.trim()) {
      where.name = { [Op.iLike]: `%${search.trim()}%` };
    }

    // 4) INCLUDE для тегов
    const includeTag = {
      model: Tag,
      attributes: ['id', 'name', 'color'],
      through: { attributes: [] },  // убираем лишние поля из join‑таблицы
    };

    if (tags) {
      // разобьём строку "1,2,3" в [1,2,3]
      const tagIds = tags
        .split(',')
        .map(s => parseInt(s, 10))
        .filter(n => !isNaN(n));
      if (tagIds.length) {
        includeTag.where    = { id: tagIds };
        includeTag.required = true;  // INNER JOIN, т.е. хотя бы один из указанных
      }
    }

    // 5) Запрос с фильтрами
    const metrics = await Metric.findAll({
      where,
      attributes: ['id', 'name'],
      include: [ includeTag ]
    });

    // 6) Отдаём в нужном формате
    const result = metrics.map(m => ({
      id:   m.id,
      name: m.name,
      tags: m.Tags.map(t => ({ id: t.id, name: t.name, color: t.color }))
    }));
    res.json(result);

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

// New endpoint for total memory
app.get('/metrics/node_memory_total_bytes', ensureAuthenticated, async (req, res) => {
  try {
    const [metric] = await Metric.findOrCreate({
      where: { name: 'NODE_MEMORY_TOTAL_BYTES' },
      defaults: { name: 'NODE_MEMORY_TOTAL_BYTES' }
    });
    const track = await Trackable.findOne({ where: { user_id: req.user.id, metric_id: metric.id } });
    const response = await fetch('http://127.0.0.1:9090/api/v1/query?query=node_memory_MemTotal_bytes');
    const data = await response.json();
    if (data.status === 'success' && data.data.result.length > 0) {
      const val = parseFloat(data.data.result[0].value[1]);
      if (track) await MetricValue.create({ value: val, metric_id: metric.id });
      return res.json({ node_memory_MemTotal_bytes: val });
    }
    res.status(500).json({ error: 'No data returned from Prometheus' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// New endpoint for CPU usage percentage
app.get('/metrics/node_cpu_usage_percent', ensureAuthenticated, async (req, res) => {
  try {
    const [metric] = await Metric.findOrCreate({
      where: { name: 'NODE_CPU_USAGE_PERCENT' },
      defaults: { name: 'NODE_CPU_USAGE_PERCENT' }
    });
    const track = await Trackable.findOne({ where: { user_id: req.user.id, metric_id: metric.id } });
    const response = await fetch('http://127.0.0.1:9090/api/v1/query?query=100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)');
    const data = await response.json();
    if (data.status === 'success' && data.data.result.length > 0) {
      const val = parseFloat(data.data.result[0].value[1]);
      if (track) await MetricValue.create({ value: val, metric_id: metric.id });
      return res.json({ node_cpu_usage_percent: val });
    }
    res.status(500).json({ error: 'No data returned from Prometheus' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// New endpoint for disk read bytes
app.get('/metrics/node_disk_read_bytes', ensureAuthenticated, async (req, res) => {
  try {
    const [metric] = await Metric.findOrCreate({
      where: { name: 'NODE_DISK_READ_BYTES' },
      defaults: { name: 'NODE_DISK_READ_BYTES' }
    });
    const track = await Trackable.findOne({ where: { user_id: req.user.id, metric_id: metric.id } });
    const response = await fetch('http://127.0.0.1:9090/api/v1/query?query=node_disk_read_bytes_total');
    const data = await response.json();
    if (data.status === 'success' && data.data.result.length > 0) {
      const val = parseFloat(data.data.result[0].value[1]);
      if (track) await MetricValue.create({ value: val, metric_id: metric.id });
      return res.json({ node_disk_read_bytes: val });
    }
    res.status(500).json({ error: 'No data returned from Prometheus' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// New endpoint for disk write bytes
app.get('/metrics/node_disk_write_bytes', ensureAuthenticated, async (req, res) => {
  try {
    const [metric] = await Metric.findOrCreate({
      where: { name: 'NODE_DISK_WRITE_BYTES' },
      defaults: { name: 'NODE_DISK_WRITE_BYTES' }
    });
    const track = await Trackable.findOne({ where: { user_id: req.user.id, metric_id: metric.id } });
    const response = await fetch('http://127.0.0.1:9090/api/v1/query?query=node_disk_written_bytes_total');
    const data = await response.json();
    if (data.status === 'success' && data.data.result.length > 0) {
      const val = parseFloat(data.data.result[0].value[1]);
      if (track) await MetricValue.create({ value: val, metric_id: metric.id });
      return res.json({ node_disk_write_bytes: val });
    }
    res.status(500).json({ error: 'No data returned from Prometheus' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// New endpoint for memory cached bytes
app.get('/metrics/node_memory_cached_bytes', ensureAuthenticated, async (req, res) => {
  try {
    const [metric] = await Metric.findOrCreate({
      where: { name: 'NODE_MEMORY_CACHED_BYTES' },
      defaults: { name: 'NODE_MEMORY_CACHED_BYTES' }
    });
    const track = await Trackable.findOne({ where: { user_id: req.user.id, metric_id: metric.id } });
    const response = await fetch('http://127.0.0.1:9090/api/v1/query?query=node_memory_Cached_bytes');
    const data = await response.json();
    if (data.status === 'success' && data.data.result.length > 0) {
      const val = parseFloat(data.data.result[0].value[1]);
      if (track) await MetricValue.create({ value: val, metric_id: metric.id });
      return res.json({ node_memory_cached_bytes: val });
    }
    res.status(500).json({ error: 'No data returned from Prometheus' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// New endpoint for disk IO time
app.get('/metrics/node_disk_io_time', ensureAuthenticated, async (req, res) => {
  try {
    const [metric] = await Metric.findOrCreate({
      where: { name: 'NODE_DISK_IO_TIME' },
      defaults: { name: 'NODE_DISK_IO_TIME' }
    });
    const track = await Trackable.findOne({ where: { user_id: req.user.id, metric_id: metric.id } });
    const response = await fetch('http://127.0.0.1:9090/api/v1/query?query=node_disk_io_time_seconds_total');
    const data = await response.json();
    if (data.status === 'success' && data.data.result.length > 0) {
      const val = parseFloat(data.data.result[0].value[1]);
      if (track) await MetricValue.create({ value: val, metric_id: metric.id });
      return res.json({ node_disk_io_time: val });
    }
    res.status(500).json({ error: 'No data returned from Prometheus' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// New endpoint for system uptime
app.get('/metrics/node_uptime', ensureAuthenticated, async (req, res) => {
  try {
    const [metric] = await Metric.findOrCreate({
      where: { name: 'NODE_UPTIME' },
      defaults: { name: 'NODE_UPTIME' }
    });
    const track = await Trackable.findOne({ where: { user_id: req.user.id, metric_id: metric.id } });
    const response = await fetch('http://127.0.0.1:9090/api/v1/query?query=node_time_seconds - node_boot_time_seconds');
    const data = await response.json();
    if (data.status === 'success' && data.data.result.length > 0) {
      const val = parseFloat(data.data.result[0].value[1]);
      if (track) await MetricValue.create({ value: val, metric_id: metric.id });
      return res.json({ node_uptime: val });
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


app.get('/tags', ensureAuthenticated, async (req, res) => {
  try {
    const tags = await Tag.findAll({ attributes: ['id', 'name'] });
    res.json(tags);
  } catch (err) {
    console.error('Error in GET /tags:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/metrics/:metric_id/comments', ensureAuthenticated, async (req, res) => {
  const metricId = +req.params.metric_id;
  const days = parseInt(req.query.days, 10);

  const where = { metric_id: metricId };
  if (!isNaN(days) && days > 0) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    where.createdAt = { [Op.gte]: since };
  }

  const comments = await Comment.findAll({
    where,
    include: [{ model: User, attributes: ['id','username'] }],
    order: [['createdAt','ASC']]
  });

  const result = comments.map(c => ({
    id: c.id,
    text: c.comment,
    user: c.User.username,
    userId: c.User.id,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt
  }));
  res.json(result);
});

// POST /metrics/:metric_id/comments
// — добавить новый комментарий
app.post('/metrics/:metric_id/comments', ensureAuthenticated, async (req, res) => {
  try {
    const metricId = req.params.metric_id;
    const userId   = req.user.id;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Empty comment' });
    }

    // проверяем, что метрика есть
    const metric = await Metric.findByPk(metricId);
    if (!metric) return res.status(404).json({ error: 'Metric not found' });

    const comment = await Comment.create({
      comment: text.trim(),
      metric_id: metricId,
      user_id: userId
    });

    // достаём созданный с данными юзера
    const created = await Comment.findByPk(comment.id, {
      include: [{ model: User, attributes: ['username'] }]
    });

    res.status(201).json({
      id: created.id,
      text: created.comment,
      user: created.User.username,
      userId: created.User.id,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt
    });
  } catch (err) {
    console.error('POST /metrics/:id/comments error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /comments/:comment_id
// — редактировать свой комментарий
app.put('/comments/:comment_id', ensureAuthenticated, async (req, res) => {
  try {
    const commentId = req.params.comment_id;
    const userId    = req.user.id;
    const { text }  = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Empty comment' });
    }

    const comment = await Comment.findByPk(commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.user_id !== userId) {
      return res.status(403).json({ error: 'Not your comment' });
    }

    comment.comment = text.trim();
    await comment.save();

    res.json({
      id: comment.id,
      text: comment.comment,
      updatedAt: comment.updatedAt
    });
  } catch (err) {
    console.error('PUT /comments/:id error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /comments/:comment_id
// — удалить свой комментарий
app.delete('/comments/:comment_id', ensureAuthenticated, async (req, res) => {
  try {
    const commentId = req.params.comment_id;
    const userId    = req.user.id;

    const comment = await Comment.findByPk(commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.user_id !== userId) {
      return res.status(403).json({ error: 'Not your comment' });
    }

    await comment.destroy();
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('DELETE /comments/:id error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Стримим каждые 5 секунд значение Load Average
setInterval(
  () => fetchAndEmit("LOAD_AVERAGE", "node_load1"),
  5000
);

// Стримим каждые 5 секунд значение CPU Seconds Total
setInterval(
  () => fetchAndEmit("NODE_CPU_SECONDS_TOTAL", "node_cpu_seconds_total"),
  5000
);

// Стримим каждые 5 секунд значение Memory MemFree Bytes
setInterval(
  () => fetchAndEmit("NODE_MEMORY_MEMFREE_BYTES", "node_memory_MemFree_bytes"),
  5000
);

// Add new interval fetches for the new metrics
setInterval(
  () => fetchAndEmit("NODE_MEMORY_TOTAL_BYTES", "node_memory_MemTotal_bytes"),
  5000
);

setInterval(
  () => fetchAndEmit("NODE_CPU_USAGE_PERCENT", "100 - (avg by (instance) (irate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)"),
  5000
);

setInterval(
  () => fetchAndEmit("NODE_DISK_READ_BYTES", "node_disk_read_bytes_total"),
  5000
);

// New endpoint for network receive bytes
app.get('/metrics/node_network_receive_bytes', ensureAuthenticated, async (req, res) => {
  try {
    const [metric] = await Metric.findOrCreate({
      where: { name: 'NODE_NETWORK_RECEIVE_BYTES' },
      defaults: { name: 'NODE_NETWORK_RECEIVE_BYTES' }
    });
    const track = await Trackable.findOne({ where: { user_id: req.user.id, metric_id: metric.id } });
    const response = await fetch('http://127.0.0.1:9090/api/v1/query?query=rate(node_network_receive_bytes_total[1m])');
    const data = await response.json();
    if (data.status === 'success' && data.data.result.length > 0) {
      const val = parseFloat(data.data.result[0].value[1]);
      if (track) await MetricValue.create({ value: val, metric_id: metric.id });
      return res.json({ node_network_receive_bytes: val });
    }
    res.status(500).json({ error: 'No data returned from Prometheus' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// New endpoint for disk space usage percentage
app.get('/metrics/node_disk_usage_percent', ensureAuthenticated, async (req, res) => {
  try {
    const [metric] = await Metric.findOrCreate({
      where: { name: 'NODE_DISK_USAGE_PERCENT' },
      defaults: { name: 'NODE_DISK_USAGE_PERCENT' }
    });
    const track = await Trackable.findOne({ where: { user_id: req.user.id, metric_id: metric.id } });
    const response = await fetch('http://127.0.0.1:9090/api/v1/query?query=100 - ((node_filesystem_avail_bytes{mountpoint="/"} * 100) / node_filesystem_size_bytes{mountpoint="/"})');
    const data = await response.json();
    if (data.status === 'success' && data.data.result.length > 0) {
      const val = parseFloat(data.data.result[0].value[1]);
      if (track) await MetricValue.create({ value: val, metric_id: metric.id });
      return res.json({ node_disk_usage_percent: val });
    }
    res.status(500).json({ error: 'No data returned from Prometheus' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// New endpoint for memory usage percentage
app.get('/metrics/node_memory_usage_percent', ensureAuthenticated, async (req, res) => {
  try {
    const [metric] = await Metric.findOrCreate({
      where: { name: 'NODE_MEMORY_USAGE_PERCENT' },
      defaults: { name: 'NODE_MEMORY_USAGE_PERCENT' }
    });
    const track = await Trackable.findOne({ where: { user_id: req.user.id, metric_id: metric.id } });
    const response = await fetch('http://127.0.0.1:9090/api/v1/query?query=100 - ((node_memory_MemAvailable_bytes * 100) / node_memory_MemTotal_bytes)');
    const data = await response.json();
    if (data.status === 'success' && data.data.result.length > 0) {
      const val = parseFloat(data.data.result[0].value[1]);
      if (track) await MetricValue.create({ value: val, metric_id: metric.id });
      return res.json({ node_memory_usage_percent: val });
    }
    res.status(500).json({ error: 'No data returned from Prometheus' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// New endpoint for process count
app.get('/metrics/node_process_count', ensureAuthenticated, async (req, res) => {
  try {
    const [metric] = await Metric.findOrCreate({
      where: { name: 'NODE_PROCESS_COUNT' },
      defaults: { name: 'NODE_PROCESS_COUNT' }
    });
    const track = await Trackable.findOne({ where: { user_id: req.user.id, metric_id: metric.id } });
    const response = await fetch('http://127.0.0.1:9090/api/v1/query?query=node_procs_running');
    const data = await response.json();
    if (data.status === 'success' && data.data.result.length > 0) {
      const val = parseFloat(data.data.result[0].value[1]);
      if (track) await MetricValue.create({ value: val, metric_id: metric.id });
      return res.json({ node_process_count: val });
    }
    res.status(500).json({ error: 'No data returned from Prometheus' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Add new interval fetches for the new metrics
setInterval(
  () => fetchAndEmit("NODE_NETWORK_RECEIVE_BYTES", "rate(node_network_receive_bytes_total[1m])"),
  5000
);

setInterval(
  () => fetchAndEmit("NODE_DISK_USAGE_PERCENT", "100 - ((node_filesystem_avail_bytes{mountpoint=\"/\"} * 100) / node_filesystem_size_bytes{mountpoint=\"/\"})"),
  5000
);

setInterval(
  () => fetchAndEmit("NODE_MEMORY_USAGE_PERCENT", "100 - ((node_memory_MemAvailable_bytes * 100) / node_memory_MemTotal_bytes)"),
  5000
);

setInterval(
  () => fetchAndEmit("NODE_PROCESS_COUNT", "node_procs_running"),
  5000
);

// HTTP-эндпоинт для истории без realtime (для initial load)
app.get('/metrics/:metric_id/values', ensureAuthenticated, async (req, res) => {
  try {
    const metricId = Number(req.params.metric_id);
    const { from, to, sort_by = 'date', order = 'asc' } = req.query;

    const where = { metric_id: metricId };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt[Op.gte] = new Date(from);
      if (to)   where.createdAt[Op.lte] = new Date(to);
    }

    const orderField = sort_by === 'value' ? 'value' : 'createdAt';
    const orderDir   = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    const vals = await MetricValue.findAll({
      where,
      order: [[ orderField, orderDir ]],
      attributes: ['value','createdAt']
    });

    // уникальные
    const seen = new Set();
    const unique = vals.filter(v => {
      if (seen.has(v.value)) return false;
      seen.add(v.value);
      return true;
    });

    res.json(unique.map(v => ({ value: v.value, date: v.createdAt })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/metrics/node_network_transmit_bytes', ensureAuthenticated, async (req, res) => {
  try {
    const response = await fetch(`${PROMETHEUS_URL}/api/v1/query?query=rate(node_network_transmit_bytes_total[1m])`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching network transmit data:', error);
    res.status(500).json({ error: 'Failed to fetch network transmit data' });
  }
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`Server on port ${PORT}`));