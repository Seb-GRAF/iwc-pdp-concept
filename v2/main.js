const lenis = new Lenis({ anchors: true });
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const storyFilm = document.querySelector('.story__film');

if (reduceMotion) {
  storyFilm.addEventListener('loadedmetadata', () => (storyFilm.currentTime = storyFilm.duration), { once: true });
} else {
  const storyObserver = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        storyObserver.disconnect();
        storyFilm.play();
      }
    },
    { threshold: 0.5 },
  );
  storyObserver.observe(storyFilm);
}

const variants = [
  { id: '388101', dial: 'Blue', case: 'Stainless steel', strapName: 'Blue calfskin strap', kind: 'calfskin', fastening: 'Buckle', price: 6700, sky: 'blue', head: '388101', strap: '388101' },
  { id: '388102', dial: 'Blue', case: 'Stainless steel', strapName: 'Stainless steel bracelet', kind: 'bracelet', fastening: 'Clasp', price: 7700, sky: 'blue', head: '388101', strap: '388102' },
  { id: '388117', dial: 'Blue', case: 'Stainless steel', strapName: 'Light blue rubber strap', kind: 'rubber', fastening: 'Buckle', price: 6700, sky: 'ice', head: '388117', strap: '388117' },
  { id: '388103', dial: 'Green', case: 'Stainless steel', strapName: 'Brown calfskin strap', kind: 'calfskin', fastening: 'Buckle', price: 6700, sky: 'green', head: '388103', strap: '388103' },
  { id: '388104', dial: 'Green', case: 'Stainless steel', strapName: 'Stainless steel bracelet', kind: 'bracelet', fastening: 'Clasp', price: 7700, sky: 'green', head: '388103', strap: '388102' },
  { id: '388110', dial: 'Green', case: '18 ct 5N gold', strapName: 'Green rubber strap', kind: 'rubber', fastening: 'Buckle', price: 23400, sky: 'bronze', head: '388110', strap: '388110' },
  { id: '388111', dial: 'Black', case: 'Stainless steel', strapName: 'Black calfskin strap', kind: 'calfskin', fastening: 'Buckle', price: 6700, sky: 'graphite', head: '388111', strap: '388111' },
  { id: '388113', dial: 'Black', case: 'Stainless steel', strapName: 'Stainless steel bracelet', kind: 'bracelet', fastening: 'Clasp', price: 7700, sky: 'graphite', head: '388111', strap: '388102' },
];

const dials = [
  { name: 'Blue', swatch: '#1f3556' },
  { name: 'Green', swatch: '#1d4a3c' },
  { name: 'Black', swatch: '#1c1c1d' },
];

const straps = [
  { id: '388101', name: 'Blue calfskin' },
  { id: '388103', name: 'Brown calfskin' },
  { id: '388111', name: 'Black calfskin' },
  { id: '388117', name: 'Light blue rubber' },
  { id: '388110', name: 'Green rubber' },
  { id: '388102', name: 'Steel bracelet' },
];

const viewNames = ['Front', 'Case back', 'Detail', 'Buckle', 'Profile'];
const viewName = (index) => (index === 3 ? current.fastening : viewNames[index]);
const price = (value) => `CHF ${value.toLocaleString('de-CH')}`;
const lowerFirst = (text) => text.charAt(0).toLowerCase() + text.slice(1);
const versionLabel = (variant) => (variant.case === 'Stainless steel' ? variant.strapName : `${variant.case}, ${lowerFirst(variant.strapName)}`).replace(' strap', '').replace('Stainless steel bracelet', 'Steel bracelet');
const describe = (variant) => (variant.kind === 'bracelet' ? 'Stainless steel case and bracelet' : `${variant.case} case, ${lowerFirst(variant.strapName)}`);

let current = variants[0];

