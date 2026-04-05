// CuidadoTotal — Backend MercadoPago Checkout Pro
// Función serverless para Vercel

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
  if (!MP_TOKEN) return res.status(500).json({ error: 'Token de MercadoPago no configurado' });

  try {
    const { items, comprador } = req.body;

    if (!items?.length || !comprador?.nombre || !comprador?.tel || !comprador?.direccion) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const BASE_URL = process.env.BASE_URL || 'https://cuidadototal.vercel.app';

    const preferencia = {
      items: items.map(i => ({
        title: i.nombre,
        quantity: Number(i.qty),
        unit_price: Number(i.precio),
        currency_id: 'ARS',
      })),
      payer: {
        name: comprador.nombre,
        phone: { number: comprador.tel },
      },
      back_urls: {
        success: `${BASE_URL}?pago=aprobado`,
        failure: `${BASE_URL}?pago=rechazado`,
        pending: `${BASE_URL}?pago=pendiente`,
      },
      auto_return: 'approved',
      statement_descriptor: 'CUIDADOTOTAL',
      external_reference: `CT-${Date.now()}`,
      metadata: {
        nombre: comprador.nombre,
        tel: comprador.tel,
        direccion: comprador.direccion,
      },
    };

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferencia),
    });

    if (!mpRes.ok) {
      const err = await mpRes.text();
      console.error('MP Error:', err);
      return res.status(mpRes.status).json({ error: 'Error al crear preferencia de pago' });
    }

    const data = await mpRes.json();

    return res.status(200).json({
      init_point: data.init_point,
      preference_id: data.id,
    });

  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
