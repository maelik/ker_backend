const { Sequelize, DataTypes } = require('sequelize');
const db = require('../config/database');

const Guest = db.define('Guest', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    email: {
        type: DataTypes.STRING
    },
    token: {
        type: DataTypes.STRING,
    }
}, {
    timestamps: false,
  });

module.exports = Guest;