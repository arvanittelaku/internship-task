require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const app = express();
const PORT = process.env.PORT || 3000;
const GITHUB_TIMEOUT_MS = 10000;
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

const rateLimitStore = new Map();

const publicPath = path.join(__dirname, "public");

app.use(cors());
app.use(express.json());
app.use(express.static(publicPath));

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "unknown";
}

function checkRateLimit(ip) {
  const now = Date.now();
  let entry = rateLimitStore.get(ip);

  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimitStore.set(ip, entry);
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count += 1;
  return true;
}

function normalizeUsername(username) {
  return username.trim().toLowerCase();
}

function githubHeaders() {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "roast-my-github",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

async function githubFetch(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GITHUB_TIMEOUT_MS);

  try {
    return await fetch(url, {
      headers: githubHeaders(),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      const timeoutErr = new Error("GitHub request timed out");
      timeoutErr.code = "GITHUB_TIMEOUT";
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

function githubApiError(res) {
  const remaining = res.headers.get("x-ratelimit-remaining");

  if (res.status === 403 && remaining === "0") {
    return {
      status: 429,
      error:
        "GitHub rate limit hit (Render shares IPs). Add GITHUB_TOKEN in Render environment variables.",
    };
  }

  if (res.status === 403) {
    return {
      status: 403,
      error: "GitHub access denied. Check your GITHUB_TOKEN on the server.",
    };
  }

  console.error("GitHub API error:", res.status, res.statusText);
  return { status: 500, error: "Failed to fetch GitHub data" };
}

function buildSummary(profile, repos) {
  return {
    username: profile.login,
    name: profile.name || profile.login,
    bio: profile.bio,
    public_repos: profile.public_repos,
    followers: profile.followers,
    following: profile.following,
    account_created_year: new Date(profile.created_at).getFullYear(),
    repos: repos.map((repo) => ({
      name: repo.name,
      description: repo.description,
      language: repo.language,
      stargazers_count: repo.stargazers_count,
      forks_count: repo.forks_count,
      updated_at: repo.updated_at,
    })),
  };
}

const STYLE_PROMPTS = {
  savage:
    "You are a brutally honest but funny code reviewer. Your roasts are sharp, specific, and based only on real data. Never make things up.",
  corporate:
    "You are a passive-aggressive corporate manager writing a performance review. Use business jargon, buzzwords, and corporate speak to roast the developer.",
  pirate:
    "Ye be a salty pirate captain reviewing a landlubber's code. Speak in pirate dialect and roast their GitHub accordingly.",
  haiku:
    "You respond only in haiku format (5-7-5 syllables). Write 3-5 haikus that roast this developer's GitHub profile.",
  motivational:
    "You are an overly enthusiastic motivational speaker who roasts people by aggressively pointing out their flaws while pretending to be encouraging.",
};

async function generateRoast(summary, style) {
  const systemPrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.savage;

  const noReposNote =
    summary.repos.length === 0
      ? "\n\nImportant: this user has no public repos — roast them for hiding their code."
      : "";

  const userPrompt = `Roast this GitHub profile. Be specific — mention their actual repos, languages, commit patterns, follower count, and anything else that stands out. Keep it under 200 words. Be funny and specific, not generic.${noReposNote}

Profile data:
${JSON.stringify(summary, null, 2)}`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 500,
  });

  return completion.choices[0].message.content;
}

app.post("/api/roast", async (req, res) => {
  const { username, style } = req.body;

  if (!username || typeof username !== "string" || !username.trim()) {
    return res.status(400).json({ error: "Username is required" });
  }

  const clientIp = getClientIp(req);
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({
      error: "Slow down, you've roasted enough people today",
    });
  }

  const normalizedUsername = normalizeUsername(username);

  if (!process.env.GROQ_API_KEY) {
    return res.status(503).json({ error: "GROQ_API_KEY is not configured" });
  }

  try {
    const profileRes = await githubFetch(
      `https://api.github.com/users/${encodeURIComponent(normalizedUsername)}`
    );

    if (profileRes.status === 404) {
      return res.status(404).json({ error: "GitHub user not found" });
    }

    if (!profileRes.ok) {
      const err = githubApiError(profileRes);
      return res.status(err.status).json({ error: err.error });
    }

    const profile = await profileRes.json();

    const reposRes = await githubFetch(
      `https://api.github.com/users/${encodeURIComponent(normalizedUsername)}/repos?sort=updated&per_page=10`
    );

    if (!reposRes.ok) {
      const err = githubApiError(reposRes);
      return res.status(err.status).json({ error: err.error });
    }

    const repos = await reposRes.json();
    const summary = buildSummary(profile, repos);

    try {
      const roast = await generateRoast(summary, style);
      return res.json({ roast });
    } catch (llmErr) {
      console.error("Groq error:", llmErr);
      if (llmErr?.status === 401) {
        return res.status(500).json({ error: "Invalid Groq API key" });
      }
      return res.status(500).json({ error: "Failed to generate roast" });
    }
  } catch (err) {
    console.error("GitHub error:", err);

    if (err.code === "GITHUB_TIMEOUT") {
      return res.status(504).json({ error: "GitHub took too long to respond. Try again." });
    }

    return res.status(500).json({ error: "Failed to fetch GitHub data" });
  }
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    groqConfigured: Boolean(process.env.GROQ_API_KEY),
    githubTokenConfigured: Boolean(process.env.GITHUB_TOKEN),
  });
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Not found" });
  }
  res.sendFile(path.join(publicPath, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`roast-my-github running on port ${PORT}`);
});
