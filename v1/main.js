gsap.registerPlugin(ScrollTrigger);

const lenis = new Lenis({ anchors: true });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add(time => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

if (reduceMotion) document.querySelector('.collection__media video').pause();

const variants = [
  { id: '388101', dial: 'Blue', swatch: '#1f3556', case: 'Stainless steel', strap: 'Blue calfskin strap', fastening: 'Buckle', price: 6700, head: '388101', strapId: '388101' },
  { id: '388102', dial: 'Blue', swatch: '#1f3556', case: 'Stainless steel', strap: 'Stainless steel bracelet', fastening: 'Clasp', price: 7700, head: '388101', strapId: '388102' },
  { id: '388103', dial: 'Green', swatch: '#1d4a3c', case: 'Stainless steel', strap: 'Brown calfskin strap', fastening: 'Buckle', price: 6700, head: '388103', strapId: '388103' },
  { id: '388104', dial: 'Green', swatch: '#1d4a3c', case: 'Stainless steel', strap: 'Stainless steel bracelet', fastening: 'Clasp', price: 7700, head: '388103', strapId: '388102' },
  { id: '388111', dial: 'Black', swatch: '#1c1c1d', case: 'Stainless steel', strap: 'Black calfskin strap', fastening: 'Buckle', price: 6700, head: '388111', strapId: '388111' },
  { id: '388113', dial: 'Black', swatch: '#1c1c1d', case: 'Stainless steel', strap: 'Stainless steel bracelet', fastening: 'Clasp', price: 7700, head: '388111', strapId: '388102' },
  { id: '388117', dial: 'Blue', swatch: '#4d6f86', case: 'Stainless steel', strap: 'Light blue rubber strap', fastening: 'Buckle', price: 6700, head: '388117', strapId: '388117' },
  { id: '388110', dial: 'Green', swatch: '#1d4a3c', case: '18 ct 5N gold', strap: 'Green rubber strap', fastening: 'Buckle', price: 23400, head: '388103', strapId: '388103' },
];

const straps = [
  { id: '388101', name: 'Blue calfskin', material: 'Calfskin, beige stitching' },
  { id: '388103', name: 'Brown calfskin', material: 'Calfskin, beige stitching' },
  { id: '388111', name: 'Black calfskin', material: 'Calfskin, beige stitching' },
  { id: '388117', name: 'Light blue rubber', material: 'Rubber' },
  { id: '388102', name: 'Stainless steel bracelet', material: 'Stainless steel, folding clasp' },
];

const image = (name) => `../assets/img/${name}.webp`;
const price = (value) => `CHF ${value.toLocaleString('de-CH')}`;
const summary = (variant) => `${variant.dial} dial, ${variant.case.charAt(0).toLowerCase()}${variant.case.slice(1)}, ${variant.strap.charAt(0).toLowerCase()}${variant.strap.slice(1)}`;

let current = variants[0];
let units = 'metric';

const formatMm = (mm) => (units === 'metric' ? `${mm} mm` : `${(mm / 25.4).toFixed(2)} in`);
const formatBar = (bar) => (units === 'metric' ? `${bar} bar` : `${Math.round(bar * 14.5038)} psi`);

function applyUnits() {
  for (const element of document.querySelectorAll('[data-mm]')) {
    element.textContent = formatMm(Number(element.dataset.mm));
  }
  for (const element of document.querySelectorAll('[data-bar]')) {
    element.textContent = formatBar(Number(element.dataset.bar));
  }
}

function crossfade(container, src, className, alt = '') {
  const next = new Image();
  next.className = className;
  next.src = src;
  next.alt = alt;
  next.decoding = 'async';
  const previous = [...container.children];
  container.append(next);
  next.decode().then(() => {
    next.classList.add('is-active');
    for (const element of previous) {
      element.classList.remove('is-active');
      setTimeout(() => element.remove(), 600);
    }
  });
}

/* Hero */

const frame = document.querySelector('.hero__frame');
const views = document.querySelector('.hero__views');
const cams = document.querySelector('.hero__cams-list');
const ticks = document.querySelector('.hero__ticks');
const camName = document.querySelector('.hero__cams-name');
const viewNames = ['Front', 'Case back', 'Detail', 'Buckle', 'Profile'];
let view = 1;

for (let i = 0; i < 60; i++) {
  const major = i % 5 === 0;
  const angle = (i / 60) * Math.PI * 2;
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  const inner = major ? 93 : 96;
  line.setAttribute('x1', (Math.sin(angle) * inner).toFixed(2));
  line.setAttribute('y1', (-Math.cos(angle) * inner).toFixed(2));
  line.setAttribute('x2', (Math.sin(angle) * 100).toFixed(2));
  line.setAttribute('y2', (-Math.cos(angle) * 100).toFixed(2));
  if (major) line.classList.add('is-major');
  if (!reduceMotion) line.style.animation = `tick-in 400ms ${300 + i * 12}ms both`;
  ticks.append(line);
}

document.querySelector('.hero__sweep').style.animationDelay = `-${(Date.now() / 1000) % 60}s`;

function renderCams() {
  cams.replaceChildren(
    ...viewNames.map((name, index) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      const label = index === 3 ? current.fastening : name;
      button.className = 'cam';
      button.type = 'button';
      button.setAttribute('aria-pressed', String(index + 1 === view));
      button.setAttribute('aria-label', label);
      button.innerHTML = `<img src="${image(`${current.id}-${index + 1}`)}" width="1297" height="1498" alt="">`;
      button.addEventListener('click', () => showView(index + 1));
      item.append(button);
      return item;
    }),
  );
}

