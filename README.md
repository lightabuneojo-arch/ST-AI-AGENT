# AI Lecture Tutor

A Next.js study companion that analyzes one uploaded DOCX/PPTX and helps a student begin studying its topics.

## Run the web app

Use Node.js 22.13 or newer. This workspace currently uses Node.js 24.15.0.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open <http://localhost:3000>. Edit `.env.local` with the Supabase function URL, project publishable key, and the same `TUTOR_GATE_SECRET` configured for the Edge Function. `.env.local` is ignored by Git. Do not add the Gemini key here; it belongs in Supabase Function secrets.

## Connect the Supabase tutor function

The browser calls the Next.js server route. The server route forwards validated requests to the Supabase Edge Function with the private `TUTOR_GATE_SECRET`. The function checks that secret before it calls Gemini.

1. Create or select a Supabase project. This prototype does not create tables, use Supabase Auth, or store uploaded materials in a database or storage bucket.
2. Install the [Supabase CLI](https://supabase.com/docs/guides/cli), authenticate with `supabase login`, and link this folder with `supabase link --project-ref <project-id>`.
3. In the Supabase Dashboard, open Edge Function Secrets and set `GEMINI_API_KEY`, `GEMINI_MODEL` to `gemini-3.8-flash`, and `TUTOR_GATE_SECRET`. Generate a long random gate secret, put it in the dashboard, and put the same value in `.env.local`. Never paste either secret into browser code or commit it.
4. Deploy the function with `supabase functions deploy tutor --use-api`.
5. In `.env.local`, set `SUPABASE_TUTOR_FUNCTION_URL` to `https://<project-id>.supabase.co/functions/v1/tutor` and `SUPABASE_PUBLISHABLE_KEY` to the project’s publishable key from Supabase API settings.
6. Restart `npm run dev` after changing `.env.local`.

The mock Sign Up and Log In forms are only a demo entry point; they do not create accounts. The Next.js route applies a small local-demo request limit. It is not a production abuse-control system.

## First build slice

The upload flow parses `.docx` and `.pptx` in the browser using `officeparser`, including image/chart attachments. It sends extracted text and supported visuals to the tutor for a grounded topic map. The material and topic map stay in the active tab’s memory and are lost when the tab is closed or refreshed.

Gemini's free tier has usage limits and data-use terms. Do not upload confidential or sensitive course material to the prototype unless you are comfortable with Google's stated use of unpaid-tier prompts and responses.
