const { Sequelize, DataTypes } = require('sequelize');
const db = require('../config/database');

const Balancing = db.define('Balancing', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    amount: {
        type: DataTypes.FLOAT
    },
    senderType: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    receiverType: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    senderName: {
        type: DataTypes.STRING,
    },
    receiverName: {
        type: DataTypes.STRING,
    }
}, {
    timestamps: false,
  });

module.exports = Balancing;