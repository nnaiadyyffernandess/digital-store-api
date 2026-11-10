const express = require('express')

const app = express()

// Aceita JSON no corpo das requisições (limite maior por causa das imagens em base64)
app.use(express.json({ limit: '10mb' }))

// Rota simples para conferir se a API está no ar
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' })
})

module.exports = app