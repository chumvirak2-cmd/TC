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

The assistant works in Local mode without credentials. To enable Gemini for open-ended questions, add `VITE_GEMINI_API_KEY` and optionally `VITE_GEMINI_MODEL` to `.env.local`, then restart Vite. Workflow commands such as creating tasks, opening modules, and generating templates continue to run locally. Because Vite exposes `VITE_*` values in the browser, use a restricted Gemini key and set API restrictions in Google AI Studio.
