const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Informe e-mail e senha para autenticação.'
      });
    }

    const admin = await db.get('SELECT * FROM admins WHERE email = ?', [email.trim().toLowerCase()]);

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'Credenciais inválidas. Verifique o e-mail ou a senha.'
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Credenciais inválidas. Verifique o e-mail ou a senha.'
      });
    }

    // Gerar JWT com validade de 24h
    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    await db.run('UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [admin.id]);

    // Cookie seguro httpOnly
    res.cookie('imperio_admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      message: 'Login realizado com sucesso.',
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res) {
  res.clearCookie('imperio_admin_token');
  res.json({ success: true, message: 'Sessão encerrada com sucesso.' });
}

async function getMe(req, res) {
  res.json({
    success: true,
    data: req.admin
  });
}

async function changePassword(req, res, next) {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password || new_password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'A nova senha deve possuir no mínimo 8 caracteres.'
      });
    }

    const admin = await db.get('SELECT * FROM admins WHERE id = ?', [req.admin.id]);
    const isMatch = await bcrypt.compare(current_password, admin.password_hash);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: 'Senha atual incorreta.'
      });
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await db.run('UPDATE admins SET password_hash = ? WHERE id = ?', [newHash, req.admin.id]);

    res.json({
      success: true,
      message: 'Senha administrativa atualizada com sucesso.'
    });
  } catch (err) {
    next(err);
  }
}

async function getDashboardStats(req, res, next) {
  try {
    // Total de faturamento em pedidos pagos
    const revenueRow = await db.get(`
      SELECT COALESCE(SUM(total), 0) as total_revenue
      FROM orders
      WHERE status IN ('pago', 'em_separacao', 'enviado', 'entregue')
    `);

    // Total de pedidos
    const totalOrdersRow = await db.get('SELECT COUNT(id) as total FROM orders');

    // Pedidos pendentes de envio/pagamento
    const pendingOrdersRow = await db.get(`
      SELECT COUNT(id) as total FROM orders WHERE status IN ('pendente', 'pago', 'em_separacao')
    `);

    // Total de produtos e produtos de demonstração
    const productsStats = await db.get(`
      SELECT 
        COUNT(id) as total_products,
        SUM(CASE WHEN is_demo = 1 THEN 1 ELSE 0 END) as demo_products,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_products
      FROM products
    `);

    // Alerta de estoque baixo (variantes com estoque <= 3)
    const lowStockVariants = await db.all(`
      SELECT 
        v.id, v.sku, v.size, v.color, v.stock_quantity,
        p.name as product_name, p.slug as product_slug
      FROM product_variants v
      JOIN products p ON p.id = v.product_id
      WHERE v.stock_quantity <= 3 AND p.is_active = 1
      ORDER BY v.stock_quantity ASC
      LIMIT 10
    `);

    // Pedidos recentes
    const recentOrders = await db.all(`
      SELECT id, order_code, customer_name, customer_email, total, status, payment_method, created_at
      FROM orders
      ORDER BY created_at DESC
      LIMIT 6
    `);

    res.json({
      success: true,
      data: {
        revenue: revenueRow.total_revenue,
        total_orders: totalOrdersRow.total,
        pending_orders: pendingOrdersRow.total,
        total_products: productsStats.total_products || 0,
        demo_products: productsStats.demo_products || 0,
        active_products: productsStats.active_products || 0,
        low_stock_variants: lowStockVariants,
        recent_orders: recentOrders
      }
    });
  } catch (err) {
    next(err);
  }
}

