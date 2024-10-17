const { Sequelize } = require('sequelize');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const databaseUrl = isProduction ? process.env.PROD_DATABASE_URL : process.env.DATABASE_URL;

const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: {
    ssl: isProduction ? {
      require: true,
      rejectUnauthorized: false, // nécessaire pour certaines configurations de Render
    } : false,
  } // Le dialecte pour PostgreSQL
});

module.exports = sequelize;