function showView(next) {
  view = next;
  frame.dataset.view = String(view);
  crossfade(views, image(`${current.id}-${view}`), 'hero__view', `Pilot’s Watch Chronograph 41 ${current.id}, ${viewNames[view - 1].toLowerCase()} view`);
  for (const [index, button] of [...cams.querySelectorAll('.cam')].entries()) {
    button.setAttribute('aria-pressed', String(index + 1 === view));
  }
  camName.textContent = `0${view} ${view === 4 ? current.fastening : viewNames[view - 1]}`;
}

/* Lineup */

const lineup = document.querySelector('.lineup__list');

lineup.replaceChildren(
  ...variants.map((variant) => {
    const item = document.createElement('li');
    item.innerHTML = `
      <button class="variant" type="button" aria-pressed="false" data-variant="${variant.id}">
        <img class="variant__image" src="${image(`${variant.id}-1`)}" width="1297" height="1498" alt="" loading="lazy">
        <span class="variant__dial"><span class="variant__swatch" style="--swatch: ${variant.swatch}"></span>${variant.dial} dial</span>
        <span class="variant__strap">${variant.case === 'Stainless steel' ? '' : `${variant.case}, `}${variant.strap.replace(' strap', '')}</span>
        <span class="variant__ref">IW${variant.id}</span>
        <span class="variant__price">${price(variant.price)}</span>
      </button>`;
    item.querySelector('button').addEventListener('click', () => {
      selectVariant(variant);
      lenis.scrollTo(0, { duration: 1.6 });
    });
    return item;
  }),
);

/* Specs */

const tabList = document.querySelector('.tabs');
const panels = document.querySelector('.specs__panels');
const frames = document.querySelector('.specs__frames');
const caption = document.querySelector('.specs__caption');
let activeTab = 'overview';

const tabs = {
  overview: {
    label: 'Overview',
    rows: () => [
      ['Reference', `IW${current.id}`],
      ['Dial colour', current.dial],
      ['Case', current.case],
      ['Strap', `${current.strap} with EasX-CHANGE® system`],
      ['Diameter', { mm: 41 }],
      ['Movement', 'Automatic, self-winding, IWC-manufactured movement'],
    ],
    media: () => ({ type: 'packshot', src: image(`${current.id}-3`) }),
    caption: () => `Detail, IW${current.id}`,
  },
  features: {
    label: 'Features',
    features: [
      'Chronograph function with hours, minutes and seconds',
      'Small hacking seconds',
      'Day and date display',
      'Sapphire glass, convex, antireflective coating on both sides',
      'Glass secured against displacement by drop in air pressure',
      'IWC EasX-CHANGE® system',
    ],
    media: () => ({ type: 'image', src: '../assets/video/lume.jpg' }),
    caption: () => 'Luminescent hands and numerals',
  },
  case: {
    label: 'Case',
    rows: () => [
      ['Case', current.case],
      ['Diameter', { mm: 41 }],
      ['Height', { mm: 14.5 }],
      ['Water resistance', { bar: 10 }],
      ['Crown', 'Screwed-in'],
      ['Case back', 'With synthetic sapphire crystal'],
      ['Strap width', { mm: 20 }],
      ['Buckle width', { mm: 18 }],
    ],
    media: () => ({ type: 'video', src: '../assets/video/case.mp4', poster: '../assets/video/case.jpg' }),
    caption: () => 'Pusher and screw-in crown',
  },
  movement: {
    label: 'Movement',
    rows: () => [
      ['Calibre', '69385'],
      ['Movement type', 'Automatic, self-winding'],
      ['IWC-manufactured movement', 'Yes'],
      ['Power reserve', '46 hours'],
      ['Frequency', '28,800 vph (4 Hz)'],
      ['Components', '242'],
      ['Jewels', '33'],
    ],
    media: () => ({ type: 'video', src: '../assets/video/movement.mp4', poster: '../assets/video/movement.jpg' }),
    caption: () => 'Calibre 69385 through the sapphire case back',
  },
};

