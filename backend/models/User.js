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
    type: DataTypes.STRING(254), // RFC 5321 standard maximum length
    allowNull: true,
    unique: true,
    validate: {
      isEmail: true,
      len: {
        args: [3, 254],
        msg: 'Email must be between 3 and 254 characters'
      },
      is: {
        args: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        msg: 'Invalid email format'
      }
    }
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
