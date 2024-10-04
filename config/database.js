const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // nécessaire pour certaines configurations de Render
    },
  } // Le dialecte pour PostgreSQL
});

module.exports = sequelize;