const rateLimit = require('express-rate-limit');

// Limitador estrito para tentativas de login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máx 5 tentativas
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Muitas tentativas de login a partir deste IP. Aguarde 15 minutos antes de tentar novamente.'
  }
});

// Limitador para criação de pedidos / checkout (prevenção de bots e fraudes)
const checkoutLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Limite de requisições de checkout excedido temporariamente. Aguarde alguns minutos.'
  }
});

// Limitador geral para APIs públicas
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Muitas requisições. Por favor, reduza a frequência de requisições.'
  }
});

module.exports = {
  loginLimiter,
  checkoutLimiter,
  apiLimiter
};
