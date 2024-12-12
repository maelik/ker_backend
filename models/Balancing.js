const { Sequelize, DataTypes } = require('sequelize');
const db = require('../config/database');

const Balancing = db.define('Balancing', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    amount: {
        type: DataTypes.DECIMAL,
        allowNull: false,
        validate: {
            type: Sequelize.DECIMAL(10, 2),
          min: 0,  // Assurer que le montant est toujours positif
        }
    },
    senderType: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true  // Assurer que ce champ n'est pas vide
        }
    },
    receiverType: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true  // Assurer que ce champ n'est pas vide
        }
    },
    senderName: {
        type: DataTypes.STRING,
        defaultValue: 'Unknown Sender',  // Défaut si le nom n'est pas fourni
        validate: {
            notEmpty: true  // Optionnel, selon tes besoins
        }
    },
    receiverName: {
        type: DataTypes.STRING,
        defaultValue: 'Unknown Receiver',  // Défaut si le nom n'est pas fourni
        validate: {
            notEmpty: true  // Optionnel, selon tes besoins
        }
    }
}, {
    timestamps: false,
  });

module.exports = Balancing;