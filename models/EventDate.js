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
    validate: {
      notEmpty: {
        msg: 'The proposed date field cannot be empty.'
      },
      isDate: {
        msg: 'The proposed date must be a valid date.'
      }
    }
  },
  score: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      isInt: {
        msg: 'Score must be an integer.'
      },
      min: {
        args: [0],
        msg: 'Score count cannot be negative.'
      }
    }
  }
}, {
  timestamps: false,
  indexes: [
    { fields: ['proposed_date'] },
    { fields: ['score'] }
  ]
});

module.exports = EventDate;
