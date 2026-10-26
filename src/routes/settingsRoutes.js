const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Retorna configurações públicas da loja (nome, WhatsApp configurável, avisos)
router.get('/', async (req, res, next) => {
  try {
    const rows = await db.all('SELECT key, value FROM site_settings');
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });

    res.json({
      success: true,
      data: {
        store_name: process.env.STORE_NAME || settings.store_name || 'IMPÉRIO STREETWEAR',
        whatsapp_number: process.env.WHATSAPP_NUMBER || '5511999999999',
        whatsapp_message: process.env.WHATSAPP_DEFAULT_MESSAGE || 'Olá! Gostaria de mais informações sobre os produtos da Império Streetwear.',
        announcement_bar: settings.announcement_bar || 'FRETE GRÁTIS PARA TODO O BRASIL ACIMA DE R$ 299 • 5% OFF NO PIX',
        free_shipping_threshold: parseFloat(settings.free_shipping_threshold || 299.00)
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
