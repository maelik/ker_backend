const { Sequelize, DataTypes } = require('sequelize');
const db = require('../config/database');

const User = db.define('User', {
    email: {
        type: DataTypes.STRING,
        allowNull: false, // S'assurer que l'email est requis
        unique: true, // L'email doit être unique dans la base de données
        validate: {
          isEmail: {
            msg: 'Must be a valid email address', // Message d'erreur personnalisé
          },
          notEmpty: {
            msg: 'Email cannot be empty', // Message d'erreur personnalisé
          },
        },
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
},
{
    timestamps: false,
    indexes: [
        { fields: ['email'], unique: true },
        { fields: ['token'] }
      ],
});

module.exports = User;