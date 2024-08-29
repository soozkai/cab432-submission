const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

// Define Video model
const Video = sequelize.define('Video', {
  originalPath: { 
    type: DataTypes.STRING,
    allowNull: false,  // Assuming this should be required
  },
  processedPath: { 
    type: DataTypes.STRING 
  },
  processingProgress: {
    type: DataTypes.DECIMAL(5, 2),  // Progress as a percentage (e.g., 25.34)
    defaultValue: 0  // Default to 0% progress
  }
});

// Define relationship
User.hasMany(Video);
Video.belongsTo(User);

module.exports = Video;