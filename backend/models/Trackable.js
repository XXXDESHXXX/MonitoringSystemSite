import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const Trackable = sequelize.define('Trackable', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  }
}, {
  tableName: 'Trackable',
  timestamps: true
});

export default Trackable;
