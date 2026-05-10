/* ============================================================
   NEPAL ROAD TRAFFIC GUIDE — MAIN APP
   ============================================================ */

'use strict';

// ── Language ────────────────────────────────────────────────
let currentLang = localStorage.getItem('lang') || 'en';

function applyLang(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
  document.documentElement.lang = lang === 'np' ? 'ne' : 'en';
  document.body.classList.toggle('lang-np', lang === 'np');

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (T[lang][key] !== undefined) {
      el.textContent = T[lang][key];
    }
  });

  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.dataset.i18nHtml;
    if (T[lang][key] !== undefined) {
      el.innerHTML = T[lang][key];
    }
  });

  // Sign names & descs
  document.querySelectorAll('.sign-card').forEach(card => {
    const sign = card.dataset.sign;
    if (!sign) return;
    const nameEl = card.querySelector('.sign-name');
    const descEl = card.querySelector('.sign-back-desc');
    if (nameEl && T[lang]['sign-' + sign]) nameEl.textContent = T[lang]['sign-' + sign];
    if (descEl && T[lang]['sign-' + sign + '-desc']) descEl.textContent = T[lang]['sign-' + sign + '-desc'];
  });

  // Update lang buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });

  // Update light info if visible
  const activeLight = document.querySelector('.light-info-content.active');
  if (activeLight) {
    const lightKey = activeLight.dataset.light;
    updateLightPanel(lightKey);
  }

  // Rebuild quiz for new lang
  currentQuiz = 0;
  quizScore = 0;
  showQuizStart();

  // Update no-overtake list
  renderNoOvertakeList();

  // Update overtaking steps
  renderOvertakeStep(currentStep);

  // Update flash cards
  renderFlashCards();

  // Update indicator cards
  renderIndicatorCards();
}

// ── Navbar ──────────────────────────────────────────────────
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });

  // Hamburger
  const ham = document.querySelector('.hamburger');
  const mobileNav = document.querySelector('.mobile-nav');
  const closeBtn = document.querySelector('.mobile-nav-close');
  if (ham && mobileNav) {
    ham.addEventListener('click', () => mobileNav.classList.add('open'));
    closeBtn?.addEventListener('click', () => mobileNav.classList.remove('open'));
    mobileNav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => mobileNav.classList.remove('open'));
    });
  }

  // Lang buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => applyLang(btn.dataset.lang));
  });
}

// ── Hero Stars ───────────────────────────────────────────────
function initStars() {
  const container = document.querySelector('.hero-stars');
  if (!container) return;
  const count = 80;
  for (let i = 0; i < count; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    const size = Math.random() * 3 + 1;
    star.style.cssText = `
      width:${size}px;height:${size}px;
      left:${Math.random()*100}%;
      top:${Math.random()*80}%;
      --op:${Math.random()*0.6+0.2};
      --dur:${Math.random()*3+2}s;
      animation-delay:${Math.random()*3}s;
    `;
    container.appendChild(star);
  }
}

// ── Mountains SVG ────────────────────────────────────────────
function initMountains() {
  const el = document.querySelector('.hero-mountains');
  if (!el) return;
  el.innerHTML = `
  <svg viewBox="0 0 1440 300" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style="width:100%;height:100%;display:block;">
    <defs>
      <linearGradient id="mtn1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1a2240"/>
        <stop offset="100%" stop-color="#0a0e1a"/>
      </linearGradient>
      <linearGradient id="mtn2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#12182b"/>
        <stop offset="100%" stop-color="#0a0e1a"/>
      </linearGradient>
      <linearGradient id="mtn3" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0a0e1a"/>
        <stop offset="100%" stop-color="#0a0e1a"/>
      </linearGradient>
    </defs>
    <!-- Far mountains -->
    <path d="M0,300 L0,200 L120,90 L250,170 L380,60 L500,150 L620,80 L720,140 L840,50 L950,130 L1080,70 L1200,160 L1300,90 L1440,180 L1440,300 Z" fill="url(#mtn1)" opacity="0.5"/>
    <!-- Mid mountains -->
    <path d="M0,300 L0,240 L80,160 L180,220 L280,130 L400,200 L500,120 L600,190 L700,110 L800,180 L900,100 L1020,200 L1130,130 L1260,210 L1380,140 L1440,200 L1440,300 Z" fill="url(#mtn2)" opacity="0.7"/>
    <!-- Foreground hills -->
    <path d="M0,300 L0,260 L100,200 L220,260 L340,190 L460,255 L560,195 L680,260 L780,200 L900,265 L1040,210 L1180,260 L1320,205 L1440,250 L1440,300 Z" fill="url(#mtn3)"/>
  </svg>`;
}

