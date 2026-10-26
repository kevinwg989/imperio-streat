const crypto = require('crypto');
const { MercadoPagoConfig, Payment, Preference } = require('mercadopago');

const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
const isLiveMode = Boolean(accessToken && accessToken.trim().length > 10);

let mpClient = null;
if (isLiveMode) {
  try {
    mpClient = new MercadoPagoConfig({
      accessToken: accessToken.trim(),
      options: { timeout: 7000 }
    });
    console.log('💳 Mercado Pago SDK inicializado com credencial configurada.');
  } catch (err) {
    console.warn('⚠️ Falha ao inicializar SDK do Mercado Pago:', err.message);
  }
} else {
  console.log('ℹ️ Mercado Pago em modo SIMULADOR / SANDBOX LOCAL. Insira MERCADO_PAGO_ACCESS_TOKEN no .env para transações reais.');
}

async function createPixPayment({ order, customer }) {
  if (isLiveMode && mpClient) {
    try {
      const payment = new Payment(mpClient);
      const paymentData = {
        transaction_amount: Number(order.total.toFixed(2)),
        description: `Pedido ${order.order_code} - Império Streetwear`,
        payment_method_id: 'pix',
        payer: {
          email: customer.email,
          first_name: customer.name.split(' ')[0] || customer.name,
          last_name: customer.name.split(' ').slice(1).join(' ') || 'Cliente',
          identification: {
            type: 'CPF',
            number: customer.cpf.replace(/\D/g, '')
          }
        },
        external_reference: order.order_code,
        notification_url: `${process.env.STORE_URL || 'http://localhost:3000'}/api/payments/webhook`
      };

      const result = await payment.create({ body: paymentData });
      const pointOfInteraction = result.point_of_interaction?.transaction_data;

      return {
        is_sandbox: false,
        payment_id: String(result.id),
        status: result.status,
        qr_code_base64: pointOfInteraction?.qr_code_base64 || null,
        qr_code: pointOfInteraction?.qr_code || null,
        ticket_url: pointOfInteraction?.ticket_url || null
      };
    } catch (error) {
      console.error('❌ Erro na API do Mercado Pago (Pix):', error);
      throw new Error(`Falha ao comunicar com Mercado Pago: ${error.message || 'Erro desconhecido'}`);
    }
  }

  // MODO SANDBOX LOCAL SEGURO
  // Gera payload simulado realista com QR Code SVG inline e Chave Copia e Cola
  const simulatedId = `SANDBOX-PIX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const simulatedCopyPaste = `00020126580014br.gov.bcb.pix0136${crypto.randomUUID()}520400005303986540${order.total.toFixed(2).length}${order.total.toFixed(2)}5802BR5918IMPERIO STREETWEAR6009SAO PAULO62070503***6304ABCD`;

  return {
    is_sandbox: true,
    payment_id: simulatedId,
    status: 'pending',
    qr_code: simulatedCopyPaste,
    qr_code_base64: null,
    sandbox_notice: 'Modo de testes ativo. Configure MERCADO_PAGO_ACCESS_TOKEN no .env para transações bancárias reais via Mercado Pago.'
  };
}

async function createCardPayment({ order, customer, token, installments = 1, paymentMethodId = 'master' }) {
  if (isLiveMode && mpClient) {
    try {
      const payment = new Payment(mpClient);
      const paymentData = {
        transaction_amount: Number(order.total.toFixed(2)),
        token: token,
        description: `Pedido ${order.order_code} - Império Streetwear`,
        installments: Number(installments),
        payment_method_id: paymentMethodId,
        payer: {
          email: customer.email,
          identification: {
            type: 'CPF',
            number: customer.cpf.replace(/\D/g, '')
          }
        },
        external_reference: order.order_code,
        notification_url: `${process.env.STORE_URL || 'http://localhost:3000'}/api/payments/webhook`
      };

      const result = await payment.create({ body: paymentData });
      return {
        is_sandbox: false,
        payment_id: String(result.id),
        status: result.status,
        status_detail: result.status_detail
      };
    } catch (error) {
      console.error('❌ Erro na API do Mercado Pago (Cartão):', error);
      throw new Error(`Falha ao processar cartão via Mercado Pago: ${error.message || 'Erro na transação'}`);
    }
  }

  // MODO SANDBOX LOCAL SEGURO (Nunca processa cartão real, simula autorização segura)
  const simulatedId = `SANDBOX-CARD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  return {
    is_sandbox: true,
    payment_id: simulatedId,
    status: 'approved',
    status_detail: 'accredited_sandbox_test',
    sandbox_notice: 'Aprovado via simulador de testes. Configure MERCADO_PAGO_ACCESS_TOKEN no .env para pagamentos reais.'
  };
}

async function verifyPaymentStatus(paymentId) {
  if (isLiveMode && mpClient) {
    try {
      const payment = new Payment(mpClient);
      const result = await payment.get({ id: paymentId });
      return {
        id: result.id,
        status: result.status,
        order_code: result.external_reference
      };
    } catch (err) {
      console.error('❌ Erro ao consultar status no Mercado Pago:', err);
      return null;
    }
  }
  return null;
}

module.exports = {
  isLiveMode,
  createPixPayment,
  createCardPayment,
  verifyPaymentStatus
};
