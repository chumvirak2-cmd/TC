export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { request, data } = req.body || {};

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';

  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });
    return;
  }

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
      res.status(response.status).json({ error: result?.error?.message || 'Gemini request failed.' });
      return;
    }

    const text = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Gemini returned an empty response.';
    res.status(200).json({ text });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Unexpected Gemini API error.' });
  }
}
