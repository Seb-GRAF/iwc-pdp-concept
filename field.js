const fieldGallery = document.querySelector('.buy__stage');
const fieldCanvas = fieldGallery.querySelector('.buy__field');
const fieldViews = fieldGallery.querySelector('.buy__views');
const field = fieldCanvas.getContext('2d');
const goldenAngle = Math.PI * (3 - Math.sqrt(5));
const rippleSpeed = 500;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const loupe = { x: 0, y: 0, targetX: 0, targetY: 0, strength: 0, target: 0, radius: 0 };
const ripples = [];
let dots = [];
let fieldWidth = 0;
let fieldHeight = 0;
let fieldRatio = 1;
let fieldFrame = 0;
let originX = 0;
let originY = 0;
let landedAt = reduceMotion ? -Infinity : Infinity;

function layoutField() {
  fieldWidth = fieldGallery.clientWidth;
  fieldHeight = fieldGallery.clientHeight;
  fieldRatio = Math.min(devicePixelRatio, 2);
  fieldCanvas.width = fieldWidth * fieldRatio;
  fieldCanvas.height = fieldHeight * fieldRatio;
  loupe.radius = Math.max(220, Math.min(fieldWidth, fieldHeight) * 0.42);

  const box = fieldViews.getBoundingClientRect();
  const frame = fieldGallery.getBoundingClientRect();
  const imageHeight = Math.min(box.height, (box.width * 1498) / 1297);
  const imageWidth = (imageHeight * 1297) / 1498;
  originX = box.left - frame.left + (box.width - imageWidth) / 2 + imageWidth * 0.5092;
  originY = box.top - frame.top + (box.height - imageHeight) / 2 + imageHeight * 0.4995;
  const reach = Math.hypot(Math.max(originX, fieldWidth - originX), Math.max(originY, fieldHeight - originY));
  const step = 10.5;
  dots = [];
  for (let n = 1; step * Math.sqrt(n) < reach; n++) {
    const radius = step * Math.sqrt(n);
    dots.push({ x: originX + Math.cos(n * goldenAngle) * radius, y: originY + Math.sin(n * goldenAngle) * radius, d: radius });
  }
  drawField();
}

function drawField() {
  field.setTransform(fieldRatio, 0, 0, fieldRatio, 0, 0);
  field.clearRect(0, 0, fieldWidth, fieldHeight);
  field.fillStyle = '#000';
  const reach = loupe.radius;
  const now = performance.now();
  for (const dot of dots) {
    let { x, y } = dot;
    let size = 1;
    let alpha = 0.16;
    const dx = x - loupe.x;
    const dy = y - loupe.y;
    const distance = Math.hypot(dx, dy);
    if (loupe.strength > 0.001 && distance < reach) {
      const t = distance / reach;
      const lift = loupe.strength * (1 - t * t) * (1 - t * t);
      x = loupe.x + dx * (1 + 0.2 * lift);
      y = loupe.y + dy * (1 + 0.2 * lift);
      size += 1.1 * lift;
      alpha += 0.22 * lift;
    }
    for (const ripple of ripples) {
      const age = (now - ripple.start) / 1000;
      const radius = age * rippleSpeed;
      const rise = Math.min(age / 0.6, 1);
      const strength = rise * rise * (3 - 2 * rise) * Math.max(1 - radius / ripple.reach, 0);
      const rx = x - ripple.x;
      const ry = y - ripple.y;
      const away = Math.hypot(rx, ry) || 1;
      const wave = Math.exp(-(((away - radius) / (60 + radius * 0.15)) ** 2)) * strength;
      x += (rx / away) * 6 * wave;
      y += (ry / away) * 6 * wave;
      size += 1.2 * wave;
      alpha += 0.32 * wave;
    }
    const front = (now - landedAt) * 0.5 - dot.d;
    const ring = Math.exp(-(((front - 150) / 150) ** 2));
    size += 0.5 * ring;
    alpha = alpha * Math.min(Math.max(front / 300, 0), 1) + 0.08 * ring;
    field.globalAlpha = alpha;
    field.beginPath();
    field.arc(x, y, size / 2, 0, Math.PI * 2);
    field.fill();
  }
}

function tickField() {
  loupe.x += (loupe.targetX - loupe.x) * 0.16;
  loupe.y += (loupe.targetY - loupe.y) * 0.16;
  loupe.strength += (loupe.target - loupe.strength) * 0.08;
  while (ripples.length && ((performance.now() - ripples[0].start) / 1000) * rippleSpeed > ripples[0].reach) ripples.shift();
  drawField();
  const settled = !ripples.length && Math.abs(loupe.target - loupe.strength) < 0.002 && Math.hypot(loupe.targetX - loupe.x, loupe.targetY - loupe.y) < 0.3 && performance.now() - landedAt > 4000;
  fieldFrame = settled ? 0 : requestAnimationFrame(tickField);
}

function wakeField() {
  if (!fieldFrame) fieldFrame = requestAnimationFrame(tickField);
}

function addRipple(x, y) {
  ripples.push({ x, y, start: performance.now(), reach: Math.hypot(Math.max(x, fieldWidth - x), Math.max(y, fieldHeight - y)) });
  wakeField();
}

if (!reduceMotion) {
  fieldGallery.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'mouse') return;
    const frame = fieldGallery.getBoundingClientRect();
    loupe.x = loupe.targetX = event.clientX - frame.left;
    loupe.y = loupe.targetY = event.clientY - frame.top;
    loupe.target = 1;
    wakeField();
  });

  fieldGallery.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    const frame = fieldGallery.getBoundingClientRect();
    loupe.targetX = event.clientX - frame.left;
    loupe.targetY = event.clientY - frame.top;
    loupe.target = 1;
    wakeField();
  });

  fieldGallery.addEventListener('pointerleave', () => {
    loupe.target = 0;
    wakeField();
  });

  fieldGallery.addEventListener('pointerdown', (event) => {
    const frame = fieldGallery.getBoundingClientRect();
    addRipple(event.clientX - frame.left, event.clientY - frame.top);
  });

  document.addEventListener('view', () => addRipple(originX, originY));

  document.addEventListener('land', () => {
    landedAt = performance.now() + 800;
    wakeField();
  });
}

new ResizeObserver(layoutField).observe(fieldGallery);
