import * as THREE from 'three';

const section = document.querySelector('.drawing');
const stage = section.querySelector('.drawing__stage');
const canvas = section.querySelector('.drawing__canvas');
const marksLayer = section.querySelector('.drawing__marks');
const steps = [...section.querySelectorAll('.drawing__step')];
const bom = section.querySelector('.drawing__bom');
const sheetCell = section.querySelector('.title-block__sheet');
const scaleCell = section.querySelector('.title-block__scale');
const buybar = document.querySelector('.buybar');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(12, 1, 10, 4000);
const resolution = new THREE.Vector2(1, 1);
const ink = new THREE.Color('#000');
const red = new THREE.Color('#ee3e3e');
const paper = new THREE.MeshBasicMaterial({ color: '#fff', polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
const outlineWidth = { value: 1.5 };

function outlineMaterial(color) {
  return new THREE.ShaderMaterial({
    uniforms: { color: { value: color }, width: outlineWidth, resolution: { value: resolution } },
    vertexShader: `
      uniform float width;
      uniform vec2 resolution;
      void main() {
        vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vec2 direction = (projectionMatrix * vec4(normalize(normalMatrix * normal), 0.0)).xy;
        float size = length(direction);
        if (size > 0.00001) clip.xy += direction / size * width * clip.w * 2.0 / resolution;
        gl_Position = clip;
      }`,
    fragmentShader: `
      uniform vec3 color;
      void main() {
        gl_FragColor = vec4(color, 1.0);
      }`,
    side: THREE.BackSide,
  });
}

class Layer {
  constructor(number, name, note, offset, anchor, side) {
    this.group = new THREE.Group();
    this.color = ink.clone();
    this.lines = new THREE.LineBasicMaterial({ color: this.color });
    this.outline = outlineMaterial(this.color);
    this.number = number;
    this.name = name;
    this.note = note;
    this.offset = offset;
    this.anchor = anchor;
    this.side = side;
    scene.add(this.group);
  }

  add(geometry, parent = this.group, crease = 30) {
    const holder = new THREE.Group();
    holder.add(new THREE.Mesh(geometry, paper), new THREE.Mesh(geometry, this.outline), new THREE.LineSegments(new THREE.EdgesGeometry(geometry, crease), this.lines));
    parent.add(holder);
    return holder;
  }

  addGlass(geometry) {
    this.group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 4), this.lines));
  }
}

function lathe(points, segments = 128) {
  const profile = points.map(([r, y]) => new THREE.Vector2(r, y));
  if (THREE.ShapeUtils.isClockWise(profile)) profile.reverse();
  return new THREE.LatheGeometry(profile, segments);
}

function flat(shape, depth, y) {
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 32 });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, y, 0);
  return geometry;
}

function circle(radius, x = 0, y = 0) {
  const path = new THREE.Path();
  path.absarc(x, y, radius, 0, Math.PI * 2, true);
  return path;
}

function disc(radius) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, radius, 0, Math.PI * 2, false);
  return shape;
}

function gear(radius, teeth, { depth = 0.32, hole = 0.35, spokes = 0, rim = 0.5 } = {}) {
  const shape = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const points = [[radius - depth, a], [radius, a + step * 0.18], [radius, a + step * 0.42], [radius - depth, a + step * 0.6]];
    points.forEach(([r, t], j) => (i === 0 && j === 0 ? shape.moveTo(Math.cos(t) * r, Math.sin(t) * r) : shape.lineTo(Math.cos(t) * r, Math.sin(t) * r)));
  }
  shape.closePath();
  if (hole) shape.holes.push(circle(hole));
  const inner = hole + 0.45;
  const outer = radius - depth - rim;
  for (let i = 0; i < spokes; i++) {
    const a0 = (i / spokes) * Math.PI * 2 + 0.22;
    const a1 = ((i + 1) / spokes) * Math.PI * 2 - 0.22;
    const path = new THREE.Path();
    path.absarc(0, 0, outer, a0, a1, false);
    path.absarc(0, 0, inner, a1 - 0.1, a0 + 0.1, true);
    path.closePath();
    shape.holes.push(path);
  }
  return shape;
}

