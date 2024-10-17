const { Sequelize, DataTypes } = require('sequelize');
const db = require('../config/database');

const Guest = db.define('Guest', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: {
            msg: 'Please provide a valid email address.'
          },
          notEmpty: {
            msg: 'Email cannot be empty.'
          }
        }
    },
    token: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Token cannot be empty.'
          }
        }
    }
}, {
    timestamps: false,
    indexes: [
        { fields: ['email'], unique: true },
        { fields: ['token'] }
      ],
  });

module.exports = Guest;