const { Router } = require('express')
const auth = require('../middleware/auth')
const asyncHandler = require('../middleware/asyncHandler')
const userController = require('../controllers/userController')
const authController = require('../controllers/authController')

const router = Router()

// Rotas públicas
router.post('/token', asyncHandler(authController.generateToken))
router.post('/', asyncHandler(userController.createUser))
router.get('/:id', asyncHandler(userController.getUserById))

// Rotas protegidas (exigem token)
router.put('/:id', auth, asyncHandler(userController.updateUser))
router.delete('/:id', auth, asyncHandler(userController.deleteUser))

module.exports = router