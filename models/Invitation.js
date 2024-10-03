const { Sequelize, DataTypes } = require('sequelize');
const db = require('../config/database');

const Invitation = db.define('Invitation', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    guestName: {
        type: DataTypes.STRING
    },
    accepted: {
        type: DataTypes.BOOLEAN
    }
}, {
    timestamps: false,
  });

module.exports = Invitation;