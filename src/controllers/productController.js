const db = require('../config/db');

async function getCategories(req, res, next) {
  try {
    const categories = await db.all(`
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
      GROUP BY c.id
      ORDER BY c.sort_order ASC, c.name ASC
    `);

    res.json({
      success: true,
      data: categories
    });
  } catch (err) {
    next(err);
  }
}

async function getProducts(req, res, next) {
  try {
    const {
      category,
      search,
      featured,
      is_new,
      sort = 'newest',
      min_price,
      max_price,
      limit = 20,
      page = 1
    } = req.query;

    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const offset = (parsedPage - 1) * parsedLimit;

    let whereClauses = ['p.is_active = 1'];
    let params = [];

    if (category) {
      whereClauses.push('(c.slug = ? OR p.category_id = ?)');
      params.push(category, category);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      whereClauses.push('(p.name LIKE ? OR p.description LIKE ? OR c.name LIKE ?)');
      params.push(term, term, term);
    }

    if (featured === '1' || featured === 'true') {
      whereClauses.push('p.is_featured = 1');
    }

    if (is_new === '1' || is_new === 'true') {
      whereClauses.push('p.is_new = 1');
    }

    if (min_price && !isNaN(min_price)) {
      whereClauses.push('p.price >= ?');
      params.push(parseFloat(min_price));
    }

    if (max_price && !isNaN(max_price)) {
      whereClauses.push('p.price <= ?');
      params.push(parseFloat(max_price));
    }

    let orderBy = 'p.created_at DESC';
    if (sort === 'price_asc') orderBy = 'p.price ASC';
    else if (sort === 'price_desc') orderBy = 'p.price DESC';
    else if (sort === 'name_asc') orderBy = 'p.name ASC';
    else if (sort === 'featured') orderBy = 'p.is_featured DESC, p.created_at DESC';

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Contagem total
    const countRow = await db.get(
      `SELECT COUNT(DISTINCT p.id) as total
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       ${whereSql}`,
      params
    );

    const total = countRow ? countRow.total : 0;

    // Busca de produtos com variantes agregadas
    const products = await db.all(
      `SELECT 
        p.id, p.name, p.slug, p.description, p.price, p.compare_at_price,
        p.images, p.is_featured, p.is_new, p.is_demo, p.created_at,
        c.name as category_name, c.slug as category_slug,
        COALESCE(SUM(v.stock_quantity), 0) as total_stock,
        COUNT(v.id) as variant_count
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN product_variants v ON v.product_id = p.id
       ${whereSql}
       GROUP BY p.id
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, parsedLimit, offset]
    );

    const formatted = products.map(prod => {
      let images = [];
      try {
        images = JSON.parse(prod.images);
      } catch (e) {
        images = [prod.images];
      }
      return {
        ...prod,
        images,
        primary_image: images[0] || '/assets/images/placeholder.svg',
        in_stock: prod.total_stock > 0
      };
    });

    res.json({
      success: true,
      data: formatted,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(total / parsedLimit) || 1
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getProductBySlug(req, res, next) {
  try {
    const { slug } = req.params;

    const product = await db.get(
      `SELECT 
        p.*, 
        c.name as category_name, 
        c.slug as category_slug
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE (p.slug = ? OR p.id = ?) AND p.is_active = 1`,
      [slug, slug]
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Produto não encontrado ou indisponível.'
      });
    }

    // Variantes do produto
    const variants = await db.all(
      `SELECT id, size, color, color_hex, sku, stock_quantity 
       FROM product_variants 
       WHERE product_id = ? 
       ORDER BY id ASC`,
      [product.id]
    );

    let images = [];
    try {
      images = JSON.parse(product.images);
    } catch (e) {
      images = [product.images];
    }

    const totalStock = variants.reduce((acc, v) => acc + (v.stock_quantity || 0), 0);

    // Produtos relacionados da mesma categoria
    const related = await db.all(
      `SELECT p.id, p.name, p.slug, p.price, p.compare_at_price, p.images, p.is_demo
       FROM products p
       WHERE p.category_id = ? AND p.id != ? AND p.is_active = 1
       LIMIT 4`,
      [product.category_id, product.id]
    );

    const formattedRelated = related.map(r => {
      let relImages = [];
      try { relImages = JSON.parse(r.images); } catch (e) { relImages = [r.images]; }
      return {
        ...r,
        images: relImages,
        primary_image: relImages[0] || '/assets/images/placeholder.svg'
      };
    });

    res.json({
      success: true,
      data: {
        ...product,
        images,
        primary_image: images[0] || '/assets/images/placeholder.svg',
        variants,
        total_stock: totalStock,
        in_stock: totalStock > 0,
        related: formattedRelated
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCategories,
  getProducts,
  getProductBySlug
};
