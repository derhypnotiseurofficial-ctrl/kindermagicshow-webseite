/* =====================================================
   MAGIC TIM – KINDERMAGICSHOW.DE
   main.js – Interaktivität & Animationen
   ===================================================== */

'use strict';

// ─── DOM bereit ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Kritisch: sofort für erste Interaktion
  initNavbar();
  initHeroReveal();
  setCurrentYear();
  setMinDate();

  // Nach erstem Paint: schwere Animationen & Below-Fold-Logik
  requestAnimationFrame(() => requestAnimationFrame(() => {
    initParticles();
    initScrollReveal();
    initParallax();
    initTestimonialsSlider();
    initFAQ();
    initContactForm();
    initVideoSection();
    initBackToTop();
    initCookieBanner();
    initMagicCursor();
  }));
});

/* ─── 1. PARTIKEL-CANVAS (Sterne-Hintergrund) ──────── */
function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let particles = [];
  let animFrame;
  let W, H;

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  // Partikel-Objekt
  function Particle() {
    this.reset();
  }

  Particle.prototype.reset = function() {
    this.x = Math.random() * W;
    this.y = Math.random() * H;
    this.size = Math.random() * 2 + 0.3;
    this.speedX = (Math.random() - 0.5) * 0.3;
    this.speedY = (Math.random() - 0.5) * 0.3;
    this.opacity = Math.random() * 0.7 + 0.15;
    this.life = Math.random() * 200 + 100;
    this.maxLife = this.life;
    // Gelegentlich goldene Funken
    this.isGold = Math.random() < 0.15;
    this.twinkleSpeed = Math.random() * 0.03 + 0.01;
    this.twinkleOffset = Math.random() * Math.PI * 2;
  };

  Particle.prototype.update = function(t) {
    this.x += this.speedX;
    this.y += this.speedY;
    this.life--;

    // Twinkle-Effekt
    this.currentOpacity = this.opacity * (0.5 + 0.5 * Math.sin(t * this.twinkleSpeed + this.twinkleOffset));

    if (this.life <= 0 || this.x < -5 || this.x > W + 5 || this.y < -5 || this.y > H + 5) {
      this.reset();
    }
  };

  Particle.prototype.draw = function() {
    ctx.save();
    ctx.globalAlpha = this.currentOpacity || this.opacity;

    if (this.isGold && this.size > 1.2) {
      // Stern-Form für goldene Partikel
      ctx.fillStyle = '#f5c518';
      ctx.shadowColor = '#f5c518';
      ctx.shadowBlur = 8;
      drawStar(ctx, this.x, this.y, this.size * 1.5);
    } else {
      // Einfacher Kreis für normale Partikel
      ctx.fillStyle = this.isGold ? '#f5c518' : 'rgba(180, 210, 255, 0.9)';
      if (this.isGold) {
        ctx.shadowColor = '#f5c518';
        ctx.shadowBlur = 6;
      }
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  function drawStar(ctx, cx, cy, r) {
    const spikes = 4;
    const inner = r * 0.4;
    let angle = -Math.PI / 2;
    const step = Math.PI / spikes;

    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? r : inner;
      ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
      angle += step;
    }
    ctx.closePath();
    ctx.fill();
  }

  function init() {
    resize();
    particles = [];
    const count = Math.min(180, Math.floor((W * H) / 6000));
    for (let i = 0; i < count; i++) {
      const p = new Particle();
      // Initial über den Canvas verteilen
      p.life = Math.random() * p.maxLife;
      particles.push(p);
    }
  }

  let t = 0;
  function animate() {
    ctx.clearRect(0, 0, W, H);
    t++;
    for (const p of particles) {
      p.update(t);
      p.draw();
    }
    animFrame = requestAnimationFrame(animate);
  }

  const resizeObs = new ResizeObserver(() => {
    cancelAnimationFrame(animFrame);
    init();
    animate();
  });

  resizeObs.observe(canvas.parentElement);
  init();
  animate();
}

