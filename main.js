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
  { id: '388101', dial: 'Blue', case: 'Stainless steel', strapName: 'Blue calfskin strap', fastening: 'Buckle', price: 6700, sky: 'blue', head: '388101', strap: '388101' },
  { id: '388102', dial: 'Blue', case: 'Stainless steel', strapName: 'Stainless steel bracelet', fastening: 'Clasp', price: 7700, sky: 'blue', head: '388101', strap: '388102' },
  { id: '388117', dial: 'Blue', case: 'Stainless steel', strapName: 'Light blue rubber strap', fastening: 'Buckle', price: 6700, sky: 'ice', head: '388117', strap: '388117' },
  { id: '388103', dial: 'Green', case: 'Stainless steel', strapName: 'Brown calfskin strap', fastening: 'Buckle', price: 6700, sky: 'green', head: '388103', strap: '388103' },
  { id: '388104', dial: 'Green', case: 'Stainless steel', strapName: 'Stainless steel bracelet', fastening: 'Clasp', price: 7700, sky: 'green', head: '388103', strap: '388102' },
  { id: '388110', dial: 'Green', case: '18 ct 5N gold', strapName: 'Green rubber strap', fastening: 'Buckle', price: 23400, sky: 'bronze', head: '388110', strap: '388110' },
  { id: '388111', dial: 'Black', case: 'Stainless steel', strapName: 'Black calfskin strap', fastening: 'Buckle', price: 6700, sky: 'graphite', head: '388111', strap: '388111' },
  { id: '388113', dial: 'Black', case: 'Stainless steel', strapName: 'Stainless steel bracelet', fastening: 'Clasp', price: 7700, sky: 'graphite', head: '388111', strap: '388102' },
];

const straps = [
  { id: '388103', name: 'Brown calfskin' },
  { id: '388111', name: 'Black calfskin' },
  { id: '388101', name: 'Blue calfskin' },
  { id: '388117', name: 'Light blue rubber' },
  { id: '388110', name: 'Green rubber' },
  { id: '388102', name: 'Steel bracelet' },
];

const viewNames = ['Front', 'Case back', 'Detail', 'Buckle', 'Profile'];
const viewName = (index) => (index === 3 ? current.fastening : viewNames[index]);
const price = (value) => `CHF ${value.toLocaleString('de-CH')}`;
const lowerFirst = (text) => text.charAt(0).toLowerCase() + text.slice(1);
const versionLabel = (variant) => (variant.case === 'Stainless steel' ? variant.strapName : `${variant.case}, ${lowerFirst(variant.strapName)}`).replace(' strap', '').replace('Stainless steel bracelet', 'Steel bracelet');
const variantName = (variant) => `${variant.dial} dial, ${lowerFirst(versionLabel(variant))}`;
const describe = (variant) => (variant.strapName === 'Stainless steel bracelet' ? 'Stainless steel case and bracelet' : `${variant.case} case, ${lowerFirst(variant.strapName)}`);

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
const variantPicker = document.querySelector('.variants');
let view = 1;

function showView(next) {
  view = next;
  crossfade(views, `assets/gallery/${current.id}-${view}.webp`, 'buy__view', `Pilot’s Watch Chronograph 41 IW${current.id}, ${viewName(view - 1).toLowerCase()}`);
  for (const [index, button] of [...thumbs.querySelectorAll('.thumb')].entries()) {
    button.setAttribute('aria-pressed', String(index + 1 === view));
  }
}

const stage = document.querySelector('.buy__stage');
let swipe = null;

stage.addEventListener('pointerdown', (event) => {
  if (event.pointerType !== 'mouse') swipe = { x: event.clientX, y: event.clientY };
});

stage.addEventListener('pointerup', (event) => {
  if (!swipe) return;
  const distance = event.clientX - swipe.x;
  if (Math.abs(distance) > 40 && Math.abs(distance) > Math.abs(event.clientY - swipe.y)) {
    showView(((view - 1 - Math.sign(distance) + viewNames.length) % viewNames.length) + 1);
  }
  swipe = null;
});

stage.addEventListener('pointercancel', () => (swipe = null));

function renderThumbs() {
  thumbs.replaceChildren(
    ...viewNames.map((_, index) => {
      const item = document.createElement('li');
      item.innerHTML = `<button class="thumb" type="button" aria-label="${viewName(index)}" aria-pressed="${index + 1 === view}"><img src="assets/img/${current.id}-${index + 1}.webp" width="1297" height="1498" alt=""></button>`;
      item.firstChild.addEventListener('click', () => showView(index + 1));
      return item;
    }),
  );
}

