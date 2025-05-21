import sequelize from '../db.js';
import Metric      from './Metric.js';
import Tag         from './Tag.js';
import MetricTag   from './MetricTag.js';
import Comment     from './Comment.js';
import Trackable   from './Trackable.js';
import MetricValue from './MetricValue.js';
import User        from './User.js';

const db = {
  sequelize,
  Metric,
  Tag,
  MetricTag,
  Comment,
  Trackable,
  MetricValue,
  User
};
db.Metric.hasMany(db.Comment,    { foreignKey: 'metric_id' });
db.Comment.belongsTo(db.Metric,  { foreignKey: 'metric_id' });
db.Metric.hasMany(db.Trackable,    { foreignKey: 'metric_id' });
db.Trackable.belongsTo(db.Metric,  { foreignKey: 'metric_id' });
db.Metric.hasMany(db.MetricValue,  { foreignKey: 'metric_id' });
db.MetricValue.belongsTo(db.Metric,{ foreignKey: 'metric_id' });
db.User.hasMany(db.Comment,        { foreignKey: 'user_id' });
db.Comment.belongsTo(db.User,      { foreignKey: 'user_id' });
db.User.hasMany(db.Trackable,      { foreignKey: 'user_id' });
db.Trackable.belongsTo(db.User,    { foreignKey: 'user_id' });
db.Metric.belongsToMany(db.Tag,    { through: db.MetricTag, foreignKey: 'metric_id' });
db.Tag.belongsToMany(db.Metric,    { through: db.MetricTag, foreignKey: 'tag_id' });

export default db;