function valueMarkup(value) {
  if (value.mm) return `<dd data-mm="${value.mm}">${formatMm(value.mm)}</dd>`;
  if (value.bar) return `<dd data-bar="${value.bar}">${formatBar(value.bar)}</dd>`;
  return `<dd>${value}</dd>`;
}

function renderPanel() {
  const tab = tabs[activeTab];
  panels.innerHTML = tab.rows
    ? `<dl id="panel-${activeTab}" role="tabpanel">${tab.rows().map(([label, value]) => `<div class="spec-row"><dt>${label}</dt>${valueMarkup(value)}</div>`).join('')}</dl>`
    : `<ul id="panel-${activeTab}" role="tabpanel">${tab.features.map((feature) => `<li class="spec-feature">${feature}</li>`).join('')}</ul>`;

  const media = tab.media();
  const previous = [...frames.children];
  const next = document.createElement(media.type === 'video' ? 'video' : 'img');
  next.className = `specs__frame${media.type === 'packshot' ? ' specs__frame--packshot' : ''}`;
  next.src = media.src;
  if (media.type === 'video') {
    Object.assign(next, { muted: true, loop: true, playsInline: true, poster: media.poster });
    next.addEventListener('canplay', () => reduceMotion || next.play(), { once: true });
  } else {
    next.alt = '';
  }
  frames.append(next);
  requestAnimationFrame(() => requestAnimationFrame(() => next.classList.add('is-active')));
  for (const element of previous) {
    element.classList.remove('is-active');
    setTimeout(() => element.remove(), 700);
  }
  caption.innerHTML = `<span class="status status--live" aria-hidden="true"></span>${tab.caption()}`;
}

tabList.replaceChildren(
  ...Object.entries(tabs).map(([key, tab]) => {
    const button = document.createElement('button');
    button.className = 'tab';
    button.type = 'button';
    button.role = 'tab';
    button.textContent = tab.label;
    button.setAttribute('aria-controls', `panel-${key}`);
    button.setAttribute('aria-selected', String(key === activeTab));
    button.addEventListener('click', () => {
      activeTab = key;
      for (const other of tabList.children) other.setAttribute('aria-selected', String(other === button));
      renderPanel();
    });
    return button;
  }),
);

for (const button of document.querySelectorAll('[data-units]')) {
  button.addEventListener('click', () => {
    units = button.dataset.units;
    for (const other of document.querySelectorAll('[data-units]')) other.setAttribute('aria-pressed', String(other === button));
    applyUnits();
  });
}

/* Straps */

const strapStage = document.querySelector('.straps__watch');
const strapOptions = document.querySelector('.straps__options');
const strapName = document.querySelector('[data-bind-strap]');
let strapId = null;

const head = document.createElement('img');
head.className = 'straps__layer straps__layer--head';
head.width = 1297;
head.height = 1498;
head.alt = '';
strapStage.append(head);

for (const strap of straps) {
  const option = document.createElement('label');
  option.className = 'strap-option';
  option.innerHTML = `
    <input type="radio" name="strap" value="${strap.id}">
    <span class="strap-option__swatch"><img src="${image(`strap-${strap.id}`)}" width="1297" height="1498" alt="" loading="lazy"></span>
    <span class="strap-option__name">${strap.name}<span class="strap-option__material">${strap.material}</span></span>
    <span class="strap-option__check" aria-hidden="true"></span>`;
  option.querySelector('input').addEventListener('change', () => fitStrap(strap.id));
  strapOptions.append(option);
}

