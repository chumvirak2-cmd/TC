export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { request, data } = req.body || {};

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });
    return;
  }

  let lastError = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: 'You are the Smart Biz operations assistant. Give concise, practical answers based only on the supplied business snapshot. Never invent employee, payroll, or policy facts. If the request needs a data change, explain that the user should use the relevant module.' }],
          },
          contents: [{
            role: 'user',
            parts: [{
              text: `${request}\n\nBusiness snapshot:\n${JSON.stringify({
                employees: data.employees.map(({ name, role, team, status, score }) => ({ name, role, team, status, score })),
                pendingLeave: data.leaves.filter((item) => item.status === 'Pending').length,
                payroll: data.payroll.map(({ name, total, status }) => ({ name, total, status })),
                recruitment: data.recruitment,
                performance: data.performance,
              })}`,
            }],
          }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const message = result?.error?.message || 'Gemini request failed.';
        const transient = response.status === 429 || response.status === 500 || response.status === 503;

        if (transient && attempt < 3) {
          lastError = message;
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
          continue;
        }

        res.status(response.status).json({ error: message });
        return;
      }

      const text = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Gemini returned an empty response.';
      res.status(200).json({ text });
      return;
    } catch (error) {
      lastError = error.message || 'Unexpected Gemini API error.';
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        continue;
      }
      res.status(500).json({ error: lastError });
      return;
    }
  }

  res.status(503).json({ error: lastError || 'Gemini temporarily unavailable.' });
}
