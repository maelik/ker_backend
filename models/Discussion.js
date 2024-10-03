const { Sequelize, DataTypes } = require('sequelize');
const db = require('../config/database');

const Discussion = db.define('Discussion', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    messageText: {
        type: DataTypes.TEXT
    },
    writorType: {
        type: DataTypes.STRING,
        allowNull: false,
    }
}, {
    timestamps: true,
  });

module.exports = Discussion;