// ── GSAP Hero Animations ─────────────────────────────────────
function initHeroGSAP() {
  if (typeof gsap === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  const tl = gsap.timeline({ delay: 0.3 });
  tl.from('.hero-badge', { opacity: 0, y: 30, duration: 0.6, ease: 'power3.out' })
    .from('.hero-title', { opacity: 0, y: 50, duration: 0.8, ease: 'power3.out' }, '-=0.3')
    .from('.hero-subtitle', { opacity: 0, y: 30, duration: 0.6, ease: 'power3.out' }, '-=0.5')
    .from('.hero-cta .btn', { opacity: 0, y: 20, stagger: 0.15, duration: 0.5, ease: 'power2.out' }, '-=0.3')
    .from('.hero-scroll', { opacity: 0, duration: 0.5 }, '-=0.2');

  // Parallax on scroll
  gsap.to('.hero-mountains', {
    yPercent: 30,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
  });
  gsap.to('.hero-content', {
    yPercent: 25,
    opacity: 0.3,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
  });
}

// ── Scroll reveal ────────────────────────────────────────────
function initReveal() {
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.utils.toArray('.reveal').forEach((el, i) => {
      gsap.fromTo(el,
        { opacity: 0, y: 50 },
        {
          opacity: 1, y: 0, duration: 0.7, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' },
          delay: (i % 4) * 0.08
        }
      );
    });
    // Stagger children
    gsap.utils.toArray('.stagger-children').forEach(parent => {
      const kids = parent.children;
      gsap.fromTo(kids,
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0, stagger: 0.07, duration: 0.6, ease: 'power2.out',
          scrollTrigger: { trigger: parent, start: 'top 85%', toggleActions: 'play none none none' }
        }
      );
    });
  } else {
    // Fallback IntersectionObserver
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  }
}

// ── Stats counter ────────────────────────────────────────────
function initStats() {
  if (typeof gsap === 'undefined') return;
  ScrollTrigger.create({
    trigger: '.stats-bar',
    start: 'top 80%',
    once: true,
    onEnter: () => {
      gsap.from('.stat-card', { opacity: 0, y: 30, stagger: 0.12, duration: 0.6, ease: 'power2.out' });
    }
  });
}

// ── Signs Section ─────────────────────────────────────────────
function initSigns() {
  const tabs = document.querySelectorAll('.tab-btn');
  const cards = document.querySelectorAll('.sign-card');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const cat = tab.dataset.cat;
      cards.forEach(card => {
        if (cat === 'all' || card.dataset.cat === cat) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });
    });
  });

  // Click to flip (toggle)
  cards.forEach(card => {
    card.addEventListener('click', () => {
      card.classList.toggle('flipped');
    });
  });
}

// ── Car Light Diagram ─────────────────────────────────────────
const lightData = {
  'lowbeam': { icon: '💡', colorClass: 'yellow' },
  'highbeam': { icon: '🔆', colorClass: 'bright-yellow' },
  'leftind': { icon: '◀️', colorClass: 'orange' },
  'rightind': { icon: '▶️', colorClass: 'orange' },
  'hazard': { icon: '⚠️', colorClass: 'orange' },
  'brake': { icon: '🔴', colorClass: 'red' },
  'reverse': { icon: '⬜', colorClass: 'white' },
  'tail': { icon: '🔴', colorClass: 'red' },
  'parking': { icon: '🅿️', colorClass: 'amber' },
};

