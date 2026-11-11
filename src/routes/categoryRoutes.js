const { Router } = require('express')
const auth = require('../middleware/auth')
const asyncHandler = require('../middleware/asyncHandler')
const categoryController = require('../controllers/categoryController')

const router = Router()

// A rota /search precisa vir antes de /:id, senão "search" seria lido como um id
router.get('/search', asyncHandler(categoryController.searchCategories))
router.get('/:id', asyncHandler(categoryController.getCategoryById))

// Rotas protegidas (exigem token)
router.post('/', auth, asyncHandler(categoryController.createCategory))
router.put('/:id', auth, asyncHandler(categoryController.updateCategory))
router.delete('/:id', auth, asyncHandler(categoryController.deleteCategory))

module.exports = router