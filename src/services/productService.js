const { validateImage, imageUrl } = require('./imageService')

const SHAPES = ['square', 'circle']
const OPTION_TYPES = ['text', 'color']

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== ''
}

function isNonNegativeNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0
}

// Imagem que já está salva: o front-end devolve a própria URL em "content"
function isUrl(content) {
  return typeof content === 'string' && /^https?:\/\//i.test(content)
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

// Valida os campos principais do produto (usado no cadastro e na atualização).
// Devolve a mensagem de erro ou null.
function validateProductFields(body) {
  if (!isNonEmptyString(body.name)) {
    return 'O nome é obrigatório'
  }
  if (!isNonEmptyString(body.slug)) {
    return 'O slug é obrigatório'
  }
  if (!isNonNegativeNumber(body.price)) {
    return 'O preço é obrigatório e deve ser um número maior ou igual a zero'
  }
  if (!isNonNegativeNumber(body.price_with_discount)) {
    return 'O preço com desconto é obrigatório e deve ser um número maior ou igual a zero'
  }
  if (body.enabled !== undefined && typeof body.enabled !== 'boolean') {
    return 'enabled deve ser true ou false'
  }
  if (body.stock !== undefined && !(Number.isInteger(body.stock) && body.stock >= 0)) {
    return 'stock deve ser um número inteiro maior ou igual a zero'
  }
  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== 'string' || body.description.length > 255) {
      return 'A descrição deve ser um texto de até 255 caracteres'
    }
  }
  return null
}

// Monta o objeto que vai para o banco, só com os campos que vieram
// (assim os valores padrão do banco continuam funcionando)
function buildProductData(body) {
  const data = {
    name: body.name.trim(),
    slug: body.slug.trim(),
    price: body.price,
    price_with_discount: body.price_with_discount,
  }
  if (body.enabled !== undefined) data.enabled = body.enabled
  if (body.stock !== undefined) data.stock = body.stock
  if (body.description !== undefined) data.description = body.description
  return data
}

// Valida category_ids: lista de números inteiros positivos (sem repetição)
function parseCategoryIds(value) {
  if (!Array.isArray(value) || !value.every(isPositiveInteger)) {
    return { error: 'category_ids deve ser uma lista de ids de categorias' }
  }
  return { categoryIds: [...new Set(value)] }
}

