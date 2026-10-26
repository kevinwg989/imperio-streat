const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function seedDatabase() {
  console.log('🌱 Inicializando sementes do banco de dados...');

  // 1. Categorias Streetwear
  const categories = [
    {
      name: 'Camisetas Oversized',
      slug: 'camisetas',
      description: 'Corte amplo, algodão pesado 220g e caimento urbano impecável.',
      image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
      sort_order: 1
    },
    {
      name: 'Moletons & Hoodies',
      slug: 'moletons',
      description: 'Moletom felpado 3 cabos, capuz estruturado e estética minimalista.',
      image_url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80',
      sort_order: 2
    },
    {
      name: 'Calças & Cargo',
      slug: 'calcas',
      description: 'Modelagem cargo utilitária, sarja premium e ajuste no tornozelo.',
      image_url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&auto=format&fit=crop&q=80',
      sort_order: 3
    },
    {
      name: 'Tênis & Sneakers',
      slug: 'tenis',
      description: 'Silhuetas robustas, conforto amortecido e design futurista.',
      image_url: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800&auto=format&fit=crop&q=80',
      sort_order: 4
    },
    {
      name: 'Acessórios & Bonés',
      slug: 'acessorios',
      description: 'Dad hats, bucket hats, shoulder bags e correntes prateadas.',
      image_url: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&auto=format&fit=crop&q=80',
      sort_order: 5
    }
  ];

  for (const cat of categories) {
    const existing = await db.get('SELECT id FROM categories WHERE slug = ?', [cat.slug]);
    if (!existing) {
      await db.run(
        'INSERT INTO categories (name, slug, description, image_url, sort_order) VALUES (?, ?, ?, ?, ?)',
        [cat.name, cat.slug, cat.description, cat.image_url, cat.sort_order]
      );
    }
  }

  // Obter IDs das categorias
  const cats = await db.all('SELECT id, slug FROM categories');
  const catMap = {};
  cats.forEach(c => { catMap[c.slug] = c.id; });

  // 2. Administrador Padrão
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@imperio.local';
  const adminPass = process.env.ADMIN_INITIAL_PASSWORD || 'ImperioAdmin2026!';
  const existingAdmin = await db.get('SELECT id FROM admins WHERE email = ?', [adminEmail]);

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPass, 10);
    await db.run(
      'INSERT INTO admins (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      ['Administrador Império', adminEmail, passwordHash, 'superadmin']
    );
    console.log(`👤 Administrador inicial cadastrado: ${adminEmail}`);
  }

  // 3. Produtos Demonstrativos (Catálogo Streetwear)
  // Conforme diretrizes: produtos demonstrativos claramente identificados com is_demo = 1
  // Incluímos também 1 item de teste pronto para compra (is_demo = 0) para validação do checkout
  const products = [
    {
      category_id: catMap['camisetas'],
      name: 'Camiseta Oversized Império Heavy Black',
      slug: 'camiseta-oversized-imperio-heavy-black',
      description: 'Camiseta de modelagem oversized confeccionada em malha 100% algodão penteado 240g/m². Toque aveludado, gola canelada grossa de 3cm com reforço ombro a ombro.',
      details: 'Composição: 100% Algodão Heavyweight 240g. Modelagem: Boxy/Oversized. Estampa: Bordado sutil monocromático no peito. Fabricação nacional.',
      price: 139.90,
      compare_at_price: 169.90,
      cost_price: 55.00,
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&auto=format&fit=crop&q=80'
      ]),
      is_featured: 1,
      is_new: 1,
      is_active: 1,
      is_demo: 0, // Liberado para testes reais de checkout no ambiente local
      supplier_name: 'Fornecedor Têxtil Santa Catarina (Piloto)',
      supplier_sku: 'FORN-CAM-001',
      variants: [
        { size: 'P', color: 'Preto Profundo', color_hex: '#111111', sku: 'IMP-CAM-BLK-P', stock: 10 },
        { size: 'M', color: 'Preto Profundo', color_hex: '#111111', sku: 'IMP-CAM-BLK-M', stock: 15 },
        { size: 'G', color: 'Preto Profundo', color_hex: '#111111', sku: 'IMP-CAM-BLK-G', stock: 12 },
        { size: 'GG', color: 'Preto Profundo', color_hex: '#111111', sku: 'IMP-CAM-BLK-GG', stock: 8 },
        { size: 'M', color: 'Off-White Grafite', color_hex: '#E8E8E8', sku: 'IMP-CAM-OFW-M', stock: 10 },
        { size: 'G', color: 'Off-White Grafite', color_hex: '#E8E8E8', sku: 'IMP-CAM-OFW-G', stock: 10 }
      ]
    },
    {
      category_id: catMap['moletons'],
      name: 'Moletom Hoodie Boxy Heavyweight Chumbo',
      slug: 'moletom-hoodie-boxy-heavyweight-chumbo',
      description: 'Hoodie streetwear pesado confeccionado em moletom 3 cabos 400g/m² com interior flanelado. Capuz duplo ultra estruturado sem cordão, bolso canguru embutido e ribanas reforçadas.',
      details: 'Composição: 50% Algodão, 50% Poliéster Premium anti-pilling. Gramatura: 400g. Costuras trançadas reforçadas.',
      price: 269.90,
      compare_at_price: 319.90,
      cost_price: 110.00,
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=800&auto=format&fit=crop&q=80'
      ]),
      is_featured: 1,
      is_new: 1,
      is_active: 1,
      is_demo: 1, // Demonstrativo - aguardando confirmação final do fornecedor
      supplier_name: 'Confecção Malhas Sul (Amostra)',
      supplier_sku: 'FORN-MOL-004',
      variants: [
        { size: 'P', color: 'Cinza Chumbo', color_hex: '#333338', sku: 'IMP-MOL-CHB-P', stock: 5 },
        { size: 'M', color: 'Cinza Chumbo', color_hex: '#333338', sku: 'IMP-MOL-CHB-M', stock: 8 },
        { size: 'G', color: 'Cinza Chumbo', color_hex: '#333338', sku: 'IMP-MOL-CHB-G', stock: 6 },
        { size: 'GG', color: 'Cinza Chumbo', color_hex: '#333338', sku: 'IMP-MOL-CHB-GG', stock: 4 }
      ]
    },
    {
      category_id: catMap['calcas'],
      name: 'Calça Cargo Utilitária Tática Black Stealth',
      slug: 'calca-cargo-utilitaria-tatica-black-stealth',
      description: 'Calça cargo urbana com 6 bolsos funcionais e fivelas táticas metálicas. Confeccionada em sarja peletizada de alta durabilidade com elástico e regulador na barra para ajuste sneaker.',
      details: 'Composição: 98% Algodão, 2% Elastano. Bolsos táticos laterais com fecho em velcro e fita acetinada. Passantes reforçados.',
      price: 219.90,
      compare_at_price: 259.90,
      cost_price: 85.00,
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?w=800&auto=format&fit=crop&q=80'
      ]),
      is_featured: 1,
      is_new: 0,
      is_active: 1,
      is_demo: 1, // Demonstrativo
      supplier_name: 'Sarjas & Cia Atacado (Em Prospecção)',
      supplier_sku: 'FORN-CARGO-009',
      variants: [
        { size: '38', color: 'Preto Fosco', color_hex: '#18181B', sku: 'IMP-CRG-BLK-38', stock: 4 },
        { size: '40', color: 'Preto Fosco', color_hex: '#18181B', sku: 'IMP-CRG-BLK-40', stock: 6 },
        { size: '42', color: 'Preto Fosco', color_hex: '#18181B', sku: 'IMP-CRG-BLK-42', stock: 6 },
        { size: '44', color: 'Preto Fosco', color_hex: '#18181B', sku: 'IMP-CRG-BLK-44', stock: 3 }
      ]
    },
    {
      category_id: catMap['tenis'],
      name: 'Sneaker Urbano Street Runner Prata & Ash',
      slug: 'sneaker-urbano-street-runner-prata-ash',
      description: 'Tênis streetwear com design contemporâneo de solado chunky e linhas reflexivas em prata. Entressola em EVA expandido para amortecimento superior no asfalto.',
      details: 'Cabedal em mesh respirável com sobreposições em camurça sintética e detalhes prateados refletivos. Solado tratorado antiderrapante.',
      price: 349.90,
      compare_at_price: 399.90,
      cost_price: 160.00,
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&auto=format&fit=crop&q=80'
      ]),
      is_featured: 1,
      is_new: 1,
      is_active: 1,
      is_demo: 1, // Demonstrativo
      supplier_name: 'Distribuidora Footwear Brasil (Em Negociação)',
      supplier_sku: 'FORN-SNK-015',
      variants: [
        { size: '39', color: 'Prata com Ash Black', color_hex: '#9E9E9E', sku: 'IMP-SNK-SIL-39', stock: 3 },
        { size: '40', color: 'Prata com Ash Black', color_hex: '#9E9E9E', sku: 'IMP-SNK-SIL-40', stock: 5 },
        { size: '41', color: 'Prata com Ash Black', color_hex: '#9E9E9E', sku: 'IMP-SNK-SIL-41', stock: 5 },
        { size: '42', color: 'Prata com Ash Black', color_hex: '#9E9E9E', sku: 'IMP-SNK-SIL-42', stock: 4 }
      ]
    },
    {
      category_id: catMap['camisetas'],
      name: 'Camiseta Graphic Cyber Underground Cinza',
      slug: 'camiseta-graphic-cyber-underground-cinza',
      description: 'Estampa frontal em serigrafia de alta definição toque zero com grafismo futurista urbano e tipografia prateada. Modelagem relaxada.',
      details: 'Composição: 100% Algodão 200g. Tingimento estonado a seco. Tratamento pré-encolhido.',
      price: 129.90,
      compare_at_price: 149.90,
      cost_price: 48.00,
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&auto=format&fit=crop&q=80'
      ]),
      is_featured: 0,
      is_new: 1,
      is_active: 1,
      is_demo: 1,
      supplier_name: 'Fornecedor Têxtil Santa Catarina (Piloto)',
      supplier_sku: 'FORN-CAM-002',
      variants: [
        { size: 'P', color: 'Mescla Escuro', color_hex: '#4A4A4A', sku: 'IMP-CAM-CYB-P', stock: 5 },
        { size: 'M', color: 'Mescla Escuro', color_hex: '#4A4A4A', sku: 'IMP-CAM-CYB-M', stock: 10 },
        { size: 'G', color: 'Mescla Escuro', color_hex: '#4A4A4A', sku: 'IMP-CAM-CYB-G', stock: 8 }
      ]
    },
    {
      category_id: catMap['acessorios'],
      name: 'Shoulder Bag Tática Império Ripstop',
      slug: 'shoulder-bag-tatica-imperio-ripstop',
      description: 'Bolsa transversal compacta em tecido Ripstop resistente à água, zíperes selados e alça regulável de fita tática com mosquetão metálico prata.',
      details: 'Medidas: 18cm x 14cm x 6cm. Três compartimentos com zíper e bolso interno secreto.',
      price: 89.90,
      compare_at_price: 109.90,
      cost_price: 32.00,
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&auto=format&fit=crop&q=80'
      ]),
      is_featured: 0,
      is_new: 0,
      is_active: 1,
      is_demo: 1,
      supplier_name: 'Acessórios SP (Catálogo Piloto)',
      supplier_sku: 'FORN-BAG-007',
      variants: [
        { size: 'Único', color: 'Preto com Detalhe Prata', color_hex: '#111111', sku: 'IMP-BAG-BLK-U', stock: 15 }
      ]
    }
  ];

  for (const prod of products) {
    const existing = await db.get('SELECT id FROM products WHERE slug = ?', [prod.slug]);
    let productId;

    if (!existing) {
      const res = await db.run(
        `INSERT INTO products (
          category_id, name, slug, description, details, price, compare_at_price,
          cost_price, images, is_featured, is_new, is_active, is_demo,
          supplier_name, supplier_sku
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          prod.category_id,
          prod.name,
          prod.slug,
          prod.description,
          prod.details,
          prod.price,
          prod.compare_at_price,
          prod.cost_price,
          prod.images,
          prod.is_featured,
          prod.is_new,
          prod.is_active,
          prod.is_demo,
          prod.supplier_name,
          prod.supplier_sku
        ]
      );
      productId = res.lastID;
    } else {
      productId = existing.id;
    }

    // Variantes de estoque
    for (const v of prod.variants) {
      const existingVar = await db.get('SELECT id FROM product_variants WHERE sku = ?', [v.sku]);
      if (!existingVar) {
        await db.run(
          'INSERT INTO product_variants (product_id, size, color, color_hex, sku, stock_quantity) VALUES (?, ?, ?, ?, ?, ?)',
          [productId, v.size, v.color, v.color_hex, v.sku, v.stock]
        );
      }
    }
  }

  // 4. Configurações Globais do Site
  const defaultSettings = [
    { key: 'store_name', value: 'IMPÉRIO STREETWEAR' },
    { key: 'store_tagline', value: 'Moda Urbana Premium • Caimento Perfeito' },
    { key: 'free_shipping_threshold', value: '299.00' },
    { key: 'announcement_bar', value: 'FRETE GRÁTIS PARA TODO O BRASIL EM COMPRAS ACIMA DE R$ 299 • 5% OFF NO PIX' }
  ];

  for (const s of defaultSettings) {
    const existing = await db.get('SELECT key FROM site_settings WHERE key = ?', [s.key]);
    if (!existing) {
      await db.run('INSERT INTO site_settings (key, value) VALUES (?, ?)', [s.key, s.value]);
    }
  }

  console.log('✅ Banco de dados populado com sucesso!');
}

module.exports = { seedDatabase };
