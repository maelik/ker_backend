const { Sequelize, DataTypes } = require('sequelize');
const db = require('../config/database');

const Expense = db.define('Expense', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    amount: {
        type: DataTypes.FLOAT,
        allowNull: false,  // Assurer qu'une dépense ne peut pas avoir un montant vide
        validate: {
            isFloat: {
                msg: 'Amount must be a valid number.'
            },
            min: {
                args: [0],
                msg: 'Amount must be greater than or equal to 0.'
            }
        }
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,  // La description est optionnelle mais vous pouvez rendre cela obligatoire si nécessaire
        validate: {
          notEmpty: {
            msg: 'Description cannot be empty.'
          }
        }
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
          isDate: {
            msg: 'Date must be a valid date.'
          }
        }
    },
    payerType: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Payer type cannot be empty.'
          }
        }
    },
    distribution: {
        type: DataTypes.ENUM('equal', 'amount', 'share'),
        allowNull: false,
        validate: {
          isIn: {
            args: [['equal', 'amount', 'share']],
            msg: 'Distribution must be either "equal", "amount", or "share".'
          }
        }
    }
}, {
    timestamps: false,
    indexes: [
        { fields: ['payerType'] }
      ],
  });

module.exports = Expense;