const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Comment = require('./Comment');
const Trackable = require('./Trackable');
const Tag = require('./Tag');
const MetricTag = require('./MetricTag');

const Metric = sequelize.define('Metric', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: { type: DataTypes.STRING },
  value: { type: DataTypes.INTEGER }
}, {
  tableName: 'Metrics',
  timestamps: true
});

Metric.hasMany(Comment, { foreignKey: 'metric_id' });
Comment.belongsTo(Metric, { foreignKey: 'metric_id' });

Metric.hasMany(Trackable, { foreignKey: 'metric_id' });
Trackable.belongsTo(Metric, { foreignKey: 'metric_id' });

Metric.belongsToMany(Tag, { through: MetricTag, foreignKey: 'metric_id' });
Tag.belongsToMany(Metric, { through: MetricTag, foreignKey: 'tag_id' });

module.exports = Metric;