/* ─── 2. NAVBAR ─────────────────────────────────────── */
function initNavbar() {
  const navbar  = document.getElementById('navbar');
  const toggle  = document.getElementById('navToggle');
  const menu    = document.getElementById('navMenu');
  const navLinks = menu ? menu.querySelectorAll('.nav-link') : [];

  if (!navbar) return;

  // Scroll-Klasse
  function handleScroll() {
    const scrolled = window.scrollY > 40;
    navbar.classList.toggle('scrolled', scrolled);
    const backBtn = document.getElementById('backToTop');
    if (backBtn) {
      if (window.scrollY > 400) {
        backBtn.removeAttribute('hidden');
      } else {
        backBtn.setAttribute('hidden', '');
      }
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // Hamburger-Toggle
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const isOpen = menu.classList.toggle('open');
      toggle.classList.toggle('active', isOpen);
      toggle.setAttribute('aria-expanded', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Link-Klick → Menü schließen
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        menu.classList.remove('open');
        toggle.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });

    // Klick außerhalb → Menü schließen
    document.addEventListener('click', (e) => {
      if (menu.classList.contains('open') && !navbar.contains(e.target)) {
        menu.classList.remove('open');
        toggle.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  }

  // Aktiven Nav-Link beim Scrollen hervorheben
  const sections = document.querySelectorAll('section[id]');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(link => {
          link.classList.toggle(
            'active',
            link.getAttribute('href') === `#${entry.target.id}`
          );
        });
      }
    });
  }, { rootMargin: '-30% 0px -60% 0px' });

  sections.forEach(s => observer.observe(s));
}

