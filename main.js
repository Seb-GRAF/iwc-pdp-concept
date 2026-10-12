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
  { id: '388101', dial: 'Blue', case: 'Stainless steel', strapName: 'Blue calfskin strap', price: 6700, sky: 'blue', head: '388101', strap: '388101' },
  { id: '388102', dial: 'Blue', case: 'Stainless steel', strapName: 'Stainless steel bracelet', price: 7700, sky: 'blue', head: '388101', strap: '388102' },
  { id: '388117', dial: 'Blue', case: 'Stainless steel', strapName: 'Light blue rubber strap', price: 6700, sky: 'ice', head: '388117', strap: '388117' },
  { id: '388103', dial: 'Green', case: 'Stainless steel', strapName: 'Brown calfskin strap', price: 6700, sky: 'green', head: '388103', strap: '388103' },
  { id: '388104', dial: 'Green', case: 'Stainless steel', strapName: 'Stainless steel bracelet', price: 7700, sky: 'green', head: '388103', strap: '388102' },
  { id: '388110', dial: 'Green', case: '18 ct 5N gold', strapName: 'Green rubber strap', price: 23400, sky: 'bronze', head: '388110', strap: '388110' },
  { id: '388111', dial: 'Black', case: 'Stainless steel', strapName: 'Black calfskin strap', price: 6700, sky: 'graphite', head: '388111', strap: '388111' },
  { id: '388113', dial: 'Black', case: 'Stainless steel', strapName: 'Stainless steel bracelet', price: 7700, sky: 'graphite', head: '388111', strap: '388102' },
];

const leather = 'Leather impresses with a timeless and stylish look and complements all outfits and occasions. It is strong and, at the same time, breathable and supple.';
const rubber = 'Rubber is a highly versatile material and ideally suited for watch straps. It is durable, flexible and completely waterproof.';

const straps = [
  { id: '388103', name: 'Brown calfskin', text: leather },
  { id: '388111', name: 'Black calfskin', text: leather },
  { id: '388101', name: 'Blue calfskin', text: leather },
  { id: '388117', name: 'Light blue rubber', text: rubber },
  { id: '388110', name: 'Green rubber', text: rubber },
  { id: '388102', name: 'Steel bracelet', text: 'The Pilot’s Watch Chronograph 41 features a 5-link metal bracelet with EasX-CHANGE® system. All metal bracelets can easily be adjusted in length.' },
];

const caseTexts = {
  'Stainless steel': 'Stainless steel is robust and durable. The material is also highly resistant to corrosion and thus unaffected by sweat, moisture and seawater splashes.',
  '18 ct 5N gold': 'The pure gold content of an IWC watch case is 75 per cent, which is equivalent to 18 carats.',
};

const price = (value) => `CHF ${value.toLocaleString('de-CH')}`;
const lowerFirst = (text) => text.charAt(0).toLowerCase() + text.slice(1);
const versionLabel = (variant) => (variant.case === 'Stainless steel' ? variant.strapName : `${variant.case}, ${lowerFirst(variant.strapName)}`).replace(' strap', '').replace('Stainless steel bracelet', 'Steel bracelet');
const variantName = (variant) => `${variant.dial} dial, ${lowerFirst(versionLabel(variant))}`;

let current = variants[0];

/* Purchase */

const desktop = matchMedia('(min-width: 1024px)');
const stage = document.querySelector('.buy__stage');
const scale = stage.querySelector('.buy__scale');
const stops = [...scale.querySelectorAll('.buy__stop')];
const chapters = [...document.querySelectorAll('.buy [data-view]')];
let chapter = 0;
let swipe = null;

function showChapter(index, progress, direction) {
  scale.style.setProperty('--progress', progress / (chapters.length - 1));
  if (index === chapter) return;
  document.dispatchEvent(new CustomEvent('view', { detail: { view: chapters[index].dataset.view, direction } }));
  chapter = index;
  stops.forEach((stop, i) => stop.classList.toggle('is-current', i === index));
}

function updateChapter() {
  if (!desktop.matches) return;
  const line = innerHeight / 2;
  const reached = chapters.map((element) => Math.max(element.getBoundingClientRect().top + scrollY - line, 0));
  let index = 0;
  while (index < reached.length - 1 && reached[index + 1] <= scrollY) index++;
  const progress = index < reached.length - 1 ? index + (scrollY - reached[index]) / (reached[index + 1] - reached[index]) : index;
  showChapter(index, progress, Math.sign(index - chapter));
}

lenis.on('scroll', updateChapter);

stage.addEventListener('pointerdown', (event) => {
  if (event.pointerType !== 'mouse' && !desktop.matches) swipe = { x: event.clientX, y: event.clientY };
});

stage.addEventListener('pointerup', (event) => {
  if (!swipe) return;
  const distance = event.clientX - swipe.x;
  if (Math.abs(distance) > 40 && Math.abs(distance) > Math.abs(event.clientY - swipe.y)) {
    const index = (chapter - Math.sign(distance) + chapters.length) % chapters.length;
    showChapter(index, index, -Math.sign(distance));
  }
  swipe = null;
});

