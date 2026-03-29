/**
 * server.js — Local Express server for E-UBI site
 * Serves the Vite production build (dist/) and provides a JSON API
 * that replaces the Netlify Serverless Functions + Netlify Forms.
 *
 * Start:  node server.js
 * Port:   3000  (set PORT env var to override)
 */

const express    = require('express');
const path       = require('path');
const fs         = require('fs');
const bodyParser = require('body-parser');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Path to the local JSON "database" ────────────────────────────────────────
const DATA_DIR  = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'comments.json');

// Ensure data/ and comments.json exist on first run
if (!fs.existsSync(DATA_DIR))  fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8');

// ── Helpers ───────────────────────────────────────────────────────────────────
function readPosts() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writePosts(posts) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(posts, null, 2), 'utf8');
}

// Strip HTML tags — same defence-in-depth approach as the old Netlify function
function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim().slice(0, 2000);
}

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // handles form-encoded bodies

// ── API routes ────────────────────────────────────────────────────────────────

// GET /api/comments — return all posts, newest first, capped at 100
app.get('/api/comments', (req, res) => {
  const posts = readPosts()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 100);
  res.json(posts);
});

// POST /api/comments — accept a new comment submission
app.post('/api/comments', (req, res) => {
  const body = req.body;
  const name = sanitize(body.name) || 'Anonymous';
  const text = sanitize(body.comment);

  if (!text) {
    return res.status(400).json({ error: 'Comment text is required.' });
  }

  const post = {
    source:     'comment',
    name,
    role:       null,
    rating:     null,
    text,
    created_at: new Date().toISOString(),
  };

  const posts = readPosts();
  posts.push(post);
  writePosts(posts);

  res.status(201).json({ ok: true });
});

// POST /api/feedback — accept a new feedback submission
app.post('/api/feedback', (req, res) => {
  const body    = req.body;
  const name    = sanitize(body.name)    || 'Anonymous';
  const role    = sanitize(body.role)    || null;
  const message = sanitize(body.message) || '';
  const rating  = parseInt(body.rating, 10) || null;

  // Only persist if there's an actual message
  if (message.trim().length > 0) {
    const post = {
      source: 'feedback',
      name,
      role,
      rating,
      text:       message,
      created_at: new Date().toISOString(),
    };
    const posts = readPosts();
    posts.push(post);
    writePosts(posts);
  }

  res.status(201).json({ ok: true });
});

// ── Static files (Vite production build) ─────────────────────────────────────
app.use(express.static(path.join(__dirname, 'dist')));

// Catch-all: send index.html for any unmatched route (SPA fallback)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ E-UBI server running at http://localhost:${PORT}`);
});

