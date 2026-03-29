// Netlify Serverless Function — GET /.netlify/functions/get-comments
// Returns a unified, date-sorted public feed from BOTH the "comments" and
// "feedback" Netlify Forms so the front-end can render a Reddit-style board.
//
// Requires NETLIFY_AUTH_TOKEN in Netlify → Site config → Environment variables.
// Runs server-side only — the token is never sent to the browser.

const SITE_ID = '2ded4cc6-fa75-47e2-b361-a86a9f68c550';

exports.handler = async function () {
  const token = process.env.NETLIFY_AUTH_TOKEN;
  if (!token) {
    return respond(500, { error: 'NETLIFY_AUTH_TOKEN is not configured.' });
  }

  const authHeaders = { Authorization: `Bearer ${token}` };

  try {
    // ── 1. Fetch the registered forms list for this site ──────────────────
    const formsRes = await fetch(
      `https://api.netlify.com/api/v1/sites/${SITE_ID}/forms`,
      { headers: authHeaders }
    );
    if (!formsRes.ok) throw new Error(`Forms API ${formsRes.status}`);
    const forms = await formsRes.json();

    // ── 2. Pull submissions for each form in parallel ─────────────────────
    const commentsForm = forms.find(f => f.name === 'comments');
    const feedbackForm = forms.find(f => f.name === 'feedback');

    const [commentSubs, feedbackSubs] = await Promise.all([
      fetchSubs(commentsForm, authHeaders),
      fetchSubs(feedbackForm,  authHeaders),
    ]);

    // ── 3. Map to unified post shape (email is always excluded) ──────────
    const commentPosts = commentSubs.map(s => ({
      source:     'comment',
      name:       sanitize(s.data.name)    || 'Anonymous',
      role:       null,
      rating:     null,
      text:       sanitize(s.data.comment) || '',
      created_at: s.created_at,
    }));

    const feedbackPosts = feedbackSubs
      // Only show feedback that has an actual message — skip blank survey entries
      .filter(s => s.data.message && s.data.message.trim().length > 0)
      .map(s => ({
        source:     'feedback',
        name:       sanitize(s.data.name)    || 'Anonymous',
        role:       sanitize(s.data.role)    || null,
        rating:     parseInt(s.data.rating, 10) || null,
        text:       sanitize(s.data.message) || '',
        created_at: s.created_at,
      }));

    // ── 4. Merge and sort newest-first ────────────────────────────────────
    const posts = [...commentPosts, ...feedbackPosts]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 100); // cap at 100 public posts

    return respond(200, posts);

  } catch (err) {
    console.error('[get-comments]', err.message);
    return respond(500, { error: err.message });
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────

async function fetchSubs(form, headers) {
  if (!form) return []; // form not yet registered → no submissions
  const res = await fetch(
    `https://api.netlify.com/api/v1/forms/${form.id}/submissions?per_page=100`,
    { headers }
  );
  if (!res.ok) throw new Error(`Submissions API ${res.status} for form ${form.name}`);
  return res.json();
}

function respond(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

// Strip HTML tags server-side (front-end also escapes — defence in depth).
function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim().slice(0, 2000);
}

