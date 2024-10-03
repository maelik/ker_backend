const { Sequelize, DataTypes } = require('sequelize');
const db = require('../config/database');

const Event = db.define('Event', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: DataTypes.STRING
    },
    userName: {
        type: DataTypes.STRING,
    },
    description: {
        type: DataTypes.TEXT
    },
    location: {
        type: DataTypes.STRING
    }
}, {
    timestamps: false,
  });

module.exports = Event;