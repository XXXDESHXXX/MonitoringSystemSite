import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const Tag = sequelize.define('Tag', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING
  }
}, {
  tableName: 'Tags',
  timestamps: true
});

export default Tag;
