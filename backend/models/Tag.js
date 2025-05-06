import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const Tag = sequelize.define('Tag', {
  id:    { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name:  { type: DataTypes.STRING, allowNull: false },
  color: { type: DataTypes.STRING, allowNull: false, defaultValue: '#cccccc' }
}, {
  tableName: 'Tags',
  timestamps: true
});

export default Tag;
