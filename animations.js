// ── Easing ─────────────────────────────────────────────────────────────────

const easeOut   = t => 1 - Math.pow(1 - t, 2);
const easeInOut = t => t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2;

// ── Shapes ─────────────────────────────────────────────────────────────────

const MAX_R = Math.sqrt(CW * CW + CH * CH) * 1.1;

const SHAPES = {
  forage(ctx) {
    ctx.save();
    ctx.translate(72, 64);
    ctx.rotate(-0.35);
    ctx.beginPath();
    ctx.ellipse(0, 0, 42, 27, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  search(ctx) {
    [[52, 44, 22], [78, 48, 19], [61, 66, 18]].forEach(([x, y, r]) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    });
  },
  dig(ctx) {
    ctx.beginPath();
    ctx.moveTo(72, 21);
    ctx.lineTo(123, 64);
    ctx.lineTo(72, 107);
    ctx.lineTo(21, 64);
    ctx.closePath();
    ctx.fill();
  },
  call(ctx) {
    ctx.lineWidth = 22;
    ctx.lineCap   = 'round';
    ctx.lineJoin  = 'round';
    ctx.beginPath();
    ctx.moveTo(46, 94);
    ctx.bezierCurveTo(32, 64, 90, 32, 77, 67);
    ctx.bezierCurveTo(66, 93, 110, 77, 99, 45);
    ctx.stroke();
  },
};

// ── Blob renderer factory ──────────────────────────────────────────────────
// Pre-renders the blob once; returns drawFull / drawReveal closures bound
// to the given canvas context.

function createBlobRenderer(ctx, color, shape, innerCorner) {
  const blob  = document.createElement('canvas');
  blob.width  = CW; blob.height = CH;
  const bctx  = blob.getContext('2d');
  bctx.save();
  bctx.filter      = `blur(${BLUR}px)`;
  bctx.fillStyle   = color;
  bctx.strokeStyle = color;
  SHAPES[shape](bctx);
  bctx.restore();

  const revealCvs  = document.createElement('canvas');
  revealCvs.width  = CW; revealCvs.height = CH;
  const rctx       = revealCvs.getContext('2d');

  function drawFull() {
    ctx.clearRect(0, 0, CW, CH);
    ctx.drawImage(blob, 0, 0);
  }

  function drawReveal(t) {
    ctx.clearRect(0, 0, CW, CH);
    if (t <= 0) return;
    if (t >= 1) { drawFull(); return; }

    // Dim ghost — immediately visible at low opacity
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.drawImage(blob, 0, 0);
    ctx.restore();

    // Bright layer revealed radially from innerCorner
    const r    = easeOut(t) * MAX_R;
    const soft = Math.max(0, 1 - 80 / Math.max(r, 1));

    rctx.clearRect(0, 0, CW, CH);
    rctx.drawImage(blob, 0, 0);

    const grad = rctx.createRadialGradient(innerCorner.x, innerCorner.y, 0,
                                            innerCorner.x, innerCorner.y, r);
    grad.addColorStop(soft, 'rgba(0,0,0,1)');
    grad.addColorStop(1,    'rgba(0,0,0,0)');
    rctx.globalCompositeOperation = 'destination-in';
    rctx.fillStyle = grad;
    rctx.fillRect(0, 0, CW, CH);
    rctx.globalCompositeOperation = 'source-over';

    ctx.drawImage(revealCvs, 0, 0);
  }

  return { drawFull, drawReveal };
}

// ── Inventory value bump ───────────────────────────────────────────────────

function animateInvBump(key) {
  const el = document.querySelector(`.inv-val[data-key="${key}"]`);
  if (!el) return;
  const RISE_MS  = 40;
  const TOTAL_MS = 200;
  const PEAK     = 0.4;
  const start    = performance.now();
  function tick(now) {
    const elapsed = now - start;
    let scale;
    if (elapsed < RISE_MS) {
      scale = 1 + PEAK * easeOut(elapsed / RISE_MS);
    } else {
      const t = Math.min((elapsed - RISE_MS) / (TOTAL_MS - RISE_MS), 1);
      scale = 1 + PEAK * (1 - easeOut(t));
    }
    el.style.transform = `scale(${scale.toFixed(4)})`;
    if (elapsed < TOTAL_MS) {
      requestAnimationFrame(tick);
    } else {
      el.style.transform = '';
    }
  }
  requestAnimationFrame(tick);
}

// ── Tool fade-in ───────────────────────────────────────────────────────────

function animateToolFadeIn(toolName) {
  const el = document.querySelector(`.tool-row[data-tool="${CSS.escape(toolName)}"]`);
  if (!el) return;
  const DURATION = 1000;
  const start    = performance.now();
  el.style.opacity = '0';
  function tick(now) {
    const t = Math.min((now - start) / DURATION, 1);
    el.style.opacity = easeOut(t).toFixed(4);
    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      el.style.opacity = '';
    }
  }
  requestAnimationFrame(tick);
}

// ── Cooldown animation ─────────────────────────────────────────────────────
// Returns a cancel() function. Call it to abort the animation early (e.g.
// debug timer reset). onComplete fires only if not cancelled.

// Visual fill is complete when the reveal circle reaches the canvas diagonal.
// MAX_R = diagonal * 1.1, so easeOut(t) >= 1/1.1 means the circle covers everything.
const UNLOCK_THRESHOLD = 1 / 1.1;

function runCooldownAnimation(canvas, drawReveal, drawFull, onUnlock, onDone) {
  let cancelled = false;
  let unlocked  = false;
  const start   = performance.now();

  function tick(now) {
    if (cancelled) return;

    const elapsed  = now - start;
    const rawT     = Math.min(elapsed / COOLDOWN_MS, 1);

    drawReveal(rawT);

    const shrinkE  = easeOut(Math.min(elapsed / SHRINK_MS, 1));
    const recoverE = easeInOut(Math.min(Math.max(elapsed - SHRINK_MS, 0) / COOLDOWN_MS, 1));
    canvas.style.transform = `scale(${1 - shrinkE * 0.05 + recoverE * 0.05})`;

    if (!unlocked && easeOut(rawT) >= UNLOCK_THRESHOLD) {
      unlocked = true;
      onUnlock();
    }

    if (rawT < 1) {
      requestAnimationFrame(tick);
    } else {
      drawFull();
      canvas.style.transform = 'scale(1)';
      if (onDone) onDone();
    }
  }

  requestAnimationFrame(tick);
  return () => { cancelled = true; };
}
