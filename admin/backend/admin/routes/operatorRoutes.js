const express = require('express');
const router = express.Router();
const operatorController = require('../controllers/operatorController');
const { authenticateOperator, isAdmin } = require('../middleware/authMiddleware');

// Public routes
router.post('/login', operatorController.operatorLogin);

// Protected routes (requires authentication)
router.get('/profile', authenticateOperator, operatorController.getOperatorProfile);
router.get('/dashboard/stats', authenticateOperator, operatorController.getDashboardStats);

// Admin only routes
router.get('/operators', authenticateOperator, isAdmin, operatorController.getAllOperators);
router.post('/operators', authenticateOperator, isAdmin, operatorController.createOperator);

module.exports = router;
