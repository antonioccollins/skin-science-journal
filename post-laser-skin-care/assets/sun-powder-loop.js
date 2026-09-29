(() => {
  const svg = document.getElementById('spLoop');
  if (!svg) return;
  const NS = 'http://www.w3.org/2000/svg';
  const $ = id => svg.querySelector('#' + id);
  const el = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const lerp = (a, b, t) => a + (b - a) * t;
  const mix = (c1, c2, t) => {
    const a = parseInt(c1.slice(1), 16), b = parseInt(c2.slice(1), 16);
    const r = Math.round(lerp(a >> 16, b >> 16, t));
    const g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, t));
    const bl = Math.round(lerp(a & 255, b & 255, t));
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
  };

  const C = {
    dayTop: '#F7E6CC', dayBot: '#FBF4EA',
    nightTop: '#1B3147', nightBot: '#2E4D68',
    navy: '#2C5470', cream: '#F6EFE4',
    cell: '#E9C4A9', cellEdge: '#D8AD90',
    glow: '#F2A93B', glowCell: '#F8CF86'
  };
  const LOOP = 14000;   // full day+night, ms
  const DAY = 0.58;     // share of loop that is daytime

  // Stars
  const starG = $('spStars');
  for (let i = 0; i < 30; i++) {
    el('circle', { cx: Math.random() * 800, cy: 10 + Math.random() * 130, r: 0.5 + Math.random() * 1.3, fill: '#fff' }, starG);
  }

  // Cells: one flattened row in the epidermis, three rows in the dermis
  const cells = [];
  for (let x = 12; x < 800; x += 44) cells.push({ x: x + Math.random() * 6 - 3, y: 201, rx: 19, ry: 10 });
  [[274, 0], [332, 35], [390, 0]].forEach(([y, off]) => {
    for (let x = 35 + off; x < 800; x += 70) {
      cells.push({ x: x + Math.random() * 16 - 8, y: y + Math.random() * 14 - 7, rx: 17, ry: 17 });
    }
  });
  const cellG = $('spCells');
  cells.forEach(c => {
    c.g = 0;
    c.n = el('ellipse', { cx: c.x, cy: c.y, rx: c.rx, ry: c.ry, fill: C.cell, stroke: C.cellEdge, 'stroke-width': 1.2 }, cellG);
  });

  const parts = [], rays = [], flashes = [];
  let lastP = 0, lastR = 0;

  function spawnParticle() {
    parts.push({
      x: 10 + Math.random() * 780, y: 470,
      v: 30 + Math.random() * 22, ph: Math.random() * 6.28, last: -1,
      n: el('circle', { r: 3, fill: C.glow }, $('spParticles'))
    });
  }

  function spawnRay(sx, sy) {
    const tx = Math.max(20, Math.min(780, sx + (Math.random() - 0.5) * 440)), ty = 168;
    const dx = tx - sx, dy = ty - sy, L = Math.hypot(dx, dy);
    rays.push({
      sx, sy, ux: dx / L, uy: dy / L, L, d: 0, hit: false, tx,
      n: el('line', { stroke: '#F2B44A', 'stroke-width': 2.5, 'stroke-linecap': 'round' }, $('spRays'))
    });
  }

  function render(p, dt, now, still) {
    const isDay = p < DAY;
    const dayP = p / DAY;
    const nightP = (p - DAY) / (1 - DAY);
    const sunUp = isDay ? Math.sin(Math.PI * dayP) : 0;
    const light = Math.pow(Math.max(0, sunUp), 0.6);

    // Sky, sun, moon, stars
    const top = mix(C.nightTop, C.dayTop, light);
    $('spSkyTop').setAttribute('stop-color', top);
    $('spSkyBot').setAttribute('stop-color', mix(C.nightBot, C.dayBot, light));
    const sx = lerp(-30, 830, isDay ? dayP : 1), sy = 180 - 150 * sunUp;
    $('spSun').setAttribute('transform', `translate(${sx},${sy})`);
    const moonUp = isDay ? 0 : Math.sin(Math.PI * nightP);
    $('spMoon').setAttribute('transform', `translate(${lerp(-20, 820, isDay ? 0 : nightP)},${180 - 120 * moonUp})`);
    $('spMoonCut').setAttribute('fill', top);
    starG.setAttribute('opacity', ((1 - light) * 0.8).toFixed(3));

    // Sunscreen layer and outside label follow the daylight
    $('spShield').setAttribute('opacity', (0.3 + 0.7 * light).toFixed(3));
    $('spOutLabel').setAttribute('fill', mix(C.cream, C.navy, light));

    if (still) return;

    // UV rays: daytime only, always stopped at the sunscreen layer
    if (light > 0.15 && now - lastR > 190 / light) { spawnRay(sx, sy); lastR = now; }
    for (let i = rays.length - 1; i >= 0; i--) {
      const r = rays[i];
      r.d += 430 * dt;
      const head = Math.min(r.d, r.L), tail = Math.max(0, r.d - 32);
      r.n.setAttribute('x1', r.sx + r.ux * tail); r.n.setAttribute('y1', r.sy + r.uy * tail);
      r.n.setAttribute('x2', r.sx + r.ux * head); r.n.setAttribute('y2', r.sy + r.uy * head);
      if (!r.hit && r.d >= r.L) {
        r.hit = true;
        flashes.push({ x: r.tx, t: 0, n: el('circle', { cx: r.tx, cy: 169, r: 2, fill: 'none', stroke: '#FFFFFF', 'stroke-width': 2 }, $('spFlashes')) });
      }
      if (tail >= r.L) { r.n.remove(); rays.splice(i, 1); }
    }
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      f.t += dt / 0.45;
      f.n.setAttribute('r', 2 + 14 * f.t);
      f.n.setAttribute('opacity', Math.max(0, 1 - f.t).toFixed(3));
      if (f.t >= 1) { f.n.remove(); flashes.splice(i, 1); }
    }

    // Nutrients: rise from below, day and night, lighting cells as they pass
    if (now - lastP > 105) { spawnParticle(); lastP = now; }
    for (let i = parts.length - 1; i >= 0; i--) {
      const q = parts[i];
      q.y -= q.v * dt;
      q.x += Math.sin(now / 600 + q.ph) * 0.3;
      for (let j = 0; j < cells.length; j++) {
        const c = cells[j];
        const nx = (q.x - c.x) / c.rx, ny = (q.y - c.y) / c.ry;
        if (nx * nx + ny * ny < 1) {
          if (q.last !== j) { c.g = Math.min(1, c.g + 0.35); q.last = j; }
          break;
        }
      }
      const fadeIn = Math.min(1, (470 - q.y) / 40), fadeOut = Math.min(1, (q.y - 182) / 25);
      q.n.setAttribute('cx', q.x); q.n.setAttribute('cy', q.y);
      q.n.setAttribute('opacity', Math.max(0, Math.min(fadeIn, fadeOut)).toFixed(3));
      if (q.y < 182) { q.n.remove(); parts.splice(i, 1); }
    }
    const decay = Math.pow(0.35, dt);
    cells.forEach(c => {
      c.g *= decay;
      c.n.setAttribute('fill', mix(C.cell, C.glowCell, c.g * 0.85));
      c.n.setAttribute('stroke', mix(C.cellEdge, C.glow, c.g * 0.7));
    });
  }

  // Keep a single animation loop; suspend it when it cannot be seen.
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const button = document.getElementById('spLoopToggle');
  let userPaused = motion.matches;
  let inView = false;
  let frameId = null;
  let prev = null;
  let clock = LOOP * 0.3;

  // A complete daytime illustration is visible before animation starts.
  if (motion.matches) {
    cells.forEach(c => {
      c.n.setAttribute('fill', mix(C.cell, C.glowCell, 0.35));
      c.n.setAttribute('stroke', mix(C.cellEdge, C.glow, 0.3));
    });
  }
  render(0.3, 0, 0, true);

  function frame(now) {
    frameId = null;
    const dt = prev === null ? 0 : Math.min((now - prev) / 1000, 0.05);
    prev = now;
    clock += dt * 1000;
    render((clock % LOOP) / LOOP, dt, now, false);
    frameId = requestAnimationFrame(frame);
  }

  function updatePlayback() {
    const shouldRun = inView && !document.hidden && !userPaused;
    if (shouldRun && frameId === null) {
      frameId = requestAnimationFrame(frame);
    } else if (!shouldRun) {
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = null;
      prev = null;
    }
    if (button) button.textContent = userPaused ? 'Play animation' : 'Pause animation';
  }

  if (button) {
    button.hidden = false;
    button.addEventListener('click', () => {
      userPaused = !userPaused;
      updatePlayback();
    });
  }
  motion.addEventListener('change', event => {
    if (event.matches) {
      userPaused = true;
      updatePlayback();
    }
  });
  document.addEventListener('visibilitychange', updatePlayback);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      updatePlayback();
    }).observe(svg);
  } else {
    inView = true;
    updatePlayback();
  }
})();
