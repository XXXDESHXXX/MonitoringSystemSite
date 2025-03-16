const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Metric = require('./Metric');
const Comment = require('./Comment');
const Trackable = require('./Trackable');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: { type: DataTypes.STRING, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING },
  role: { type: DataTypes.STRING }
}, {
  tableName: 'Users',
  timestamps: true
});

User.hasMany(Metric, { foreignKey: 'user_id' });
Metric.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Comment, { foreignKey: 'user_id' });
Comment.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Trackable, { foreignKey: 'user_id' });
Trackable.belongsTo(User, { foreignKey: 'user_id' });

module.exports = User;