function handShape(points, hole) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  if (hole) shape.holes.push(new THREE.Path(hole.map(([x, y]) => new THREE.Vector2(x, y))));
  return shape;
}

function placeAt(holder, x, z) {
  holder.position.set(x, 0, z);
  return holder;
}

/* Parts, top to bottom */

const crystal = new Layer('01', 'Sapphire glass', 'Convex, antireflective on both sides', 30, [17, 5.4], 1);
crystal.addGlass(lathe([[0, 7.5], [6, 7.35], [11, 6.85], [14.5, 6.2], [16.9, 5.3], [16.9, 4.85], [0, 4.85]]));

const bezel = new Layer('02', 'Bezel', 'Stainless steel', 23, [20.2, 3.4], -1);
bezel.add(lathe([[16.9, 2.6], [20.1, 2.6], [20.3, 3.05], [19.9, 4.2], [19.1, 4.8], [16.9, 4.9], [16.9, 2.6]]));

const hands = new Layer('03', 'Hands', 'Hours, minutes, chronograph seconds', 15.5, [14.6, 1.9], 1);
const handGeometry = (shape, y) => flat(shape, 0.12, y);
const hourHand = hands.add(handGeometry(handShape([[-0.9, -2.4], [-1.25, 6], [0, 9.6], [1.25, 6], [0.9, -2.4]], [[-0.5, 1.4], [-0.72, 5.9], [0, 8.3], [0.72, 5.9], [0.5, 1.4]]), 1.5));
const minuteHand = hands.add(handGeometry(handShape([[-0.75, -2.8], [-1, 10.5], [0, 14.6], [1, 10.5], [0.75, -2.8]], [[-0.42, 1.6], [-0.6, 10.3], [0, 13.1], [0.6, 10.3], [0.42, 1.6]]), 1.75));
const chronoHand = hands.add(handGeometry(handShape([[-0.32, -4.6], [-0.1, 15.6], [0.1, 15.6], [0.32, -4.6]]), 2.0));
hands.add(lathe([[0, 2.25], [0.8, 2.25], [0.8, 1.45], [0, 1.45]], 48));
const counterHand = handShape([[-0.32, -0.7], [-0.25, 3.3], [0, 3.9], [0.25, 3.3], [0.32, -0.7]]);
const subdials = { minutes: [0, -6.3], hours: [-6.3, 0], seconds: [0, 6.3] };
const counterHands = Object.fromEntries(
  Object.entries(subdials).map(([name, [x, z]]) => {
    const holder = placeAt(new THREE.Group(), x, z);
    hands.group.add(holder);
    return [name, hands.add(handGeometry(counterHand, 1.4), holder)];
  }),
);

const dial = new Layer('04', 'Dial', 'Counters at 12, 9 and 6 o’clock, day-date', 8.5, [16.6, 1.1], -1);
dial.add(lathe([[0, 1.3], [16.6, 1.3], [16.6, 0.9], [0, 0.9]]));
const dialFace = new THREE.Mesh(new THREE.CircleGeometry(16.5, 128), new THREE.MeshBasicMaterial({ color: '#fff' }));
dialFace.rotation.x = -Math.PI / 2;
dialFace.position.y = 1.31;
dial.group.add(dialFace);

const body = new Layer('05', 'Case', 'Stainless steel, lugs for a 20 mm strap', 0, [20.6, -1], -1);
body.add(lathe([[17, -4.4], [19.6, -4.4], [20.35, -3.6], [20.6, -1], [20.4, 2], [20, 2.6], [17, 2.6], [17, -4.4]]));
const lug = new THREE.Shape();
lug.moveTo(14, 1.5);
lug.lineTo(19, 1.6);
lug.quadraticCurveTo(23.6, 1.1, 24.4, -1);
lug.quadraticCurveTo(24.6, -3.2, 22.2, -3.5);
lug.lineTo(14, -3.5);
lug.closePath();
const lugGeometry = new THREE.ExtrudeGeometry(lug, { depth: 3, bevelEnabled: false, curveSegments: 24 });
for (const [side, x] of [[1, 13], [1, -10], [-1, 10], [-1, -13]]) {
  const holder = body.add(lugGeometry);
  holder.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
  holder.position.x = x;
}

