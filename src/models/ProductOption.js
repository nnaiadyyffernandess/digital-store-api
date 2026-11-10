const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

// Representa a tabela product_options (sem created_at e updated_at)
const ProductOption = sequelize.define(
  'ProductOption',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    shape: { type: DataTypes.ENUM('square', 'circle'), defaultValue: 'square' },
    radius: { type: DataTypes.INTEGER, defaultValue: 0 },
    type: { type: DataTypes.ENUM('text', 'color'), defaultValue: 'text' },
    values: { type: DataTypes.STRING, allowNull: false },
  },
  { tableName: 'product_options', timestamps: false }
)

module.exports = ProductOption