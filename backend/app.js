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
import nodemailer from 'nodemailer';
import { initializeAdminAccounts } from './init-admin-accounts.js';
import PDFDocument from 'pdfkit';

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
  console.log('[DEBUG] Starting sendHourlyNotifications function...');
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  try {
    // берём все трекабельные метрики вместе с пользователем
    const trackables = await Trackable.findAll({
      where: {},
      include: [
        { model: User, attributes: ['email','username'] },
        { model: Metric, attributes: ['name'] }
      ]
    });

    console.log(`[DEBUG] Found ${trackables.length} trackable metrics`);

    for (let tr of trackables) {
      const { User: user, Metric: metric } = tr;
      if (!user.email) {
        console.log(`[DEBUG] Skipping metric ${metric.name} - no email for user ${user.username}`);
        continue;
      }

      console.log(`[DEBUG] Processing metric ${metric.name} for user ${user.username}`);

      // находим последние 5 значений этой метрики за последний час
      const latestValues = await MetricValue.findAll({
        where: {
          metric_id: tr.metric_id,
          createdAt: { [Op.gte]: oneHourAgo }
        },
        order: [['createdAt', 'DESC']],
        limit: 5
      });

      console.log(`[DEBUG] Found ${latestValues.length} values for metric ${metric.name}`);

      if (!latestValues.length) {
        console.log(`[DEBUG] No values found for metric ${metric.name} - skipping`);
        continue;
      }

      // Создаем PDF документ
      console.log(`[DEBUG] Creating PDF for metric ${metric.name}`);
      const doc = new PDFDocument();
      
      // Создаем Promise для ожидания завершения генерации PDF
      const pdfPromise = new Promise((resolve, reject) => {
        const chunks = [];
        
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        
        // Добавляем заголовок
        doc.fontSize(20)
           .text('Отчет по мониторингу', { align: 'center' })
           .moveDown();

        doc.fontSize(14)
           .text(`Пользователь: ${user.username}`)
           .text(`Метрика: ${metric.name}`)
           .text(`Дата отчета: ${new Date().toLocaleString()}`)
           .moveDown();

        // Создаем таблицу
        const tableTop = doc.y;
        const cellPadding = 10;
        const colWidth = (doc.page.width - 100) / 2;

        // Заголовки таблицы
        doc.fontSize(12)
           .text('Значение', 50, tableTop, { width: colWidth, align: 'center' })
           .text('Время', 50 + colWidth, tableTop, { width: colWidth, align: 'center' });

        let rowTop = tableTop + 25;

        // Данные таблицы
        latestValues.forEach((value, i) => {
          doc.text(value.value.toString(), 50, rowTop + i * 25, { width: colWidth, align: 'center' })
             .text(value.createdAt.toLocaleString(), 50 + colWidth, rowTop + i * 25, { width: colWidth, align: 'center' });
        });

        // Рисуем линии таблицы
        doc.lineWidth(1);
        
        // Горизонтальные линии
        for (let i = 0; i <= latestValues.length; i++) {
          doc.moveTo(50, tableTop + i * 25)
             .lineTo(50 + colWidth * 2, tableTop + i * 25)
             .stroke();
        }

        // Вертикальные линии
        doc.moveTo(50, tableTop)
           .lineTo(50, tableTop + latestValues.length * 25)
           .stroke();
        doc.moveTo(50 + colWidth, tableTop)
           .lineTo(50 + colWidth, tableTop + latestValues.length * 25)
           .stroke();
        doc.moveTo(50 + colWidth * 2, tableTop)
           .lineTo(50 + colWidth * 2, tableTop + latestValues.length * 25)
           .stroke();

        // Добавляем печать
        doc.moveDown(4)
           .fontSize(12)
           .text('Документ сформирован автоматически', { align: 'right' })
           .text('Мониторинговая система', { align: 'right' })
           .text(new Date().toLocaleDateString(), { align: 'right' });

        // Завершаем документ
        doc.end();
      });

      console.log(`[DEBUG] Waiting for PDF generation to complete for metric ${metric.name}...`);
      
      try {
        // Дожидаемся завершения генерации PDF
        const pdfBuffer = await pdfPromise;
        console.log(`[DEBUG] PDF buffer created, size: ${pdfBuffer.length} bytes`);

        // Проверяем настройки SMTP
        console.log('[DEBUG] SMTP Settings:', {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          secure: Number(process.env.SMTP_PORT) === 465,
          user: process.env.SMTP_USER ? 'Set' : 'Not set',
          from: process.env.FROM_EMAIL ? 'Set' : 'Not set'
        });

        // Отправляем email с PDF
        await transporter.sendMail({
          from: process.env.FROM_EMAIL,
          to: user.email,
          subject: `Отчет по метрике ${metric.name}`,
          text: `Прикрепляем отчет по метрике "${metric.name}" за последний час.`,
          attachments: [{
            filename: `report_${metric.name}_${new Date().toISOString()}.pdf`,
            content: pdfBuffer
          }]
        });
        console.log(`[MAIL] Отправлен отчет ${metric.name} -> ${user.email}`);
      } catch (err) {
        console.error(`[MAIL_ERROR] Не удалось отправить отчет ${metric.name} пользователю ${user.email}:`, err);
        console.error('[MAIL_ERROR] Full error:', err);
      }
    }
  } catch (err) {
    console.error('[ERROR] Error in sendHourlyNotifications:', err);
    console.error('[ERROR] Full error stack:', err.stack);
  }
}


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

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://monitoringsite.online',
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  exposedHeaders: ["Set-Cookie"],
  maxAge: 86400
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
    maxAge: 24 * 60 * 60 * 1000, // 24 часа
    domain: process.env.NODE_ENV === 'production' ? '.monitoringsite.online' : undefined
  }
}));

