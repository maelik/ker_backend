const { Sequelize, DataTypes } = require('sequelize');
const db = require('../config/database');

const Post = db.define('Post', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    topic: {
        type: DataTypes.TEXT,
        allowNull: false,  // Assurer que le sujet est requis
        validate: {
          notEmpty: {
            msg: 'Topic cannot be empty',  // Message d'erreur personnalisé
          },
          len: {
            args: [1, 500],  // Limiter la longueur du sujet à 1-500 caractères
            msg: 'Topic must be between 1 and 500 characters',
          },
        },
    },
    creatorType: {
        type: DataTypes.STRING,
        allowNull: false,  // Assurer que le type de créateur est requis
        validate: {
          notEmpty: {
            msg: 'Creator type cannot be empty',  // Message d'erreur personnalisé
          },
        },
    },
}, {
    timestamps: true,
  });

module.exports = Post;