function updateLightPanel(key) {
  const lang = currentLang;
  document.querySelectorAll('.light-info-content').forEach(el => el.classList.remove('active'));
  document.querySelector('.light-info-default')?.classList.remove('active');

  const panel = document.querySelector(`.light-info-content[data-light="${key}"]`);
  if (!panel) return;

  panel.querySelector('.light-info-name').textContent = T[lang][`light-${key}-name`] || '';
  panel.querySelector('.light-info-when').textContent = T[lang][`light-${key}-when`] || '';
  panel.querySelector('.light-info-desc').textContent = T[lang][`light-${key}-desc`] || '';
  panel.querySelector('.light-info-tip').innerHTML = `<span class="tip-icon">💡</span><span>${T[lang][`light-${key}-tip`] || ''}</span>`;
  panel.querySelector('.light-info-icon').textContent = lightData[key]?.icon || '💡';

  panel.classList.add('active');

  // Highlight the active light group in the SVG
  document.querySelectorAll('.light-group').forEach(g => g.classList.remove('selected'));
  document.querySelectorAll(`.light-group[data-light="${key}"]`).forEach(g => g.classList.add('selected'));
}

function initCarDiagram() {
  // View toggle
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const view = btn.dataset.view;
      document.querySelectorAll('.car-view').forEach(v => v.classList.remove('active'));
      document.querySelector(`.car-view[data-view="${view}"]`)?.classList.add('active');
    });
  });

  // Light group clicks
  document.querySelectorAll('.light-group').forEach(g => {
    g.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = g.dataset.light;
      updateLightPanel(key);

      if (typeof gsap !== 'undefined') {
        gsap.from(`.light-info-content[data-light="${key}"]`, { opacity: 0, x: 20, duration: 0.4, ease: 'power2.out' });
      }
    });
  });
}

// ── Flash Cards ───────────────────────────────────────────────
function renderFlashCards() {
  const lang = currentLang;
  const grid = document.querySelector('.flash-grid');
  if (!grid) return;
  const keys = ['s1','s2','s3','s4'];
  const icons = ['⚡','🚗','⚠️','🤝'];
  grid.innerHTML = keys.map((k,i) => `
    <div class="flash-card reveal">
      <div class="flash-num">${i+1}</div>
      <div class="flash-scenario">${T[lang][`flash-${k}-scenario`]||''}</div>
      <h3>${T[lang][`flash-${k}-title`]||''}</h3>
      <p>${T[lang][`flash-${k}-desc`]||''}</p>
      <div class="flash-reply">${T[lang][`flash-${k}-reply`]||''}</div>
    </div>
  `).join('');
}

// ── Indicators ────────────────────────────────────────────────
function renderIndicatorCards() {
  const lang = currentLang;
  const grid = document.querySelector('.indicators-grid');
  if (!grid) return;

  const configs = [
    { key:'s1', icon:'↰↱', cls:'left', keys:['left','right','note'] },
    { key:'s2', icon:'⇆', cls:'right', keys:['left','right','note'] },
    { key:'s3', icon:'⭕', cls:'roundabout', keys:['enter','exit','note'] },
    { key:'s4', icon:'🅿', cls:'parking', keys:['park','move','note'] },
  ];

  grid.innerHTML = configs.map(c => `
    <div class="indicator-card reveal">
      <div class="ind-icon ${c.cls}">${c.icon}</div>
      <h3>${T[lang][`ind-${c.key}-title`]||''}</h3>
      ${c.keys.slice(0,-1).map(sub => `
        <div class="ind-rule">
          <span class="ind-rule-icon">${sub==='left'?'◀':'▶'}</span>
          <span>${T[lang][`ind-${c.key}-${sub}`]||''}</span>
        </div>
      `).join('')}
      <div class="ind-note">${T[lang][`ind-${c.key}-note`]||''}</div>
    </div>
  `).join('') + `
    <div class="indicator-card highlight reveal" style="grid-column:1/-1">
      <div class="ind-icon allow">🚦</div>
      <h3>${T[lang]['ind-s5-title']||''}</h3>
      <p style="margin-bottom:0.75rem;color:var(--text-mid);font-size:0.95rem;line-height:1.7;">${T[lang]['ind-s5-desc']||''}</p>
      <div class="ind-note">${T[lang]['ind-s5-note']||''}</div>
    </div>
  `;
}

