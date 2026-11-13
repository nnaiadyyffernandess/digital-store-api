const path = require('path')
const { Op, Sequelize } = require('sequelize')
const {
  sequelize,
  Product,
  Category,
  ProductImage,
  ProductOption,
  ProductCategory,
} = require('../models')
const imageService = require('../services/imageService')
const productService = require('../services/productService')
const { parsePagination, parseFields } = require('../services/queryParams')

// Campos que podem ser pedidos em ?fields=
const PRODUCT_FIELDS = [
  'id',
  'enabled',
  'name',
  'slug',
  'stock',
  'description',
  'price',
  'price_with_discount',
  'category_ids',
  'images',
  'options',
]

// Tudo o que acompanha um produto na resposta: imagens, opções e ids das categorias
const INCLUDE_ALL = [
  { model: ProductImage, as: 'images' },
  { model: ProductOption, as: 'options' },
  { model: Category, as: 'categories', attributes: ['id'], through: { attributes: [] } },
]

// Endereço base da API (usado para montar a URL das imagens)
function getBaseUrl(req) {
  return `${req.protocol}://${req.get('host')}`
}

// Confere se todas as categorias informadas existem
async function allCategoriesExist(categoryIds) {
  if (categoryIds.length === 0) {
    return true
  }
  const found = await Category.count({ where: { id: categoryIds } })
  return found === categoryIds.length
}

// GET /v1/product/search
async function searchProducts(req, res) {
  const pagination = parsePagination(req.query)
  if (pagination.error) {
    return res.status(400).json({ message: pagination.error })
  }

  const fields = parseFields(req.query, PRODUCT_FIELDS)
  if (fields.error) {
    return res.status(400).json({ message: fields.error })
  }

  const parsed = productService.parseSearchFilters(req.query)
  if (parsed.error) {
    return res.status(400).json({ message: parsed.error })
  }

  const { match, categoryIds, priceRange, optionFilters } = parsed.filters

  // Filtros simples, direto na tabela de produtos
  const where = {}

  if (match) {
    where[Op.or] = [
      { name: { [Op.like]: `%${match}%` } },
      { description: { [Op.like]: `%${match}%` } },
    ]
  }

  if (priceRange) {
    where.price = { [Op.between]: priceRange }
  }

  // Filtros por categoria e por opção: descobre quais produtos combinam
  // e vai restringindo a lista de ids permitidos
  let allowedIds = null
  const restrictTo = (ids) => {
    allowedIds = allowedIds === null ? ids : allowedIds.filter((id) => ids.includes(id))
  }

  if (categoryIds) {
    const links = await ProductCategory.findAll({
      where: { category_id: categoryIds },
      attributes: ['product_id'],
      raw: true,
    })
    restrictTo([...new Set(links.map((link) => link.product_id))])
  }

  for (const { optionId, values } of optionFilters) {
    // FIND_IN_SET procura cada valor dentro da lista guardada (ex.: "PP,M,GG")
    const matching = await ProductOption.findAll({
      where: {
        id: optionId,
        [Op.or]: values.map((value) =>
          Sequelize.where(
            Sequelize.fn('FIND_IN_SET', value, Sequelize.col('values')),
            Op.gt,
            0
          )
        ),
      },
      attributes: ['product_id'],
      raw: true,
    })
    restrictTo(matching.map((option) => option.product_id))
  }

  const empty = {
    data: [],
    total: 0,
    limit: pagination.limit,
    page: pagination.page,
  }

  if (allowedIds !== null) {
    if (allowedIds.length === 0) {
      return res.status(200).json(empty)
    }
    where.id = allowedIds
  }

  // Busca só a página pedida de produtos (o total vem do mesmo filtro)
  const options = { where, order: [['id', 'ASC']] }
  if (pagination.limit !== -1) {
    options.limit = pagination.limit
    options.offset = pagination.offset
  }

  const { rows, count } = await Product.findAndCountAll(options)

  if (rows.length === 0) {
    return res.status(200).json({ ...empty, total: count })
  }

  // Carrega imagens, opções e categorias só dos produtos da página
  const ids = rows.map((product) => product.id)
  const [images, productOptions, links] = await Promise.all([
    ProductImage.findAll({ where: { product_id: ids } }),
    ProductOption.findAll({ where: { product_id: ids } }),
    ProductCategory.findAll({ where: { product_id: ids } }),
  ])

  const baseUrl = getBaseUrl(req)

  const data = rows.map((product) => {
    const formatted = productService.formatProduct(
      {
        ...product.toJSON(),
        images: images.filter((image) => image.product_id === product.id),
        options: productOptions.filter((option) => option.product_id === product.id),
        categories: links
          .filter((link) => link.product_id === product.id)
          .map((link) => ({ id: link.category_id })),
      },
      baseUrl
    )

    // Se vier ?fields=, devolve só os campos pedidos
    if (!fields.attributes) {
      return formatted
    }
    return Object.fromEntries(fields.attributes.map((field) => [field, formatted[field]]))
  })

  return res.status(200).json({
    data,
    total: count,
    limit: pagination.limit,
    page: pagination.page,
  })
}

// GET /v1/product/:id
async function getProductById(req, res) {
  const product = await Product.findByPk(req.params.id, { include: INCLUDE_ALL })

  if (!product) {
    return res.status(404).json({ message: 'Produto não encontrado' })
  }

  return res.status(200).json(productService.formatProduct(product, getBaseUrl(req)))
}

