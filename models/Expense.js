const { Sequelize, DataTypes } = require('sequelize');
const db = require('../config/database');

const Expense = db.define('Expense', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    amount: {
        type: DataTypes.FLOAT
    },
    description: {
        type: DataTypes.TEXT
    },
    date: {
        type: DataTypes.DATEONLY
    },
    payerType: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    distribution: {
        type: DataTypes.ENUM('equal', 'amount', 'share'),
        allowNull: false,
    }
}, {
    timestamps: false,
  });

module.exports = Expense;