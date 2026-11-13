const { validateImage, imageUrl } = require('./imageService')

const SHAPES = ['square', 'circle']
const OPTION_TYPES = ['text', 'color']

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== ''
}

function isNonNegativeNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

// Converte o raio ("4px" ou 4) em número inteiro; devolve null se for inválido
function parseRadius(radius) {
  const value = typeof radius === 'string' ? parseInt(radius, 10) : radius
  return Number.isInteger(value) && value >= 0 ? value : null
}

// Valida e normaliza uma opção do produto (tamanho, cor...).
// Com partial = true (usado na atualização), só os campos enviados são validados.
function normalizeOption(option, partial = false) {
  if (!option || typeof option !== 'object') {
    return { error: 'Opção inválida' }
  }

  const data = {}
  const sent = (field) => option[field] !== undefined

  if (!partial || sent('title')) {
    if (!isNonEmptyString(option.title)) {
      return { error: 'O título da opção é obrigatório' }
    }
    data.title = option.title.trim()
  }

  if (!partial || sent('shape')) {
    const shape = option.shape === undefined ? 'square' : option.shape
    if (!SHAPES.includes(shape)) {
      return { error: 'shape deve ser square ou circle' }
    }
    data.shape = shape
  }

  if (!partial || sent('type')) {
    const type = option.type === undefined ? 'text' : option.type
    if (!OPTION_TYPES.includes(type)) {
      return { error: 'type deve ser text ou color' }
    }
    data.type = type
  }

  if (!partial || sent('radius')) {
    const radius = option.radius === undefined ? 0 : parseRadius(option.radius)
    if (radius === null) {
      return { error: 'radius inválido' }
    }
    data.radius = radius
  }

  // O README usa "values" e "value"; aceitamos os dois nomes
  const values = option.values !== undefined ? option.values : option.value

  if (!partial || values !== undefined) {
    if (
      !Array.isArray(values) ||
      values.length === 0 ||
      values.some((item) => !isNonEmptyString(item))
    ) {
      return { error: 'values deve ser uma lista com pelo menos um valor' }
    }
    const joined = values.map((item) => item.trim()).join(',')
    if (joined.length > 255) {
      return { error: 'values é grande demais' }
    }
    data.values = joined
  }

  return { data }
}

// Valida os dados de cadastro do produto.
// Devolve { error } ou { data, categoryIds, images, options }.
function validateProduct(body) {
  if (!isNonEmptyString(body.name)) {
    return { error: 'O nome é obrigatório' }
  }
  if (!isNonEmptyString(body.slug)) {
    return { error: 'O slug é obrigatório' }
  }
  if (!isNonNegativeNumber(body.price)) {
    return { error: 'O preço é obrigatório e deve ser um número maior ou igual a zero' }
  }
  if (!isNonNegativeNumber(body.price_with_discount)) {
    return { error: 'O preço com desconto é obrigatório e deve ser um número maior ou igual a zero' }
  }
  if (body.enabled !== undefined && typeof body.enabled !== 'boolean') {
    return { error: 'enabled deve ser true ou false' }
  }
  if (body.stock !== undefined && !(Number.isInteger(body.stock) && body.stock >= 0)) {
    return { error: 'stock deve ser um número inteiro maior ou igual a zero' }
  }
  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== 'string' || body.description.length > 255) {
      return { error: 'A descrição deve ser um texto de até 255 caracteres' }
    }
  }

  // category_ids: lista de números inteiros positivos, sem repetição
  const categoryIds = body.category_ids === undefined ? [] : body.category_ids
  if (!Array.isArray(categoryIds) || !categoryIds.every((id) => Number.isInteger(id) && id > 0)) {
    return { error: 'category_ids deve ser uma lista de ids de categorias' }
  }

  // images: lista de { type, content } com o conteúdo em base64
  const images = body.images === undefined ? [] : body.images
  if (!Array.isArray(images)) {
    return { error: 'images deve ser uma lista' }
  }
  for (const image of images) {
    const imageError = validateImage(image)
    if (imageError) {
      return { error: imageError }
    }
  }

  // options: lista de opções do produto
  const rawOptions = body.options === undefined ? [] : body.options
  if (!Array.isArray(rawOptions)) {
    return { error: 'options deve ser uma lista' }
  }
  const options = []
  for (const rawOption of rawOptions) {
    const normalized = normalizeOption(rawOption)
    if (normalized.error) {
      return { error: normalized.error }
    }
    options.push(normalized.data)
  }

  // Só envia ao banco os campos que vieram, para os valores padrão funcionarem
  const data = {
    name: body.name.trim(),
    slug: body.slug.trim(),
    price: body.price,
    price_with_discount: body.price_with_discount,
  }
  if (body.enabled !== undefined) data.enabled = body.enabled
  if (body.stock !== undefined) data.stock = body.stock
  if (body.description !== undefined) data.description = body.description

  return { data, categoryIds: [...new Set(categoryIds)], images, options }
}

// Monta o produto no formato de resposta da API
function formatProduct(product, baseUrl) {
  const byId = (a, b) => a.id - b.id

  return {
    id: product.id,
    enabled: product.enabled,
    name: product.name,
    slug: product.slug,
    stock: product.stock,
    description: product.description,
    price: product.price,
    price_with_discount: product.price_with_discount,
    category_ids: (product.categories || []).map((category) => category.id).sort((a, b) => a - b),
    images: (product.images || [])
      .slice()
      .sort(byId)
      .map((image) => ({ id: image.id, content: imageUrl(baseUrl, image.path) })),
    options: (product.options || [])
      .slice()
      .sort(byId)
      .map((option) => ({
        id: option.id,
        title: option.title,
        shape: option.shape,
        radius: option.radius,
        type: option.type,
        values: option.values.split(','),
      })),
  }
}

module.exports = { normalizeOption, validateProduct, formatProduct }