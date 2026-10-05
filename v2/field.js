const fieldGallery = document.querySelector('.buy__gallery');
const fieldCanvas = fieldGallery.querySelector('.buy__field');
const fieldViews = fieldGallery.querySelector('.buy__views');
const field = fieldCanvas.getContext('2d');
const goldenAngle = Math.PI * (3 - Math.sqrt(5));
const loupe = { x: 0, y: 0, targetX: 0, targetY: 0, strength: 0, target: 0, radius: 0 };
let dots = [];
let fieldWidth = 0;
let fieldHeight = 0;
let fieldRatio = 1;
let fieldFrame = 0;

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
  const centerX = box.left - frame.left + (box.width - imageWidth) / 2 + imageWidth * 0.5092;
  const centerY = box.top - frame.top + (box.height - imageHeight) / 2 + imageHeight * 0.4995;
  const reach = Math.hypot(Math.max(centerX, fieldWidth - centerX), Math.max(centerY, fieldHeight - centerY));
  const step = 10.5;
  dots = [];
  for (let n = 1; step * Math.sqrt(n) < reach; n++) {
    const radius = step * Math.sqrt(n);
    dots.push({ x: centerX + Math.cos(n * goldenAngle) * radius, y: centerY + Math.sin(n * goldenAngle) * radius });
  }
  drawField();
}

function drawField() {
  field.setTransform(fieldRatio, 0, 0, fieldRatio, 0, 0);
  field.clearRect(0, 0, fieldWidth, fieldHeight);
  field.fillStyle = '#000';
  const reach = loupe.radius;
  for (const dot of dots) {
    let { x, y } = dot;
    let size = 1;
    let alpha = 0.1;
    const dx = x - loupe.x;
    const dy = y - loupe.y;
    const distance = Math.hypot(dx, dy);
    if (loupe.strength > 0.001 && distance < reach) {
      const t = distance / reach;
      const lift = loupe.strength * (1 - t * t) * (1 - t * t);
      x = loupe.x + dx * (1 + 0.3 * lift);
      y = loupe.y + dy * (1 + 0.3 * lift);
      size += 1.8 * lift;
      alpha += 0.4 * lift;
    }
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
  drawField();
  const settled = Math.abs(loupe.target - loupe.strength) < 0.002 && Math.hypot(loupe.targetX - loupe.x, loupe.targetY - loupe.y) < 0.3;
  fieldFrame = settled ? 0 : requestAnimationFrame(tickField);
}

function wakeField() {
  if (!fieldFrame) fieldFrame = requestAnimationFrame(tickField);
}

if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
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
}

new ResizeObserver(layoutField).observe(fieldGallery);