function strapLayer(id) {
  const layer = document.createElement('div');
  layer.className = 'straps__layer';
  layer.innerHTML = ['inset(0 0 50% 0)', 'inset(50% 0 0 0)']
    .map((clip) => `<img class="straps__layer" src="${image(`strap-${id}`)}" width="1297" height="1498" alt="" style="clip-path: ${clip}">`)
    .join('');
  return layer;
}

function fitStrap(id) {
  if (id === strapId) return;
  const previous = strapStage.querySelector('.straps__layer:not(.straps__layer--head)');
  const next = strapLayer(id);
  strapId = id;
  strapName.textContent = straps.find((strap) => strap.id === id).name;
  strapOptions.querySelector(`input[value="${id}"]`).checked = true;
  strapStage.prepend(next);

  if (!previous) return;
  if (reduceMotion) {
    previous.remove();
    return;
  }

  const [oldTop, oldBottom] = previous.children;
  const [newTop, newBottom] = next.children;
  const out = { duration: 320, easing: 'cubic-bezier(0.7, 0, 0.84, 0)', fill: 'forwards' };
  const into = { duration: 640, delay: 220, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards' };
  oldTop.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(-9%)', opacity: 0 }], out);
  oldBottom.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(9%)', opacity: 0 }], out).finished.then(() => previous.remove());
  newTop.animate([{ transform: 'translateY(-9%)', opacity: 0 }, { transform: 'none', opacity: 1 }], into);
  newBottom.animate([{ transform: 'translateY(9%)', opacity: 0 }, { transform: 'none', opacity: 1 }], into);
}

/* Variant selection */

function selectVariant(variant) {
  current = variant;
  for (const element of document.querySelectorAll('[data-bind="ref"]')) element.textContent = `IW${variant.id}`;
  for (const element of document.querySelectorAll('[data-bind="price"]')) element.textContent = price(variant.price);
  for (const element of document.querySelectorAll('[data-bind="case"]')) element.textContent = variant.case;
  document.querySelector('[data-bind="summary"]').textContent = summary(variant);
  document.querySelector('.buybar__image').src = image(`${variant.id}-1`);
  document.title = `Pilot’s Watch Chronograph 41 - IW${variant.id} | IWC Schaffhausen`;
  for (const button of lineup.querySelectorAll('.variant')) {
    button.setAttribute('aria-pressed', String(button.dataset.variant === variant.id));
  }
  showView(view);
  renderCams();
  renderPanel();
  head.src = image(`head-${variant.head}`);
  fitStrap(variant.strapId);
}

selectVariant(current);

/* Chronograph */

const dial = document.querySelector('.chrono__dial');
const startButton = document.querySelector('[data-chrono-start]');
const resetButton = document.querySelector('[data-chrono-reset]');
const hint = document.querySelector('[data-chrono-hint]');
const hintText = hint.innerHTML;
const stateLabel = document.querySelector('[data-chrono-state]');
const statusMark = document.querySelector('[data-chrono-status]');
const readout = Object.fromEntries([...document.querySelectorAll('[data-chrono]')].map((element) => [element.dataset.chrono, element]));
const svg = 'http://www.w3.org/2000/svg';
const R = 196;
const subdial = 78;
const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

let elapsed = 0;
let startedAt = 0;
let running = false;

const polar = (radius, degrees) => [Math.sin((degrees * Math.PI) / 180) * radius, -Math.cos((degrees * Math.PI) / 180) * radius];

function node(name, attributes, parent = dial) {
  const element = document.createElementNS(svg, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  parent.append(element);
  return element;
}

function tickRing(parent, { radius, count, length, every = 0, longer = 0 }) {
  for (let i = 0; i < count; i++) {
    const long = every && i % every === 0;
    const [x1, y1] = polar(radius - length - (long ? longer : 0), (i / count) * 360);
    const [x2, y2] = polar(radius, (i / count) * 360);
    node('line', { x1, y1, x2, y2, class: long ? 'dial__stroke' : 'dial__faint' }, parent);
  }
}

function hand(parent, path, className) {
  const group = node('g', {}, parent);
  node('path', { d: path, class: className }, group);
  return group;
}

function pusher(degrees, label, onPress) {
  const [x, y] = polar(R + 18, degrees);
  const group = node('g', { class: 'dial__pusher', transform: `translate(${x} ${y}) rotate(${degrees})`, role: 'button', tabindex: '0', 'aria-label': label });
  node('rect', { x: -9, y: -30, width: 18, height: 22 }, group);
  node('rect', { x: -12, y: -10, width: 24, height: 10 }, group);
  const [lx, ly] = polar(R + 50, degrees);
  node('text', { x: lx, y: ly, class: 'dial__pusher-label', 'text-anchor': 'start', 'dominant-baseline': 'central' }).textContent = label;
  const [px, py] = polar(4, degrees + 180);
  group.style.setProperty('--press-x', `${px}px`);
  group.style.setProperty('--press-y', `${py}px`);
  const press = () => {
    group.classList.add('is-pressed');
    setTimeout(() => group.classList.remove('is-pressed'), 140);
    onPress();
  };
  group.addEventListener('click', press);
  group.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      press();
    }
  });
  return group;
}

