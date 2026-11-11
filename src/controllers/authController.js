const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { User } = require('../models')

// POST /v1/user/token
async function generateToken(req, res) {
  const { email, password } = req.body || {}

  if (!email || !password) {
    return res.status(400).json({ message: 'E-mail e senha são obrigatórios' })
  }

  const user = await User.findOne({ where: { email } })

  // Compara a senha enviada com o hash guardado no banco
  const validPassword = user && (await bcrypt.compare(password, user.password))

  if (!validPassword) {
    return res.status(400).json({ message: 'E-mail ou senha inválidos' })
  }

  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  )

  return res.status(200).json({ token })
}

module.exports = { generateToken }