const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

// Representa a tabela product_images (sem created_at e updated_at)
const ProductImage = sequelize.define(
  'ProductImage',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
    path: { type: DataTypes.STRING, allowNull: false },
  },
  { tableName: 'product_images', timestamps: false }
)

module.exports = ProductImage