// Passport
import { initializePassport, passport } from "./dependencies.js";
app.use(passport.initialize());
app.use(passport.session());
initializePassport();
app.use("/auth", authRouter);
app.use('/admin', ensureAuthenticated, ensureAdmin, adminRouter);

async function fetchMetricValue(metricName, promQuery) {
  try {
    const [metric] = await Metric.findOrCreate({ where: { name: metricName } });
    
    // Проверяем, есть ли хоть один пользователь, отслеживающий эту метрику
    const trackables = await Trackable.findAll({
      where: { metric_id: metric.id }
    });

    // Если никто не отслеживает метрику, не делаем запрос к Prometheus
    if (trackables.length === 0) {
      return null;
    }

    const response = await fetch(`http://prometheus:9090/api/v1/query?query=${promQuery}`);
    const data = await response.json();

    if (data.status === "success" && data.data.result.length) {
      const val = parseFloat(data.data.result[0].value[1]);
      
      // Сохраняем значение, так как метрика отслеживается
      await MetricValue.create({ 
        value: val.toString(), // Убедимся, что значение сохраняется как строка
        metric_id: metric.id 
      });
      
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
      where.name = { [Op.iLike]: `%${search.trim()}%` };
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
app.get('/metrics/load_average', ensureAuthenticated, async (req, res) => {
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
app.get('/metrics/node_cpu_seconds_total', ensureAuthenticated, async (req, res) => {
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

app.get('/metrics/node_memory_memfree_bytes', ensureAuthenticated, async (req, res) => {
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
app.get('/metrics/node_memory_total_bytes', ensureAuthenticated, async (req, res) => {
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
app.get('/metrics/node_cpu_usage_percent', ensureAuthenticated, async (req, res) => {
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
app.get('/metrics/node_disk_read_bytes', ensureAuthenticated, async (req, res) => {
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
app.get('/metrics/node_disk_write_bytes', ensureAuthenticated, async (req, res) => {
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
app.get('/metrics/node_memory_cached_bytes', ensureAuthenticated, async (req, res) => {
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
app.get('/metrics/node_disk_io_time', ensureAuthenticated, async (req, res) => {
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
app.get('/metrics/node_uptime', ensureAuthenticated, async (req, res) => {
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

// HTTP-эндпоинт для истории значений метрики
app.get('/metrics/:metric_id/values', ensureAuthenticated, async (req, res) => {
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
app.get('/metrics/node_process_count', ensureAuthenticated, async (req, res) => {
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
app.get('/metrics/node_disk_usage_percent', ensureAuthenticated, async (req, res) => {
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
app.get('/metrics/node_network_receive_bytes', ensureAuthenticated, async (req, res) => {
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
app.get('/metrics/node_memory_usage_percent', ensureAuthenticated, async (req, res) => {
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