import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const MetricTag = sequelize.define('MetricTag', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  }
}, {
  tableName: 'MetricTags',
  timestamps: true
});

export default MetricTag;
