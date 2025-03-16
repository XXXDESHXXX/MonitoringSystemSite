const path = require('path');
require('dotenv').config({
  path: path.join(__dirname, '..', '.env'),
});

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
    {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
  }
);

module.exports = sequelize;
