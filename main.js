import './style.css';

// ── Floating particles ────────────────────────────────────────────────────
(function spawnParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  for (let i = 0; i < 60; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left              = Math.random() * 100 + 'vw';
    p.style.width             = (Math.random() * 3 + 1) + 'px';
    p.style.height            = p.style.width;
    p.style.animationDuration = (Math.random() * 12 + 8) + 's';
    p.style.animationDelay    = (Math.random() * 10) + 's';
    container.appendChild(p);
  }
})();

// ── Navbar shrink on scroll ───────────────────────────────────────────────
window.addEventListener('scroll', () => {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 60);
});

// ── Fade-in on scroll ─────────────────────────────────────────────────────
const fadeSelectors = [
  '.step-card', '.why-card', '.stat-card', '.roadmap-item',
  '.contact-card', '.community-panel', 'section h2',
  'blockquote', '.loop-badge', '.compare-table', '.numbers-note'
];
fadeSelectors.forEach(sel =>
  document.querySelectorAll(sel).forEach(el => el.classList.add('fade-in'))
);

const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 80);
      fadeObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.fade-in').forEach(el => fadeObserver.observe(el));

// ── Animated counters ─────────────────────────────────────────────────────
function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  const step   = 16;
  const inc    = target / (1800 / step);
  let cur = 0;
  const timer = setInterval(() => {
    cur += inc;
    if (cur >= target) { el.textContent = target; clearInterval(timer); }
    else el.textContent = Math.floor(cur);
  }, step);
}
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { animateCounter(e.target); counterObserver.unobserve(e.target); } });
}, { threshold: 0.5 });
document.querySelectorAll('.stat-num[data-target]').forEach(el => counterObserver.observe(el));

// ── Smooth scroll ─────────────────────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});

// ── Active nav highlight ──────────────────────────────────────────────────
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('nav ul a[href^="#"]');
window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(sec => { if (window.scrollY >= sec.offsetTop - 120) current = sec.id; });
  navLinks.forEach(a => { a.style.color = a.getAttribute('href') === '#' + current ? '#ffd700' : ''; });
});

// ── Star rating ───────────────────────────────────────────────────────────
const stars      = document.querySelectorAll('#rating-stars span');
const ratingInput = document.getElementById('rating-input');
stars.forEach(star => {
  star.addEventListener('click', () => {
    const val = parseInt(star.dataset.val);
    ratingInput.value = val;
    stars.forEach(s => s.classList.toggle('active', parseInt(s.dataset.val) <= val));
  });
  star.addEventListener('mouseenter', () => {
    const val = parseInt(star.dataset.val);
    stars.forEach(s => s.style.opacity = parseInt(s.dataset.val) <= val ? '1' : '0.35');
  });
});
document.getElementById('rating-stars')?.addEventListener('mouseleave', () => {
  const current = parseInt(ratingInput.value) || 0;
  stars.forEach(s => s.style.opacity = parseInt(s.dataset.val) <= current ? '1' : '0.35');
});

// ── Helpers ───────────────────────────────────────────────────────────────

// Escape user-supplied text before injecting into innerHTML.
// Prevents XSS even if the server-side sanitize() in the function missed something.
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// ── Comments display ──────────────────────────────────────────────────────

async function loadComments() {
  const list = document.getElementById('comments-list');
  if (!list) return;

  // Show loading state
  list.innerHTML = '<div class="comments-loading"><span class="comments-spinner"></span> Loading comments…</div>';

  try {
    const res = await fetch('/.netlify/functions/get-comments');
    if (!res.ok) throw new Error(`Function returned ${res.status}`);

    const comments = await res.json();

    if (!Array.isArray(comments) || comments.length === 0) {
      list.innerHTML = '<p class="comments-empty">No comments yet — be the first to share your thoughts!</p>';
      return;
    }

    list.innerHTML = comments.map(c => `
      <div class="comment-card">
        <div class="comment-header">
          <span class="comment-name">${escapeHtml(c.name)}</span>
          <span class="comment-date">${formatDate(c.created_at)}</span>
        </div>
        <div class="comment-text">${escapeHtml(c.comment)}</div>
      </div>
    `).join('');

  } catch (err) {
    console.error('[loadComments]', err);
    list.innerHTML = '<p class="comments-empty">Couldn\'t load comments right now — try refreshing.</p>';
  }
}

// Load on page open
loadComments();

// ── Form submissions (Netlify Forms via fetch) ────────────────────────────

// onSuccess is an optional callback invoked after a successful submission.
function handleForm(formId, successId, onSuccess) {
  const form    = document.getElementById(formId);
  const success = document.getElementById(successId);
  // Guard: if either element is missing, bail out silently
  if (!form || !success) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled    = true;
    btn.textContent = 'Sending...';

    try {
      // URLSearchParams correctly serializes all fields including the hidden
      // form-name field that Netlify requires to identify the form
      const body = new URLSearchParams(new FormData(form)).toString();
      const res  = await fetch('/', {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });

      // fetch() only throws on network errors — NOT on HTTP 4xx/5xx.
      // Check res.ok explicitly so a Netlify 404 (unregistered form) or
      // 500 is treated as a failure, not a silent success.
      if (!res.ok) throw new Error(`Netlify responded ${res.status}`);

      form.classList.add('hidden');
      success.classList.remove('hidden');
      if (typeof onSuccess === 'function') onSuccess();

    } catch (err) {
      console.error('[eubi-form]', err);
      btn.disabled    = false;
      btn.textContent = 'Try again — something went wrong';
    }
  });
}

// After posting a comment, reload the display so it appears immediately
handleForm('comment-form',  'comment-success', loadComments);
handleForm('feedback-form', 'feedback-success');

// ── Schematic tab switcher ────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    // Update panels
    document.querySelectorAll('.schematic-panel').forEach(panel => {
      panel.classList.toggle('hidden', panel.id !== `tab-${target}`);
    });
  });
});

