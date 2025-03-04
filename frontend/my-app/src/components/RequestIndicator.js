import React from 'react';

function RequestIndicator({ statusCode }) {
  let indicatorColor;
  if (statusCode === null) {
    indicatorColor = '#ef7f38'; // ожидание
  } else if (statusCode >= 400 && statusCode < 600) {
    indicatorColor = '#f67373'; // ошибка
  } else {
    indicatorColor = '#FFF'; // нормальное состояние
  }

  return (
    <div className="request-indicator">
      <span className="circle" style={{ backgroundColor: indicatorColor }}></span>
    </div>
  );
}

export default RequestIndicator;
