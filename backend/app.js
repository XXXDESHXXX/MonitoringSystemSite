import dotenv from "dotenv";
dotenv.config();
import express from "express";
import { createServer } from "http";
import fetch from "node-fetch";
import cors from "cors";
import sequelize from "./db.js";
import authRouter from "./routes/auth.js";
import { ensureAuthenticated } from "./middleware/auth.js";
import { ensureAdmin } from './middleware/admin.js';
import adminRouter from './routes/admin.js';
import db from './models/index.js';
import nodemailer from 'nodemailer';
import { initializeAdminAccounts } from './init-admin-accounts.js';
import PDFDocument from 'pdfkit';
import { Server } from 'socket.io';

const FONT_PATH = '/usr/share/fonts/dejavu/DejaVuSans.ttf';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendHourlyNotifications() {
  console.log('[DEBUG] Starting sendHourlyNotifications...');
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const trackables = await Trackable.findAll({
    where: {},
    include: [
      { model: User, attributes: ['email','username'] },
      { model: Metric, attributes: ['name'] }
    ]
  });

  const byUser = {};
  for (let t of trackables) {
    const { User: user, Metric: metric } = t;
    if (!user.email) continue;
    if (!byUser[user.username]) byUser[user.username] = { user, metrics: [] };
    byUser[user.username].metrics.push({ metricName: metric.name, metricId: t.metric_id });
  }

  for (let { user, metrics } of Object.values(byUser)) {
    console.log(`[DEBUG] Generating report for ${user.username}`);
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      bufferPages: true
    });
    
    doc.registerFont('DejaVu', FONT_PATH);
    doc.font('DejaVu');

    const chunks = [];
    const pdfPromise = new Promise((resolve, reject) => {
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    // Функция для создания таблицы
    const createTable = (values, metricName) => {
      const tableTop = doc.y;
      const colWidth = 200;
      const rowHeight = 30;
      const headerHeight = 40;
      const tableWidth = colWidth * 2;
      const tableHeight = headerHeight + (values.length * rowHeight);

      // Проверяем, поместится ли таблица на текущей странице
      if (tableTop + tableHeight > 700) {
        doc.addPage();
        return createTable(values, metricName); // Рекурсивно создаем таблицу на новой странице
      }

      // Заголовок метрики
      doc.fontSize(16)
         .text(metricName.replace(/_/g, ' '), { underline: true })
         .moveDown(0.5);

      // Верхняя граница таблицы
      doc.moveTo(50, doc.y)
         .lineTo(50 + tableWidth, doc.y)
         .stroke();

      // Заголовки таблицы
      const headerY = doc.y;
      doc.fontSize(12)
         .text('Значение', 50, headerY, { width: colWidth, align: 'center' })
         .text('Время', 50 + colWidth, headerY, { width: colWidth, align: 'center' });

      // Линия под заголовками
      doc.moveTo(50, headerY + headerHeight)
         .lineTo(50 + tableWidth, headerY + headerHeight)
         .stroke();

      // Данные таблицы
      let currentY = headerY + headerHeight;
      values.forEach((v, index) => {
        // Форматируем значение
        let displayValue = v.value;
        if (metricName.includes('MEMORY') && metricName.includes('BYTES')) {
          displayValue = (parseFloat(v.value) / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
        } else if (metricName.includes('PERCENT')) {
          displayValue = parseFloat(v.value).toFixed(2) + '%';
        }

        // Добавляем строку данных
        doc.fontSize(10)
           .text(displayValue, 50, currentY, { width: colWidth, align: 'center' })
           .text(new Date(v.createdAt).toLocaleString(), 50 + colWidth, currentY, { width: colWidth, align: 'center' });

        // Горизонтальные линии между строками
        doc.moveTo(50, currentY + rowHeight)
           .lineTo(50 + tableWidth, currentY + rowHeight)
           .stroke();

        currentY += rowHeight;
      });

      // Вертикальные линии таблицы
      doc.moveTo(50, headerY)
         .lineTo(50, currentY)
         .stroke();
      doc.moveTo(50 + colWidth, headerY)
         .lineTo(50 + colWidth, currentY)
         .stroke();
      doc.moveTo(50 + tableWidth, headerY)
         .lineTo(50 + tableWidth, currentY)
         .stroke();

      // Добавляем отступ после таблицы
      doc.moveDown(2);
    };

    // Шапка отчета
    doc.fontSize(24)
       .text('Отчет по мониторингу', { align: 'center' })
       .moveDown();
    
    doc.fontSize(14)
       .text(`Пользователь: ${user.username}`)
       .text(`Дата отчета: ${new Date().toLocaleString()}`)
       .moveDown(2);

    // Для каждой метрики создаем таблицу
    for (let { metricName, metricId } of metrics) {
      const values = await MetricValue.findAll({
        where: { 
          metric_id: metricId, 
          createdAt: { [Op.gte]: oneHourAgo } 
        },
        order: [['createdAt', 'DESC']],
        limit: 10
      });

      if (values.length > 0) {
        createTable(values, metricName);
      } else {
        doc.fontSize(10)
           .text('Нет данных за последний час', { color: 'gray' })
           .moveDown(2);
      }
    }

    // Подпись в конце отчета
    doc.fontSize(10)
       .text('Документ сформирован автоматически', { align: 'right' });

    doc.end();

    const pdfBuffer = await pdfPromise;
    console.log(`[DEBUG] PDF ready for ${user.username}`);

    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: user.email,
      subject: `Ежечасной отчет мониторинга для ${user.username}`,
      text: `Здравствуйте, ${user.username}! В приложении вы найдете единый отчет по всем вашим метрикам за последний час.`,
      attachments: [{ 
        filename: `report_${user.username}_${new Date().toISOString()}.pdf`, 
        content: pdfBuffer 
      }]
    });
    console.log(`[MAIL] Sent aggregated report to ${user.email}`);
  }
}

