const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { checkoutLimiter } = require('../middleware/rateLimiter');

// Criar novo pedido (com limitador anti-fraude)
router.post('/', checkoutLimiter, orderController.createOrder);

// Rastrear/Consultar status de pedido pelo código (ex: IMP-123456-789)
router.get('/:code', orderController.getOrderByCode);

// Simular confirmação de pagamento Pix no ambiente de sandbox local
router.post('/simulate-sandbox-pix', orderController.simulateSandboxPayment);

module.exports = router;
