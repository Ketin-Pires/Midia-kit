/* =========================================================
   Ketlin Victória | Mídia kit
   Tudo opcional: sem JS o site continua legível.
   ========================================================= */
(() => {
  'use strict';

  const root = document.documentElement;
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const canAutoplay = !reduceMotion && !saveData;   // respeita acessibilidade e economia de dados
  const hasIO = 'IntersectionObserver' in window;

  /* ---------- 1. Sequência de entrada do hero ---------- */
  const setReady = () => requestAnimationFrame(() => root.classList.add('is-ready'));
  const heroPic = $('.hero__media img');
  const picReady = new Promise((res) => {
    if (!heroPic || (heroPic.complete && heroPic.naturalWidth)) return res();
    heroPic.addEventListener('load', res, { once: true });
    heroPic.addEventListener('error', res, { once: true });
  });
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.all([fontsReady, picReady]).then(setReady);
  setTimeout(setReady, 2500); // garantia: não espera mais que isso

  /* ---------- 2. Placeholder some quando a mídia carrega ---------- */
  $$('.media').forEach((fig) => {
    const mark = () => fig.classList.add('is-loaded');
    const img = $('img', fig);
    const vid = $('video', fig);

    if (img) {
      if (img.complete && img.naturalWidth) mark();
      else img.addEventListener('load', mark, { once: true });
    }
    if (vid) {
      vid.addEventListener('loadeddata', mark, { once: true });
      // se houver poster, mostra o poster assim que ele carregar
      const poster = vid.getAttribute('poster');
      if (poster) {
        const p = new Image();
        p.onload = mark;
        p.src = poster;
      }
    }
  });

  /* ---------- 3. Vídeos: tocam quando visíveis, pausam quando saem ---------- */
  const videos = $$('video[data-autoplay]');

  if (canAutoplay && hasIO) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(({ target: v, isIntersecting }) => {
        if (isIntersecting) {
          const p = v.play();
          if (p && p.catch) p.catch(() => {});
        } else {
          v.pause();
        }
      });
    }, { threshold: 0.55 });
    videos.forEach((v) => io.observe(v));
  }

  // Toque/clique no vídeo: alterna play/pause (útil com movimento reduzido)
  $$('.media--video').forEach((fig) => {
    fig.addEventListener('click', () => {
      if (fig.dataset.dragged === '1') return;
      const v = $('video', fig);
      if (!v) return;
      if (v.paused) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
      else v.pause();
    });
  });

  /* ---------- 4. Reel: card central em destaque + arrastar com mouse ---------- */
  const reel = $('.reel');
  if (reel) {
    const items = [...reel.children];

    if (!reduceMotion) {
      let ticking = false;
      const update = () => {
        const r = reel.getBoundingClientRect();
        const center = r.left + r.width / 2;
        items.forEach((it) => {
          const b = it.getBoundingClientRect();
          const d = Math.min(Math.abs(b.left + b.width / 2 - center) / (b.width + 12), 1);
          it.style.setProperty('--s', (1 - d * 0.08).toFixed(3));
        });
        ticking = false;
      };
      reel.addEventListener('scroll', () => {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
      }, { passive: true });
      addEventListener('resize', update);
      update();
    }

    // arrastar com o mouse no desktop (no celular o próprio toque já rola)
    let down = false, startX = 0, startLeft = 0, moved = 0;
    reel.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = 0; startX = e.clientX; startLeft = reel.scrollLeft;
      reel.classList.add('is-drag');
    });
    addEventListener('pointermove', (e) => {
      if (!down) return;
      moved = Math.abs(e.clientX - startX);
      reel.scrollLeft = startLeft - (e.clientX - startX);
    });
    addEventListener('pointerup', () => {
      if (!down) return;
      down = false;
      reel.classList.remove('is-drag');
      if (moved > 5) {                       // evita tocar/pausar o vídeo ao soltar o arraste
        items.forEach((i) => (i.dataset.dragged = '1'));
        setTimeout(() => items.forEach((i) => delete i.dataset.dragged), 50);
      }
    });
  }

  /* ---------- 5. Parallax suave na foto do hero ---------- */
  const heroImg = $('.hero__media img');
  if (heroImg && !reduceMotion) {
    let t = false;
    addEventListener('scroll', () => {
      if (t) return;
      t = true;
      requestAnimationFrame(() => {
        const y = Math.min(scrollY, innerHeight);
        heroImg.style.setProperty('--py', (y * 0.18).toFixed(1) + 'px');
        t = false;
      });
    }, { passive: true });
  }

  /* ---------- 6. Menu em tela cheia ---------- */
  const nav = $('.nav');
  const toggle = $('.nav__toggle');
  const menu = $('#menu');
  const toggleLabel = $('.sr', toggle);

  const setMenu = (open) => {
    menu.classList.toggle('is-open', open);
    menu.inert = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggleLabel.textContent = open ? 'Fechar menu' : 'Abrir menu';
    document.body.classList.toggle('is-locked', open);
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- 7. Nav com fundo + botão fixo ---------- */
  const hero = $('.hero');
  const fab = $('.fab');
  const contact = $('#contato');
  const state = { pastHero: false, inContact: false };

  const updateFab = () => {
    const show = state.pastHero && !state.inContact;
    fab.classList.toggle('is-visible', show);
    fab.setAttribute('aria-hidden', String(!show));
    fab.tabIndex = show ? 0 : -1;
  };

  if (hasIO) {
    new IntersectionObserver(([e]) => {
      state.pastHero = !e.isIntersecting;
      nav.classList.toggle('is-scrolled', state.pastHero);
      updateFab();
    }, { rootMargin: '-80px 0px 0px 0px' }).observe(hero);

    new IntersectionObserver(([e]) => {
      state.inContact = e.isIntersecting;
      updateFab();
    }, { threshold: 0.2 }).observe(contact);
  }

  /* ---------- 8. Contador animado (elementos com data-count) ---------- */
  const fmt = new Intl.NumberFormat('pt-BR');
  const animateCount = (el) => {
    const end = Number(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const dec = Number(el.dataset.decimals) || 0;
    const f = dec ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : fmt;
    const val = (v) => f.format(dec ? v : Math.round(v)) + suffix;
    if (Number.isNaN(end)) return;
    if (reduceMotion) { el.textContent = val(end); return; }
    const dur = 1400, t0 = performance.now();
    const step = (now) => {
      const p = Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = val(end * eased);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const counters = $$('[data-count]');
  if (hasIO) {
    const cio = new IntersectionObserver((entries, obs) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { animateCount(e.target); obs.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach((c) => cio.observe(c));
  }

  /* ---------- 9. Copiar e-mail ---------- */
  const toast = $('.toast');
  let toastTimer;
  const showToast = (msg) => {
    toast.textContent = msg;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2200);
  };

  $$('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const text = btn.dataset.copy;
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement('textarea');   // fallback para navegadores antigos
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); ta.remove();
      }
      showToast('E-mail copiado');
    });
  });

  /* ---------- 10. Meus trabalhos: ingressos, passe e brilhos ---------- */
  const works = $('#trabalhos');
  if (works) {
    const tickets = $$('.ticket', works);
    const pass = $('.pass', works);
    const tilt = $('.pass__tilt', works);
    const sparks = $$('.spark', works);

    // 10a. Ingressos entram em sequência (o 2º da linha atrasa um pouco)
    tickets.forEach((t, i) => t.style.setProperty('--i', i % 2));
    if (hasIO) {
      const tio = new IntersectionObserver((entries, obs) => {
        entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); obs.unobserve(e.target); } });
      }, { threshold: 0.2 });
      tickets.forEach((t) => tio.observe(t));
    } else {
      tickets.forEach((t) => t.classList.add('is-in'));
    }

    // 10b. O passe é "impresso" ao entrar na tela
    if (pass) {
      if (hasIO) {
        const pio = new IntersectionObserver((entries, obs) => {
          entries.forEach((e) => { if (e.isIntersecting) { pass.classList.add('is-printed'); obs.unobserve(pass); } });
        }, { threshold: 0.5 });
        pio.observe(pass);
      } else {
        pass.classList.add('is-printed');
      }
    }

    // 10c. Inclinação 3D com brilho (mouse, caneta e toque)
    if (tilt && !reduceMotion) {
      const setTilt = (e) => {
        const r = tilt.getBoundingClientRect();
        const px = clamp((e.clientX - r.left) / r.width);
        const py = clamp((e.clientY - r.top) / r.height);
        tilt.style.setProperty('--ry', ((px - 0.5) * 14).toFixed(2) + 'deg');
        tilt.style.setProperty('--rx', ((0.5 - py) * 10).toFixed(2) + 'deg');
        tilt.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
        tilt.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
        tilt.style.setProperty('--go', '1');
      };
      const resetTilt = () => {
        ['--rx', '--ry', '--go'].forEach((k) => tilt.style.removeProperty(k));
      };
      tilt.addEventListener('pointerenter', setTilt);
      tilt.addEventListener('pointermove', setTilt);
      tilt.addEventListener('pointerleave', resetTilt);
      tilt.addEventListener('pointercancel', resetTilt);
      tilt.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') resetTilt(); });
    }

    // 10d. Brilhos em camadas: cada um anda numa velocidade (data-depth) conforme a rolagem
    if (sparks.length && !reduceMotion && hasIO) {
      let visible = false, ticking = false;
      const move = () => {
        ticking = false;
        const r = works.getBoundingClientRect();
        const off = innerHeight / 2 - (r.top + r.height / 2);   // 0 quando a seção está no centro
        sparks.forEach((s) => {
          const d = Number(s.dataset.depth) || 1;
          s.style.setProperty('--py', (off * d * 0.08).toFixed(1) + 'px');
          s.style.setProperty('--rot', (off * d * 0.05).toFixed(1) + 'deg');
        });
      };
      const request = () => { if (visible && !ticking) { ticking = true; requestAnimationFrame(move); } };
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; request(); }).observe(works);
      addEventListener('scroll', request, { passive: true });
      addEventListener('resize', request);
    }
  }

  /* ---------- 11. Ano do rodapé ---------- */
  const ano = $('#ano');
  if (ano) ano.textContent = new Date().getFullYear();
})();
