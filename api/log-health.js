const https = require('https');

const SUPABASE_HOST = 'ppeyzgzejqmooebqucnx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwZXl6Z3planFtb29lYnF1Y254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MTk5MzksImV4cCI6MjA5NDI5NTkzOX0.IqCXuzB_rNb94a1Incsy-eFlIJaHNW1rW1SYfOfMx48';
const AJ_USER_ID = '5e72f2e2-49d8-4efc-b773-f8b640115ed6';
const AJ_HOUSEHOLD_ID = '133bd7ed-b231-49d2-b233-7bcbfafc6ce9';
const SECRET = 'BOS-AJ-HEALTH-7k9xQ2mP';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { weight_lbs, body_fat_pct, sleep_hrs, steps, resting_cal, active_cal, date, token } = req.body || {};
  if (token !== SECRET) return res.status(401).json({ error: 'Unauthorized' });

  const logDate = date || new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

  const row = { user_id: AJ_USER_ID, household_id: AJ_HOUSEHOLD_ID, logged_date: logDate, source: 'apple_health' };
  if (parseFloat(weight_lbs) > 0) row.weight_lbs = parseFloat(parseFloat(weight_lbs).toFixed(1));
  if (parseFloat(body_fat_pct) > 0) row.body_fat_pct = parseFloat(parseFloat(body_fat_pct).toFixed(1));
  if (parseFloat(sleep_hrs) > 0) row.sleep_hrs = parseFloat(parseFloat(sleep_hrs).toFixed(2));
  if (parseInt(steps) > 0) row.steps = parseInt(steps);
  if (parseInt(resting_cal) > 0) row.resting_cal = parseInt(resting_cal);
  if (parseInt(active_cal) > 0) row.active_cal = parseInt(active_cal);

  const payload = JSON.stringify([row]);

  return new Promise(resolve => {
    const r = https.request({
      hostname: SUPABASE_HOST,
      path: '/rest/v1/body_logs?on_conflict=user_id,logged_date',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Prefer': 'resolution=merge-duplicates,return=minimal',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, apiRes => {
      let d = '';
      apiRes.on('data', c => d += c);
      apiRes.on('end', () => {
        if (apiRes.statusCode >= 400) {
          res.status(500).json({ error: 'Database error', detail: d });
        } else {
          res.status(200).json({ ok: true, date: logDate, weight_lbs: row.weight_lbs, body_fat_pct: row.body_fat_pct });
        }
        resolve();
      });
    });
    r.on('error', () => { res.status(503).json({ error: 'Database unavailable' }); resolve(); });
    r.write(payload);
    r.end();
  });
};
