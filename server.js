const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const { apiLimiter } = require('./src/middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');

const productRoutes = require('./src/routes/productRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const settingsRoutes = require('./src/routes/settingsRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurações de Segurança
app.use(
  helmet({
    contentSecurityPolicy: false, // Permite fontes do Google, Unsplash e scripts locais
    crossOriginEmbedderPolicy: false
  })
);

app.use(cors({
  origin: true,
  credentials: true
}));

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, 'public')));

// Rotas de API
app.use('/api', apiLimiter);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settings', settingsRoutes);

// Rotas de Páginas Amigáveis
app.get('/catalogo', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/catalogo.html'));
});

app.get('/produto/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/produto.html'));
});

app.get('/carrinho', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/carrinho.html'));
});

app.get('/checkout', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/checkout.html'));
});

app.get('/pedido/:code', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pedido-confirmado.html'));
});

app.get('/sobre', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/sobre.html'));
});

app.get('/contato', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/contato.html'));
});

app.get('/politicas', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/politicas.html'));
});

// Rotas Amigáveis do Painel Admin
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/index.html'));
});

app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/login.html'));
});

app.get('/admin/produtos', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/produtos.html'));
});

app.get('/admin/pedidos', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/pedidos.html'));
});

// Tratamento de 404 e Erros
app.use(notFoundHandler);
app.use(errorHandler);

// Inicialização
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🔥 IMPÉRIO STREETWEAR - Servidor Ativo com Sucesso!`);
    console.log(`🌐 Loja Virtual:       http://localhost:${PORT}`);
    console.log(`⚙️  Painel Admin:       http://localhost:${PORT}/admin`);
    console.log(`📱 Contato WhatsApp:   ${process.env.WHATSAPP_NUMBER || 'Configurável via .env'}`);
    console.log(`======================================================\n`);
  });
}

module.exports = app;
