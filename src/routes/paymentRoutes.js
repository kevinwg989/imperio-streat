const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Webhook para notificações do Mercado Pago
router.post('/webhook', paymentController.handleWebhook);

// Status da configuração do Mercado Pago (para frontend saber se chave pública está ativa)
router.get('/config', (req, res) => {
  res.json({
    success: true,
    mercado_pago_public_key: process.env.MERCADO_PAGO_PUBLIC_KEY || null,
    is_live_mode: Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN && process.env.MERCADO_PAGO_ACCESS_TOKEN.trim().length > 10)
  });
});

module.exports = router;
