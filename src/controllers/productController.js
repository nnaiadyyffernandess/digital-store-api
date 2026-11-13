const { sequelize, Product, Category, ProductImage, ProductOption } = require('../models')
const imageService = require('../services/imageService')
const productService = require('../services/productService')

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

  // Todas as categorias informadas precisam existir
  if (categoryIds.length > 0) {
    const found = await Category.count({ where: { id: categoryIds } })
    if (found !== categoryIds.length) {
      return res.status(400).json({ message: 'Uma ou mais categorias não existem' })
    }
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
        savedFiles.map((path) => ({ product_id: product.id, enabled: true, path })),
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

module.exports = { getProductById, createProduct, deleteProduct }