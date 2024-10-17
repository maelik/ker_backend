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
      validate: {
        notEmpty: {
          msg: 'Participant type cannot be empty.'
        }
      }
    },
    shareValue: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        isFloat: {
          msg: 'Share value must be a valid number.'
        },
        min: {
          args: [0],
          msg: 'Share value must be greater than or equal to 0.'
        }
      }
    }
}, {
    timestamps: false,
    indexes: [
      { fields: ['participantType'] }
    ],
  });

module.exports = ExpenseParticipant;