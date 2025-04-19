import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const MetricValue = sequelize.define('MetricValue', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  value: { type: DataTypes.STRING }
}, {
  tableName: 'MetricValue',
  timestamps: true
});

export default MetricValue;