variantPicker.replaceChildren(
  ...variants.map((variant) => {
    const button = document.createElement('button');
    button.className = 'variant';
    button.type = 'button';
    button.role = 'radio';
    button.ariaLabel = `${variantName(variant)}, ${price(variant.price)}`;
    button.innerHTML = `<img src="assets/img/${variant.id}-1.webp" width="1297" height="1498" alt="">`;
    button.addEventListener('click', () => selectVariant(variant));
    return button;
  }),
);

/* Showroom */

const showroom = document.querySelector('.showroom');
const skyLayer = showroom.querySelector('.showroom__skies');
const track = showroom.querySelector('.showroom__track');
const showroomText = Object.fromEntries([...showroom.querySelectorAll('[data-showroom]')].map((element) => [element.dataset.showroom, element]));
const selectButton = showroom.querySelector('[data-showroom-select]');
const count = variants.length;
const wrap = (value) => ((value % count) + count) % count;
const slide = { position: 0, target: 0 };
let shown = -1;
let drag = null;

const skies = Object.fromEntries(
  ['blue', 'ice', 'green', 'bronze', 'graphite'].map((name) => {
    const image = new Image();
    image.className = 'showroom__sky';
    image.src = `assets/sky/${name}.jpg`;
    image.alt = '';
    skyLayer.append(image);
    return [name, image];
  }),
);

const items = variants.map((variant) => {
  const image = new Image();
  image.className = 'showroom__item';
  image.src = `assets/img/${variant.id}-1.webp`;
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
    weights[variants[index].sky] = (weights[variants[index].sky] ?? 0) + Math.max(0, 1 - distance);
  });
  for (const [name, image] of Object.entries(skies)) image.style.opacity = String(weights[name] ?? 0);

  const index = wrap(Math.round(slide.position));
  if (index === shown) return;
  shown = index;
  const variant = variants[index];
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
  selectVariant(variants[wrap(slide.target)]);
  lenis.scrollTo(0, { duration: 1.4 });
});

addEventListener('resize', renderShowroom);

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

const strapSpacing = () => strapCase.offsetWidth * 0.62;

function renderStraps() {
  const gap = strapSpacing();
  strapItems.forEach((item, index) => {
    const offset = index - strapRail.position;
    item.style.transform = `translateX(${offset * gap}px)`;
    item.style.opacity = String(1 - Math.min(Math.abs(offset), 1) * 0.45);
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
  const box = strapStage.getBoundingClientRect();
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

/* Selection */

function selectVariant(variant) {
  current = variant;
  for (const element of document.querySelectorAll('[data-bind="ref"]')) element.textContent = `IW${variant.id}`;
  for (const element of document.querySelectorAll('[data-bind="price"]')) element.textContent = price(variant.price);
  for (const element of document.querySelectorAll('[data-bind="variant"]')) element.textContent = variantName(variant);
  for (const element of document.querySelectorAll('[data-bind="dial"]')) element.textContent = variant.dial;
  for (const element of document.querySelectorAll('[data-bind="case"]')) element.textContent = variant.case;
  for (const element of document.querySelectorAll('[data-bind="strap-name"]')) element.textContent = variant.strapName;
  document.title = `Pilot’s Watch Chronograph 41 - IW${variant.id} | IWC Schaffhausen`;

  showView(view);
  renderThumbs();
  for (const [index, button] of [...variantPicker.children].entries()) button.ariaChecked = String(variants[index] === variant);

  const index = variants.indexOf(variant);
  slide.position = slide.target = slide.target + (wrap(index - slide.target + count / 2) - count / 2);
  shown = -1;
  renderShowroom();

  strapCase.src = `assets/straps/head-${variant.head}.webp`;
  fitStrap(straps.findIndex((strap) => strap.id === variant.strap));
  document.dispatchEvent(new CustomEvent('variant', { detail: variant }));
}

strapRail.position = straps.findIndex((strap) => strap.id === current.strap);
renderStraps();
selectVariant(current);

/* Landing */

if (!reduceMotion) views.querySelector('.buy__view').decode().then(() => gsap.from(views, { opacity: 0, filter: 'blur(8px)', duration: 1.4, ease: 'power2.out', clearProps: 'opacity,filter' }));

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