const controls = new Layer('06', 'Crown and pushers', 'Screw-in crown, start/stop and reset', 0, [0, -0.9], 1);
const crownGeometry = new THREE.ExtrudeGeometry(gear(3.35, 22, { depth: 0.32, hole: 0 }), { depth: 2.6, bevelEnabled: false });
crownGeometry.translate(0, 0, 1.6);
const stemGeometry = lathe([[0, 0], [1.7, 0], [1.7, 1.7], [0, 1.7]], 48);
stemGeometry.rotateX(Math.PI / 2);
const crown = new THREE.Group();
crown.rotation.y = Math.PI / 2;
crown.position.set(20.2, -0.9, 0);
controls.group.add(crown);
controls.add(crownGeometry, crown, 20);
controls.add(stemGeometry, crown);
const pusherGeometry = lathe([[0, 0], [2.1, 0], [2.1, 1.8], [1.6, 1.8], [1.6, 4.2], [1.3, 4.6], [0, 4.7]], 48);
const pushers = [30, -30].map((degrees) => {
  const direction = new THREE.Vector3(Math.cos((degrees * Math.PI) / 180), 0, -Math.sin((degrees * Math.PI) / 180));
  const holder = controls.add(pusherGeometry);
  holder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  holder.position.copy(direction.clone().multiplyScalar(19.6)).setY(-0.9);
  return { holder, direction, base: holder.position.clone() };
});

const plate = new Layer('07', 'Main plate', 'Calibre 69385, IWC-manufactured', -9, [15, -0.4], -1);
plate.add(lathe([[0, 0.8], [15, 0.8], [15, -1], [14.2, -1.6], [0, -1.6]]));

const train = new Layer('08', 'Gear train and balance', '28,800 vph, 4 Hz', -15, [13, -2.5], 1);
const trainParts = [
  [gear(5.4, 72, { hole: 0.9 }), 5.2, -5.6, 0.45],
  [gear(4.2, 64, { spokes: 4 }), 0, 0, 0.3],
  [gear(3.2, 54, { spokes: 4 }), -5.8, -4.6, 0.3],
  [gear(2.6, 48, { spokes: 4 }), -8.6, 0.6, 0.3],
  [gear(1.5, 20, { depth: 0.4, hole: 0.25 }), -10.4, 3.4, 0.3],
];
for (const [shape, x, z, depth] of trainParts) placeAt(train.add(flat(shape, depth, -2.6)), x, z);
const balanceAt = [-7.4, 7.6];
const balance = placeAt(new THREE.Group(), ...balanceAt);
train.group.add(balance);
const rim = disc(4.6);
rim.holes.push(circle(4.1));
train.add(flat(rim, 0.5, -2.9), balance);
for (let i = 0; i < 3; i++) {
  const a = (i / 3) * Math.PI * 2;
  const along = new THREE.Vector2(Math.cos(a), Math.sin(a));
  const across = new THREE.Vector2(-along.y, along.x).multiplyScalar(0.28);
  const tip = along.clone().multiplyScalar(4.2);
  const arm = new THREE.Shape();
  arm.moveTo(-across.x, -across.y);
  arm.lineTo(tip.x - across.x, tip.y - across.y);
  arm.lineTo(tip.x + across.x, tip.y + across.y);
  arm.lineTo(across.x, across.y);
  arm.closePath();
  train.add(flat(arm, 0.3, -2.8), balance);
}
train.add(lathe([[0, -1.6], [0.45, -1.6], [0.45, -3.4], [0, -3.4]], 32), balance);
const spiral = [];
for (let t = 0; t <= 1; t += 1 / 720) {
  const angle = t * Math.PI * 2 * 11;
  const radius = 0.7 + t * 2.9;
  spiral.push(new THREE.Vector3(Math.cos(angle) * radius, -2.3, Math.sin(angle) * radius));
}
const hairspring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(spiral), train.lines);
balance.add(hairspring);

