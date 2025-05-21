import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const Tag = sequelize.define('Tag', {
  id:    { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name:  {
    type: DataTypes.STRING(32),
    allowNull: false,
    unique: true,
    validate: {
      len: {
        args: [1, 32],
        msg: 'Название тега должно быть от 1 до 32 символов'
      }
    }
  },
  color: {
    type: DataTypes.STRING(56),
    allowNull: false,
    defaultValue: '#cccccc',
    validate: {
      len: {
        args: [1, 56],
        msg: 'Цвет должен быть от 1 до 56 символов'
      }
    }
  }
}, {
  tableName: 'Tags',
  timestamps: true
});

export default Tag;
