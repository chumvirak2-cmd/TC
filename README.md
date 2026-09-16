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