const bridges = new Layer('09', 'Bridges and column wheel', 'Column-wheel chronograph control', -20.5, [14.4, -3.2], -1);
const bridgeShape = disc(14.4);
bridgeShape.holes.push(circle(5.3, balanceAt[0], -balanceAt[1]), circle(2.3, 7.6, -3.2), circle(3, 0, 0));
for (const [x, y] of [[10.5, 8.5], [-11.5, -6], [3, 12.4], [-2.5, -12.6], [12.6, -3.5]]) bridgeShape.holes.push(circle(0.5, x, y));
bridges.add(flat(bridgeShape, 0.9, -3.6));
const columnWheel = placeAt(new THREE.Group(), 7.6, 3.2);
bridges.group.add(columnWheel);
bridges.add(flat(gear(1.9, 18, { depth: 0.3, hole: 0.3 }), 0.4, -3.5), columnWheel);
bridges.add(flat(gear(1.35, 7, { depth: 0.5, hole: 0.3 }), 0.7, -3.1), columnWheel);

const rotor = new Layer('10', 'Rotor', 'Automatic winding', -26, [14.2, -4], 1);
const rotorShape = new THREE.Shape();
rotorShape.absarc(0, 0, 14.2, 0, Math.PI, false);
rotorShape.absarc(0, 0, 2.4, Math.PI, 0, true);
rotorShape.closePath();
for (const [a0, a1] of [[0.22, 0.46], [0.54, 0.78]]) {
  const slot = new THREE.Path();
  slot.absarc(0, 0, 11, a0 * Math.PI, a1 * Math.PI, false);
  slot.absarc(0, 0, 7.5, a1 * Math.PI, a0 * Math.PI, true);
  slot.closePath();
  rotorShape.holes.push(slot);
}
const rotorHolder = rotor.add(flat(rotorShape, 0.7, -4.4));
rotor.add(lathe([[0, -3.2], [2.4, -3.2], [2.4, -4.5], [0, -4.5]], 64));

const back = new Layer('11', 'Case back', 'Sapphire glass, water-resistant to 10 bar', -32, [18.6, -5.6], -1);
back.add(lathe([[12.4, -4.4], [18.6, -4.4], [18.4, -5.6], [17.6, -6.6], [16.4, -7], [12.4, -7], [12.4, -4.4]]));
back.addGlass(lathe([[0, -6.85], [12.4, -6.85], [12.4, -4.6], [0, -4.6]]));

const layers = [crystal, bezel, hands, dial, body, controls, plate, train, bridges, rotor, back];

/* Dial artwork */

