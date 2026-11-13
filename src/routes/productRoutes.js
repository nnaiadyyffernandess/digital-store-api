const { Router } = require('express')
const auth = require('../middleware/auth')
const asyncHandler = require('../middleware/asyncHandler')
const productController = require('../controllers/productController')

const router = Router()

// A rota /search precisa vir antes de /:id, senão "search" seria lido como um id
router.get('/search', asyncHandler(productController.searchProducts))
router.get('/:id', asyncHandler(productController.getProductById))

// Rotas protegidas (exigem token)
router.post('/', auth, asyncHandler(productController.createProduct))
router.put('/:id', auth, asyncHandler(productController.updateProduct))
router.delete('/:id', auth, asyncHandler(productController.deleteProduct))

module.exports = router