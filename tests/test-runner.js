// Suite de Testes Automatizados - IMPÉRIO STREETWEAR
process.env.NODE_ENV = 'test';
process.env.DB_PATH = './data/imperio.db';

const assert = require('assert');
const http = require('http');
const db = require('../src/config/db');
const app = require('../server');
const bcrypt = require('bcryptjs');

let server;
let baseUrl;

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const reqHeaders = { ...headers };
    let postData = null;

    if (body) {
      postData = JSON.stringify(body);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: reqHeaders
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) { json = data; }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 INICIANDO TESTES DO SISTEMA IMPÉRIO STREETWEAR');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      process.stdout.write(`⏳ ${name}... `);
      await fn();
      console.log('✅ OK');
      passed++;
    } catch (err) {
      console.log(`❌ FALHOU: ${err.message}`);
      if (err.devDetails) console.log(`   Detalhes: ${err.devDetails}`);
      failed++;
    }
  }

  // Iniciar servidor em porta efêmera para testes
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });

  try {
    // Teste 1: Banco de dados conectado e com tabelas
    await test('1. Integridade do banco de dados SQLite', async () => {
      const categories = await db.all('SELECT * FROM categories');
      assert(categories.length >= 5, 'Deve possuir no mínimo 5 categorias');

      const products = await db.all('SELECT * FROM products');
      assert(products.length >= 5, 'Deve possuir produtos cadastrados');
    });

    // Teste 2: API de Categorias
    await test('2. Endpoint GET /api/products/categories', async () => {
      const res = await makeRequest('GET', '/api/products/categories');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert(Array.isArray(res.body.data) && res.body.data.length > 0);
    });

    // Teste 3: API de Configurações Públicas (WhatsApp, Nome da Loja)
    await test('3. Endpoint GET /api/settings', async () => {
      const res = await makeRequest('GET', '/api/settings');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.store_name, 'IMPÉRIO STREETWEAR');
      assert(res.body.data.whatsapp_number, 'WhatsApp deve estar configurado');
    });

    // Teste 4: API de Produtos e Filtro por Categoria
    await test('4. Endpoint GET /api/products com paginação', async () => {
      const res = await makeRequest('GET', '/api/products?limit=10');
      assert.strictEqual(res.status, 200);
      assert(res.body.data.length > 0);
      assert(res.body.pagination.total > 0);
    });

    // Teste 5: Segurança - Bloqueio de compra de peças puramente demonstrativas
    await test('5. Segurança: Rejeição de compra de produtos demonstrativos (is_demo = 1)', async () => {
      // Buscar um produto que seja demonstrativo
      const demoProd = await db.get('SELECT * FROM products WHERE is_demo = 1 LIMIT 1');
      assert(demoProd, 'Deve existir ao menos um produto demonstrativo no catálogo');

      const demoVar = await db.get('SELECT * FROM product_variants WHERE product_id = ? LIMIT 1', [demoProd.id]);

      const payload = {
        customer: {
          name: 'Cliente Teste',
          email: 'teste@demo.com',
          cpf: '11144477735',
          phone: '(11) 99999-9999'
        },
        shipping_address: {
          zip: '01310100',
          street: 'Avenida Paulista',
          number: '1000',
          city: 'São Paulo',
          state: 'SP'
        },
        items: [
          { product_id: demoProd.id, variant_id: demoVar.id, quantity: 1 }
        ]
      };

      const res = await makeRequest('POST', '/api/orders', payload);
      assert.strictEqual(res.status, 400);
      assert(res.body.error.includes('demonstrativa') || res.body.error.includes('amostra'), 'Servidor deve rejeitar compra de produto demonstrativo');
    });

    // Teste 6: Fluxo Completo de Criação de Pedido com Produto Liberado
    let createdOrderCode = null;
    await test('6. Criação de pedido com validação de preço e estoque no servidor', async () => {
      // Buscar um produto liberado para venda (is_demo = 0)
      const liveProd = await db.get('SELECT * FROM products WHERE is_demo = 0 AND is_active = 1 LIMIT 1');
      assert(liveProd, 'Deve existir um produto pronto para testes');

      const liveVar = await db.get('SELECT * FROM product_variants WHERE product_id = ? AND stock_quantity > 0 LIMIT 1', [liveProd.id]);
      const initialStock = liveVar.stock_quantity;

      const payload = {
        customer: {
          name: 'Comprador Streetwear Teste',
          email: 'comprador@imperio.local',
          cpf: '11144477735',
          phone: '(11) 98765-4321'
        },
        shipping_address: {
          zip: '01310100',
          street: 'Avenida Paulista',
          number: '1500',
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          state: 'SP'
        },
        shipping_method: 'PAC',
        payment_method: 'pix',
        items: [
          // Enviar preço falso para confirmar que o backend calcula pelo valor do banco!
          { product_id: liveProd.id, variant_id: liveVar.id, quantity: 1, unit_price: 1.00 }
        ]
      };

      const res = await makeRequest('POST', '/api/orders', payload);
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert(res.body.data.order_code.startsWith('IMP-'), 'Código deve iniciar com IMP-');
      assert.strictEqual(res.body.data.subtotal, Number(liveProd.price), 'Subtotal deve ser calculado pelo preço do banco de dados, ignorando preço forjado pelo cliente');

      createdOrderCode = res.body.data.order_code;

      // Verificar que o estoque foi decrementado no banco
      const updatedVar = await db.get('SELECT stock_quantity FROM product_variants WHERE id = ?', [liveVar.id]);
      assert.strictEqual(updatedVar.stock_quantity, initialStock - 1, 'Estoque deve ser decrementado');
    });

    // Teste 7: Consulta de status de pedido público
    await test('7. Consulta pública de status de pedido por código', async () => {
      assert(createdOrderCode, 'Código do pedido deve existir');
      const res = await makeRequest('GET', `/api/orders/${createdOrderCode}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.order_code, createdOrderCode);
      assert.strictEqual(res.body.data.status, 'pendente');
    });

    // Teste 8: Simulação de pagamento Sandbox Pix
    await test('8. Confirmação segura de pagamento Pix no ambiente Sandbox', async () => {
      const res = await makeRequest('POST', '/api/orders/simulate-sandbox-pix', { order_code: createdOrderCode });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'pago');

      const checkOrder = await db.get('SELECT status, payment_status FROM orders WHERE order_code = ?', [createdOrderCode]);
      assert.strictEqual(checkOrder.status, 'pago');
      assert.strictEqual(checkOrder.payment_status, 'aprovado');
    });

    // Teste 9: Autenticação Administrativa (Login & JWT)
    let adminToken = null;
    await test('9. Autenticação Administrativa (Login com sucesso e hash bcrypt)', async () => {
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@imperio.local';
      const adminPass = process.env.ADMIN_INITIAL_PASSWORD || 'ImperioAdmin2026!';

      const res = await makeRequest('POST', '/api/admin/login', {
        email: adminEmail,
        password: adminPass
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert(res.body.token, 'Deve retornar token JWT');
      adminToken = res.body.token;
    });

    // Teste 10: Rota protegida do Admin sem token deve ser rejeitada com 401
    await test('10. Segurança: Bloqueio de acesso não autorizado a rotas restritas', async () => {
      const res = await makeRequest('GET', '/api/admin/dashboard-stats');
      assert.strictEqual(res.status, 401, 'Deve retornar 401 Unauthorized');
    });

    // Teste 11: Acesso autorizado a rotas do Admin com Bearer Token
    await test('11. Acesso a métricas do dashboard administrativo autenticado', async () => {
      assert(adminToken, 'Token admin deve existir');
      const res = await makeRequest('GET', '/api/admin/dashboard-stats', null, {
        Authorization: `Bearer ${adminToken}`
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert(typeof res.body.data.revenue === 'number');
      assert(res.body.data.total_orders >= 1);
    });

    // Teste 12: Alternar status demonstrativo de produto com 1 clique no admin
    await test('12. Alternância de status de demonstração (1-click toggle)', async () => {
      const prod = await db.get('SELECT id, is_demo FROM products LIMIT 1');
      const originalState = prod.is_demo;

      const res = await makeRequest('PATCH', `/api/admin/products/${prod.id}/toggle-demo`, null, {
        Authorization: `Bearer ${adminToken}`
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.is_demo, originalState === 1 ? 0 : 1);

      // Reverter para o estado original
      await makeRequest('PATCH', `/api/admin/products/${prod.id}/toggle-demo`, null, {
        Authorization: `Bearer ${adminToken}`
      });
    });

  } finally {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
    await db.close();
  }

  console.log('\n======================================================');
  console.log(`🏁 RESULTADO DOS TESTES: ${passed} APROVADOS | ${failed} FALHAS`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Erro fatal nos testes:', err);
  process.exit(1);
});
