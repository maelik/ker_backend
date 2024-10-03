const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EventDate = sequelize.define('EventDate', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
},
  proposed_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  vote: {
    type: DataTypes.INTEGER,
  }
}, {
  timestamps: false,
});

module.exports = EventDate;
