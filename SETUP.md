# GyanSetu — Live Collab Room Setup

The collab room uses **Supabase Realtime** as its backend.
Supabase is free, runs in the cloud, and takes about 3 minutes to set up.
You don't need to install anything or write any server code.

---

## Step 1 — Create a free Supabase account

1. Open your browser and go to **https://supabase.com**
2. Click **"Start your project"** (top-right green button)
3. Sign up with GitHub or email — it's free, no credit card needed

---

## Step 2 — Create a new project

1. After signing in, click **"New project"**
2. Fill in:
   - **Name**: `gyansetu` (or anything you like)
   - **Database Password**: type any password (you won't need it)
   - **Region**: pick the one closest to you (e.g. South Asia → Singapore)
3. Click **"Create new project"**
4. Wait about 1 minute for it to finish setting up

---

## Step 3 — Get your API keys

1. In your project dashboard, click **"Project Settings"** (gear icon, bottom-left sidebar)
2. Click **"API"** in the left menu
3. You will see two things you need:

   | What it's called on screen | What to copy |
   |---|---|
   | **Project URL** | Something like `https://abcdefgh.supabase.co` |
   | **anon** **public** key | A very long string starting with `eyJ...` |

---

## Step 4 — Paste them into the config file

1. Open the file **`js/supabase-config.js`** in any text editor (Notepad, VS Code, etc.)
2. It looks like this:

```js
const SUPABASE_URL  = 'PASTE_YOUR_PROJECT_URL_HERE';
const SUPABASE_ANON = 'PASTE_YOUR_ANON_KEY_HERE';
```

3. Replace `PASTE_YOUR_PROJECT_URL_HERE` with your **Project URL**
4. Replace `PASTE_YOUR_ANON_KEY_HERE` with your **anon public key**
5. Save the file

Example of what it should look like after:
```js
const SUPABASE_URL  = 'https://abcdefgh.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...';
```

---

## Step 5 — Create the database table (30 seconds)

We need one small table to save the room state (code + whiteboard) so late joiners see the current content.

1. In your Supabase project dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. Paste this SQL and click **"Run"** (the green button):

```sql
create table if not exists room_state (
  room_id    text primary key,
  code       text default '',
  lang       text default 'javascript',
  canvas     text default '',
  updated_at timestamptz default now()
);

-- Allow anyone with the anon key to read and write (fine for a hackathon)
alter table room_state enable row level security;
create policy "public read"  on room_state for select using (true);
create policy "public write" on room_state for insert with check (true);
create policy "public update" on room_state for update using (true);
```

4. You should see **"Success. No rows returned"** — that means it worked ✅

**That's it.** You do not need to configure anything else in Supabase.

---

## Step 6 — Open the app

Since this is a plain HTML project (no build step), you need to open it through a local web server,
not by double-clicking the file (browsers block some features when opening files directly).

**Easiest way — use VS Code Live Server:**
1. Install the **"Live Server"** extension in VS Code
2. Right-click `index.html` → **"Open with Live Server"**
3. It opens at `http://127.0.0.1:5500`

**Alternative — Python (already installed on most computers):**
```
# In the Gyan-Setu folder, run:
python -m http.server 5500
# Then open http://localhost:5500 in your browser
```

---

## Step 7 — Test with two laptops

1. Both laptops open the same URL (e.g. `http://localhost:5500/room.html` if on the same WiFi,
   or deploy to GitHub Pages / Netlify for anywhere-in-the-world access)
2. Both type the **same Room ID** (e.g. `test-room-1`)
3. Type in the code editor on one laptop — it appears on the other instantly ✅

---

## Is the anon key safe to share?

Yes. The **anon key** is a public key — it's designed to be visible in frontend code.
It only allows connecting to your Realtime channels, not reading/writing your database
(unless you explicitly grant that, which we haven't done).

---

## Free tier limits (more than enough for a hackathon)

| Feature | Free limit |
|---|---|
| Realtime messages | 2 million / month |
| Concurrent connections | 200 |
| Projects | 2 |

---

## Deploying so anyone can access it (optional)

To make the room accessible from **any laptop, anywhere** (not just same WiFi):

1. Push the project to GitHub
2. Go to **https://netlify.com** → "Add new site" → "Import from Git"
3. Select your repo, click Deploy
4. Done — you get a public URL like `https://gyansetu.netlify.app`
5. Share `https://gyansetu.netlify.app/room.html?room=your-room-id` with anyone
