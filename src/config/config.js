require('dotenv').config()

// Configurações do banco, lidas do .env
const base = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  dialect: 'mysql',
  define: {
    timestamps: true,   // cria created_at e updated_at
    underscored: true,  // usa snake_case nas colunas
  },
}

module.exports = {
  development: base,
  test: { ...base, database: process.env.DB_NAME_TEST || `${process.env.DB_NAME}_test` },
  production: base,
}