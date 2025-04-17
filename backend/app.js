import {registerAuthRoutes} from "./routes/auth.js";
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import sequelize from "./db.js";



const app = express();
app.use(cors());
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
import {initializePassport,passport} from "./dependencies.js";


app.use(passport.initialize());
app.use(passport.session());
initializePassport();

registerAuthRoutes(app);

sequelize.sync({ force: false })
  .then(() => {
    console.log('DB synced successfully');
  })
  .catch(err => {
    console.error('Error syncing DB:', err);
  });

app.get('/metrics/load_average', async (req, res) => {
  try {
    const response = await fetch('http://127.0.0.1:9090/api/v1/query?query=node_load1');
    const data = await response.json();

    if (data.status === 'success' && data.data.result.length > 0) {
      const loadMetric = data.data.result[0];
      const loadValue = loadMetric.value[1];
      res.json({ load_average: loadValue });
    } else {
      res.status(500).json({ error: 'No data returned from Prometheus' });
    }
  } catch (error) {
    console.error('Error fetching data from Prometheus:', error);
    res.status(500).json({ error: 'Failed to fetch data from Prometheus' });
  }
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
