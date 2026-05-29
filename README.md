# Roast My GitHub 🔥

Ever wondered what your GitHub profile *really* says about you? This app pulls your public repos, hands the data to **Groq** (Llama 3 70B), and returns a roast that's actually based on your code — not generic "you code too much" nonsense. Pick a style (savage, corporate, pirate, whatever), enter a username, and take your lumps. Built for the [solution25](https://solution25.com) internship task.

**Live demo:** [REPLIT_URL_HERE]

---

## Run it locally

Should take under five minutes from a fresh clone.

```bash
git clone https://github.com/YOUR_USERNAME/roast-my-github.git
cd roast-my-github
npm install
cp .env.example .env
```

Open `.env` and add your keys:

| Variable | Required? | Where to get it |
|----------|-----------|-----------------|
| `GROQ_API_KEY` | Yes | [console.groq.com](https://console.groq.com/) |
| `GITHUB_TOKEN` | **Yes on Render** (recommended locally) | [github.com/settings/tokens](https://github.com/settings/tokens) — no scopes needed for public data; **required on Render** because shared IPs hit GitHub rate limits fast |

Then:

```bash
npm start
```

Open **http://localhost:3000** and roast someone. Try `@octocat` if you're feeling gentle.

**Deploy on Render:** import the repo, add `GROQ_API_KEY` and **`GITHUB_TOKEN`** in Environment (both required), hit Deploy. Check https://your-app.onrender.com/health — `githubTokenConfigured` should be `true`.

---

## What it does

- Fetches a GitHub user's **public profile** and their **10 most recently updated repos**
- Builds a summary (bio, followers, languages, stars, descriptions, etc.)
- Sends that to **Groq** (`llama-3.3-70b-versatile`) with a style-specific system prompt
- Returns a roast under ~200 words that cites **real repo names and stats** — the prompt tells the model not to invent data
- Handles edge cases: user not found, no public repos (still roasts them for "hiding their code"), GitHub timeouts, missing API key
- **5 roast styles:** Savage, Corporate, Pirate, Haiku, Motivational
- **Rate limit:** 10 roasts per IP per hour (in-memory — fine for a demo, not for production)
- Frontend validation, loading jokes, terminal-style output, copy-to-clipboard Share button

---

## Tech stack

- **Node.js + Express** — API and static file serving
- **GitHub REST API** — `node-fetch` with 5s timeout + optional Bearer token
- **Groq SDK** — Llama 3.3 70B Versatile for roasts
- **Vanilla HTML / CSS / JS** — no React, no build step, no drama
- **dotenv** + **cors**

---

## The Prompts I Used

Each style uses a different **system prompt**. The **user prompt** is the same for all styles (plus an extra line when someone has zero public repos).

### User prompt (shared)

```
Roast this GitHub profile. Be specific — mention their actual repos, languages, commit patterns, follower count, and anything else that stands out. Keep it under 200 words. Be funny and specific, not generic.

Profile data:
{JSON summary of profile + repos}
```

**When `repos` is empty**, this gets appended:

```
Important: this user has no public repos — roast them for hiding their code.
```

---

### Savage (default)

```
You are a brutally honest but funny code reviewer. Your roasts are sharp, specific, and based only on real data. Never make things up.
```

### Corporate

```
You are a passive-aggressive corporate manager writing a performance review. Use business jargon, buzzwords, and corporate speak to roast the developer.
```

### Pirate

```
Ye be a salty pirate captain reviewing a landlubber's code. Speak in pirate dialect and roast their GitHub accordingly.
```

### Haiku

```
You respond only in haiku format (5-7-5 syllables). Write 3-5 haikus that roast this developer's GitHub profile.
```

### Motivational

```
You are an overly enthusiastic motivational speaker who roasts people by aggressively pointing out their flaws while pretending to be encouraging.
```

---

## What I'd do with more time

- **GitHub contribution graph analysis** — pull commit frequency / green squares and roast people for "404 days without a commit"
- **Cache roasts by username** — same person + style shouldn't burn another Groq call every time
- **Hall of Shame** — public feed of the best roasts (with permission / opt-in, obviously)
- **Organization roasting** — `@company` repos, team dynamics, who's actually pushing code

---

## What surprised me

[ADD THIS AFTER BUILDING]

---

## Project structure

```
roast-my-github/
├── server.js          # Express API, GitHub fetch, Groq roast
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── .env.example
└── package.json
```

## License

MIT — roast responsibly.
