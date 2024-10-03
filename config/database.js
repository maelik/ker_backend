const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('ker_db', 'postgres', 'KerBddProject', {
  host: 'localhost',
  dialect: 'postgres', // Le dialecte pour PostgreSQL
});

module.exports = sequelize;