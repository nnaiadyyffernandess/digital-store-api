const { Router } = require('express')
const auth = require('../middleware/auth')
const asyncHandler = require('../middleware/asyncHandler')
const productController = require('../controllers/productController')

const router = Router()

router.get('/:id', asyncHandler(productController.getProductById))

// Rotas protegidas (exigem token)
router.post('/', auth, asyncHandler(productController.createProduct))
router.delete('/:id', auth, asyncHandler(productController.deleteProduct))

module.exports = router