function crossfade(container, src, className, alt) {
  const next = new Image();
  next.className = className;
  next.src = src;
  next.alt = alt;
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

/* Purchase */

const views = document.querySelector('.buy__views');
const thumbs = document.querySelector('.buy__thumbs');
const dialPicker = document.querySelector('.picker__dials');
const versionPicker = document.querySelector('.picker__versions');
let view = 1;

function showView(next) {
  view = next;
  crossfade(views, `../assets/gallery/${current.id}-${view}.webp`, 'buy__view', `Pilot’s Watch Chronograph 41 IW${current.id}, ${viewName(view - 1).toLowerCase()}`);
  for (const [index, button] of [...thumbs.querySelectorAll('.thumb')].entries()) {
    button.setAttribute('aria-pressed', String(index + 1 === view));
  }
}

function renderThumbs() {
  thumbs.replaceChildren(
    ...viewNames.map((_, index) => {
      const item = document.createElement('li');
      item.innerHTML = `<button class="thumb" type="button" aria-label="${viewName(index)}" aria-pressed="${index + 1 === view}"><img src="../assets/img/${current.id}-${index + 1}.webp" width="1297" height="1498" alt=""></button>`;
      item.firstChild.addEventListener('click', () => showView(index + 1));
      return item;
    }),
  );
}

dialPicker.replaceChildren(
  ...dials.map((dial) => {
    const button = document.createElement('button');
    button.className = 'dial';
    button.type = 'button';
    button.role = 'radio';
    button.ariaLabel = dial.name;
    button.style.setProperty('--swatch', dial.swatch);
    button.addEventListener('click', () => {
      const sameKind = variants.find((variant) => variant.dial === dial.name && variant.kind === current.kind && variant.case === current.case);
      selectVariant(sameKind ?? variants.find((variant) => variant.dial === dial.name));
    });
    return button;
  }),
);

function renderPickers() {
  for (const button of dialPicker.children) button.ariaChecked = String(button.ariaLabel === current.dial);
  versionPicker.replaceChildren(
    ...variants
      .filter((variant) => variant.dial === current.dial)
      .map((variant) => {
        const button = document.createElement('button');
        button.className = 'version';
        button.type = 'button';
        button.role = 'radio';
        button.ariaChecked = String(variant === current);
        button.textContent = versionLabel(variant);
        button.addEventListener('click', () => selectVariant(variant));
        return button;
      }),
  );
}

/* Showroom */

const showroom = document.querySelector('.showroom');
const skyLayer = showroom.querySelector('.showroom__skies');
const track = showroom.querySelector('.showroom__track');
const showroomText = Object.fromEntries([...showroom.querySelectorAll('[data-showroom]')].map((element) => [element.dataset.showroom, element]));
const selectButton = showroom.querySelector('[data-showroom-select]');
const lineup = ['388101', '388102', '388117', '388103', '388104', '388110', '388111', '388113'].map((id) => variants.find((variant) => variant.id === id));
const count = lineup.length;
const wrap = (value) => ((value % count) + count) % count;
const slide = { position: 0, target: 0 };
let shown = -1;
let drag = null;

const skies = Object.fromEntries(
  ['blue', 'ice', 'green', 'bronze', 'graphite'].map((name) => {
    const image = new Image();
    image.className = 'showroom__sky';
    image.src = `../assets/sky/${name}.jpg`;
    image.alt = '';
    skyLayer.append(image);
    return [name, image];
  }),
);

const items = lineup.map((variant) => {
  const image = new Image();
  image.className = 'showroom__item';
  image.src = `../assets/img/${variant.id}-1.webp`;
  image.alt = '';
  image.draggable = false;
  track.append(image);
  return image;
});

showroomText.total.textContent = String(count).padStart(2, '0');

const spacing = () => (innerWidth < 768 ? innerWidth * 0.74 : Math.min(innerWidth * 0.34, 560));

function renderShowroom() {
  const gap = spacing();
  const weights = {};
  items.forEach((item, index) => {
    const offset = wrap(index - slide.position + count / 2) - count / 2;
    const distance = Math.abs(offset);
    item.style.transform = `translate(-50%, -50%) translateX(${offset * gap}px) scale(${1 - Math.min(distance, 1) * 0.42})`;
    item.style.opacity = String(Math.max(0, 1 - distance * 0.6));
    item.style.filter = `blur(${Math.min(distance, 1.5) * 3}px)`;
    weights[lineup[index].sky] = (weights[lineup[index].sky] ?? 0) + Math.max(0, 1 - distance);
  });
  for (const [name, image] of Object.entries(skies)) image.style.opacity = String(weights[name] ?? 0);

  const index = wrap(Math.round(slide.position));
  if (index === shown) return;
  shown = index;
  const variant = lineup[index];
  showroomText.index.textContent = String(index + 1).padStart(2, '0');
  showroomText.dial.textContent = `${variant.dial} dial`;
  showroomText.strap.textContent = describe(variant);
  showroomText.ref.textContent = `IW${variant.id}`;
  showroomText.price.textContent = price(variant.price);
  selectButton.ariaPressed = String(variant === current);
  selectButton.textContent = variant === current ? 'Selected' : 'Select';
}

function goTo(target) {
  slide.target = target;
  gsap.to(slide, { position: target, duration: reduceMotion ? 0 : 1.1, ease: 'expo.out', onUpdate: renderShowroom });
}

showroom.addEventListener('pointerdown', (event) => {
  if (event.target.closest('button')) return;
  gsap.killTweensOf(slide);
  drag = { x: event.clientX, position: slide.position, lastX: event.clientX, lastTime: performance.now(), velocity: 0 };
  showroom.setPointerCapture(event.pointerId);
  showroom.classList.add('is-dragging');
});

showroom.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const now = performance.now();
  drag.velocity = (event.clientX - drag.lastX) / Math.max(now - drag.lastTime, 1);
  drag.lastX = event.clientX;
  drag.lastTime = now;
  slide.position = drag.position - (event.clientX - drag.x) / spacing();
  renderShowroom();
});

