// CuidadoTotal — Webhook MercadoPago
// Recibe notificaciones de pago y manda email al vendedor

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { type, data } = req.body;

    if (type === 'payment') {
      const MP_TOKEN     = process.env.MP_ACCESS_TOKEN;
      const RESEND_KEY   = process.env.RESEND_API_KEY;
      const EMAIL_DESTINO = process.env.EMAIL_PEDIDOS;

      // Consultar el pago en MercadoPago
      const pagoRes = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
        headers: { 'Authorization': `Bearer ${MP_TOKEN}` },
      });
      const pago = await pagoRes.json();

      // Solo procesar pagos aprobados
      if (pago.status !== 'approved') {
        console.log(`Pago ${pago.id} no aprobado: ${pago.status}`);
        return res.status(200).end();
      }

      // Datos del pedido
      const nombre    = pago.metadata?.nombre    || 'No especificado';
      const tel       = pago.metadata?.tel       || 'No especificado';
      const direccion = pago.metadata?.direccion || 'No especificada';
      const total     = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(pago.transaction_amount);
      const fecha     = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
      const referencia = pago.external_reference || pago.id;

      // Lista de productos
      const productos = (pago.additional_info?.items || [])
        .map(i => `• ${i.title} × ${i.quantity} = ${new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(i.unit_price * i.quantity)}`)
        .join('<br>') || 'Ver detalle en MercadoPago';

      // Enviar email via Resend
      if (RESEND_KEY && EMAIL_DESTINO) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'CuidadoTotal Pedidos <onboarding@resend.dev>',
            to: [EMAIL_DESTINO],
            subject: `🛍️ Nuevo pedido #${referencia} — ${total}`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
                <div style="background:#3D7A5A;color:white;padding:20px;border-radius:8px 8px 0 0;text-align:center">
                  <h1 style="margin:0;font-size:22px">🛍️ Nuevo Pedido Recibido</h1>
                  <p style="margin:6px 0 0;font-size:13px;opacity:0.85">${fecha}</p>
                </div>
                <div style="background:white;border:1px solid #e0e0e0;padding:24px;border-radius:0 0 8px 8px">

                  <div style="background:#EAF2EC;border-radius:8px;padding:16px;margin-bottom:20px">
                    <p style="margin:0;color:#2C5A41;font-size:13px;font-weight:600">✅ PAGO APROBADO</p>
                    <p style="margin:6px 0 0;font-size:26px;font-weight:bold;color:#1A1A18">${total}</p>
                    <p style="margin:4px 0 0;color:#5A5A55;font-size:12px">Ref: #${referencia}</p>
                  </div>

                  <h3 style="color:#3D7A5A;font-size:13px;margin:0 0 10px;text-transform:uppercase;letter-spacing:0.05em">📦 Datos para el envío</h3>
                  <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
                    <tr><td style="padding:7px 0;color:#5A5A55;font-size:14px;width:100px">Nombre</td><td style="padding:7px 0;font-size:14px;font-weight:600">${nombre}</td></tr>
                    <tr style="border-top:1px solid #f0f0f0"><td style="padding:7px 0;color:#5A5A55;font-size:14px">WhatsApp</td><td style="padding:7px 0;font-size:14px;font-weight:600">${tel}</td></tr>
                    <tr style="border-top:1px solid #f0f0f0"><td style="padding:7px 0;color:#5A5A55;font-size:14px">Dirección</td><td style="padding:7px 0;font-size:14px;font-weight:600">${direccion}</td></tr>
                  </table>

                  <h3 style="color:#3D7A5A;font-size:13px;margin:0 0 10px;text-transform:uppercase;letter-spacing:0.05em">🛒 Productos</h3>
                  <div style="background:#f9f9f9;border-radius:6px;padding:12px;font-size:14px;line-height:1.9">${productos}</div>

                  <div style="margin-top:20px;text-align:center">
                    <a href="https://www.mercadopago.com.ar/activities" style="display:inline-block;background:#009EE3;color:white;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600">Ver en MercadoPago</a>
                  </div>

                </div>
              </div>
            `,
          }),
        });
        console.log(`Email enviado a ${EMAIL_DESTINO} — pedido ${referencia}`);
      }
    }

    return res.status(200).end();

  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(200).end();
  }
}
