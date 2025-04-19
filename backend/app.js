import dotenv from "dotenv";
dotenv.config();
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import sequelize from "./db.js";
import session from 'express-session';
import authRouter from "./routes/auth.js";
import { ensureAuthenticated } from "./middleware/auth.js";



const app = express();
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json())


// Настройка сессий
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));

import User from "./models/User.js"
import Metric from "./models/Metric.js"
import Comment from "./models/Comment.js"
import Trackable from "./models/Trackable.js"
import Tag from "./models/Tag.js"
import MetricTag from "./models/MetricTag.js"
import MetricValue from "./models/MetricValue.js";
import {initializePassport,passport} from "./dependencies.js";


app.use(passport.initialize());
app.use(passport.session());
initializePassport();

app.use("/auth", authRouter);
app.use("/metrics", ensureAuthenticated);

sequelize.sync({ force: true })
  .then(() => {
    console.log('DB synced successfully');
  })
  .catch(err => {
    console.error('Error syncing DB:', err);
  });

app.get('/metrics/load_average', async (req, res) => {
  const [metric, created] = await Metric.findOrCreate({
  where: { name: 'LOAD_AVERAGE' },   // что ищем
  defaults: {                        // если не найдёт — создаст с этим
    name: 'LOAD_AVERAGE'
  }
});
  const userTrackableMetric = Trackable.findOne( { where: {user_id: req.user.id, metric_id: metric.id}} )
  try {
    const response = await fetch('http://127.0.0.1:9090/api/v1/query?query=node_load1');
    const data = await response.json();

    if (data.status === 'success' && data.data.result.length > 0) {
      const loadMetric = data.data.result[0];
      const loadValue = loadMetric.value[1];
      if (userTrackableMetric != null)
      {
        await MetricValue.create({ value: loadValue, metric_id: metric.id})
      }
      res.json({ load_average: loadValue });
    } else {
      res.status(500).json({ error: 'No data returned from Prometheus' });
    }

  } catch (error) {
    console.error('Error fetching data from Prometheus:', error);
    res.status(500).json({ error: 'Failed to fetch data from Prometheus' });
  }
});

app.get('/protected', ensureAuthenticated, (req, res) => {
  // если пользователь залогинен, здесь доступен req.user
  res.json({ msg: "You are in!", user: req.user.username });
});


const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
