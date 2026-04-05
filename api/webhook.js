// CuidadoTotal — Webhook MercadoPago
// Recibe notificaciones automáticas cuando alguien paga

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { type, data } = req.body;

    if (type === 'payment') {
      const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
      const pagoRes = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
        headers: { 'Authorization': `Bearer ${MP_TOKEN}` },
      });
      const pago = await pagoRes.json();

      console.log(`Pago ${pago.id}: ${pago.status} — $${pago.transaction_amount} ARS`);
      console.log(`Cliente: ${pago.metadata?.nombre} — ${pago.metadata?.tel}`);
      console.log(`Referencia: ${pago.external_reference}`);

      // Acá podés agregar lógica extra:
      // - Enviar email de confirmación
      // - Actualizar stock en Tiendanube
      // - Notificar por WhatsApp
    }

    return res.status(200).end();

  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(200).end(); // Siempre 200 para que MP no reintente
  }
}