stage.addEventListener('pointercancel', () => (swipe = null));

/* Swatches */

const swatchList = document.querySelector('.swatches');

const swatches = variants.map((variant) => {
  const button = document.createElement('button');
  button.className = 'swatch';
  button.type = 'button';
  button.ariaLabel = variantName(variant);
  button.innerHTML = `<img src="assets/thumbs/${variant.id}-1.webp" width="160" height="185" alt="">`;
  button.addEventListener('click', () => selectVariant(variant));
  swatchList.append(button);
  return button;
});

const more = document.createElement('button');
more.className = 'swatch swatch--more';
more.type = 'button';
more.ariaLabel = 'Show all variants';
more.textContent = `+${variants.length - 3}`;
more.addEventListener('click', () => {
  swatchList.classList.add('is-open');
  swatches[3].focus();
});
swatches[2].after(more);

/* Straps */

const strapStage = document.querySelector('.straps__stage');
const rail = strapStage.querySelector('.straps__rail');
const strapCase = strapStage.querySelector('.straps__case');
const strapText = Object.fromEntries([...document.querySelectorAll('[data-strap]')].map((element) => [element.dataset.strap, element]));
const strapRail = { position: 0 };
let strapDrag = null;

const strapItems = straps.map((strap) => {
  const image = new Image();
  image.className = 'straps__strap';
  image.src = `assets/straps/strap-${strap.id}.webp`;
  image.alt = '';
  image.draggable = false;
  rail.append(image);
  return image;
});

for (const button of document.querySelectorAll('[data-strap-step]')) {
  button.addEventListener('click', () => fitStrap(Math.round(strapRail.position) + Number(button.dataset.strapStep)));
}

const strapSpacing = () => (desktop.matches ? strapCase.offsetWidth * 0.6 : strapStage.offsetWidth / 2);

function renderStraps() {
  const gap = strapSpacing();
  strapItems.forEach((item, index) => {
    const offset = index - strapRail.position;
    item.style.transform = `translateX(${offset * gap}px)`;
    item.style.opacity = String(desktop.matches ? 1 : 1 - Math.min(Math.abs(offset), 1) * 0.45);
  });
  const index = Math.min(Math.max(Math.round(strapRail.position), 0), straps.length - 1);
  strapText.name.textContent = straps[index].name;
  strapText.index.textContent = `${String(index + 1).padStart(2, '0')} / ${String(straps.length).padStart(2, '0')}`;
}

function fitStrap(index) {
  const target = Math.min(Math.max(index, 0), straps.length - 1);
  if (reduceMotion) {
    strapRail.position = target;
    renderStraps();
    return;
  }
  gsap.to(strapCase, { scale: 1.04, y: -8, duration: 0.3, ease: 'power2.out' });
  gsap.to(strapRail, {
    position: target,
    duration: 0.8,
    ease: 'power3.inOut',
    onUpdate: renderStraps,
    onComplete: () => gsap.to(strapCase, { scale: 1, y: 0, duration: 0.16, ease: 'power2.in' }),
  });
}

strapStage.addEventListener('pointerdown', (event) => {
  gsap.killTweensOf(strapRail);
  strapDrag = { x: event.clientX, position: strapRail.position, moved: false };
  strapStage.setPointerCapture(event.pointerId);
});

strapStage.addEventListener('pointermove', (event) => {
  if (!strapDrag) return;
  const distance = event.clientX - strapDrag.x;
  if (Math.abs(distance) > 6) strapDrag.moved = true;
  if (!strapDrag.moved) return;
  strapRail.position = Math.min(Math.max(strapDrag.position - distance / strapSpacing(), -0.4), straps.length - 0.6);
  renderStraps();
});

function releaseStrap(event) {
  if (!strapDrag) return;
  const box = strapCase.getBoundingClientRect();
  const target = strapDrag.moved ? strapRail.position : strapRail.position + (event.clientX - box.left - box.width / 2) / strapSpacing();
  strapDrag = null;
  fitStrap(Math.round(target));
}

strapStage.addEventListener('pointerup', releaseStrap);
strapStage.addEventListener('pointercancel', releaseStrap);
addEventListener('resize', renderStraps);

/* Specifications */

const counters = [...document.querySelectorAll('[data-count]')].map((element) => {
  const text = element.textContent;
  element.innerHTML = `<span class="visually-hidden">${text}</span>${[...text].map((char) => `<span class="reel${char === '1' ? ' kern' : ''}" aria-hidden="true"><span>${char}</span></span>`).join('')}`;
  return element;
});