node('circle', { r: R + 18, class: 'dial__stroke' });
node('circle', { r: R + 6, class: 'dial__faint' });
node('circle', { r: R, class: 'dial__faint' });

const crown = node('g', { transform: `translate(${R + 18} 0)` });
node('rect', { x: 0, y: -19, width: 26, height: 38, class: 'dial__stroke' }, crown);
for (let i = 1; i < 8; i++) node('line', { x1: 6, x2: 26, y1: -19 + i * 4.75, y2: -19 + i * 4.75, class: 'dial__faint' }, crown);

pusher(60, 'Start / Stop', toggleChrono);
pusher(120, 'Reset', resetChrono);

const face = node('g', {});
tickRing(face, { radius: R - 6, count: 240, length: 4, every: 4, longer: 4 });

for (let hour = 0; hour < 12; hour++) {
  const angle = hour * 30;
  const group = node('g', { transform: `rotate(${angle})` }, face);
  if (hour === 0) {
    node('path', { d: `M0 ${-R + 26} L-12 ${-R + 48} L12 ${-R + 48} Z`, class: 'dial__fill' }, group);
    node('circle', { cx: -20, cy: -R + 28, r: 3.5, class: 'dial__fill' }, group);
    node('circle', { cx: 20, cy: -R + 28, r: 3.5, class: 'dial__fill' }, group);
  } else {
    node('rect', { x: -3.5, y: -R + 18, width: 7, height: 22, class: 'dial__fill' }, group);
  }
}

for (const hour of [1, 2, 4, 5, 7, 8, 10, 11]) {
  const [x, y] = polar(R - 56, hour * 30);
  node('text', { x, y, class: 'dial__text', 'font-size': 34 }, face).textContent = hour;
}

const counters = [
  { name: 'minutes', cx: 0, cy: -subdial, count: 30, every: 5, labels: [[30, 0], [10, 120], [20, 240]] },
  { name: 'hours', cx: -subdial, cy: 0, count: 24, every: 2, labels: [[12, 0], [3, 90], [6, 180], [9, 270]] },
  { name: 'seconds', cx: 0, cy: subdial, count: 60, every: 10, labels: [[60, 0], [20, 120], [40, 240]] },
];

const counterHands = {};

for (const counter of counters) {
  const group = node('g', { transform: `translate(${counter.cx} ${counter.cy})` }, face);
  node('circle', { r: 46, class: 'dial__faint' }, group);
  tickRing(group, { radius: 46, count: counter.count, length: 4, every: counter.every, longer: 4 });
  for (const [value, angle] of counter.labels) {
    const [x, y] = polar(29, angle);
    node('text', { x, y, class: 'dial__text dial__small' }, group).textContent = value;
  }
  const isSeconds = counter.name === 'seconds';
  counterHands[counter.name] = hand(group, 'M-2.2 8 L-1.6 -31 L0 -39 L1.6 -31 L2.2 8 Z', 'dial__hand');
  if (isSeconds) node('path', { d: 'M-1.6 -31 L0 -39 L1.6 -31 L1.9 -16 L-1.9 -16 Z', class: 'dial__hand--red' }, counterHands.seconds);
  node('circle', { r: 4, class: 'dial__fill' }, group);
}

node('text', { x: 96, y: -34, class: 'dial__text', 'font-size': 18 }, face).textContent = 'IWC';
node('rect', { x: 50, y: -15, width: 54, height: 30, class: 'dial__stroke' }, face);
node('rect', { x: 108, y: -15, width: 34, height: 30, class: 'dial__stroke' }, face);
const today = new Date();
node('text', { x: 77, y: 1, class: 'dial__text', 'font-size': 18 }, face).textContent = days[today.getDay()];
node('text', { x: 125, y: 1, class: 'dial__text', 'font-size': 18 }, face).textContent = today.getDate();
node('text', { x: 96, y: 34, class: 'dial__text dial__small', 'letter-spacing': '2' }, face).textContent = 'SCHAFFHAUSEN';

