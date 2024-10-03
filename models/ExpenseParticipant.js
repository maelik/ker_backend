const { Sequelize, DataTypes } = require('sequelize');
const db = require('../config/database');

const ExpenseParticipant = db.define('ExpenseParticipant', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    participantType: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    shareValue: {
      type: DataTypes.FLOAT,
      allowNull: false,
    }
}, {
    timestamps: false,
  });

module.exports = ExpenseParticipant;