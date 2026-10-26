const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// Listar categorias
router.get('/categories', productController.getCategories);

// Listar produtos com busca e filtros
router.get('/', productController.getProducts);

// Obter detalhes de um produto por slug ou ID
router.get('/:slug', productController.getProductBySlug);

module.exports = router;
