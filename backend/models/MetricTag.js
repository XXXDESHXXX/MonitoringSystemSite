import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const MetricTag = sequelize.define('MetricTag', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  metric_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Metrics', key: 'id' },
    onDelete: 'CASCADE'
  },
  tag_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Tags', key: 'id' },
    onDelete: 'CASCADE'
  }
}, {
  tableName: 'MetricTags',
  timestamps: true,
  indexes: [{ unique: true, fields: ['metric_id','tag_id'] }]
});

export default MetricTag;
