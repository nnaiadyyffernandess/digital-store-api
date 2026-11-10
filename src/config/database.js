const { Sequelize } = require('sequelize')
const config = require('./config')

const env = process.env.NODE_ENV || 'development'

// Instância única do Sequelize, usada por todos os models
const sequelize = new Sequelize({ ...config[env], logging: false })

// Testa a conexão com o banco
async function connectDatabase() {
  await sequelize.authenticate()
  console.log('MySQL conectado')
}

module.exports = { sequelize, connectDatabase }