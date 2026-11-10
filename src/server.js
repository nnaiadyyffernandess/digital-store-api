require('dotenv').config()
const app = require('./app')
const { connectDatabase } = require('./config/database')

const PORT = process.env.PORT || 3000

// Só sobe o servidor depois que o banco conectar
connectDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`)
    })
  })
  .catch((error) => {
    console.error('Erro ao conectar no banco:', error.message)
    process.exit(1)
  })