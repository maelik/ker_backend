const { Sequelize, DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

const Event = db.define('Event', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    userName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    location: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            len: [0, 255]
        }
    }
}, {
    timestamps: false,
  });

module.exports = Event;