async function listOrders(req, res, next) {
  try {
    const { status, search, limit = 50, page = 1 } = req.query;
    const parsedLimit = Math.min(parseInt(limit, 10) || 50, 100);
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const offset = (parsedPage - 1) * parsedLimit;

    let where = [];
    let params = [];

    if (status && status !== 'todos') {
      where.push('status = ?');
      params.push(status);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      where.push('(order_code LIKE ? OR customer_name LIKE ? OR customer_email LIKE ? OR customer_cpf LIKE ?)');
      params.push(term, term, term, term);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const countRow = await db.get(`SELECT COUNT(id) as total FROM orders ${whereSql}`, params);
    const total = countRow ? countRow.total : 0;

    const orders = await db.all(`
      SELECT * FROM orders
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parsedLimit, offset]);

    res.json({
      success: true,
      data: orders,
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

async function getOrderDetails(req, res, next) {
  try {
    const { id } = req.params;
    const order = await db.get('SELECT * FROM orders WHERE id = ? OR order_code = ?', [id, id]);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Pedido não encontrado.' });
    }

    const items = await db.all('SELECT * FROM order_items WHERE order_id = ?', [order.id]);

    res.json({
      success: true,
      data: {
        ...order,
        items
      }
    });
  } catch (err) {
    next(err);
  }
}

async function updateOrderStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['pendente', 'pago', 'em_separacao', 'enviado', 'entregue', 'cancelado'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Status inválido. Escolha entre: ${validStatuses.join(', ')}`
      });
    }

    const existing = await db.get('SELECT id, status FROM orders WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Pedido não encontrado.' });
    }

    // Se o pedido for cancelado, podemos opcionalmente devolver o estoque
    if (status === 'cancelado' && existing.status !== 'cancelado') {
      const items = await db.all('SELECT variant_id, quantity FROM order_items WHERE order_id = ?', [id]);
      for (const it of items) {
        if (it.variant_id) {
          await db.run('UPDATE product_variants SET stock_quantity = stock_quantity + ? WHERE id = ?', [it.quantity, it.variant_id]);
        }
      }
    }

    await db.run(
      `UPDATE orders 
       SET status = ?, notes = COALESCE(?, notes), updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [status, notes || null, id]
    );

    res.json({
      success: true,
      message: `Status do pedido atualizado para "${status}".`
    });
  } catch (err) {
    next(err);
  }
}

async function listProductsAdmin(req, res, next) {
  try {
    const products = await db.all(`
      SELECT 
        p.*,
        c.name as category_name,
        COALESCE(SUM(v.stock_quantity), 0) as total_stock,
        COUNT(v.id) as variant_count
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_variants v ON v.product_id = p.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);

    // Carregar variantes detalhadas para cada produto
    for (const prod of products) {
      try { prod.images = JSON.parse(prod.images); } catch (e) { prod.images = [prod.images]; }
      prod.variants = await db.all(
        'SELECT * FROM product_variants WHERE product_id = ? ORDER BY id ASC',
        [prod.id]
      );
    }

    res.json({
      success: true,
      data: products
    });
  } catch (err) {
    next(err);
  }
}

async function createProduct(req, res, next) {
  try {
    const {
      name,
      category_id,
      description,
      details,
      price,
      compare_at_price,
      cost_price,
      images,
      is_featured = 0,
      is_new = 1,
      is_active = 1,
      is_demo = 0,
      supplier_name,
      supplier_sku,
      variants = []
    } = req.body;

    if (!name || !price || !category_id) {
      return res.status(400).json({
        success: false,
        error: 'Nome, preço e categoria são campos obrigatórios.'
      });
    }

    const baseSlug = slugify(name);
    let finalSlug = baseSlug;
    let counter = 1;
    while (await db.get('SELECT id FROM products WHERE slug = ?', [finalSlug])) {
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    let imagesJson = '[]';
    if (Array.isArray(images)) {
      imagesJson = JSON.stringify(images);
    } else if (typeof images === 'string') {
      imagesJson = JSON.stringify([images]);
    }

    const result = await db.run(`
      INSERT INTO products (
        category_id, name, slug, description, details, price, compare_at_price,
        cost_price, images, is_featured, is_new, is_active, is_demo,
        supplier_name, supplier_sku
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      category_id,
      name.trim(),
      finalSlug,
      description || '',
      details || '',
      parseFloat(price),
      compare_at_price ? parseFloat(compare_at_price) : null,
      cost_price ? parseFloat(cost_price) : 0,
      imagesJson,
      is_featured ? 1 : 0,
      is_new ? 1 : 0,
      is_active ? 1 : 0,
      is_demo ? 1 : 0,
      supplier_name || null,
      supplier_sku || null
    ]);

    const productId = result.lastID;

    // Inserir variantes
    if (Array.isArray(variants) && variants.length > 0) {
      for (const v of variants) {
        if (!v.size) continue;
        const sku = v.sku || `IMP-${productId}-${v.size}-${Math.floor(100 + Math.random() * 900)}`;
        await db.run(
          'INSERT INTO product_variants (product_id, size, color, color_hex, sku, stock_quantity) VALUES (?, ?, ?, ?, ?, ?)',
          [productId, v.size, v.color || 'Padrão', v.color_hex || '#000000', sku, parseInt(v.stock_quantity, 10) || 0]
        );
      }
    } else {
      // Cria variante padrão tamanho Único
      await db.run(
        'INSERT INTO product_variants (product_id, size, color, color_hex, sku, stock_quantity) VALUES (?, ?, ?, ?, ?, ?)',
        [productId, 'Único', 'Preto', '#000000', `IMP-${productId}-UNIQ`, 10]
      );
    }

    res.status(201).json({
      success: true,
      message: 'Produto cadastrado com sucesso!',
      product_id: productId
    });
  } catch (err) {
    next(err);
  }
}

async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const {
      name,
      category_id,
      description,
      details,
      price,
      compare_at_price,
      cost_price,
      images,
      is_featured,
      is_new,
      is_active,
      is_demo,
      supplier_name,
      supplier_sku,
      variants
    } = req.body;

    const existing = await db.get('SELECT * FROM products WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Produto não encontrado.' });
    }

    let imagesJson = existing.images;
    if (images) {
      imagesJson = Array.isArray(images) ? JSON.stringify(images) : JSON.stringify([images]);
    }

    await db.run(`
      UPDATE products SET
        category_id = COALESCE(?, category_id),
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        details = COALESCE(?, details),
        price = COALESCE(?, price),
        compare_at_price = ?,
        cost_price = COALESCE(?, cost_price),
        images = ?,
        is_featured = COALESCE(?, is_featured),
        is_new = COALESCE(?, is_new),
        is_active = COALESCE(?, is_active),
        is_demo = COALESCE(?, is_demo),
        supplier_name = COALESCE(?, supplier_name),
        supplier_sku = COALESCE(?, supplier_sku),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      category_id || null,
      name ? name.trim() : null,
      description !== undefined ? description : null,
      details !== undefined ? details : null,
      price !== undefined ? parseFloat(price) : null,
      compare_at_price !== undefined ? (compare_at_price ? parseFloat(compare_at_price) : null) : existing.compare_at_price,
      cost_price !== undefined ? parseFloat(cost_price) : null,
      imagesJson,
      is_featured !== undefined ? (is_featured ? 1 : 0) : null,
      is_new !== undefined ? (is_new ? 1 : 0) : null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      is_demo !== undefined ? (is_demo ? 1 : 0) : null,
      supplier_name !== undefined ? supplier_name : null,
      supplier_sku !== undefined ? supplier_sku : null,
      id
    ]);

    // Se variantes foram fornecidas, sincronizar estoque
    if (Array.isArray(variants)) {
      for (const v of variants) {
        if (v.id) {
          await db.run(
            'UPDATE product_variants SET size = ?, color = ?, color_hex = ?, stock_quantity = ? WHERE id = ? AND product_id = ?',
            [v.size, v.color || 'Padrão', v.color_hex || '#000000', parseInt(v.stock_quantity, 10) || 0, v.id, id]
          );
        } else if (v.size) {
          const sku = v.sku || `IMP-${id}-${v.size}-${Math.floor(100 + Math.random() * 900)}`;
          await db.run(
            'INSERT INTO product_variants (product_id, size, color, color_hex, sku, stock_quantity) VALUES (?, ?, ?, ?, ?, ?)',
            [id, v.size, v.color || 'Padrão', v.color_hex || '#000000', sku, parseInt(v.stock_quantity, 10) || 0]
          );
        }
      }
    }

    res.json({
      success: true,
      message: 'Produto atualizado com sucesso.'
    });
  } catch (err) {
    next(err);
  }
}

