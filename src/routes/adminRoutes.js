const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateAdmin } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');

// Autenticação
router.post('/login', loginLimiter, adminController.login);
router.post('/logout', adminController.logout);

// Rotas protegidas por autenticação
router.use(authenticateAdmin);

router.get('/me', adminController.getMe);
router.post('/change-password', adminController.changePassword);

// Métricas e Painel
router.get('/dashboard-stats', adminController.getDashboardStats);

// Gestão de Pedidos
router.get('/orders', adminController.listOrders);
router.get('/orders/:id', adminController.getOrderDetails);
router.patch('/orders/:id/status', adminController.updateOrderStatus);

// Gestão de Produtos e Estoque
router.get('/products', adminController.listProductsAdmin);
router.post('/products', adminController.createProduct);
router.put('/products/:id', adminController.updateProduct);
router.patch('/products/:id/toggle-demo', adminController.toggleProductDemo);
router.patch('/products/:id/toggle-active', adminController.toggleProductActive);
router.patch('/variants/:variantId/stock', adminController.updateVariantStock);

module.exports = router;
