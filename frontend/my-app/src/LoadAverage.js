import React, {useEffect, useState} from 'react';
import {API_ENDPOINTS} from './constants';
import {getAbsoluteURL} from './utils/utils';
import RequestIndicator from './components/RequestIndicator';
import './index.css';

function LoadAverage() {
    const [loadAverageHumanized, setLoadAverageHumanized] = useState('0.00');
    const [statusCode, setStatusCode] = useState(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const url = getAbsoluteURL(API_ENDPOINTS.loadAverage);
                setStatusCode(null);
                const response = await fetch(url, {method: 'GET'});
                setStatusCode(response.statusCode);
                const json = await response.json();
                const loadAverageHumanized = (json.load_average * 100).toFixed(2).toString();
                setLoadAverageHumanized(loadAverageHumanized);
            } catch (error) {
                console.error('Ошибка при получении данных:', error);
            }
        }

        setInterval(fetchData, 1000);
    }, []);

    return (
        <div className="metric-container">
            <h1 className="title">Показатель: LoadAverage</h1>
            <p className="description">
                Средняя нагрузка на процессор, включающая в себя процессы в состоянии D, R (ожидание, запущено)
                соответственно и количество I/O операций за 1 минуту.
            </p>
            <div className="metric-status">
                <RequestIndicator statusCode={statusCode}/>
                <span className="metric-value">Показатель: {loadAverageHumanized} %</span>
            </div>
        </div>
    );
}

export default LoadAverage;
