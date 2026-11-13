const path = require('path')
const express = require('express')
const userRoutes = require('./routes/userRoutes')
const categoryRoutes = require('./routes/categoryRoutes')
const productRoutes = require('./routes/productRoutes')
const swaggerUi = require('swagger-ui-express')
const swaggerDocument = require('./docs/swagger')

const app = express()

// Aceita JSON no corpo das requisições (limite maior por causa das imagens em base64)
app.use(express.json({ limit: '10mb' }))

// Serve as imagens dos produtos (pasta public/media) em /media/<arquivo>
app.use('/media', express.static(path.join(__dirname, '..', 'public', 'media')))

// Rota simples para conferir se a API está no ar
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' })
})

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))

app.use('/v1/user', userRoutes)
app.use('/v1/category', categoryRoutes)
app.use('/v1/product', productRoutes)

// Rota que não existe
app.use((req, res) => {
  res.status(404).json({ message: 'Rota não encontrada' })
})

// Tratamento de erros inesperados
app.use((err, req, res, next) => {
  // JSON malformado no corpo da requisição
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'JSON inválido' })
  }

  console.error(err)
  return res.status(500).json({ message: 'Erro interno do servidor' })
})

module.exports = app