function drawDial() {
  const size = 2048;
  const k = size / 2 / 16.5;
  const art = document.createElement('canvas');
  art.width = art.height = size;
  const ctx = art.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, size, size);
  ctx.translate(size / 2, size / 2);
  ctx.scale(k, k);
  ctx.strokeStyle = ctx.fillStyle = '#000';
  ctx.lineWidth = 0.075;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const ring = (cx, cy, radius, count, length, every, longer) => {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const l = i % every === 0 ? length + longer : length;
      ctx.beginPath();
      ctx.moveTo(cx + Math.sin(a) * (radius - l), cy - Math.cos(a) * (radius - l));
      ctx.lineTo(cx + Math.sin(a) * radius, cy - Math.cos(a) * radius);
      ctx.stroke();
    }
  };

  ring(0, 0, 16.1, 60, 0.6, 5, 0);
  for (let hour = 0; hour < 12; hour++) {
    ctx.save();
    ctx.rotate((hour * Math.PI) / 6);
    if (hour === 0) {
      ctx.beginPath();
      ctx.moveTo(0, -14.1);
      ctx.lineTo(-0.95, -12.3);
      ctx.lineTo(0.95, -12.3);
      ctx.closePath();
      ctx.stroke();
      for (const x of [-1.65, 1.65]) {
        ctx.beginPath();
        ctx.arc(x, -13.9, 0.3, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      ctx.strokeRect(-0.32, -15.9, 0.64, 1.9);
    }
    ctx.restore();
  }
  ctx.font = '500 2.9px HelveticaNeue';
  for (const hour of [1, 2, 4, 5, 7, 8, 10, 11]) {
    const a = (hour * Math.PI) / 6;
    ctx.fillText(String(hour), Math.sin(a) * 11.2, -Math.cos(a) * 11.2 + 0.1);
  }
  ctx.font = '500 0.85px HelveticaNeue';
  const counters = [[subdials.minutes, 30, 5, [['30', 0], ['10', 120], ['20', 240]]], [subdials.hours, 24, 2, [['12', 0], ['3', 90], ['6', 180], ['9', 270]]], [subdials.seconds, 60, 10, [['60', 0], ['20', 120], ['40', 240]]]];
  for (const [[cx, cy], count, every, labels] of counters) {
    ctx.beginPath();
    ctx.arc(cx, cy, 4.4, 0, Math.PI * 2);
    ctx.stroke();
    ring(cx, cy, 4.4, count, 0.35, every, 0.3);
    for (const [label, degrees] of labels) {
      const a = (degrees * Math.PI) / 180;
      ctx.fillText(label, cx + Math.sin(a) * 2.9, cy - Math.cos(a) * 2.9);
    }
  }
  const today = new Date();
  ctx.strokeRect(4.1, -1, 3.6, 2);
  ctx.strokeRect(7.95, -1, 2.2, 2);
  ctx.font = '500 1.15px HelveticaNeue';
  ctx.fillText(['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][today.getDay()], 5.9, 0.05);
  ctx.fillText(String(today.getDate()), 9.05, 0.05);
  ctx.font = '500 1.2px HelveticaNeue';
  ctx.fillText('IWC', 7.1, -2.6);
  ctx.font = '400 0.62px HelveticaNeue';
  ctx.fillText('S C H A F F H A U S E N', 7.1, 2.2);

  const texture = new THREE.CanvasTexture(art);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  dialFace.material.map = texture;
  dialFace.material.needsUpdate = true;
}

document.fonts.load('500 40px HelveticaNeue').then(drawDial);

/* Dimensions */

class Dimension {
  constructor(segments, label, mm) {
    this.material = new THREE.LineBasicMaterial({ color: ink, transparent: true, opacity: 0, depthTest: false });
    const points = segments.flatMap(([a, b]) => [new THREE.Vector3(...a), new THREE.Vector3(...b)]);
    this.lines = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points), this.material);
    this.lines.renderOrder = 10;
    scene.add(this.lines);
    this.anchor = new THREE.Vector3(...label);
    this.mark = document.createElement('span');
    this.mark.className = 'mark mark--dimension';
    this.mark.dataset.mm = mm;
    this.mark.textContent = `${mm} mm`;
    marksLayer.append(this.mark);
  }

  set(opacity) {
    this.material.opacity = opacity;
    this.lines.visible = opacity > 0.01;
    this.mark.classList.toggle('is-visible', opacity > 0.5);
  }
}

function arrow(tip, direction, normal, size = 1.6) {
  const back = direction.clone().normalize().multiplyScalar(-size);
  const wing = new THREE.Vector3().crossVectors(direction, normal).normalize().multiplyScalar(size * 0.32);
  return [
    [tip.toArray(), tip.clone().add(back).add(wing).toArray()],
    [tip.toArray(), tip.clone().add(back).sub(wing).toArray()],
  ];
}

const up = new THREE.Vector3(0, 1, 0);
const toCamera = new THREE.Vector3(0, 0, 1);
const diagonal = new THREE.Vector3(Math.SQRT1_2, 0, -Math.SQRT1_2);
const edgeA = diagonal.clone().multiplyScalar(20.6).setY(7.6);
const edgeB = diagonal.clone().multiplyScalar(-20.6).setY(7.6);
const elbow = diagonal.clone().multiplyScalar(30).setY(7.6);
const shoulder = elbow.clone().add(new THREE.Vector3(7, 0, 0));
const diameter = new Dimension(
  [[edgeB.toArray(), elbow.toArray()], [elbow.toArray(), shoulder.toArray()], ...arrow(edgeA, diagonal, up), ...arrow(edgeB, diagonal.clone().negate(), up)],
  shoulder.clone().add(new THREE.Vector3(3.6, 0, 0)).toArray(),
  41,
);

const height = new Dimension(
  [
    [[-1, 7.5, 0], [-31, 7.5, 0]],
    [[-12, -7, 0], [-31, -7, 0]],
    [[-29, 7.5, 0], [-29, -7, 0]],
    ...arrow(new THREE.Vector3(-29, 7.5, 0), up, toCamera),
    ...arrow(new THREE.Vector3(-29, -7, 0), up.clone().negate(), toCamera),
  ],
  [-29, 0.25, 0],
  14.5,
);

const strapWidth = new Dimension(
  [
    [[-10, -3.8, 24.4], [-10, -12.5, 24.4]],
    [[10, -3.8, 24.4], [10, -12.5, 24.4]],
    [[-10, -11, 24.4], [10, -11, 24.4]],
    ...arrow(new THREE.Vector3(-10, -11, 24.4), new THREE.Vector3(-1, 0, 0), toCamera),
    ...arrow(new THREE.Vector3(10, -11, 24.4), new THREE.Vector3(1, 0, 0), toCamera),
  ],
  [0, -11, 24.4],
  20,
);

/* Part tags and list */

const tags = layers.map((layer) => {
  const tag = document.createElement('span');
  tag.className = `mark mark--part${layer.side < 0 ? ' mark--left' : ''}`;
  tag.textContent = layer.number;
  marksLayer.append(tag);

  const item = document.createElement('li');
  item.className = 'bom__item';
  item.innerHTML = `<span class="bom__number">${layer.number}</span><span>${layer.name}</span><span class="bom__note">${layer.note}</span>`;
  bom.append(item);

  const highlight = (on) => {
    layer.color.copy(on ? red : ink);
    tag.classList.toggle('is-highlighted', on);
    item.classList.toggle('is-highlighted', on);
  };
  for (const element of [tag, item]) {
    element.addEventListener('pointerenter', () => highlight(true));
    element.addEventListener('pointerleave', () => highlight(false));
  }
  return tag;
});

/* Scroll choreography */

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const span = (p, from, to) => ease(THREE.MathUtils.clamp((p - from) / (to - from), 0, 1));
const lerp = THREE.MathUtils.lerp;
const views = {
  front: { phi: 0.001, theta: 0, height: 66, width: 64 },
  side: { phi: Math.PI / 2, theta: 0, height: 46, width: 74 },
  exploded: { phi: 1.08, theta: -0.7, height: 96, width: 76 },
};

let progress = 0;
let visible = false;
let sheet = 0;
const spherical = new THREE.Spherical();
const target = new THREE.Vector3();
const projected = new THREE.Vector3();

ScrollTrigger.create({
  trigger: section,
  start: 'top top',
  end: 'bottom bottom',
  onUpdate: (self) => (progress = self.progress),
});

new IntersectionObserver(([entry]) => (visible = entry.isIntersecting), { rootMargin: '200px 0px' }).observe(section);

function frameDistance(view) {
  const aspect = camera.aspect;
  const needed = Math.max(view.height, view.width / aspect);
  return needed / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
}

function resize() {
  const width = stage.clientWidth;
  const heightPx = stage.clientHeight;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(width, heightPx, false);
  renderer.getDrawingBufferSize(resolution);
  outlineWidth.value = 1.5 * renderer.getPixelRatio();
  camera.aspect = width / heightPx;
  camera.setViewOffset(width, heightPx, 0, buybar.offsetHeight / 2, width, heightPx);
  camera.updateProjectionMatrix();
}

addEventListener('resize', resize);
resize();

function place(time) {
  const p = progress;
  const toSide = span(p, 0.16, 0.38);
  const toExploded = span(p, 0.5, 0.74);
  const drift = reduceMotion ? 0 : Math.max(0, p - 0.74) * 0.9;

  const phi = lerp(lerp(views.front.phi, views.side.phi, toSide), views.exploded.phi, toExploded);
  const theta = lerp(lerp(views.front.theta, views.side.theta, toSide), views.exploded.theta, toExploded) - drift;
  const radius = lerp(lerp(frameDistance(views.front), frameDistance(views.side), toSide), frameDistance(views.exploded), toExploded);
  target.set(0, lerp(0, -1, toExploded), 0);
  spherical.set(radius, phi, theta);
  camera.position.setFromSpherical(spherical).add(target);
  camera.lookAt(target);

  for (const layer of layers) layer.group.position.y = layer.offset * toExploded;
  for (const { holder, direction, base } of pushers) holder.position.copy(base).addScaledVector(direction, 6 * toExploded);
  crown.position.x = 20.2 + 6 * toExploded;

  diameter.set(1 - span(p, 0.14, 0.2));
  height.set(span(p, 0.32, 0.38) * (1 - span(p, 0.5, 0.56)));
  strapWidth.set(span(p, 0.34, 0.4) * (1 - span(p, 0.5, 0.56)));

  const now = new Date();
  const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
  const minutes = now.getMinutes() + seconds / 60;
  hourHand.rotation.y = -(((now.getHours() % 12) + minutes / 60) * Math.PI) / 6;
  minuteHand.rotation.y = -(minutes * Math.PI) / 30;
  counterHands.seconds.rotation.y = -(Math.floor(seconds * 8) / 8) * (Math.PI / 30);
  chronoHand.rotation.y = -(Math.floor((time / 1000) * 8) / 8) * (Math.PI / 30);
  if (!reduceMotion) {
    balance.rotation.y = Math.sin((time / 1000) * Math.PI * 2 * 4) * 1.4;
    hairspring.rotation.y = balance.rotation.y * -0.6;
    rotorHolder.rotation.y = time / 4000 + p * 6;
  }

  const nextSheet = p < 0.28 ? 1 : p < 0.62 ? 2 : 3;
  if (nextSheet !== sheet) {
    sheet = nextSheet;
    section.dataset.sheet = String(sheet);
    sheetCell.textContent = `${sheet} / 3`;
    steps.forEach((step, index) => step.classList.toggle('is-active', index === sheet - 1));
  }
  const tagsOn = toExploded > 0.92;
  for (const tag of tags) tag.classList.toggle('is-visible', tagsOn);
}

function project(vector, element) {
  projected.copy(vector).project(camera);
  const x = ((projected.x + 1) / 2) * stage.clientWidth;
  const y = ((1 - projected.y) / 2) * stage.clientHeight;
  element.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
}

const sideways = new THREE.Vector3();
const point = new THREE.Vector3();
const caseLeft = new THREE.Vector3(-20.5, 0, 0);
const caseRight = new THREE.Vector3(20.5, 0, 0);

function label() {
  for (const dimension of [diameter, height, strapWidth]) project(dimension.anchor, dimension.mark);
  sideways.setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize();
  layers.forEach((layer, index) => {
    const [radius, y] = layer.anchor;
    if (layer === controls) point.set(crown.position.x + 4.6, y, 0);
    else point.copy(sideways).multiplyScalar(radius * layer.side).setY(y + layer.group.position.y);
    project(point, tags[index]);
  });

  const a = caseLeft.clone().project(camera);
  const b = caseRight.clone().project(camera);
  const pixelsPerMm = ((Math.hypot(b.x - a.x, (b.y - a.y) / camera.aspect) / 2) * stage.clientWidth) / 41;
  scaleCell.textContent = `Scale ${(pixelsPerMm / (96 / 25.4)).toFixed(1)} : 1`;
}

renderer.setAnimationLoop((time) => {
  if (!visible) return;
  place(time);
  renderer.render(scene, camera);
  label();
});
