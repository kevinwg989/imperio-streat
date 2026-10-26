const db = require('../config/db');
const mercadoPagoService = require('../services/mercadoPagoService');

// Validação simples de CPF (formato e dígitos)
function isValidCPF(cpf) {
  if (!cpf) return false;
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(clean.charAt(i), 10) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(clean.charAt(i), 10) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10), 10)) return false;

  return true;
}

// Cálculo seguro de frete no backend
function calculateShipping(subtotal, shippingMethod) {
  const isFreeThreshold = subtotal >= 299.00;
  const method = (shippingMethod || 'PAC').toUpperCase();

  if (method === 'SEDEX') {
    return {
      method: 'SEDEX Express',
      cost: isFreeThreshold ? 15.00 : 34.90,
      estimated_days: '2 a 4 dias úteis'
    };
  }

  // Padrão PAC
  return {
    method: 'PAC Padrão',
    cost: isFreeThreshold ? 0.00 : 19.90,
    estimated_days: '5 a 9 dias úteis'
  };
}

async function createOrder(req, res, next) {
  try {
    const {
      customer,
      items,
      shipping_address,
      shipping_method = 'PAC',
      payment_method = 'pix',
      card_token = null,
      installments = 1
    } = req.body;

    // 1. Validação básica de entrada
    if (!customer || !customer.name || !customer.email || !customer.cpf || !customer.phone) {
      return res.status(400).json({
        success: false,
        error: 'Dados do cliente incompletos. Informe nome, e-mail, CPF e telefone.'
      });
    }

    if (!isValidCPF(customer.cpf)) {
      return res.status(400).json({
        success: false,
        error: 'CPF informado é inválido. Por favor, verifique o documento.'
      });
    }

    if (!shipping_address || !shipping_address.zip || !shipping_address.street || !shipping_address.number || !shipping_address.city || !shipping_address.state) {
      return res.status(400).json({
        success: false,
        error: 'Endereço de entrega incompleto. Preencha CEP, rua, número, cidade e estado.'
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'O carrinho está vazio. Adicione produtos antes de finalizar.'
      });
    }

    // 2. Validação RIGOROSA no servidor de preços, estoque e produtos demonstrativos
    // NUNCA confiar em preços ou totais vindos do frontend!
    let validatedItems = [];
    let calculatedSubtotal = 0;

    for (const item of items) {
      const quantity = Math.max(parseInt(item.quantity, 10) || 1, 1);
      const variantId = parseInt(item.variant_id, 10);
      const productId = parseInt(item.product_id, 10);

      if (!productId || !variantId) {
        return res.status(400).json({
          success: false,
          error: 'Identificador de produto ou variante inválido.'
        });
      }

      // Buscar produto ativo no banco
      const product = await db.get(
        'SELECT id, name, slug, price, is_active, is_demo FROM products WHERE id = ?',
        [productId]
      );

      if (!product || !product.is_active) {
        return res.status(400).json({
          success: false,
          error: `O produto "${item.product_name || 'selecionado'}" não está disponível.`
        });
      }

      // Bloquear compra de produtos puramente demonstrativos
      if (product.is_demo === 1) {
        return res.status(400).json({
          success: false,
          error: `O item "${product.name}" é uma amostra demonstrativa de catálogo (pré-lançamento) e aguarda confirmação final de fornecedor. Para testar o checkout, utilize produtos com o selo "Disponível para Teste" ou ative-o no painel administrativo.`
        });
      }

      // Buscar variante e estoque
      const variant = await db.get(
        'SELECT id, size, color, sku, stock_quantity FROM product_variants WHERE id = ? AND product_id = ?',
        [variantId, productId]
      );

      if (!variant) {
        return res.status(400).json({
          success: false,
          error: `A variante selecionada (tamanho/cor) de "${product.name}" não existe.`
        });
      }

      if (variant.stock_quantity < quantity) {
        return res.status(400).json({
          success: false,
          error: `Estoque insuficiente para "${product.name}" (Tam: ${variant.size}). Disponível em estoque: ${variant.stock_quantity}.`
        });
      }

      const unitPrice = Number(product.price);
      const itemSubtotal = unitPrice * quantity;
      calculatedSubtotal += itemSubtotal;

      validatedItems.push({
        product_id: product.id,
        variant_id: variant.id,
        product_name: product.name,
        product_sku: variant.sku,
        variant_size: variant.size,
        variant_color: variant.color,
        unit_price: unitPrice,
        quantity: quantity,
        subtotal: itemSubtotal
      });
    }

    // 3. Cálculo de frete e total final
    const shippingInfo = calculateShipping(calculatedSubtotal, shipping_method);
    const calculatedTotal = calculatedSubtotal + shippingInfo.cost;

    // 4. Código único do pedido
    const orderCode = `IMP-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    // 5. Cadastrar ou atualizar cliente
    let customerId;
    const cleanEmail = customer.email.trim().toLowerCase();
    const cleanCpf = customer.cpf.replace(/\D/g, '');
    const existingCustomer = await db.get('SELECT id FROM customers WHERE email = ? OR cpf = ?', [cleanEmail, cleanCpf]);

    if (existingCustomer) {
      customerId = existingCustomer.id;
      await db.run(
        'UPDATE customers SET name = ?, phone = ? WHERE id = ?',
        [customer.name.trim(), customer.phone.trim(), customerId]
      );
    } else {
      const custRes = await db.run(
        'INSERT INTO customers (name, email, cpf, phone) VALUES (?, ?, ?, ?)',
        [customer.name.trim(), cleanEmail, cleanCpf, customer.phone.trim()]
      );
      customerId = custRes.lastID;
    }

    // 6. Criar Pedido
    const orderRes = await db.run(
      `INSERT INTO orders (
        order_code, customer_id, customer_name, customer_email, customer_cpf, customer_phone,
        shipping_zip, shipping_street, shipping_number, shipping_complement,
        shipping_neighborhood, shipping_city, shipping_state,
        shipping_method, shipping_cost, subtotal, total,
        status, payment_method, payment_status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderCode,
        customerId,
        customer.name.trim(),
        cleanEmail,
        cleanCpf,
        customer.phone.trim(),
        shipping_address.zip.replace(/\D/g, ''),
        shipping_address.street.trim(),
        shipping_address.number.trim(),
        shipping_address.complement ? shipping_address.complement.trim() : null,
        shipping_address.neighborhood ? shipping_address.neighborhood.trim() : '',
        shipping_address.city.trim(),
        shipping_address.state.trim().toUpperCase(),
        shippingInfo.method,
        shippingInfo.cost,
        Number(calculatedSubtotal.toFixed(2)),
        Number(calculatedTotal.toFixed(2)),
        'pendente',
        payment_method,
        'pendente',
        customer.notes || null
      ]
    );

    const orderId = orderRes.lastID;

    // 7. Inserir itens do pedido e decrementar estoque
    for (const vItem of validatedItems) {
      await db.run(
        `INSERT INTO order_items (
          order_id, product_id, variant_id, product_name, product_sku,
          variant_size, variant_color, unit_price, quantity, subtotal
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          vItem.product_id,
          vItem.variant_id,
          vItem.product_name,
          vItem.product_sku,
          vItem.variant_size,
          vItem.variant_color,
          vItem.unit_price,
          vItem.quantity,
          vItem.subtotal
        ]
      );

      // Decrementar estoque da variante
      await db.run(
        'UPDATE product_variants SET stock_quantity = stock_quantity - ? WHERE id = ?',
        [vItem.quantity, vItem.variant_id]
      );
    }

    // 8. Processar Pagamento (Mercado Pago ou Simulador Seguro)
    let paymentResult = null;
    const orderObj = {
      id: orderId,
      order_code: orderCode,
      total: calculatedTotal
    };

    if (payment_method === 'pix') {
      paymentResult = await mercadoPagoService.createPixPayment({
        order: orderObj,
        customer: {
          name: customer.name,
          email: cleanEmail,
          cpf: cleanCpf
        }
      });

      // Atualizar dados de pagamento no pedido
      await db.run(
        'UPDATE orders SET payment_id = ?, payment_details = ? WHERE id = ?',
        [paymentResult.payment_id, JSON.stringify(paymentResult), orderId]
      );
    } else if (payment_method === 'cartao_credito') {
      paymentResult = await mercadoPagoService.createCardPayment({
        order: orderObj,
        customer: {
          name: customer.name,
          email: cleanEmail,
          cpf: cleanCpf
        },
        token: card_token,
        installments: installments
      });

      const newStatus = paymentResult.status === 'approved' ? 'pago' : 'pendente';
      const newPaymentStatus = paymentResult.status === 'approved' ? 'aprovado' : 'pendente';

      await db.run(
        'UPDATE orders SET payment_id = ?, payment_status = ?, status = ?, payment_details = ? WHERE id = ?',
        [paymentResult.payment_id, newPaymentStatus, newStatus, JSON.stringify(paymentResult), orderId]
      );
    } else if (payment_method === 'checkout_pro' || payment_method === 'mercadopago') {
      paymentResult = await mercadoPagoService.createCheckoutProPreference({
        order: orderObj,
        customer: {
          name: customer.name,
          email: cleanEmail,
          cpf: cleanCpf,
          phone: customer.phone
        },
        items: validatedItems,
        shippingInfo: shippingInfo
      });

      await db.run(
        'UPDATE orders SET payment_id = ?, payment_details = ? WHERE id = ?',
        [paymentResult.preference_id, JSON.stringify(paymentResult), orderId]
      );
    }

    res.status(201).json({
      success: true,
      message: 'Pedido criado com sucesso!',
      data: {
        order_id: orderId,
        order_code: orderCode,
        subtotal: calculatedSubtotal,
        shipping: shippingInfo,
        total: calculatedTotal,
        payment_method,
        payment: paymentResult
      }
    });
  } catch (err) {
    next(err);
  }
}

// Consultar status de pedido (para tela de confirmação e rastreamento público)
async function getOrderByCode(req, res, next) {
  try {
    const { code } = req.params;
    const order = await db.get(
      `SELECT * FROM orders WHERE order_code = ?`,
      [code.toUpperCase()]
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Pedido não encontrado.'
      });
    }

    const items = await db.all(
      `SELECT * FROM order_items WHERE order_id = ?`,
      [order.id]
    );

    let paymentDetails = null;
    try {
      if (order.payment_details) paymentDetails = JSON.parse(order.payment_details);
    } catch (e) {
      paymentDetails = null;
    }

    // Não expor dados excessivos do cliente
    res.json({
      success: true,
      data: {
        order_code: order.order_code,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        status: order.status,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        shipping_method: order.shipping_method,
        shipping_cost: order.shipping_cost,
        shipping_city: order.shipping_city,
        shipping_state: order.shipping_state,
        subtotal: order.subtotal,
        total: order.total,
        created_at: order.created_at,
        payment: paymentDetails,
        items: items
      }
    });
  } catch (err) {
    next(err);
  }
}

// Simular confirmação de pagamento Pix no ambiente de sandbox local
async function simulateSandboxPayment(req, res, next) {
  try {
    const { order_code } = req.body;
    if (!order_code) {
      return res.status(400).json({ success: false, error: 'Código do pedido não fornecido.' });
    }

    const order = await db.get('SELECT * FROM orders WHERE order_code = ?', [order_code.toUpperCase()]);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Pedido não encontrado.' });
    }

    if (order.status === 'pago') {
      return res.json({ success: true, message: 'Pedido já se encontra com status pago.', status: 'pago' });
    }

    await db.run(
      `UPDATE orders SET status = 'pago', payment_status = 'aprovado', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [order.id]
    );

    res.json({
      success: true,
      message: 'Pagamento Pix simulado com sucesso no ambiente Sandbox!',
      status: 'pago',
      payment_status: 'aprovado'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createOrder,
  getOrderByCode,
  simulateSandboxPayment
};
