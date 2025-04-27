// src/models/MetricTag.js
import { DataTypes } from 'sequelize';
import sequelize from '../db.js';
import Metric from './Metric.js';
import Tag from './Tag.js';

const MetricTag = sequelize.define('MetricTag', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  metric_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Metric,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  tag_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Tag,
      key: 'id'
    },
    onDelete: 'CASCADE'
  }
}, {
  tableName: 'MetricTags',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['metric_id', 'tag_id']
    }
  ]
});

// Связываем модели (многие-ко-многим через эту таблицу)
Metric.belongsToMany(Tag,   { through: MetricTag, foreignKey: 'metric_id' });
Tag.   belongsToMany(Metric,{ through: MetricTag, foreignKey: 'tag_id' });

export default MetricTag;