// ── Overtaking Steps ──────────────────────────────────────────
const TOTAL_STEPS = 9;
let currentStep = 0;

const stepAnimations = [
  // Step 0: Initial state
  (ego) => {
    gsap.to(ego, { left: '80px', top: '50%', yPercent: -50, duration: 0.5 });
    hideIndicators(ego);
    showLabel('Check mirrors carefully');
  },
  // Step 1: Right indicator
  (ego) => {
    showRightIndicator(ego);
    showLabel('RIGHT indicator ON');
  },
  // Step 2: Flash headlights
  (ego) => {
    showRightIndicator(ego);
    flashEffect(ego);
    showLabel('Flash headlights (optional)');
  },
  // Step 3: Check gap
  (ego) => {
    showRightIndicator(ego);
    showLabel('Check clear gap ahead');
  },
  // Step 4: Move right
  (ego) => {
    gsap.to(ego, { top: '35%', yPercent: -50, duration: 0.8, ease: 'power2.inOut' });
    showRightIndicator(ego);
    showLabel('Move to right lane');
  },
  // Step 5: Accelerate and pass
  (ego) => {
    gsap.to(ego, { left: '320px', top: '35%', yPercent: -50, duration: 1, ease: 'power2.inOut' });
    showRightIndicator(ego);
    showLabel('Pass with 1m+ clearance');
  },
  // Step 6: Left indicator
  (ego) => {
    gsap.to(ego, { left: '420px', duration: 0.6, ease: 'power2.out' });
    hideIndicators(ego);
    showLeftIndicator(ego);
    showLabel('LEFT indicator ON — returning to lane');
  },
  // Step 7: Return to left lane
  (ego) => {
    gsap.to(ego, { top: '50%', yPercent: -50, duration: 0.8, ease: 'power2.inOut' });
    showLeftIndicator(ego);
    showLabel('Return to left lane smoothly');
  },
  // Step 8: Done
  (ego) => {
    hideIndicators(ego);
    showLabel('Cancel indicator ✓ Overtake complete!');
  },
];

function showLabel(text) {
  const label = document.querySelector('.road-label');
  if (label) {
    label.textContent = text;
    gsap.from(label, { opacity: 0, y: -10, duration: 0.3, ease: 'power2.out' });
  }
}

function showRightIndicator(ego) {
  const ri = ego.querySelector('.car-indicator-right');
  const li = ego.querySelector('.car-indicator-left');
  if (ri) ri.style.display = 'block';
  if (li) li.style.display = 'none';
}
function showLeftIndicator(ego) {
  const ri = ego.querySelector('.car-indicator-right');
  const li = ego.querySelector('.car-indicator-left');
  if (ri) ri.style.display = 'none';
  if (li) li.style.display = 'block';
}
function hideIndicators(ego) {
  ego.querySelector('.car-indicator-right')?.style && (ego.querySelector('.car-indicator-right').style.display = 'none');
  ego.querySelector('.car-indicator-left')?.style && (ego.querySelector('.car-indicator-left').style.display = 'none');
}
function flashEffect(ego) {
  if (typeof gsap !== 'undefined') {
    const tl = gsap.timeline({ repeat: 2 });
    tl.to(ego, { filter: 'brightness(2)', duration: 0.1 })
      .to(ego, { filter: 'brightness(1)', duration: 0.1 });
  }
}

