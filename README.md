# Smart Biz Management Workflow

Admin, HR, attendance, task, and AI workflow management built with React and Vite.

## Cloud Sync Setup

The app works in Local mode by default. To sync attendance and CMS changes between phones and the admin dashboard:

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env.local`.
4. Add the Supabase project URL and anon key.
5. Add the same variables to the Vercel project environment settings.
6. Redeploy the app.

The dashboard will show `Cloud sync` when the environment variables are active. Without them, it shows `Local mode` and keeps using browser storage.

For QR attendance, set `VITE_PUBLIC_APP_URL` to the deployed URL. Scanning a QR from a localhost development URL cannot work on an employee phone.

## Gemini Assistant Setup

The assistant works in Local mode without credentials. For production on Vercel, add the API key and model as server-side environment variables in your Vercel project settings:

- `GEMINI_API_KEY`
- `GEMINI_MODEL` (optional, defaults to `gemini-flash-latest`)

The app calls the secure endpoint in [api/gemini.js](api/gemini.js), which keeps the key off the browser and inside the Vercel runtime. If you use local development, you can also add these values to `.env.local` for testing, but do not expose them as `VITE_*` variables.

Workflow commands such as creating tasks, opening modules, and generating templates continue to run locally. For Google AI Studio, use a restricted Gemini key and set API restrictions to limit exposure.
