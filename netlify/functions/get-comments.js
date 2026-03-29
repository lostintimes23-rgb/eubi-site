// Netlify Serverless Function — GET /netlify/functions/get-comments
// Reads submissions from the Netlify Forms "comments" form and returns
// them as sanitized JSON for the front-end to render.
//
// Requires NETLIFY_AUTH_TOKEN to be set in:
//   Netlify dashboard → Site configuration → Environment variables
//
// This runs server-side only — the token is never exposed to the browser.

const SITE_ID = '2ded4cc6-fa75-47e2-b361-a86a9f68c550';

exports.handler = async function () {
  const token = process.env.NETLIFY_AUTH_TOKEN;

  if (!token) {
    return respond(500, { error: 'NETLIFY_AUTH_TOKEN is not set in environment variables.' });
  }

  const headers = { Authorization: `Bearer ${token}` };

  try {
    // Step 1 — find the "comments" form registered for this site
    const formsRes = await fetch(
      `https://api.netlify.com/api/v1/sites/${SITE_ID}/forms`,
      { headers }
    );
    if (!formsRes.ok) throw new Error(`Forms list API returned ${formsRes.status}`);

    const forms       = await formsRes.json();
    const commentsForm = forms.find(f => f.name === 'comments');

    // Form not yet registered (no submissions + no deploy yet) → return empty
    if (!commentsForm) return respond(200, []);

    // Step 2 — fetch up to 50 most recent submissions, newest first
    const subsRes = await fetch(
      `https://api.netlify.com/api/v1/forms/${commentsForm.id}/submissions?per_page=50`,
      { headers }
    );
    if (!subsRes.ok) throw new Error(`Submissions API returned ${subsRes.status}`);

    const submissions = await subsRes.json();

    // Step 3 — map to safe display-only fields (never expose email)
    const comments = submissions.map(s => ({
      name:       sanitize(s.data.name)    || 'Anonymous',
      comment:    sanitize(s.data.comment) || '',
      created_at: s.created_at,
    }));

    return respond(200, comments);

  } catch (err) {
    console.error('[get-comments]', err.message);
    return respond(500, { error: err.message });
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────

function respond(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      // Allow the same-origin page to call this function
      'Access-Control-Allow-Origin': 'https://eubi-site.netlify.app',
    },
    body: JSON.stringify(body),
  };
}

// Strip any HTML tags from user-supplied strings before storing in JSON.
// The front-end also escapes on render — this is a defence-in-depth measure.
function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim().slice(0, 2000);
}

