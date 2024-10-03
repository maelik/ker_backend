const { Sequelize, DataTypes } = require('sequelize');
const db = require('../config/database');

const Post = db.define('Post', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    topic: {
        type: DataTypes.TEXT
    },
    creatorType: {
        type: DataTypes.STRING,
        allowNull: false,
    }
}, {
    timestamps: true,
  });

module.exports = Post;