const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

// Representa a tabela categories
const Category = sequelize.define(
  'Category',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    slug: { type: DataTypes.STRING, allowNull: false },
    use_in_menu: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  { tableName: 'categories' }
)

module.exports = Category