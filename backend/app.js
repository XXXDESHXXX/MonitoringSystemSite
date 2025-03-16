// app.js
require('dotenv').config(); // Чтобы process.env.* были доступны
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());

// Подключаем наш sequelize-экземпляр:
const sequelize = require('./db');

// Подключаем модели, чтобы они «подтянулись» и ассоциации были установлены.
// Если мы их не заимпортируем, ассоциации не будут зарегистрированы.
require('./models/User');
require('./models/Metric');
require('./models/Comment');
require('./models/Trackable');
require('./models/Tag');
require('./models/MetricTag');

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
