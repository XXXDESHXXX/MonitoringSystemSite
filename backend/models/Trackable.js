const { DataTypes } = require('sequelize');
const sequelize = require('../db');

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

module.exports = Trackable;