async function toggleProductDemo(req, res, next) {
  try {
    const { id } = req.params;
    const product = await db.get('SELECT id, is_demo, name FROM products WHERE id = ?', [id]);

    if (!product) {
      return res.status(404).json({ success: false, error: 'Produto não encontrado.' });
    }

    const newDemoState = product.is_demo === 1 ? 0 : 1;
    await db.run('UPDATE products SET is_demo = ? WHERE id = ?', [newDemoState, id]);

    res.json({
      success: true,
      is_demo: newDemoState,
      message: newDemoState === 1
        ? `Produto marcado como DEMONSTRATIVO (bloqueado para compra real até validação de fornecedor).`
        : `Produto LIBERADO PARA VENDA no catálogo e checkout!`
    });
  } catch (err) {
    next(err);
  }
}

async function toggleProductActive(req, res, next) {
  try {
    const { id } = req.params;
    const product = await db.get('SELECT id, is_active FROM products WHERE id = ?', [id]);

    if (!product) {
      return res.status(404).json({ success: false, error: 'Produto não encontrado.' });
    }

    const newActiveState = product.is_active === 1 ? 0 : 1;
    await db.run('UPDATE products SET is_active = ? WHERE id = ?', [newActiveState, id]);

    res.json({
      success: true,
      is_active: newActiveState,
      message: newActiveState === 1 ? 'Produto ativado no catálogo.' : 'Produto desativado do catálogo.'
    });
  } catch (err) {
    next(err);
  }
}

async function updateVariantStock(req, res, next) {
  try {
    const { variantId } = req.params;
    const { stock_quantity } = req.body;

    if (stock_quantity === undefined || isNaN(stock_quantity)) {
      return res.status(400).json({ success: false, error: 'Quantidade de estoque inválida.' });
    }

    await db.run('UPDATE product_variants SET stock_quantity = ? WHERE id = ?', [parseInt(stock_quantity, 10), variantId]);

    res.json({
      success: true,
      message: 'Estoque atualizado com sucesso.'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  logout,
  getMe,
  changePassword,
  getDashboardStats,
  listOrders,
  getOrderDetails,
  updateOrderStatus,
  listProductsAdmin,
  createProduct,
  updateProduct,
  toggleProductDemo,
  toggleProductActive,
  updateVariantStock
};