// Valida os dados de cadastro do produto.
// Devolve { error } ou { data, categoryIds, images, options }.
function validateProduct(body) {
  const fieldsError = validateProductFields(body)
  if (fieldsError) {
    return { error: fieldsError }
  }

  const categories = parseCategoryIds(body.category_ids === undefined ? [] : body.category_ids)
  if (categories.error) {
    return { error: categories.error }
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

  return { data: buildProductData(body), categoryIds: categories.categoryIds, images, options }
}

// Valida os dados de atualização do produto.
// "product" é o produto atual (com images e options carregados), usado para
// conferir se os ids de imagens e opções pertencem a ele.
// Devolve { error } ou { data, categoryIds, imageActions, optionActions }.
function validateProductUpdate(body, product) {
  const fieldsError = validateProductFields(body)
  if (fieldsError) {
    return { error: fieldsError }
  }

  // category_ids é opcional: se não vier, as categorias continuam como estão
  let categoryIds
  if (body.category_ids !== undefined) {
    const categories = parseCategoryIds(body.category_ids)
    if (categories.error) {
      return { error: categories.error }
    }
    categoryIds = categories.categoryIds
  }

  const currentImages = new Map(product.images.map((image) => [image.id, image]))
  const currentOptions = new Map(product.options.map((option) => [option.id, option]))

  // Imagens: sem id = nova; com id e deleted = apagar; com id e base64 = trocar
  const rawImages = body.images === undefined ? [] : body.images
  if (!Array.isArray(rawImages)) {
    return { error: 'images deve ser uma lista' }
  }
  const imageActions = []
  const seenImages = new Set()
  for (const image of rawImages) {
    if (!image || typeof image !== 'object') {
      return { error: 'Imagem inválida' }
    }

    if (image.id === undefined) {
      const imageError = validateImage(image)
      if (imageError) {
        return { error: imageError }
      }
      imageActions.push({ action: 'create', image })
      continue
    }

    if (!currentImages.has(image.id) || seenImages.has(image.id)) {
      return { error: `A imagem ${image.id} não existe neste produto` }
    }
    seenImages.add(image.id)

    if (image.deleted === true) {
      imageActions.push({ action: 'delete', id: image.id })
    } else if (image.content !== undefined && !isUrl(image.content)) {
      const imageError = validateImage(image, false)
      if (imageError) {
        return { error: imageError }
      }
      imageActions.push({ action: 'replace', id: image.id, image })
    }
    // Se o content for uma URL, a imagem já existe e nada muda
  }

  // Opções: sem id = nova; com id e deleted = apagar; com id = atualizar os campos enviados
  const rawOptions = body.options === undefined ? [] : body.options
  if (!Array.isArray(rawOptions)) {
    return { error: 'options deve ser uma lista' }
  }
  const optionActions = []
  const seenOptions = new Set()
  for (const option of rawOptions) {
    if (!option || typeof option !== 'object') {
      return { error: 'Opção inválida' }
    }

    if (option.id === undefined) {
      const normalized = normalizeOption(option)
      if (normalized.error) {
        return { error: normalized.error }
      }
      optionActions.push({ action: 'create', data: normalized.data })
      continue
    }

    if (!currentOptions.has(option.id) || seenOptions.has(option.id)) {
      return { error: `A opção ${option.id} não existe neste produto` }
    }
    seenOptions.add(option.id)

    if (option.deleted === true) {
      optionActions.push({ action: 'delete', id: option.id })
    } else {
      const normalized = normalizeOption(option, true)
      if (normalized.error) {
        return { error: normalized.error }
      }
      optionActions.push({ action: 'update', id: option.id, data: normalized.data })
    }
  }

  return { data: buildProductData(body), categoryIds, imageActions, optionActions }
}

// Lê e valida os filtros da busca de produtos (match, category_ids, price-range, option[id])
function parseSearchFilters(query) {
  const filters = { optionFilters: [] }

  if (query.match !== undefined) {
    if (!isNonEmptyString(query.match)) {
      return { error: 'O parâmetro match é inválido' }
    }
    filters.match = query.match.trim()
  }

  if (query.category_ids !== undefined) {
    const ids = String(query.category_ids).split(',').map((id) => id.trim())
    if (!ids.every((id) => /^\d+$/.test(id) && Number(id) > 0)) {
      return { error: 'category_ids deve ser uma lista de ids separados por vírgula' }
    }
    filters.categoryIds = ids.map(Number)
  }

  const range = query['price-range']
  if (range !== undefined) {
    const found = /^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/.exec(String(range))
    if (!found || Number(found[1]) > Number(found[2])) {
      return { error: 'price-range deve ter o formato 100-200' }
    }
    filters.priceRange = [Number(found[1]), Number(found[2])]
  }

  // option[45]=GG,PP. No Express 5 a chave chega como "option[45]";
  // no Express 4 chegaria como um objeto em query.option.
  const entries = []
  for (const [key, value] of Object.entries(query)) {
    if (!key.startsWith('option[')) {
      continue
    }
    const found = /^option\[(\d+)\]$/.exec(key)
    if (!found) {
      return { error: 'O filtro deve ter o formato option[id]=valor1,valor2' }
    }
    entries.push([found[1], value])
  }
  if (query.option && typeof query.option === 'object' && !Array.isArray(query.option)) {
    entries.push(...Object.entries(query.option))
  }
  for (const [id, value] of entries) {
    const values = String(value).split(',').map((item) => item.trim()).filter(Boolean)
    if (!/^\d+$/.test(String(id)) || values.length === 0) {
      return { error: 'O filtro option[id] precisa de um id e de pelo menos um valor' }
    }
    filters.optionFilters.push({ optionId: Number(id), values })
  }

  return { filters }
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

module.exports = {
  normalizeOption,
  validateProduct,
  validateProductUpdate,
  parseSearchFilters,
  formatProduct,
}