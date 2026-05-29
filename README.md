# Roast My GitHub 🔥

Ever wondered what your GitHub profile *really* says about you? This app pulls your public repos, hands the data to **Groq** (Llama 3.3 70B), and returns a roast that's actually based on your code — not generic filler you could paste on any profile. Pick a style (savage, corporate, pirate, whatever), enter a username, and take your lumps. Built as part of an internship challenge — turns out roasting strangers' code is harder than it sounds.

**Live demo:** https://internship-task-hnbf.onrender.com/

---

## Run it locally

Should take under five minutes from a fresh clone.

```bash
git clone https://github.com/arvanittelaku/internship-task
cd roast-my-github
npm install
cp .env.example .env
```

Open `.env` and add your keys:

| Variable | Required? | Where to get it |
|----------|-----------|-----------------|
| `GROQ_API_KEY` | Yes | [console.groq.com](https://console.groq.com/) |
| `GITHUB_TOKEN` | Recommended | [github.com/settings/tokens](https://github.com/settings/tokens) — no scopes needed for public data; without it you hit GitHub's rate limit fast on shared IPs |

Then:

```bash
npm start
```

Open **http://localhost:3000** and roast someone. Try `octocat` if you're feeling gentle.

**Deploy on Render:** import the repo, add `GROQ_API_KEY` and `GITHUB_TOKEN` in Environment Variables, set start command to `node server.js`, hit Deploy.

---

## What it does

- Fetches a GitHub user's **public profile** and their **10 most recently updated repos**
- Builds a summary (bio, followers, languages, stars, descriptions, account age)
- Sends that to **Groq** (`llama-3.3-70b-versatile`) with a style-specific system prompt
- Returns a roast under ~200 words that cites **real repo names and stats**
- Returns "GitHub user not found" if the username doesn't exist — no crash, no hang
- Still roasts users with zero public repos — just with extra emphasis on the hiding
- **5 roast styles:** Savage, Corporate, Pirate, Haiku, Motivational
- **Rate limit:** 10 roasts per IP per hour (in-memory — fine for a demo)
- Frontend validation catches empty input and invalid characters before hitting the API
- Copy-to-clipboard Share button after every roast

---

## Tech stack

- **Node.js + Express** — API and static file serving
- **GitHub REST API** — native fetch with 10s timeout + optional Bearer token
- **Groq SDK** — Llama 3.3 70B Versatile for roast generation
- **Vanilla HTML / CSS / JS** — no React, no build step, no drama
- **dotenv** + **cors**

---

## The Prompts I Used

Each style uses a different **system prompt**. The **user prompt** is the same for all styles.

### User prompt (shared)
Roast this GitHub profile. Be specific — mention their actual repos, languages,
commit patterns, follower count, and anything else that stands out. Keep it under
200 words. Be funny and specific, not generic.
Profile data:
{JSON summary of profile + repos}

When the user has zero public repos, this line gets appended:
Important: this user has no public repos — roast them for hiding their code.

### Savage (default)
You are a brutally honest but funny code reviewer. Your roasts are sharp,
specific, and based only on real data. Never make things up.

### Corporate
You are a passive-aggressive corporate manager writing a performance review.
Use business jargon, buzzwords, and corporate speak to roast the developer.

### Pirate
Ye be a salty pirate captain reviewing a landlubber's code. Speak in pirate
dialect and roast their GitHub accordingly.

### Haiku
You respond only in haiku format (5-7-5 syllables). Write 3-5 haikus that
roast this developer's GitHub profile.

### Motivational
You are an overly enthusiastic motivational speaker who roasts people by
aggressively pointing out their flaws while pretending to be encouraging.

---

## What I'd do with more time

- **Contribution graph analysis** — pull commit frequency and roast people for "404 days without a commit"
- **Cache roasts by username + style** — same person shouldn't burn another API call every time
- **Hall of Shame** — public feed of the best roasts, opt-in obviously
- **Organization roasting** — point it at a company's repos and roast the whole team

---

## What surprised me

The system prompt style made a much bigger difference than I expected. Early versions of the corporate and motivational styles kept bleeding into each other — they both sounded vaguely sarcastic but not distinct. The fix was making each persona more specific and slightly absurd. Also, telling the model explicitly to cite real repo names was the single change that made every style feel personal instead of generic — without that instruction the roasts could have been about anyone.

---

## Project structure
roast-my-github/
├── server.js          # Express API, GitHub fetch, Groq roast generation
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── .env.example
└── package.json

## License

MIT — roast responsibly.