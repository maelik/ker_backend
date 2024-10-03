const { Sequelize, DataTypes } = require('sequelize');
const db = require('../config/database');

const User = db.define('User', {
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    token: {
        type: DataTypes.STRING,
    }
},
{
    timestamps: false,
});

module.exports = User;