const hourHand = hand(face, 'M-6 18 L-8 -60 L0 -104 L8 -60 L6 18 Z', 'dial__hand');
const minuteHand = hand(face, 'M-5 20 L-6 -120 L0 -168 L6 -120 L5 20 Z', 'dial__hand');
const chronoHand = hand(face, 'M0 44 L0 -186', 'dial__hand--chrono');
node('circle', { r: 7, class: 'dial__fill' }, face);
node('circle', { r: 2.5, class: 'dial__pin' }, face);

const rotate = (group, degrees) => group.setAttribute('transform', `rotate(${degrees.toFixed(3)})`);
const pad = (value) => String(value).padStart(2, '0');

function chronoSeconds() {
  return elapsed + (running ? (performance.now() - startedAt) / 1000 : 0);
}

function draw() {
  const now = new Date();
  const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
  const minutes = now.getMinutes() + seconds / 60;
  rotate(hourHand, ((now.getHours() % 12) + minutes / 60) * 30);
  rotate(minuteHand, minutes * 6);
  rotate(counterHands.seconds, (Math.floor(seconds * 8) / 8) * 6);

  const total = Math.floor(chronoSeconds() * 8) / 8;
  rotate(chronoHand, (total % 60) * 6);
  rotate(counterHands.minutes, (Math.floor(total / 60) % 30) * 12);
  rotate(counterHands.hours, ((total / 3600) % 12) * 30);

  readout.h.textContent = pad(Math.floor(total / 3600) % 12);
  readout.m.textContent = pad(Math.floor(total / 60) % 60);
  readout.s.textContent = pad(Math.floor(total % 60));
  readout.f.textContent = `.${String(Math.round((total % 1) * 1000)).padStart(3, '0')}`;
}

function setState() {
  startButton.textContent = running ? 'Stop' : 'Start';
  resetButton.disabled = running || elapsed === 0;
  stateLabel.textContent = running ? 'Running' : 'Stopped';
  statusMark.className = `status ${running ? 'status--live' : 'status--idle'}`;
}

function toggleChrono() {
  if (running) {
    elapsed += (performance.now() - startedAt) / 1000;
  } else {
    startedAt = performance.now();
  }
  running = !running;
  hint.innerHTML = hintText;
  setState();
}

function resetChrono() {
  if (running) {
    hint.textContent = 'Stop it first: calibre 69385 is not a flyback, so it resets only when stopped.';
    return;
  }
  elapsed = 0;
  hint.innerHTML = hintText;
  setState();
  draw();
}

startButton.addEventListener('click', toggleChrono);
resetButton.addEventListener('click', resetChrono);

let chronoVisible = false;
new IntersectionObserver(([entry]) => {
  chronoVisible = entry.isIntersecting;
}).observe(document.querySelector('.chrono'));

document.addEventListener('keydown', (event) => {
  if (!chronoVisible || event.target.closest('input, button, a, summary, [role="button"]')) return;
  if (event.key === ' ') {
    event.preventDefault();
    toggleChrono();
  } else if (event.key === 'r' || event.key === 'R') {
    resetChrono();
  }
});

gsap.ticker.add(() => {
  if (chronoVisible) draw();
});

draw();

/* Buy bar */

const buybar = document.querySelector('.buybar');
const bagCount = document.querySelector('.nav__count');
let heroVisible = true;
let footerVisible = false;

const updateBuybar = () => {
  const visible = !heroVisible && !footerVisible;
  buybar.classList.toggle('is-visible', visible);
  buybar.setAttribute('aria-hidden', String(!visible));
  buybar.querySelector('button').tabIndex = visible ? 0 : -1;
};

new IntersectionObserver(([entry]) => {
  heroVisible = entry.isIntersecting;
  updateBuybar();
}).observe(document.querySelector('.hero__ctas'));

new IntersectionObserver(([entry]) => {
  footerVisible = entry.isIntersecting;
  updateBuybar();
}).observe(document.querySelector('.footer'));

for (const button of document.querySelectorAll('[data-add-to-bag]')) {
  button.addEventListener('click', () => {
    bagCount.hidden = false;
    bagCount.textContent = String(Number(bagCount.textContent) + 1);
    button.textContent = 'Added to bag';
    setTimeout(() => (button.textContent = 'Add to bag'), 2000);
  });
}
