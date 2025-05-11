// src/models/User.js
import { DataTypes } from 'sequelize';
import sequelize      from '../db.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(16),
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.BLOB,
    allowNull: false
  },
  salt: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    validate: { isEmail: true },
    unique: true
  },
  role: {
    type: DataTypes.ENUM('user','admin'),
    allowNull: false,
    defaultValue: 'user'
  }
}, {
  tableName: 'Users',
  timestamps: true
});

export default User;
