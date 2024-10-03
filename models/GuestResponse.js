const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const GuestResponse = sequelize.define('GuestResponse', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  response: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
}, {
  timestamps: false,
});

module.exports = GuestResponse;
