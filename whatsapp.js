const https = require('https');

function sendWhatsAppText(to, body) {
  return new Promise((resolve, reject) => {
    const version = process.env.GRAPH_API_VERSION || 'v23.0';
    const phoneNumberId = process.env.PHONE_NUMBER_ID;
    const accessToken = process.env.META_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      return reject(new Error('PHONE_NUMBER_ID ou META_ACCESS_TOKEN não configurado.'));
    }

    const payload = JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        preview_url: false,
        body
      }
    });

    const req = https.request(
      {
        hostname: 'graph.facebook.com',
        path: `/${version}/${phoneNumberId}/messages`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          Authorization: `Bearer ${accessToken}`
        }
      },
      (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`Erro ao enviar mensagem (${res.statusCode}): ${data}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

module.exports = { sendWhatsAppText };
