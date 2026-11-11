const bcrypt = require('bcrypt')
const { User } = require('../models')

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Devolve só os campos públicos do usuário (nunca a senha)
function publicUser(user) {
  return {
    id: user.id,
    firstname: user.firstname,
    surname: user.surname,
    email: user.email,
  }
}

// GET /v1/user/:id
async function getUserById(req, res) {
  const user = await User.findByPk(req.params.id)

  if (!user) {
    return res.status(404).json({ message: 'Usuário não encontrado' })
  }

  return res.status(200).json(publicUser(user))
}

// POST /v1/user
async function createUser(req, res) {
  const { firstname, surname, email, password, confirmPassword } = req.body || {}

  if (!firstname || !surname || !email || !password || !confirmPassword) {
    return res.status(400).json({ message: 'Todos os campos são obrigatórios' })
  }

  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ message: 'E-mail inválido' })
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'As senhas não conferem' })
  }

  const existing = await User.findOne({ where: { email } })
  if (existing) {
    return res.status(400).json({ message: 'E-mail já cadastrado' })
  }

  // Guarda o hash da senha, nunca a senha em texto puro
  const hash = await bcrypt.hash(password, 10)
  const user = await User.create({ firstname, surname, email, password: hash })

  return res.status(201).json(publicUser(user))
}

// PUT /v1/user/:id (protegido)
async function updateUser(req, res) {
  const user = await User.findByPk(req.params.id)

  if (!user) {
    return res.status(404).json({ message: 'Usuário não encontrado' })
  }

  const { firstname, surname, email } = req.body || {}

  if (!firstname || !surname || !email) {
    return res.status(400).json({ message: 'Nome, sobrenome e e-mail são obrigatórios' })
  }

  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ message: 'E-mail inválido' })
  }

  // O e-mail não pode pertencer a outro usuário
  const other = await User.findOne({ where: { email } })
  if (other && other.id !== user.id) {
    return res.status(400).json({ message: 'E-mail já cadastrado' })
  }

  await user.update({ firstname, surname, email })

  return res.status(204).send()
}

// DELETE /v1/user/:id (protegido)
async function deleteUser(req, res) {
  const user = await User.findByPk(req.params.id)

  if (!user) {
    return res.status(404).json({ message: 'Usuário não encontrado' })
  }

  await user.destroy()

  return res.status(204).send()
}

module.exports = { getUserById, createUser, updateUser, deleteUser }