const express = require('express');
const fetch = require('node-fetch');
const app = express();
const port = 5000;
const cors = require('cors');

app.use(cors());

app.get('/', (req, res) => {
    res.send('Hello World!');
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

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
