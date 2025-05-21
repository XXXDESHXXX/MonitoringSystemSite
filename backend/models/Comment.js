import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const Comment = sequelize.define('Comment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: {
        args: [1, 1000],
        msg: 'Комментарий должен содержать от 1 до 1000 символов'
      }
    }
  }
}, {
  tableName: 'Comments',
  timestamps: true
});

export default Comment;
