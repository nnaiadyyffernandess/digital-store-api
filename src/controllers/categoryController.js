const { Category } = require('../models')
const { parsePagination, parseFields } = require('../services/queryParams')

// Campos que a API devolve (sem created_at e updated_at, como no README)
const ALLOWED_FIELDS = ['id', 'name', 'slug', 'use_in_menu']

// Valida os dados de cadastro e atualização; devolve a mensagem de erro ou null
function validateCategory({ name, slug, use_in_menu }) {
  if (typeof name !== 'string' || !name.trim()) {
    return 'O nome é obrigatório'
  }
  if (typeof slug !== 'string' || !slug.trim()) {
    return 'O slug é obrigatório'
  }
  if (use_in_menu !== undefined && typeof use_in_menu !== 'boolean') {
    return 'use_in_menu deve ser true ou false'
  }
  return null
}

// GET /v1/category/search
async function searchCategories(req, res) {
  const pagination = parsePagination(req.query)
  if (pagination.error) {
    return res.status(400).json({ message: pagination.error })
  }

  const fields = parseFields(req.query, ALLOWED_FIELDS)
  if (fields.error) {
    return res.status(400).json({ message: fields.error })
  }

  // Filtro opcional: use_in_menu=true ou use_in_menu=false
  const where = {}
  if (req.query.use_in_menu !== undefined) {
    if (!['true', 'false'].includes(req.query.use_in_menu)) {
      return res.status(400).json({ message: 'use_in_menu deve ser true ou false' })
    }
    where.use_in_menu = req.query.use_in_menu === 'true'
  }

  const options = {
    where,
    attributes: fields.attributes || ALLOWED_FIELDS,
    order: [['id', 'ASC']],
  }

  // Só aplica limite e deslocamento quando não é "buscar todos"
  if (pagination.limit !== -1) {
    options.limit = pagination.limit
    options.offset = pagination.offset
  }

  const { rows, count } = await Category.findAndCountAll(options)

  return res.status(200).json({
    data: rows,
    total: count,
    limit: pagination.limit,
    page: pagination.page,
  })
}

// GET /v1/category/:id
async function getCategoryById(req, res) {
  const category = await Category.findByPk(req.params.id, {
    attributes: ALLOWED_FIELDS,
  })

  if (!category) {
    return res.status(404).json({ message: 'Categoria não encontrada' })
  }

  return res.status(200).json(category)
}

// POST /v1/category (protegido)
async function createCategory(req, res) {
  const body = req.body || {}

  const error = validateCategory(body)
  if (error) {
    return res.status(400).json({ message: error })
  }

  const category = await Category.create({
    name: body.name,
    slug: body.slug,
    use_in_menu: body.use_in_menu,
  })

  return res.status(201).json({
    id: category.id,
    name: category.name,
    slug: category.slug,
    use_in_menu: category.use_in_menu,
  })
}

// PUT /v1/category/:id (protegido)
async function updateCategory(req, res) {
  const category = await Category.findByPk(req.params.id)

  if (!category) {
    return res.status(404).json({ message: 'Categoria não encontrada' })
  }

  const body = req.body || {}

  const error = validateCategory(body)
  if (error) {
    return res.status(400).json({ message: error })
  }

  const data = { name: body.name, slug: body.slug }
  if (body.use_in_menu !== undefined) {
    data.use_in_menu = body.use_in_menu
  }

  await category.update(data)

  return res.status(204).send()
}

// DELETE /v1/category/:id (protegido)
async function deleteCategory(req, res) {
  const category = await Category.findByPk(req.params.id)

  if (!category) {
    return res.status(404).json({ message: 'Categoria não encontrada' })
  }

  await category.destroy()

  return res.status(204).send()
}

module.exports = {
  searchCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
}