// POST /v1/product (protegido)
async function createProduct(req, res) {
  const validation = productService.validateProduct(req.body || {})

  if (validation.error) {
    return res.status(400).json({ message: validation.error })
  }

  const { data, categoryIds, images, options } = validation

  if (!(await allCategoriesExist(categoryIds))) {
    return res.status(400).json({ message: 'Uma ou mais categorias não existem' })
  }

  const savedFiles = []

  try {
    // As imagens (base64) são salvas no disco antes de gravar no banco
    for (const image of images) {
      savedFiles.push(await imageService.saveBase64Image(image))
    }

    // Transação: ou grava tudo (produto, categorias, imagens, opções) ou não grava nada
    const productId = await sequelize.transaction(async (transaction) => {
      const product = await Product.create(data, { transaction })

      await product.setCategories(categoryIds, { transaction })

      await ProductImage.bulkCreate(
        savedFiles.map((filename) => ({ product_id: product.id, enabled: true, path: filename })),
        { transaction }
      )

      await ProductOption.bulkCreate(
        options.map((option) => ({ ...option, product_id: product.id })),
        { transaction }
      )

      return product.id
    })

    const created = await Product.findByPk(productId, { include: INCLUDE_ALL })

    return res.status(201).json(productService.formatProduct(created, getBaseUrl(req)))
  } catch (error) {
    // Se algo der errado, apaga as imagens que já tinham sido salvas no disco
    await Promise.all(savedFiles.map((file) => imageService.deleteImageFile(file)))
    throw error
  }
}

// PUT /v1/product/:id (protegido)
async function updateProduct(req, res) {
  const product = await Product.findByPk(req.params.id, { include: INCLUDE_ALL })

  if (!product) {
    return res.status(404).json({ message: 'Produto não encontrado' })
  }

  const validation = productService.validateProductUpdate(req.body || {}, product)

  if (validation.error) {
    return res.status(400).json({ message: validation.error })
  }

  const { data, categoryIds, imageActions, optionActions } = validation

  if (categoryIds && !(await allCategoriesExist(categoryIds))) {
    return res.status(400).json({ message: 'Uma ou mais categorias não existem' })
  }

  const newFiles = [] // arquivos criados agora (apagados se algo der errado)
  const oldFiles = [] // arquivos antigos (apagados só depois que tudo der certo)

  try {
    // 1) Salva no disco as imagens novas e as trocas
    const prepared = []

    for (const item of imageActions) {
      if (item.action === 'create') {
        const filename = await imageService.saveBase64Image(item.image)
        newFiles.push(filename)
        prepared.push({ ...item, filename })
      } else if (item.action === 'replace') {
        const current = product.images.find((image) => image.id === item.id)
        // Se o tipo não vier, mantém a extensão da imagem que está sendo trocada
        const extension = path.extname(current.path).slice(1) || 'png'
        const filename = await imageService.saveBase64Image(item.image, extension)
        newFiles.push(filename)
        oldFiles.push(current.path)
        prepared.push({ ...item, filename })
      } else {
        const current = product.images.find((image) => image.id === item.id)
        oldFiles.push(current.path)
        prepared.push(item)
      }
    }

    // 2) Atualiza o banco numa transação
    await sequelize.transaction(async (transaction) => {
      await product.update(data, { transaction })

      if (categoryIds) {
        await product.setCategories(categoryIds, { transaction })
      }

      for (const item of prepared) {
        const where = { id: item.id, product_id: product.id }

        if (item.action === 'create') {
          await ProductImage.create(
            { product_id: product.id, enabled: true, path: item.filename },
            { transaction }
          )
        } else if (item.action === 'replace') {
          await ProductImage.update({ path: item.filename }, { where, transaction })
        } else {
          await ProductImage.destroy({ where, transaction })
        }
      }

      for (const item of optionActions) {
        const where = { id: item.id, product_id: product.id }

        if (item.action === 'create') {
          await ProductOption.create({ ...item.data, product_id: product.id }, { transaction })
        } else if (item.action === 'update') {
          if (Object.keys(item.data).length > 0) {
            await ProductOption.update(item.data, { where, transaction })
          }
        } else {
          await ProductOption.destroy({ where, transaction })
        }
      }
    })
  } catch (error) {
    await Promise.all(newFiles.map((file) => imageService.deleteImageFile(file)))
    throw error
  }

  // 3) Tudo certo: agora pode apagar do disco as imagens antigas
  await Promise.all(oldFiles.map((file) => imageService.deleteImageFile(file)))

  return res.status(204).send()
}

// DELETE /v1/product/:id (protegido)
async function deleteProduct(req, res) {
  const product = await Product.findByPk(req.params.id, {
    include: [{ model: ProductImage, as: 'images' }],
  })

  if (!product) {
    return res.status(404).json({ message: 'Produto não encontrado' })
  }

  const files = product.images.map((image) => image.path)

  // O banco apaga sozinho as imagens, as opções e as ligações com categorias (CASCADE)
  await product.destroy()

  // Depois apaga os arquivos de imagem do disco
  await Promise.all(files.map((file) => imageService.deleteImageFile(file)))

  return res.status(204).send()
}

module.exports = {
  searchProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
}