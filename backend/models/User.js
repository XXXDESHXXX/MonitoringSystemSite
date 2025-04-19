import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

import Metric from './Metric.js';
import Comment from './Comment.js';
import Trackable from './Trackable.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: { type: DataTypes.STRING, allowNull: false },
  password: { type: DataTypes.BLOB, allowNull: false },
  salt: { type: DataTypes.STRING, allowNull: false },
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

export default User;