// Таймеры
setTimeout(() => { sendHourlyNotifications(); setInterval(sendHourlyNotifications, 3600e3); }, 5000);
// Заменяем простой setInterval на комбинацию setTimeout и setInterval
console.log('[DEBUG] Setting up notification timers...');
setTimeout(() => {
  console.log('[DEBUG] Running first notification...');
  sendHourlyNotifications();
  
  console.log('[DEBUG] Setting up hourly interval...');
  setInterval(sendHourlyNotifications, 60 * 60 * 1000);
}, 5000);

// Модели
import Metric from "./models/Metric.js";
import Trackable from "./models/Trackable.js";
import MetricValue from "./models/MetricValue.js";
import Tag from './models/Tag.js';
import MetricTag from './models/MetricTag.js';
import Comment from './models/Comment.js';
import User from './models/User.js';

import { Op } from 'sequelize';

const app = express();
const httpServer = createServer(app);

// Настройка Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'https://monitoringsite.online',
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  path: '/socket.io',
  transports: ['websocket', 'polling']
});

// Обработка WebSocket соединений
io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('subscribe', ({ metricId }) => {
    console.log(`Client subscribed to metric ${metricId}`);
    socket.join(`metric-${metricId}`);
  });

  socket.on('unsubscribe', ({ metricId }) => {
    console.log(`Client unsubscribed from metric ${metricId}`);
    socket.leave(`metric-${metricId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Функция для отправки обновлений метрик через WebSocket
async function broadcastMetricUpdate(metricId, value) {
  io.to(`metric-${metricId}`).emit('newValue', {
    metricId,
    value,
    date: new Date()
  });
}

app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://monitoringsite.online',
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  exposedHeaders: ["Authorization"],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
app.use(express.json());

// Passport
import { initializePassport, passport } from "./dependencies.js";
app.use(passport.initialize());
initializePassport();
app.use("/api/auth", authRouter);
app.use('/api/admin', ensureAuthenticated, ensureAdmin, adminRouter);

// Модифицируем функцию fetchMetricValue для отправки обновлений
async function fetchMetricValue(metricName, promQuery) {
  try {
    const [metric] = await Metric.findOrCreate({ where: { name: metricName } });
    
    const trackables = await Trackable.findAll({
      where: { metric_id: metric.id }
    });

    if (trackables.length === 0) {
      return null;
    }

    const response = await fetch(`http://prometheus:9090/api/v1/query?query=${promQuery}`);
    const data = await response.json();

    if (data.status === "success" && data.data.result.length) {
      const val = parseFloat(data.data.result[0].value[1]);
      
      await MetricValue.create({ 
        value: val.toString(),
        metric_id: metric.id 
      });

      // Отправляем обновление через WebSocket
      broadcastMetricUpdate(metric.id, val);
      
      return val;
    }
    console.warn(`No data returned from Prometheus for ${metricName}`);
    return null;
  } catch (error) {
    console.error(`Error in fetchMetricValue for ${metricName}:`, error);
    return null;
  }
}

// Обновляем значения метрик каждые 5 секунд
setInterval(async () => {
  await fetchMetricValue("LOAD_AVERAGE", "node_load1");
  await fetchMetricValue("NODE_CPU_SECONDS_TOTAL", "node_cpu_seconds_total");
  await fetchMetricValue("NODE_MEMORY_MEMFREE_BYTES", "node_memory_MemFree_bytes");
  await fetchMetricValue("NODE_MEMORY_TOTAL_BYTES", "node_memory_MemTotal_bytes");
  await fetchMetricValue("NODE_CPU_USAGE_PERCENT", "100 - (avg by (instance) (irate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)");
  await fetchMetricValue("NODE_DISK_READ_BYTES", "node_disk_read_bytes_total");
  await fetchMetricValue("NODE_DISK_WRITE_BYTES", "node_disk_written_bytes_total");
  await fetchMetricValue("NODE_MEMORY_CACHED_BYTES", "node_memory_Cached_bytes");
  await fetchMetricValue("NODE_DISK_IO_TIME", "node_disk_io_time_seconds_total");
  await fetchMetricValue("NODE_UPTIME", "node_time_seconds - node_boot_time_seconds");
  await fetchMetricValue("NODE_NETWORK_RECEIVE_BYTES", "rate(node_network_receive_bytes_total[1m])");
  await fetchMetricValue("NODE_DISK_USAGE_PERCENT", "(node_filesystem_size_bytes{mountpoint=\"/\"} - node_filesystem_free_bytes{mountpoint=\"/\"}) * 100 / node_filesystem_size_bytes{mountpoint=\"/\"}");
  await fetchMetricValue("NODE_MEMORY_USAGE_PERCENT", "100 - ((node_memory_MemAvailable_bytes * 100) / node_memory_MemTotal_bytes)");
  await fetchMetricValue("NODE_PROCESS_COUNT", "node_procs_running");
}, 5000);

// Инициализация базы данных
(async () => {
  try {
    await sequelize.sync();
    await initializeAdminAccounts();
    await db.sequelize.authenticate();
    await db.sequelize.sync({ alter: true });
    console.log('База данных подключена и таблички синхронизированы');
  } catch (err) {
    console.error('Ошибка инициализации БД:', err);
  }
})();

// 1) Список всех метрик
app.get('/api/metrics', ensureAuthenticated, async (req, res) => {
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
      Metric.findOrCreate({ where: { name: 'NODE_PROCESS_COUNT' } }),
      Metric.findOrCreate({ where: { name: 'NODE_DISK_USAGE_PERCENT' } }),
      Metric.findOrCreate({ where: { name: 'NODE_NETWORK_RECEIVE_BYTES' } }),
      Metric.findOrCreate({ where: { name: 'NODE_MEMORY_USAGE_PERCENT' } })
    ]);

    // 2) Считаем параметры из query
    const { search, tags } = req.query;

    // 3) WHERE по имени (search)
    const where = {};
    if (search && search.trim()) {
      const searchTerms = search.trim().split('_');
      where.name = {
        [Op.and]: searchTerms.map(term => ({
          [Op.iLike]: `%${term}%`
        }))
      };
    }

    // 4) Подготовка запроса
    let metricIds = null;
    
    if (tags) {
      // Если есть фильтр по тегам, сначала найдем ID подходящих метрик
      const tagIds = tags
        .split(',')
        .map(s => parseInt(s, 10))
        .filter(n => !isNaN(n));

      if (tagIds.length) {
        const metricsWithTags = await Metric.findAll({
          attributes: ['id'],
          include: [{
            model: Tag,
            where: { id: tagIds },
            attributes: [],
            through: { attributes: [] }
          }]
        });
        metricIds = metricsWithTags.map(m => m.id);
        if (metricIds.length) {
          where.id = { [Op.in]: metricIds };
        } else {
          // Если не нашли метрик с такими тегами, вернем пустой результат
          return res.json([]);
        }
      }
    }

    // 5) Основной запрос с включением ВСЕХ тегов
    const metrics = await Metric.findAll({
      where,
      attributes: ['id', 'name'],
      include: [{
        model: Tag,
        attributes: ['id', 'name', 'color'],
        through: { attributes: [] }
      }]
    });

    // 6) Отдаём в нужном формате
    const result = metrics.map(m => ({
      id: m.id,
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
app.get('/api/metrics/load_average', ensureAuthenticated, async (req, res) => {
  try {
    const [metric] = await Metric.findOrCreate({
      where: { name: 'LOAD_AVERAGE' },
      defaults: { name: 'LOAD_AVERAGE' }
    });
    const track = await Trackable.findOne({ where: { user_id: req.user.id, metric_id: metric.id } });
    const response = await fetch('http://prometheus:9090/api/v1/query?query=node_load1');
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
app.get('/api/metrics/node_cpu_seconds_total', ensureAuthenticated, async (req, res) => {
  try {
    const [metric] = await Metric.findOrCreate({
      where: { name: 'NODE_CPU_SECONDS_TOTAL' },
      defaults: { name: 'NODE_CPU_SECONDS_TOTAL' }
    });
    const track = await Trackable.findOne({ where: { user_id: req.user.id, metric_id: metric.id } });
    const response = await fetch('http://prometheus:9090/api/v1/query?query=node_cpu_seconds_total');
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

app.get('/api/metrics/node_memory_memfree_bytes', ensureAuthenticated, async (req, res) => {
  try {
    const [metric] = await Metric.findOrCreate({
      where: { name: 'NODE_MEMORY_MEMFREE_BYTES' },
      defaults: { name: 'NODE_MEMORY_MEMFREE_BYTES' }
    });
    const track = await Trackable.findOne({ where: { user_id: req.user.id, metric_id: metric.id } });
    const response = await fetch('http://prometheus:9090/api/v1/query?query=node_memory_MemFree_bytes');
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
app.get('/api/metrics/node_memory_total_bytes', ensureAuthenticated, async (req, res) => {
  try {
    const [metric] = await Metric.findOrCreate({
      where: { name: 'NODE_MEMORY_TOTAL_BYTES' },
      defaults: { name: 'NODE_MEMORY_TOTAL_BYTES' }
    });
    const track = await Trackable.findOne({ where: { user_id: req.user.id, metric_id: metric.id } });
    const response = await fetch('http://prometheus:9090/api/v1/query?query=node_memory_MemTotal_bytes');
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
app.get('/api/metrics/node_cpu_usage_percent', ensureAuthenticated, async (req, res) => {
  try {
    const [metric] = await Metric.findOrCreate({
      where: { name: 'NODE_CPU_USAGE_PERCENT' },
      defaults: { name: 'NODE_CPU_USAGE_PERCENT' }
    });
    const track = await Trackable.findOne({ where: { user_id: req.user.id, metric_id: metric.id } });
    const response = await fetch('http://prometheus:9090/api/v1/query?query=100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)');
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
app.get('/api/metrics/node_disk_read_bytes', ensureAuthenticated, async (req, res) => {
  try {
    const [metric] = await Metric.findOrCreate({
      where: { name: 'NODE_DISK_READ_BYTES' },
      defaults: { name: 'NODE_DISK_READ_BYTES' }
    });
    const track = await Trackable.findOne({ where: { user_id: req.user.id, metric_id: metric.id } });
    const response = await fetch('http://prometheus:9090/api/v1/query?query=node_disk_read_bytes_total');
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
app.get('/api/metrics/node_disk_write_bytes', ensureAuthenticated, async (req, res) => {
  try {
    const [metric] = await Metric.findOrCreate({
      where: { name: 'NODE_DISK_WRITE_BYTES' },
      defaults: { name: 'NODE_DISK_WRITE_BYTES' }
    });
    const track = await Trackable.findOne({ where: { user_id: req.user.id, metric_id: metric.id } });
    const response = await fetch('http://prometheus:9090/api/v1/query?query=node_disk_written_bytes_total');
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
app.get('/api/metrics/node_memory_cached_bytes', ensureAuthenticated, async (req, res) => {
  try {
    const [metric] = await Metric.findOrCreate({
      where: { name: 'NODE_MEMORY_CACHED_BYTES' },
      defaults: { name: 'NODE_MEMORY_CACHED_BYTES' }
    });
    const track = await Trackable.findOne({ where: { user_id: req.user.id, metric_id: metric.id } });
    const response = await fetch('http://prometheus:9090/api/v1/query?query=node_memory_Cached_bytes');
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
app.get('/api/metrics/node_disk_io_time', ensureAuthenticated, async (req, res) => {
  try {
    const [metric] = await Metric.findOrCreate({
      where: { name: 'NODE_DISK_IO_TIME' },
      defaults: { name: 'NODE_DISK_IO_TIME' }
    });
    const track = await Trackable.findOne({ where: { user_id: req.user.id, metric_id: metric.id } });
    const response = await fetch('http://prometheus:9090/api/v1/query?query=node_disk_io_time_seconds_total');
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
app.get('/api/metrics/node_uptime', ensureAuthenticated, async (req, res) => {
  try {
    const [metric] = await Metric.findOrCreate({
      where: { name: 'NODE_UPTIME' },
      defaults: { name: 'NODE_UPTIME' }
    });
    const track = await Trackable.findOne({ where: { user_id: req.user.id, metric_id: metric.id } });
    const response = await fetch('http://prometheus:9090/api/v1/query?query=node_time_seconds - node_boot_time_seconds');
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

app.post('/api/metrics/:metric_id/track', ensureAuthenticated, async (req, res) => {
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
app.delete('/api/metrics/:metric_id/track', ensureAuthenticated, async (req, res) => {
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
app.get('/api/metrics/tracked', ensureAuthenticated, async (req, res) => {
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


app.get('/api/tags', ensureAuthenticated, async (req, res) => {
  try {
    const tags = await Tag.findAll({ attributes: ['id', 'name'] });
    res.json(tags);
  } catch (err) {
    console.error('Error in GET /tags:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/api/metrics/:metric_id/comments', ensureAuthenticated, async (req, res) => {
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
app.post('/api/metrics/:metric_id/comments', ensureAuthenticated, async (req, res) => {
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
app.put('/api/comments/:comment_id', ensureAuthenticated, async (req, res) => {
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
app.delete('/api/comments/:comment_id', ensureAuthenticated, async (req, res) => {
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

// HTTP-эндпоинт для истории значений метрики
app.get('/api/metrics/:metric_id/values', ensureAuthenticated, async (req, res) => {
  try {
    const metricId = Number(req.params.metric_id);
    const userId = req.user.id;
    const { from, to, sort_by = 'date', order = 'asc' } = req.query;

    // Проверяем, отслеживает ли пользователь эту метрику
    const trackable = await Trackable.findOne({
      where: { 
        user_id: userId,
        metric_id: metricId
      }
    });

    if (!trackable) {
      return res.status(403).json({ 
        error: 'You are not tracking this metric' 
      });
    }

    const where = { metric_id: metricId };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt[Op.gte] = new Date(from);
      if (to) where.createdAt[Op.lte] = new Date(to);
    }

    const orderField = sort_by === 'value' ? 'value' : 'createdAt';
    const orderDir = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    const values = await MetricValue.findAll({
      where,
      order: [[orderField, orderDir]],
      attributes: ['value', 'createdAt']
    });

    // Форматируем значения для ответа
    const result = values.map(v => ({
      value: parseFloat(v.value),
      date: v.createdAt
    }));

    res.json(result);
  } catch (err) {
    console.error('Error fetching metric values:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint for process count
app.get('/api/metrics/node_process_count', ensureAuthenticated, async (req, res) => {
  try {
    const [metric] = await Metric.findOrCreate({
      where: { name: 'NODE_PROCESS_COUNT' },
      defaults: { name: 'NODE_PROCESS_COUNT' }
    });
    const track = await Trackable.findOne({ where: { user_id: req.user.id, metric_id: metric.id } });
    const response = await fetch('http://prometheus:9090/api/v1/query?query=node_procs_running');
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

// Endpoint for disk usage percent
app.get('/api/metrics/node_disk_usage_percent', ensureAuthenticated, async (req, res) => {
  try {
    const [metric] = await Metric.findOrCreate({
      where: { name: 'NODE_DISK_USAGE_PERCENT' },
      defaults: { name: 'NODE_DISK_USAGE_PERCENT' }
    });
    const track = await Trackable.findOne({ where: { user_id: req.user.id, metric_id: metric.id } });
    const response = await fetch('http://prometheus:9090/api/v1/query?query=(node_filesystem_size_bytes{mountpoint="/"} - node_filesystem_free_bytes{mountpoint="/"}) * 100 / node_filesystem_size_bytes{mountpoint="/"}');
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

// Endpoint for network receive bytes
app.get('/api/metrics/node_network_receive_bytes', ensureAuthenticated, async (req, res) => {
  try {
    const [metric] = await Metric.findOrCreate({
      where: { name: 'NODE_NETWORK_RECEIVE_BYTES' },
      defaults: { name: 'NODE_NETWORK_RECEIVE_BYTES' }
    });
    const track = await Trackable.findOne({ where: { user_id: req.user.id, metric_id: metric.id } });
    const response = await fetch('http://prometheus:9090/api/v1/query?query=rate(node_network_receive_bytes_total[1m])');
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

// Endpoint for memory usage percent
app.get('/api/metrics/node_memory_usage_percent', ensureAuthenticated, async (req, res) => {
  try {
    const [metric] = await Metric.findOrCreate({
      where: { name: 'NODE_MEMORY_USAGE_PERCENT' },
      defaults: { name: 'NODE_MEMORY_USAGE_PERCENT' }
    });
    const track = await Trackable.findOne({ where: { user_id: req.user.id, metric_id: metric.id } });
    const response = await fetch('http://prometheus:9090/api/v1/query?query=100 - ((node_memory_MemAvailable_bytes * 100) / node_memory_MemTotal_bytes)');
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

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`Server on port ${PORT}`));