function renderOvertakeStep(step) {
  const lang = currentLang;
  const key = `ov-s${step+1}`;
  const info = document.querySelector('.step-info');
  if (!info) return;
  info.querySelector('.step-number').textContent = `${T[lang]['step'] || 'Step'} ${step+1} / ${TOTAL_STEPS}`;
  info.querySelector('h3').textContent = T[lang][`${key}-title`] || '';
  info.querySelector('p').textContent = T[lang][`${key}-desc`] || '';

  // Progress dots
  document.querySelectorAll('.step-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === step);
    dot.classList.toggle('done', i < step);
  });

  // Buttons
  const prevBtn = document.querySelector('.step-prev');
  const nextBtn = document.querySelector('.step-next');
  if (prevBtn) prevBtn.disabled = step === 0;
  if (nextBtn) nextBtn.disabled = step === TOTAL_STEPS - 1;

  // Animate car
  const ego = document.querySelector('.car-ego');
  if (ego && typeof gsap !== 'undefined') {
    stepAnimations[step]?.(ego);
  }
}

function renderNoOvertakeList() {
  const lang = currentLang;
  const grid = document.querySelector('.no-overtake-grid');
  if (!grid) return;
  const items = T[lang]['noovertake-items'] || [];
  grid.innerHTML = items.map(item => `<div class="no-item">${item}</div>`).join('');
}

function initOvertaking() {
  renderOvertakeStep(0);
  renderNoOvertakeList();

  document.querySelector('.step-prev')?.addEventListener('click', () => {
    if (currentStep > 0) { currentStep--; renderOvertakeStep(currentStep); }
  });
  document.querySelector('.step-next')?.addEventListener('click', () => {
    if (currentStep < TOTAL_STEPS - 1) { currentStep++; renderOvertakeStep(currentStep); }
  });
  document.querySelectorAll('.step-dot').forEach((dot, i) => {
    dot.addEventListener('click', () => { currentStep = i; renderOvertakeStep(currentStep); });
  });

  // Play all button
  document.querySelector('.overtake-play-btn')?.addEventListener('click', async function() {
    this.disabled = true;
    for (let i = 0; i < TOTAL_STEPS; i++) {
      currentStep = i;
      renderOvertakeStep(i);
      await new Promise(r => setTimeout(r, 1200));
    }
    this.disabled = false;
  });
}

// ── Quiz ──────────────────────────────────────────────────────
let currentQuiz = 0;
let quizScore = 0;
let quizAnswered = false;

function showQuizStart() {
  document.querySelector('.quiz-start-screen')?.style && (document.querySelector('.quiz-start-screen').style.display = 'block');
  document.querySelector('.quiz-question-screen') && (document.querySelector('.quiz-question-screen').style.display = 'none');
  document.querySelector('.quiz-results-screen') && (document.querySelector('.quiz-results-screen').style.display = 'none');
}

