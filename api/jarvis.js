const https = require('https');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'BOS-AUTH-010', message: 'Method not allowed' });

  const { messages, context } = req.body || {};
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'BOS-DATA-001', message: 'Messages required' });

  const system = `You are Jarvis, AI assistant for the Betancur Operating System. Expert in life management, business, health, biohacking, parenting, finances.
FAMILY: AJ Betancur (admin, ParkNest + Poof founder), Juliette Betancur (admin, pregnant week 13, due Nov 23 2026), Diana (baby, born Jan 7 2025).
PETS: Romeo (Doberman ~3yr), Nina (~10yr), 5 chickens. LOCATION: Tallahassee FL Eastern Time.
VEHICLE: 2020 Toyota RAV4 118172mi, oil due ~125172mi.
FINANCES: Income $9100/mo, bills $5984/mo, remaining $3116/mo.
BUSINESSES: ParkNest (parking tech, active), Poof (emotional decompression app, active), Garage Airbnb (setup).
OS STATE: ${context ? JSON.stringify(context) : 'loading'}.
Be proactive, concise for mobile, warm, reference real data.`;

  const payload = JSON.stringify({ model: 'claude-opus-4-5', max_tokens: 1024, system, messages });

  return new Promise(resolve => {
    const r = https.request({
      hostname: 'api.anthropic.com', path: '/v1/messages', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'Content-Length': Buffer.byteLength(payload) }
    }, apiRes => {
      let d = '';
      apiRes.on('data', c => d += c);
      apiRes.on('end', () => {
        try {
          const p = JSON.parse(d);
          if (p.error) { res.status(500).json({ error: 'BOS-AI-001', message: 'Jarvis error. Tap to retry.' }); }
          else { res.status(200).json(p); }
        } catch { res.status(500).json({ error: 'BOS-AI-001', message: 'Parse error' }); }
        resolve();
      });
    });
    r.on('error', () => { res.status(503).json({ error: 'BOS-AI-002', message: 'Jarvis unavailable.' }); resolve(); });
    r.setTimeout(30000, () => { r.destroy(); res.status(504).json({ error: 'BOS-AI-001', message: 'Jarvis timeout. Tap to retry.' }); resolve(); });
    r.write(payload); r.end();
  });
};
