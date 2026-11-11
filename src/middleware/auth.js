const jwt = require('jsonwebtoken')

// Status devolvido quando o token não é enviado ou está incorreto.
// (Se o monitor pedir 400, é só trocar este número.)
const INVALID_TOKEN_STATUS = 401

// Middleware que protege as rotas: exige "Authorization: Bearer <token>"
function auth(req, res, next) {
  const header = req.headers.authorization

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(INVALID_TOKEN_STATUS).json({ message: 'Token não informado' })
  }

  const token = header.slice(7) // remove o "Bearer "

  try {
    // Valida a assinatura e a validade; guarda os dados do token na requisição
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    return next()
  } catch (error) {
    return res.status(INVALID_TOKEN_STATUS).json({ message: 'Token inválido ou expirado' })
  }
}

module.exports = auth