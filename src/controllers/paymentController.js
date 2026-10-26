const db = require('../config/db');
const mercadoPagoService = require('../services/mercadoPagoService');

async function handleWebhook(req, res, next) {
  try {
    const { type, data, action } = req.body;
    const queryType = req.query.type || req.query.topic;
    const queryId = req.query['data.id'] || req.query.id;

    console.log('🔔 Webhook de pagamento recebido:', {
      bodyType: type,
      action: action,
      dataId: data?.id,
      queryType,
      queryId
    });

    const paymentId = data?.id || queryId;

    if (!paymentId) {
      return res.status(200).send('Ignored: missing payment id');
    }

    // Se estiver em live mode, consulta a adquirente Mercado Pago diretamente
    if (mercadoPagoService.isLiveMode) {
      const verified = await mercadoPagoService.verifyPaymentStatus(paymentId);
      if (verified && verified.order_code) {
        if (verified.status === 'approved') {
          await db.run(
            `UPDATE orders 
             SET status = 'pago', payment_status = 'aprovado', updated_at = CURRENT_TIMESTAMP 
             WHERE order_code = ?`,
            [verified.order_code]
          );
          console.log(`✅ Pedido ${verified.order_code} atualizado para PAGO via Webhook verificado.`);
        } else if (['rejected', 'cancelled'].includes(verified.status)) {
          await db.run(
            `UPDATE orders 
             SET payment_status = 'recusado', updated_at = CURRENT_TIMESTAMP 
             WHERE order_code = ?`,
            [verified.order_code]
          );
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('❌ Erro ao processar webhook:', err);
    // Sempre retornar 200 para evitar retentativas agressivas de webhook da adquirente
    return res.status(200).json({ error: 'Erro processado com segurança' });
  }
}

module.exports = {
  handleWebhook
};
