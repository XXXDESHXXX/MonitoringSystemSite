const { DataTypes } = require('sequelize');
const sequelize = require('../db');

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

module.exports = MetricTag;