function showQuizQuestion() {
  const lang = currentLang;
  const data = quizData[lang];
  const q = data[currentQuiz];

  document.querySelector('.quiz-start-screen').style.display = 'none';
  document.querySelector('.quiz-results-screen').style.display = 'none';
  const screen = document.querySelector('.quiz-question-screen');
  screen.style.display = 'block';

  // Progress
  const fill = ((currentQuiz) / data.length) * 100;
  document.querySelector('.quiz-progress-fill').style.width = fill + '%';
  document.querySelector('.quiz-counter').textContent = `${currentQuiz + 1} / ${data.length}`;

  // Question
  document.querySelector('.quiz-question').textContent = q.q;

  // Options
  const optContainer = document.querySelector('.quiz-options');
  optContainer.innerHTML = q.options.map((opt, i) => `
    <button class="quiz-option" data-idx="${i}">${opt}</button>
  `).join('');

  // Explanation
  const expl = document.querySelector('.quiz-explanation');
  expl.classList.remove('show');
  expl.textContent = '';

  // Next btn
  const nextBtn = document.querySelector('.quiz-next-btn');
  nextBtn.classList.remove('show');
  nextBtn.textContent = currentQuiz === data.length - 1
    ? (T[lang]['quiz-finish'] || 'Finish')
    : (T[lang]['quiz-next'] || 'Next');

  quizAnswered = false;

  optContainer.querySelectorAll('.quiz-option').forEach(btn => {
    btn.addEventListener('click', function() {
      if (quizAnswered) return;
      quizAnswered = true;
      const chosen = parseInt(this.dataset.idx);
      const correct = q.answer;

      optContainer.querySelectorAll('.quiz-option').forEach((b, i) => {
        b.disabled = true;
        if (i === correct) b.classList.add('correct');
        else if (i === chosen && chosen !== correct) b.classList.add('wrong');
      });

      if (chosen === correct) quizScore++;

      expl.textContent = q.explanation;
      expl.classList.add('show');
      nextBtn.classList.add('show');

      if (typeof gsap !== 'undefined') {
        gsap.from(expl, { opacity: 0, y: 10, duration: 0.3, ease: 'power2.out' });
      }
    });
  });

  nextBtn.onclick = () => {
    currentQuiz++;
    if (currentQuiz < data.length) {
      showQuizQuestion();
    } else {
      showQuizResults();
    }
  };

  if (typeof gsap !== 'undefined') {
    gsap.from(screen, { opacity: 0, y: 20, duration: 0.4, ease: 'power2.out' });
  }
}

function showQuizResults() {
  const lang = currentLang;
  const data = quizData[lang];
  document.querySelector('.quiz-question-screen').style.display = 'none';
  const screen = document.querySelector('.quiz-results-screen');
  screen.style.display = 'block';

  const pct = Math.round((quizScore / data.length) * 100);

  // Score circle
  const circle = document.querySelector('.quiz-score-circle');
  if (circle) {
    circle.style.background = `conic-gradient(var(--red) ${pct * 3.6}deg, rgba(255,255,255,0.08) 0deg)`;
  }
  document.querySelector('.quiz-score-num').textContent = `${quizScore}/${data.length}`;
  document.querySelector('.quiz-score-label').textContent = T[lang]['quiz-score-label'] || 'Score';

  let msg = '';
  if (pct >= 90) msg = T[lang]['quiz-excellent'];
  else if (pct >= 70) msg = T[lang]['quiz-good'];
  else if (pct >= 50) msg = T[lang]['quiz-fair'];
  else msg = T[lang]['quiz-poor'];

  document.querySelector('.quiz-result-msg').textContent = msg;

  if (typeof gsap !== 'undefined') {
    gsap.from('.quiz-score-circle', { scale: 0, duration: 0.6, ease: 'back.out(1.7)' });
    gsap.from(screen, { opacity: 0, duration: 0.4 });
  }
}

function initQuiz() {
  showQuizStart();
  document.querySelector('.quiz-start-btn')?.addEventListener('click', () => {
    currentQuiz = 0;
    quizScore = 0;
    showQuizQuestion();
  });
  document.querySelector('.quiz-restart-btn')?.addEventListener('click', () => {
    currentQuiz = 0;
    quizScore = 0;
    showQuizQuestion();
  });
}

// ── Road animation (dashes) ───────────────────────────────────
function initRoadDashes() {
  const center = document.querySelector('.road-center-line');
  if (!center) return;
  for (let i = 0; i < 20; i++) {
    const d = document.createElement('div');
    d.className = 'dash';
    center.appendChild(d);
  }
  if (typeof gsap !== 'undefined') {
    gsap.to('.road-center-line', {
      x: -60,
      duration: 0.6,
      repeat: -1,
      ease: 'none'
    });
  }
}

// ── Smooth scroll ─────────────────────────────────────────────
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const offset = 70;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      if (typeof gsap !== 'undefined') {
        gsap.to(window, { scrollTo: top, duration: 0.8, ease: 'power3.inOut' });
      } else {
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
}

