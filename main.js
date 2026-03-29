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

// ── Mobile hamburger menu ─────────────────────────────────────────────────
(function initHamburger() {
  const toggle  = document.querySelector('.nav-toggle');
  const menu    = document.querySelector('nav ul');
  if (!toggle || !menu) return;

  function closeMenu() {
    menu.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = '☰';
  }

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', isOpen);
    toggle.textContent = isOpen ? '✕' : '☰';
  });

  // Close when any nav link is tapped
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));

  // Close when tapping outside the navbar
  document.addEventListener('click', (e) => {
    if (!toggle.closest('nav').contains(e.target)) closeMenu();
  });
})();

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

// ── Community Board display ───────────────────────────────────────────────

// Generate a consistent hue for a name so each avatar has its own colour.
function nameToHue(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return h % 360;
}

function renderStars(rating) {
  if (!rating || rating < 1) return '';
  const filled = Math.min(5, Math.max(1, rating));
  return '⭐'.repeat(filled);
}

function renderPost(p) {
  const hue     = nameToHue(p.name);
  const initial = escapeHtml(p.name.charAt(0).toUpperCase());
  const name    = escapeHtml(p.name);
  const text    = escapeHtml(p.text);
  const date    = formatDate(p.created_at);

  const badge  = p.role
    ? `<span class="post-badge">${escapeHtml(p.role)}</span>`
    : '';
  const stars  = p.rating
    ? `<span class="post-stars">${renderStars(p.rating)}</span>`
    : '';
  const tag    = p.source === 'feedback'
    ? `<span class="post-type-tag feedback-tag">Feedback</span>`
    : `<span class="post-type-tag comment-tag">Comment</span>`;

  return `
    <div class="post-card">
      <div class="post-avatar" style="--hue:${hue}">${initial}</div>
      <div class="post-body">
        <div class="post-header">
          <span class="post-name">${name}</span>
          ${badge}
          ${stars}
          ${tag}
          <span class="post-date">${date}</span>
        </div>
        <div class="post-text">${text}</div>
      </div>
    </div>`;
}

async function loadComments() {
  const list = document.getElementById('comments-list');
  if (!list) return;

  list.innerHTML = '<div class="comments-loading"><span class="comments-spinner"></span> Loading posts…</div>';

  try {
    const res = await fetch('/api/comments');
    if (!res.ok) throw new Error(`API returned ${res.status}`);

    const posts = await res.json();

    if (!Array.isArray(posts) || posts.length === 0) {
      list.innerHTML = '<p class="comments-empty">No posts yet — be the first to share your thoughts!</p>';
      return;
    }

    list.innerHTML = posts.map(renderPost).join('');

  } catch (err) {
    console.error('[loadComments]', err);
    list.innerHTML = '<p class="comments-empty">Couldn\'t load posts right now — try refreshing.</p>';
  }
}

// Load on page open
loadComments();

// ── Form submissions (local Express API) ─────────────────────────────────────

// formId     — HTML id of the <form>
// successId  — HTML id of the success message element
// endpoint   — Express API path to POST to (e.g. '/api/comments')
// onSuccess  — optional callback after a successful submission
function handleForm(formId, successId, endpoint, onSuccess) {
  const form    = document.getElementById(formId);
  const success = document.getElementById(successId);
  if (!form || !success) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled    = true;
    btn.textContent = 'Sending...';

    try {
      const body = new URLSearchParams(new FormData(form)).toString();
      const res  = await fetch(endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });

      if (!res.ok) throw new Error(`Server responded ${res.status}`);

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
handleForm('comment-form',  'comment-success',  '/api/comments', loadComments);
handleForm('feedback-form', 'feedback-success', '/api/feedback');

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