function release() {
  if (!drag) return;
  const target = Math.round(slide.position - (drag.velocity * 180) / spacing());
  drag = null;
  showroom.classList.remove('is-dragging');
  goTo(target);
}

showroom.addEventListener('pointerup', release);
showroom.addEventListener('pointercancel', release);

for (const button of showroom.querySelectorAll('[data-showroom-step]')) {
  button.addEventListener('click', () => goTo(slide.target + Number(button.dataset.showroomStep)));
}

showroom.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft') goTo(slide.target - 1);
  if (event.key === 'ArrowRight') goTo(slide.target + 1);
});

selectButton.addEventListener('click', () => {
  selectVariant(lineup[wrap(slide.target)]);
  lenis.scrollTo(0, { duration: 1.4 });
});

addEventListener('resize', renderShowroom);

/* Specifications */

const chapters = {
  overview: {
    rows: () => [
      ['Reference', `IW${current.id}`, ''],
      ['Dial colour', current.dial, 'dial'],
      ['Case', current.case, 'body bezel back'],
      ['Strap', `${current.strapName} with EasX-CHANGE® system`, 'body'],
      ['Diameter', '41 mm', 'body bezel'],
      ['Movement', 'Automatic, self-winding, IWC-manufactured movement', 'works plate train bridges winding balance'],
    ],
  },
  features: {
    items: [
      ['Chronograph function with hours, minutes and seconds', 'hands controls'],
      ['Small hacking seconds', 'hands'],
      ['Day and date display', 'dial'],
      ['Sapphire glass, convex, antireflective coating on both sides', 'crystal'],
      ['Glass secured against displacement by drop in air pressure', 'crystal'],
      ['IWC EasX-CHANGE® system', 'body'],
    ],
  },
  case: {
    rows: () => [
      ['Case', current.case, 'body bezel back'],
      ['Diameter', '41 mm', 'body bezel'],
      ['Height', '14.5 mm', 'body crystal back'],
      ['Water resistance', '10 bar', 'crystal controls back'],
      ['Crown', 'Screwed-in', 'controls'],
      ['Case back', 'With synthetic sapphire crystal', 'back'],
      ['Strap width', '20 mm', 'body'],
      ['Buckle width', '18 mm', 'body'],
    ],
  },
  movement: {
    rows: () => [
      ['Calibre', '69385', 'works plate train bridges winding balance'],
      ['Movement type', 'Automatic, self-winding', 'winding'],
      ['IWC-manufactured movement', 'Yes', 'works plate train bridges winding balance'],
      ['Power reserve', '46 hours', 'train'],
      ['Frequency', '28,800 vph (4 Hz)', 'balance'],
      ['Components', '242', 'works plate train bridges winding balance'],
      ['Jewels', '33', 'bridges balance'],
    ],
  },
};