/* ─── 3. SCROLL REVEAL ──────────────────────────────── */
function initScrollReveal() {
  const elements = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right');

  if (!elements.length) return;

  // Kurze Verzögerungen für gestaffelte Erscheinung
  document.querySelectorAll('.shows-grid .show-card').forEach((card, i) => {
    card.style.transitionDelay = `${i * 0.12}s`;
  });

  document.querySelectorAll('.highlight-item').forEach((item, i) => {
    item.style.transitionDelay = `${i * 0.1}s`;
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  elements.forEach(el => observer.observe(el));
}

/* ─── 4. HERO REVEAL ────────────────────────────────── */
function initHeroReveal() {
  // Hero-Elemente zeitversetzt einblenden
  const heroRevealEls = document.querySelectorAll('.hero .reveal-up, .hero .reveal-right');
  heroRevealEls.forEach((el, i) => {
    setTimeout(() => {
      el.classList.add('in-view');
    }, 200 + i * 180);
  });
}

/* ─── 5. PARALLAX ───────────────────────────────────── */
function initParallax() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const heroImg = document.querySelector('.hero-img');
  const heroGlows = document.querySelectorAll('.hero-glow');

  if (!heroImg) return;

  function onScroll() {
    const scrollY = window.scrollY;
    const heroH = document.querySelector('.hero')?.offsetHeight || 0;
    if (scrollY > heroH) return;

    const factor = scrollY / heroH;

    heroImg.style.transform = `translateY(${scrollY * 0.25}px)`;
    heroGlows.forEach((glow, i) => {
      const dir = i % 2 === 0 ? 1 : -1;
      glow.style.transform = `translateY(${scrollY * 0.15 * dir}px)`;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
}

/* ─── 7. TESTIMONIALS SLIDER ────────────────────────── */
function initTestimonialsSlider() {
  const track     = document.getElementById('testimonialsTrack');
  const dotsWrap  = document.getElementById('sliderDots');
  const prevBtn   = document.getElementById('sliderPrev');
  const nextBtn   = document.getElementById('sliderNext');

  if (!track) return;

  const cards = track.querySelectorAll('.testimonial-card');
  let current = 0;
  let autoPlay;

  // Responsive: Anzahl sichtbarer Karten
  function getVisible() {
    if (window.innerWidth < 768) return 1;
    if (window.innerWidth < 1024) return 2;
    return 3;
  }

  function getMaxIndex() {
    return Math.max(0, cards.length - getVisible());
  }

  // Kartenbreiten dynamisch berechnen relativ zum Slider-Container
  function setCardWidths() {
    const visible = getVisible();
    const gap = 24; // 1.5rem
    const sliderWidth = track.parentElement.offsetWidth;
    const cardWidth = (sliderWidth - gap * (visible - 1)) / visible;
    cards.forEach(card => {
      card.style.width = cardWidth + 'px';
      card.style.minWidth = cardWidth + 'px';
    });
  }

  // Dots erzeugen
  function buildDots() {
    dotsWrap.innerHTML = '';
    for (let i = 0; i <= getMaxIndex(); i++) {
      const dot = document.createElement('button');
      dot.className = 'slider-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', `Bewertung ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(dot);
    }
  }

  function updateDots() {
    const dots = dotsWrap.querySelectorAll('.slider-dot');
    dots.forEach((dot, i) => dot.classList.toggle('active', i === current));
  }

  function goTo(index) {
    current = Math.max(0, Math.min(index, getMaxIndex()));

    const card = cards[0];
    const gap = 24;
    const offset = current * (card.offsetWidth + gap);

    track.style.transform = `translateX(-${offset}px)`;
    updateDots();

    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === getMaxIndex();
  }

  function prev() { goTo(current - 1); resetAuto(); }
  function next() { goTo(current + 1); resetAuto(); }

  function resetAuto() {
    clearInterval(autoPlay);
    autoPlay = setInterval(() => {
      goTo(current < getMaxIndex() ? current + 1 : 0);
    }, 6000);
  }

  prevBtn?.addEventListener('click', prev);
  nextBtn?.addEventListener('click', next);

  // Touch-Swipe
  let touchStart = 0;
  track.addEventListener('touchstart', (e) => {
    touchStart = e.changedTouches[0].screenX;
  }, { passive: true });

  track.addEventListener('touchend', (e) => {
    const delta = e.changedTouches[0].screenX - touchStart;
    if (Math.abs(delta) > 50) {
      delta > 0 ? prev() : next();
    }
  }, { passive: true });

  // Neuberechnung bei Resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      setCardWidths();
      buildDots();
      goTo(Math.min(current, getMaxIndex()));
    }, 150);
  });

  setCardWidths();
  buildDots();
  goTo(0);
  resetAuto();

  // Pause bei Hover
  track.addEventListener('mouseenter', () => clearInterval(autoPlay));
  track.addEventListener('mouseleave', () => resetAuto());
}

/* ─── 8. FAQ ACCORDION ──────────────────────────────── */
function initFAQ() {
  const items = document.querySelectorAll('.faq-item');

  items.forEach(item => {
    const summary = item.querySelector('.faq-question');
    if (!summary) return;

    // Details-Element nutzt nativen open/close
    item.addEventListener('toggle', () => {
      // Alle anderen schließen (Accordion-Verhalten optional)
      // Entfernen wenn mehrere gleichzeitig offen sein sollen:
      if (item.open) {
        items.forEach(other => {
          if (other !== item && other.open) {
            other.removeAttribute('open');
          }
        });
      }
    });
  });
}

/* ─── 9. KONTAKTFORMULAR ────────────────────────────── */
function initContactForm() {
  const form      = document.getElementById('contactForm');
  const successEl = document.getElementById('formSuccess');
  const errorEl   = document.getElementById('formError');
  const submitBtn = document.getElementById('submitBtn');

  if (!form) return;

  // Einfaches CSRF-Token (Server muss das validieren)
  const token = Math.random().toString(36).slice(2);
  const tokenField = document.getElementById('csrfToken');
  if (tokenField) tokenField.value = token;

  // Validierungsregeln
  const rules = {
    name:      { required: true, min: 2,  msg: 'Bitte gib deinen Namen ein (min. 2 Zeichen).' },
    email:     { required: true, email: true, msg: 'Bitte gib eine gültige E-Mail-Adresse ein.' },
    eventType: { required: true, msg: 'Bitte wähle eine Veranstaltungsart.' },
    privacy:   { required: true, checkbox: true, msg: 'Bitte stimme der Datenschutzerklärung zu.' }
  };

  function showError(field, msg) {
    const input = form.querySelector(`[name="${field}"]`);
    const errorEl = input?.closest('.form-group')?.querySelector('.field-error');
    if (input)   input.classList.add('error');
    if (errorEl) { errorEl.textContent = msg; errorEl.classList.add('visible'); }
  }

  function clearError(field) {
    const input = form.querySelector(`[name="${field}"]`);
    const err = input?.closest('.form-group')?.querySelector('.field-error');
    if (input) input.classList.remove('error');
    if (err)   { err.textContent = ''; err.classList.remove('visible'); }
  }

  function validateForm() {
    let valid = true;
    for (const [field, rule] of Object.entries(rules)) {
      const input = form.querySelector(`[name="${field}"]`);
      if (!input) continue;

      clearError(field);

      if (rule.required) {
        if (rule.checkbox) {
          if (!input.checked) { showError(field, rule.msg); valid = false; continue; }
        } else if (!input.value.trim()) {
          showError(field, rule.msg); valid = false; continue;
        }
      }

      if (rule.email) {
        const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRx.test(input.value.trim())) {
          showError(field, rule.msg); valid = false; continue;
        }
      }

      if (rule.min && input.value.trim().length < rule.min) {
        showError(field, rule.msg); valid = false;
      }
    }
    return valid;
  }

  // Live-Validierung bei verlassen
  Object.keys(rules).forEach(field => {
    const input = form.querySelector(`[name="${field}"]`);
    if (input) {
      input.addEventListener('blur', () => {
        const rule = rules[field];
        clearError(field);
        if (rule.required && !rule.checkbox && !input.value.trim()) {
          showError(field, rule.msg);
        }
        if (rule.email) {
          const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (input.value.trim() && !emailRx.test(input.value.trim())) {
            showError(field, rule.msg);
          }
        }
      });
    }
  });

  // Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Honeypot prüfen
    const hp = form.querySelector('[name="website_url"]');
    if (hp && hp.value) return; // Bot erkannt

    if (!validateForm()) {
      // Ersten Fehler fokussieren
      const firstError = form.querySelector('.error');
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstError?.focus();
      return;
    }

    // Loading-State
    const btnText    = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    submitBtn.disabled = true;
    if (btnText)    btnText.textContent = 'Wird gesendet…';
    if (btnLoading) btnLoading.removeAttribute('hidden');

    try {
      const formData = new FormData(form);

      const response = await fetch('contact-handler.php', {
        method: 'POST',
        body: formData,
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });

      const data = await response.json();

      if (data.success) {
        form.setAttribute('hidden', '');
        successEl?.removeAttribute('hidden');
        successEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        throw new Error(data.message || 'Fehler');
      }
    } catch (err) {
      // Fallback: mailto-Link öffnen
      console.error('Formular-Fehler:', err);
      errorEl?.removeAttribute('hidden');
      // Nicht ausgeblendet bei PHP-Fehler – mailto anbieten
    } finally {
      submitBtn.disabled = false;
      if (btnText)    btnText.textContent = 'Anfrage absenden';
      if (btnLoading) btnLoading.setAttribute('hidden', '');
    }
  });
}

/* ─── 10. VIDEO ─────────────────────────────────────── */
function initVideoSection() {
  const placeholder = document.getElementById('videoPlaceholder');
  const frame       = document.getElementById('youtubeFrame');

  if (!placeholder || !frame) return;

  // Nur laden wenn Cookie-Zustimmung
  function loadVideo() {
    const consent = localStorage.getItem('cookieConsent');
    if (consent !== 'all') {
      // Zeige Cookie-Hinweis
      if (window.cookieBannerAccepted !== true) {
        alert('Bitte akzeptiere alle Cookies, um das Video abzuspielen.');
        return;
      }
    }

    const src = frame.dataset.src;
    if (src && src.includes('VIDEO_ID')) {
      // Platzhalter – noch keine echte Video-ID
      alert('Bitte ersetze VIDEO_ID in index.html mit deiner echten YouTube-Video-ID.');
      return;
    }

    frame.src = src || '';
    frame.classList.remove('hidden');
    placeholder.classList.add('hidden');
  }

  placeholder.addEventListener('click', loadVideo);
  placeholder.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); loadVideo(); }
  });
}

/* ─── 11. BACK TO TOP ───────────────────────────────── */
function initBackToTop() {
  const btn = document.getElementById('backToTop');
  if (!btn) return;

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ─── 12. COOKIE BANNER ─────────────────────────────── */
function initCookieBanner() {
  const banner  = document.getElementById('cookieBanner');
  const accept  = document.getElementById('cookieAccept');
  const decline = document.getElementById('cookieDecline');

  if (!banner) return;

  // Schon entschieden?
  if (localStorage.getItem('cookieConsent')) {
    banner.classList.add('hidden');
    return;
  }

  // Nach kurzer Verzögerung einblenden
  setTimeout(() => {
    banner.style.display = 'block';
  }, 1500);

  function setCookie(type) {
    localStorage.setItem('cookieConsent', type);
    banner.classList.add('hidden');
    if (type === 'all') window.cookieBannerAccepted = true;
  }

  accept?.addEventListener('click', () => setCookie('all'));
  decline?.addEventListener('click', () => setCookie('essential'));
}

/* ─── 13. HILFSFUNKTIONEN ───────────────────────────── */
function setCurrentYear() {
  const el = document.getElementById('currentYear');
  if (el) el.textContent = new Date().getFullYear();
}

function setMinDate() {
  const dateInput = document.getElementById('eventDate');
  if (!dateInput) return;
  const today = new Date().toISOString().split('T')[0];
  dateInput.setAttribute('min', today);
}

/* ─── 14. GSAP ScrollTrigger (falls geladen) ────────── */
window.addEventListener('load', () => {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  // Zahl-Counter Animations in den Hero-Stats
  const statNumbers = document.querySelectorAll('.stat-number');
  statNumbers.forEach(el => {
    const text = el.textContent;
    const num  = parseInt(text.replace(/[^0-9]/g, ''), 10);
    if (isNaN(num)) return;

    const suffix = text.replace(/[0-9]/g, '').trim();

    gsap.fromTo(el,
      { textContent: 0 },
      {
        textContent: num,
        duration: 2,
        ease: 'power2.out',
        snap: { textContent: 1 },
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          once: true
        },
        onUpdate: function() {
          el.textContent = Math.round(this.targets()[0].textContent).toLocaleString('de') + suffix;
        }
      }
    );
  });

});

/* ─── MAGIC CURSOR (Feenstaub-Trail) ────────────────── */
function initMagicCursor() {
  // Nur auf Desktop (Touch-Geräte haben keinen Mauszeiger)
  if (window.matchMedia('(hover: none)').matches) return;

  // Cursor-Elemente erzeugen
  const dot    = document.createElement('div');
  const ring   = document.createElement('div');
  dot.className  = 'cursor-dot';
  ring.className = 'cursor-ring';
  document.body.appendChild(dot);
  document.body.appendChild(ring);

  let mouseX = -200, mouseY = -200;
  let ringX  = -200, ringY  = -200;

  // Sparkle-Pool – Partikel werden wiederverwendet
  const POOL_SIZE = 30;
  const pool = [];
  for (let i = 0; i < POOL_SIZE; i++) {
    const s = document.createElement('div');
    s.className = 'cursor-sparkle';
    document.body.appendChild(s);
    pool.push({ el: s, active: false });
  }

  const GLYPHS = ['✦', '✧', '★', '✨', '·', '⋆'];

  function spawnSparkle(x, y) {
    const p = pool.find(p => !p.active);
    if (!p) return;
    p.active = true;

    const el = p.el;
    const angle  = Math.random() * Math.PI * 2;
    const dist   = 12 + Math.random() * 20;
    const tx     = Math.cos(angle) * dist;
    const ty     = Math.sin(angle) * dist;
    const scale  = 0.4 + Math.random() * 0.8;
    const dur    = 500 + Math.random() * 400;

    el.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    el.style.cssText = `
      left:${x}px; top:${y}px;
      transform: translate(-50%,-50%) scale(${scale});
      opacity: 1;
      transition: none;
      font-size: ${10 + Math.random() * 8}px;
    `;

    // Nächsten Frame starten damit transition greift
    requestAnimationFrame(() => {
      el.style.transition = `transform ${dur}ms ease-out, opacity ${dur}ms ease-out`;
      el.style.transform  = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(0)`;
      el.style.opacity    = '0';
    });

    setTimeout(() => { p.active = false; }, dur);
  }

  let lastSpawnX = -999, lastSpawnY = -999;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    // Nur spawnen wenn Maus sich genug bewegt hat
    const dx = mouseX - lastSpawnX;
    const dy = mouseY - lastSpawnY;
    if (dx * dx + dy * dy > 180) {
      spawnSparkle(mouseX, mouseY);
      lastSpawnX = mouseX;
      lastSpawnY = mouseY;
    }
  });

  // Ring folgt mit sanftem Lag
  function animateCursor() {
    dot.style.transform  = `translate(${mouseX - 4}px, ${mouseY - 4}px)`;

    ringX += (mouseX - ringX) * 0.12;
    ringY += (mouseY - ringY) * 0.12;
    ring.style.transform = `translate(${ringX - 18}px, ${ringY - 18}px)`;

    requestAnimationFrame(animateCursor);
  }
  animateCursor();

  // Cursor bei hover auf klickbaren Elementen vergrößern
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest('a, button, [role="button"], input, select, textarea')) {
      ring.classList.add('cursor-ring--hover');
    } else {
      ring.classList.remove('cursor-ring--hover');
    }
  });
}
