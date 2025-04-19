import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

import Comment from './Comment.js';
import Trackable from './Trackable.js';
import Tag from './Tag.js';
import MetricTag from './MetricTag.js';
import MetricValue from "./MetricValue.js";

const Metric = sequelize.define('Metric', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: { type: DataTypes.STRING },
}, {
  tableName: 'Metrics',
});

Metric.hasMany(Comment, { foreignKey: 'metric_id' });
Comment.belongsTo(Metric, { foreignKey: 'metric_id' });

Metric.hasMany(Trackable, { foreignKey: 'metric_id' });
Trackable.belongsTo(Metric, { foreignKey: 'metric_id' });

Metric.belongsToMany(Tag, { through: MetricTag, foreignKey: 'metric_id' });
Tag.belongsToMany(Metric, { through: MetricTag, foreignKey: 'tag_id' });

Metric.hasMany(MetricValue, { foreignKey: 'metric_id' });
MetricValue.belongsTo(Metric, { foreignKey: 'metric_id'});

export default Metric;
