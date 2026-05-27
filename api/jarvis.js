const https = require('https');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'BOS-AUTH-010' });

  const { messages, context } = req.body || {};
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'BOS-DATA-001' });

  const ctx = context || {};

  // Build workout history section
  const workoutNotes = ctx.workout_notes_by_day && typeof ctx.workout_notes_by_day === 'object'
    ? Object.entries(ctx.workout_notes_by_day).map(([day, notes]) => `  ${day}: ${notes}`).join('\n')
    : (ctx.workout_notes_by_day || 'No workout notes logged yet');

  const system = `You are Jarvis, the AI brain of the Betancur Family Operating System. You are a personal coach, financial advisor, and family assistant rolled into one.

=== TODAY ===
- Date: ${ctx.today_date || 'unknown'} (${ctx.today_day || 'unknown day'})
- Location: Tallahassee, FL (Eastern Time)
- ALWAYS use this date when the user asks what day or date it is. Never guess.

=== FAMILY ===
- AJ Betancur: admin, founder of ParkNest (parking tech) and Poof (consumer app). Your main user.
- Juliette Betancur: admin, pregnant week ${ctx.preg_week || '13'}, due Nov 23 2026
- Diana Betancur: baby, ${ctx.diana_months || '4'} months old (born Jan 7 2025)

=== FINANCES ===
- AJ income: $${ctx.income_aj || 4550}/mo | Juliette income: $${ctx.income_juliette || 4550}/mo
- Household: $${ctx.household_income || 9100}/mo
- Total bills: $${ctx.bills_total || 0}/mo | Remaining: $${ctx.remaining || 0}/mo

=== AJ'S MAIN GOAL ===
${ctx.main_goal || 'Not set — ask AJ to set it in Health > Goals tab'}

=== BODY METRICS ===
- Current weight: ${ctx.current_weight || 'Not logged'}
- Body fat: ${ctx.current_bf || 'Not logged'}

=== NUTRITION RULES ===
${ctx.nutrition_rules || 'Not set — ask AJ to set rules in Health > Goals > Nutrition'}

=== FASTING SCHEDULE ===
${ctx.fasting || 'Not set — ask AJ to set in Health > Goals > Fasting'}

=== WORKOUT SPLIT ===
${ctx.workout_split || 'Not loaded yet'}

=== RECENT SESSIONS (last 10) ===
${ctx.recent_sessions || 'No sessions logged yet'}

=== WORKOUT NOTES BY DAY (exercises, weights, reps, duration, energy) ===
${workoutNotes}

=== PERSONAL RECORDS / MAX LIFTS ===
${ctx.personal_records || 'None logged yet - ask AJ to add them in Health > PRs tab'}

=== SUPPLEMENTS ===
Today: ${ctx.supps_today || '0 of 0 taken'}
Stack: ${ctx.supplements || 'none logged'}

=== STATUS ===
- Chores pending: ${ctx.chores_pending || 0}
- Grocery items left: ${ctx.grocery_items || 0}
- Open business tasks: ${ctx.open_biz_tasks || 0}
- This week sessions: ${ctx.this_week_sessions || 0} | Total ever: ${ctx.total_sessions_logged || 0}

=== YOUR JOB ===
- ALWAYS know today's date and day from the TODAY section — never hallucinate or guess dates
- Respond in clean, organized sections when the answer is detailed. Use headers, bullets, and clear structure
- Give ONE focused response — do not answer questions the user didn't ask
- If workout_notes_by_day shows actual data, USE IT for progressive overload (e.g. "Last Monday you hit Bench 185x8, aim for 190x8 today")
- Reference AJ's main goal and nutrition rules when relevant to keep him on track
- Be concise for mobile, warm, real — you know this family personally`;

  const payload = JSON.stringify({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    system,
    messages
  });

  return new Promise(resolve => {
    const r = https.request({
      hostname: 'api.anthropic.com', path: '/v1/messages', method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, apiRes => {
      let d = '';
      apiRes.on('data', c => d += c);
      apiRes.on('end', () => {
        try {
          const p = JSON.parse(d);
          if (p.error) res.status(500).json({ error: 'BOS-AI-001', message: 'Jarvis error. Tap to retry.' });
          else res.status(200).json(p);
        } catch { res.status(500).json({ error: 'BOS-AI-001', message: 'Parse error' }); }
        resolve();
      });
    });
    r.on('error', () => { res.status(503).json({ error: 'BOS-AI-002', message: 'Jarvis unavailable.' }); resolve(); });
    r.setTimeout(30000, () => { r.destroy(); res.status(504).json({ error: 'BOS-AI-001', message: 'Timeout.' }); resolve(); });
    r.write(payload);
    r.end();
  });
};
