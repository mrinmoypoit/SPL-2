const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateOperator } = require('../middleware/authMiddleware');

// All routes require operator authentication
router.use(authenticateOperator);

// Product CRUD routes
router.get('/products', productController.getAllProducts);
router.get('/products/:productId', productController.getProduct);
router.post('/products', productController.createProduct);
router.put('/products/:productId', productController.updateProduct);
router.delete('/products/:productId', productController.deleteProduct);

// Draft and publish routes
router.post('/drafts/:draftId/publish', productController.publishDraft);

// Audit log routes
router.get('/products/:productId/logs', productController.getChangeLogs);

module.exports = router;