// ── GSAP scroll-triggered animations ─────────────────────────
function initSectionAnimations() {
  if (typeof gsap === 'undefined') return;

  // Stats bar numbers
  ScrollTrigger.create({
    trigger: '.stats-grid',
    start: 'top 80%',
    once: true,
    onEnter: () => gsap.from('.stat-card', { opacity:0, y:30, stagger:0.1, duration:0.6, ease:'power2.out' })
  });

  // Sign cards
  ScrollTrigger.create({
    trigger: '.signs-grid',
    start: 'top 80%',
    once: true,
    onEnter: () => gsap.from('.sign-card', { opacity:0, scale:0.85, stagger:0.04, duration:0.4, ease:'back.out(1.4)' })
  });

  // Flash cards
  ScrollTrigger.create({
    trigger: '.flash-grid',
    start: 'top 80%',
    once: true,
    onEnter: () => gsap.from('.flash-card', { opacity:0, x:-30, stagger:0.12, duration:0.6, ease:'power2.out' })
  });

  // Rule cards
  ScrollTrigger.create({
    trigger: '.rules-grid',
    start: 'top 80%',
    once: true,
    onEnter: () => gsap.from('.rule-card', { opacity:0, y:30, stagger:0.08, duration:0.5, ease:'power2.out' })
  });

  // Mountain cards
  ScrollTrigger.create({
    trigger: '.mountain-grid',
    start: 'top 80%',
    once: true,
    onEnter: () => gsap.from('.mountain-card', { opacity:0, y:20, stagger:0.1, duration:0.5, ease:'power2.out' })
  });

  // Lights section
  ScrollTrigger.create({
    trigger: '.lights-inner',
    start: 'top 75%',
    once: true,
    onEnter: () => {
      gsap.from('.car-svg-container', { opacity:0, scale:0.9, duration:0.7, ease:'back.out(1.4)' });
      gsap.from('.light-info-panel', { opacity:0, x:30, duration:0.7, ease:'power2.out', delay:0.2 });
    }
  });

  // Overtake section
  ScrollTrigger.create({
    trigger: '.road-animation',
    start: 'top 80%',
    once: true,
    onEnter: () => {
      gsap.from('.road-animation', { opacity:0, y:30, duration:0.6, ease:'power2.out' });
      gsap.from('.car-sprite', { opacity:0, scale:0, stagger:0.15, duration:0.5, ease:'back.out(1.7)', delay:0.3 });
    }
  });
}

// ── Nepal Flag SVG for navbar ─────────────────────────────────
function initFlag() {
  const flags = document.querySelectorAll('.nav-flag');
  flags.forEach(f => {
    f.innerHTML = `
    <svg viewBox="0 0 64 80" xmlns="http://www.w3.org/2000/svg">
      <polygon points="0,0 64,20 0,40" fill="#DC143C" stroke="#003893" stroke-width="3"/>
      <polygon points="0,40 52,55 0,70" fill="#DC143C" stroke="#003893" stroke-width="3"/>
      <circle cx="16" cy="22" r="5" fill="white" opacity="0.9"/>
      <path d="M16,9 L17.5,14 L22,14 L18.5,17 L20,22 L16,19 L12,22 L13.5,17 L10,14 L14.5,14 Z" fill="white" opacity="0.7" transform="scale(0.5) translate(16,18)"/>
    </svg>`;
  });
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initFlag();
  initNavbar();
  initStars();
  initMountains();
  initSigns();
  renderFlashCards();
  renderIndicatorCards();
  initCarDiagram();
  initOvertaking();
  initQuiz();
  initRoadDashes();
  initSmoothScroll();

  // GSAP-dependent
  if (typeof gsap !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
    if (typeof ScrollToPlugin !== 'undefined') gsap.registerPlugin(ScrollToPlugin);
    initHeroGSAP();
    initSectionAnimations();
  } else {
    initReveal();
  }

  // Apply stored language
  applyLang(currentLang);
});