function renderChapters() {
  for (const element of document.querySelectorAll('.chapter')) {
    const chapter = chapters[element.dataset.view];
    element.querySelector('.chapter__body').innerHTML = chapter.rows
      ? `<dl class="rows">${chapter.rows().map(([label, value, part]) => `<div class="row" data-part="${part}"><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl>`
      : `<ul>${chapter.items.map(([item, part]) => `<li class="feature-row" data-part="${part}">${item}</li>`).join('')}</ul>`;
  }
}

/* Straps */

const strapStage = document.querySelector('.straps__watch');
const strapOptions = document.querySelector('.straps__options');
let strapId = null;

const head = new Image();
head.className = 'straps__layer straps__layer--head';
head.alt = '';
strapStage.append(head);

strapOptions.replaceChildren(
  ...straps.map((strap) => {
    const button = document.createElement('button');
    button.className = 'swatch';
    button.type = 'button';
    button.role = 'radio';
    button.dataset.strap = strap.id;
    button.innerHTML = `<img src="../assets/straps/swatch-${strap.id}.jpg" width="160" height="160" alt=""><span>${strap.name}</span>`;
    button.addEventListener('click', () => fitStrap(strap.id));
    return button;
  }),
);

function strapLayer(id) {
  const layer = document.createElement('div');
  layer.className = 'straps__layer';
  layer.innerHTML = ['top', 'bottom']
    .map((half) => `<img class="straps__half straps__half--${half}" src="../assets/straps/strap-${id}.webp" width="1297" height="1498" alt="">`)
    .join('');
  return layer;
}

function fitStrap(id) {
  if (id === strapId) return;
  strapId = id;
  for (const button of strapOptions.children) button.ariaChecked = String(button.dataset.strap === id);

  const previous = strapStage.querySelector('.straps__layer:not(.straps__layer--head)');
  const next = strapLayer(id);
  strapStage.prepend(next);
  if (!previous) return;
  if (reduceMotion) {
    previous.remove();
    return;
  }

  const out = { duration: 380, easing: 'cubic-bezier(0.55, 0, 0.75, 0)', fill: 'forwards' };
  const into = { duration: 760, delay: 260, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards' };
  previous.children[0].animate([{ transform: 'none', opacity: 1 }, { opacity: 1, offset: 0.4 }, { transform: 'translateY(-12%)', opacity: 0 }], out);
  previous.children[1].animate([{ transform: 'none', opacity: 1 }, { opacity: 1, offset: 0.4 }, { transform: 'translateY(12%)', opacity: 0 }], out).finished.then(() => previous.remove());
  next.children[0].animate([{ transform: 'translateY(-12%)', opacity: 0 }, { opacity: 1, offset: 0.35 }, { transform: 'none', opacity: 1 }], into);
  next.children[1].animate([{ transform: 'translateY(12%)', opacity: 0 }, { opacity: 1, offset: 0.35 }, { transform: 'none', opacity: 1 }], into);
}

/* Selection */

function selectVariant(variant) {
  current = variant;
  for (const element of document.querySelectorAll('[data-bind="ref"]')) element.textContent = `IW${variant.id}`;
  for (const element of document.querySelectorAll('[data-bind="price"]')) element.textContent = price(variant.price);
  document.querySelector('[data-bind="dial"]').textContent = variant.dial;
  document.querySelector('[data-bind="strap"]').textContent = versionLabel(variant);
  document.title = `Pilot’s Watch Chronograph 41 - IW${variant.id} | IWC Schaffhausen`;

  showView(view);
  renderThumbs();
  renderPickers();
  renderChapters();

  const index = lineup.indexOf(variant);
  slide.position = slide.target = slide.target + (wrap(index - slide.target + count / 2) - count / 2);
  shown = -1;
  renderShowroom();

  head.src = `../assets/straps/head-${variant.head}.webp`;
  fitStrap(variant.strap);
  document.dispatchEvent(new CustomEvent('variant', { detail: variant }));
}

selectVariant(current);

/* Bag */

const buybar = document.querySelector('.buybar');
const bagCount = document.querySelector('.nav__count');
const ctas = document.querySelector('.buy__ctas');
const footer = document.querySelector('.footer');

function updateBuybar() {
  const visible = ctas.getBoundingClientRect().bottom < 0 && footer.getBoundingClientRect().top > innerHeight;
  buybar.classList.toggle('is-visible', visible);
  buybar.ariaHidden = String(!visible);
  buybar.querySelector('button').tabIndex = visible ? 0 : -1;
}

lenis.on('scroll', updateBuybar);
updateBuybar();

for (const button of document.querySelectorAll('[data-add-to-bag]')) {
  button.addEventListener('click', () => {
    bagCount.hidden = false;
    bagCount.textContent = String(Number(bagCount.textContent) + 1);
    button.textContent = 'Added to bag';
    setTimeout(() => (button.textContent = 'Add to bag'), 2000);
  });
}
