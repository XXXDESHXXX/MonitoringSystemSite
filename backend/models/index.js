import sequelize from '../db.js';
import Metric      from './Metric.js';
import Tag         from './Tag.js';
import MetricTag   from './MetricTag.js';
import Comment     from './Comment.js';
import Trackable   from './Trackable.js';
import MetricValue from './MetricValue.js';
import User        from './User.js';

// Собираем все модели в объект для удобной работы
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

// Настраиваем связи (асссоциации) между моделями

// Metric ←→ Comment
db.Metric.hasMany(db.Comment,    { foreignKey: 'metric_id' });
db.Comment.belongsTo(db.Metric,  { foreignKey: 'metric_id' });

// Metric ←→ Trackable
db.Metric.hasMany(db.Trackable,    { foreignKey: 'metric_id' });
db.Trackable.belongsTo(db.Metric,  { foreignKey: 'metric_id' });

// Metric ←→ MetricValue
db.Metric.hasMany(db.MetricValue,  { foreignKey: 'metric_id' });
db.MetricValue.belongsTo(db.Metric,{ foreignKey: 'metric_id' });

// User ←→ Comment
db.User.hasMany(db.Comment,        { foreignKey: 'user_id' });
db.Comment.belongsTo(db.User,      { foreignKey: 'user_id' });

// User ←→ Trackable
db.User.hasMany(db.Trackable,      { foreignKey: 'user_id' });
db.Trackable.belongsTo(db.User,    { foreignKey: 'user_id' });

// Metric ←→ Tag (через MetricTag)
db.Metric.belongsToMany(db.Tag,    { through: db.MetricTag, foreignKey: 'metric_id' });
db.Tag.belongsToMany(db.Metric,    { through: db.MetricTag, foreignKey: 'tag_id' });

export default db;