if (!reduceMotion) {
  const counterObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) gsap.to(entry.target.querySelectorAll('.reel > span'), { yPercent: 0, duration: 1.2, ease: 'power3.out', stagger: 0.08, overwrite: true });
      }
    },
    { rootMargin: '0px 0px -15% 0px' },
  );
  const counterReset = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting && entry.boundingClientRect.top > 0) gsap.set(entry.target.querySelectorAll('.reel > span'), { yPercent: 110, overwrite: true });
    }
  });
  for (const element of counters) {
    gsap.set(element.querySelectorAll('.reel > span'), { yPercent: 110 });
    counterObserver.observe(element);
    counterReset.observe(element);
  }
}

/* Gallery */

const galleryVideos = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) entry.target.play();
      else entry.target.pause();
    }
  },
  { threshold: 0.6 },
);
if (!reduceMotion) for (const video of document.querySelectorAll('.gallery video')) galleryVideos.observe(video);

const sheetRows = [...document.querySelectorAll('.sheet__row')];
const sheetMedia = [...document.querySelectorAll('.sheet__media')];

function renderSheet() {
  for (const media of sheetMedia) {
    const box = media.getBoundingClientRect();
    const offset = Math.min(Math.max((box.top + box.height / 2) / innerHeight - 0.5, -0.5), 0.5);
    media.firstElementChild.style.translate = `0 ${offset * -8}%`;
  }
}

const sheetObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-drawn');
        sheetObserver.unobserve(entry.target);
      }
    }
  },
  { rootMargin: '0px 0px -15% 0px' },
);

if (reduceMotion) {
  for (const row of sheetRows) row.classList.add('is-drawn');
} else {
  for (const row of sheetRows) sheetObserver.observe(row);
  lenis.on('scroll', renderSheet);
  renderSheet();
}

/* Collections */

const collections = document.querySelector('.collections');
const collectionPin = collections.querySelector('.collections__pin');
const collectionItems = [...collections.querySelectorAll('.collection')];
const collectionWatches = [...collections.querySelectorAll('.collections__watches img')];
const collectionYears = collectionItems.map((item) => Number(item.dataset.year));
const collectionIndex = collections.querySelector('[data-collection-index]');
const yearElement = collections.querySelector('.collections__year');
yearElement.innerHTML = [...yearElement.textContent].map((char) => `<span class="reel${char === '1' ? ' kern' : ''}"><span class="reel__digits">${[...'0123456789'].map((digit) => `<span>${digit}</span>`).join('')}</span></span>`).join('');
const yearDigits = [...yearElement.querySelectorAll('.reel__digits')];
let shownCollection = -1;

function renderCollections() {
  const box = collections.getBoundingClientRect();
  const pinned = (parseFloat(getComputedStyle(collectionPin).top) - box.top) / (box.height - collectionPin.offsetHeight);
  const progress = Math.min(Math.max(pinned, 0), 1) * (collectionYears.length - 1);
  const index = Math.min(Math.floor(progress), collectionYears.length - 2);
  const move = Math.min(Math.max((progress - index - 0.25) / 0.5, 0), 1);
  collections.style.setProperty('--hand', collectionYears[index] + (collectionYears[index + 1] - collectionYears[index]) * move * move * (3 - 2 * move));
  const active = index + Math.round(move);
  if (active === shownCollection) return;
  shownCollection = active;
  collectionItems.forEach((item, i) => item.classList.toggle('is-current', i === active));
  collectionWatches.forEach((image, i) => image.classList.toggle('is-current', i === active));
  collectionIndex.textContent = String(active + 1).padStart(2, '0');
  [...String(collectionYears[active])].forEach((digit, i) => yearDigits[i].style.setProperty('--digit', digit));
}

lenis.on('scroll', renderCollections);
renderCollections();

/* Selection */

function selectVariant(variant) {
  current = variant;
  for (const element of document.querySelectorAll('[data-bind="ref"]')) element.textContent = `IW${variant.id}`;
  for (const element of document.querySelectorAll('[data-bind="price"]')) element.textContent = price(variant.price);
  for (const element of document.querySelectorAll('[data-bind="variant"]')) element.textContent = variantName(variant);
  for (const element of document.querySelectorAll('[data-bind="dial"]')) element.textContent = variant.dial;
  for (const element of document.querySelectorAll('[data-bind="case"]')) element.textContent = variant.case;
  for (const element of document.querySelectorAll('[data-bind="strap-name"]')) element.textContent = variant.strapName;
  for (const element of document.querySelectorAll('[data-bind="case-text"]')) element.textContent = caseTexts[variant.case];
  for (const element of document.querySelectorAll('[data-bind="strap-text"]')) element.textContent = straps.find((strap) => strap.id === variant.strap).text;
  document.title = `Pilot’s Watch Chronograph 41 - IW${variant.id} | IWC Schaffhausen`;

  swatches.forEach((swatch, i) => (swatch.ariaPressed = String(variants[i] === variant)));

  strapCase.src = `assets/straps/head-${variant.head}.webp`;
  fitStrap(straps.findIndex((strap) => strap.id === variant.strap));
  document.dispatchEvent(new CustomEvent('variant', { detail: variant }));
}

strapRail.position = straps.findIndex((strap) => strap.id === current.strap);
renderStraps();
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
