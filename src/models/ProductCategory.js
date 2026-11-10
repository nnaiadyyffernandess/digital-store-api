const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

// Tabela de ligação entre produtos e categorias (chave composta)
const ProductCategory = sequelize.define(
  'ProductCategory',
  {
    product_id: { type: DataTypes.INTEGER, primaryKey: true },
    category_id: { type: DataTypes.INTEGER, primaryKey: true },
  },
  { tableName: 'product_categories', timestamps: false }
)

module.exports = ProductCategory