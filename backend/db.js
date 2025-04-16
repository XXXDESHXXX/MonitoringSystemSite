import {Sequelize} from "sequelize";
import dotenv from "dotenv";
dotenv.config({path: '../.env'});


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

export default sequelize;