const { Sequelize, DataTypes } = require('sequelize');
const db = require('../config/database');

const Invitation = db.define('Invitation', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    guestName: {
        type: DataTypes.STRING,
        allowNull: false,  // Assurer que le nom de l'invité est requis
        validate: {
          notEmpty: {
            msg: 'Guest name cannot be empty',  // Message d'erreur personnalisé
          },
          len: {
            args: [1, 255],  // Limite de longueur pour le nom
            msg: 'Guest name must be between 1 and 255 characters',
          },
        },
    },
    accepted: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
    }
}, {
    timestamps: false,
    indexes: [
        { fields: ['accepted'] }
    ]
  });

module.exports = Invitation;