import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const Metric = sequelize.define('Metric', {
  id:    { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name:  { type: DataTypes.STRING }
}, {
  tableName: 'Metrics',
});

export default Metric;
