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
    validate: {
      // Validation pour s'assurer que la réponse est soit true soit false
      isIn: {
        args: [[true, false]],
        msg: 'Response must be either true or false',
      },
    },
  },
  order: {
    type: DataTypes.INTEGER,
    defaultValue: null,
    validate: {
      isInt: {
        msg: 'Score must be an integer.'
      }
    }
  }
}, {
  timestamps: false,
  indexes: [
    { fields: ['response'] }
  ]
});

module.exports = GuestResponse;
