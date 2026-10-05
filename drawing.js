import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const stage = document.querySelector('.specs__drawing');
const canvas = stage.querySelector('.specs__canvas');
const marksLayer = stage.querySelector('.specs__marks');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(12, 1, 10, 4000);
const resolution = new THREE.Vector2(1, 1);
const ink = new THREE.Color('#000');
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
  constructor(offset) {
    this.group = new THREE.Group();
    this.color = ink.clone();
    this.lines = new THREE.LineBasicMaterial();
    this.lines.color = this.color;
    this.outline = outlineMaterial(this.color);
    this.offset = offset;
    this.lift = 0;
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

function gear(radius, teeth, depth) {
  const shape = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const points = [[radius - depth, a], [radius, a + step * 0.18], [radius, a + step * 0.42], [radius - depth, a + step * 0.6]];
    points.forEach(([r, t], j) => (i === 0 && j === 0 ? shape.moveTo(Math.cos(t) * r, Math.sin(t) * r) : shape.lineTo(Math.cos(t) * r, Math.sin(t) * r)));
  }
  shape.closePath();
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

const crystal = new Layer(30);
crystal.addGlass(lathe([[0, 7.5], [6, 7.35], [11, 6.85], [14.5, 6.2], [16.9, 5.3], [16.9, 4.85], [0, 4.85]]));

const bezel = new Layer(23);
bezel.add(lathe([[16.9, 2.6], [20.1, 2.6], [20.3, 3.05], [19.9, 4.2], [19.1, 4.8], [16.9, 4.9], [16.9, 2.6]]));

const hands = new Layer(15.5);
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

const dial = new Layer(8.5);
dial.add(lathe([[0, 1.3], [16.6, 1.3], [16.6, 0.9], [0, 0.9]]));
const dialFace = new THREE.Mesh(new THREE.CircleGeometry(16.5, 128), new THREE.MeshBasicMaterial({ transparent: true }));
dialFace.rotation.x = -Math.PI / 2;
dialFace.position.y = 1.31;
dial.group.add(dialFace);

const body = new Layer(0);
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

const controls = new Layer(0);
const crownGeometry = new THREE.ExtrudeGeometry(gear(3.35, 22, 0.32), { depth: 2.6, bevelEnabled: false });
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

const movement = {
  works: { name: 'Keyless and motion works', offset: -8, layers: [] },
  plate: { name: 'Main plate', offset: -16, layers: [] },
  train: { name: 'Going train', offset: -24, layers: [] },
  bridges: { name: 'Bridges', offset: -32, layers: [] },
  winding: { name: 'Ratchet and crown wheels', offset: -40, layers: [] },
  balance: { name: 'Balance and balance cock', offset: -48, layers: [] },
};

function movementGroup(layer) {
  if (layer < 0) return movement.works;
  if (layer === 0) return movement.plate;
  if (layer < 2) return movement.train;
  if (layer < 3) return movement.bridges;
  if (layer < 4) return movement.winding;
  return movement.balance;
}

async function loadMovement() {
  const [gltf, layers] = await Promise.all([
    new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('assets/movement/eta-6498-1.glb'),
    fetch('assets/movement/layers.json').then((response) => response.json()),
  ]);
  const meshes = [];
  gltf.scene.traverse((object) => object.isMesh && object.name !== '401_Winding_stem' && meshes.push(object));
  for (const mesh of meshes) {
    const group = movementGroup(layers[mesh.name]);
    const layer = new Layer(group.offset);
    const frame = new THREE.Group();
    frame.rotation.y = Math.PI / 2;
    frame.scale.setScalar(22);
    frame.position.y = -1.6;
    mesh.position.z += 0.3205;
    mesh.material = paper;
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 35), layer.lines));
    frame.add(mesh);
    layer.group.add(frame);
    layer.mesh = mesh;
    group.layers.push(layer);
    await new Promise((resolve) => setTimeout(resolve));
  }
  for (const [key, group] of Object.entries(movement)) parts[key] = group.layers;
}

const back = new Layer(-60);
back.add(lathe([[12.4, -4.4], [18.6, -4.4], [18.4, -5.6], [17.6, -6.6], [16.4, -7], [12.4, -7], [12.4, -4.4]]));
back.addGlass(lathe([[0, -6.85], [12.4, -6.85], [12.4, -4.6], [0, -4.6]]));

const parts = { crystal: [crystal], bezel: [bezel], hands: [hands], dial: [dial], body: [body], controls: [controls], back: [back] };

/* Dial artwork */

function drawDial() {
  const size = 2048;
  const k = size / 2 / 16.5;
  const art = document.createElement('canvas');
  art.width = art.height = size;
  const ctx = art.getContext('2d');
  ctx.fillStyle = '#f9f9f9';
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

/* Labels */

const sideways = new THREE.Vector3();
const sphere = new THREE.Sphere();
const box = new THREE.Box3();

function rimPoint(layer, radius, y) {
  return () => sideways.clone().multiplyScalar(radius).setY(y + layer.group.position.y);
}

function pusherTip(pusher) {
  return () => pusher.holder.position.clone().addScaledVector(pusher.direction, 4.9);
}

function edgeOf(key, mesh, side) {
  return () => {
    const layer = parts[key]?.find((item) => item.mesh.name === mesh);
    if (!layer) return null;
    box.setFromObject(layer.mesh).getBoundingSphere(sphere);
    return sphere.center.addScaledVector(sideways, sphere.radius * 0.85 * side);
  };
}

const labels = [
  ['glass', 'Sapphire glass', rimPoint(crystal, -17, 5.6), -1],
  ['start', 'Start and stop', pusherTip(pushers[0]), 1],
  ['reset', 'Reset', pusherTip(pushers[1]), 1],
  ['crown', 'Screw-in crown', () => crown.position.clone().add(new THREE.Vector3(4.6, 0, 0)), 1],
  ['plate', movement.plate.name, edgeOf('plate', '100_Main_Plate', -1), -1],
  ['train', movement.train.name, edgeOf('train', '210_Third_wheel', 1), 1],
  ['bridges', movement.bridges.name, edgeOf('bridges', '105M_Barrel_bridge', -1), -1],
  ['winding', movement.winding.name, edgeOf('winding', '415_Ratchet_wheel', 1), 1],
  ['balance', movement.balance.name, edgeOf('balance', '121_Balancing_bridge', -1), -1],
  ['back', 'Sapphire case back', rimPoint(back, 18.6, -5.6), 1],
].map(([key, text, anchor, side]) => {
  const mark = document.createElement('span');
  mark.className = `mark mark--part${side < 0 ? ' mark--left' : ''}`;
  mark.textContent = text;
  marksLayer.append(mark);
  return { key, mark, anchor };
});

/* Views */

const exploded = { crystal: 0.25, bezel: 0.25, hands: 0.25, dial: 0.25, controls: 1, back: 1, works: 1, plate: 1, train: 1, bridges: 1, winding: 1, balance: 1 };
const views = [
  { phi: 0.001, theta: 0, y: 0, height: 64, width: 76, lift: {}, labels: [] },
  { phi: 1.02, theta: -0.45, y: 0, height: 80, width: 98, lift: { crystal: 0.4, bezel: 0.12 }, labels: ['glass', 'start', 'reset', 'crown'] },
  { phi: Math.PI / 2, theta: 0, y: 0, height: 46, width: 74, lift: {}, labels: [] },
  { phi: Math.PI - 1.26, theta: -0.75, y: -29, height: 100, width: 104, lift: exploded, labels: ['plate', 'train', 'bridges', 'winding', 'balance', 'back'] },
];
const dimensions = new Map([[diameter, 0], [height, 2], [strapWidth, 2]]);
const chapterElements = [...document.querySelectorAll('.chapter')];
const view = { ...views[0] };
const clamp01 = (t) => Math.min(Math.max(t, 0), 1);
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function readProgress() {
  const line = innerHeight * (innerWidth < 1024 ? 0.72 : 0.5);
  const tops = chapterElements.map((chapter) => chapter.getBoundingClientRect().top - line);
  let index = 0;
  while (index < tops.length - 1 && tops[index + 1] <= 0) index++;
  if (index === tops.length - 1 || tops[index] > 0) return index;
  const local = -tops[index] / (tops[index + 1] - tops[index]);
  return index + ease(clamp01((local - 0.4) / 0.6));
}

function applyView(progress) {
  const index = Math.min(Math.floor(progress), views.length - 2);
  const t = progress - index;
  const from = views[index];
  const to = views[index + 1];
  for (const key of ['phi', 'theta', 'y', 'height', 'width']) view[key] = THREE.MathUtils.lerp(from[key], to[key], t);
  for (const [name, layers] of Object.entries(parts)) {
    const lift = THREE.MathUtils.lerp(from.lift[name] ?? 0, to.lift[name] ?? 0, t);
    for (const layer of layers) layer.lift = lift;
  }
  for (const [dimension, at] of dimensions) dimension.set(clamp01(1 - Math.abs(progress - at) * 2.5));
  const nearest = views[Math.round(progress)];
  const settled = Math.abs(progress - Math.round(progress)) < 0.2;
  for (const label of labels) label.mark.classList.toggle('is-visible', settled && nearest.labels.includes(label.key));
}

/* Render */

const spherical = new THREE.Spherical();
const projected = new THREE.Vector3();
const target = new THREE.Vector3();
let visible = false;

new IntersectionObserver(([entry]) => (visible = entry.isIntersecting), { rootMargin: '200px 0px' }).observe(stage);

const loadObserver = new IntersectionObserver(
  ([entry]) => {
    if (entry.isIntersecting) {
      loadObserver.disconnect();
      loadMovement();
    }
  },
  { rootMargin: '100% 0px' },
);
loadObserver.observe(stage);

function resize() {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(stage.clientWidth, stage.clientHeight, false);
  renderer.getDrawingBufferSize(resolution);
  outlineWidth.value = 1.25 * renderer.getPixelRatio();
  camera.aspect = stage.clientWidth / stage.clientHeight;
  camera.updateProjectionMatrix();
}

new ResizeObserver(resize).observe(stage);

function project(vector, element) {
  if (!vector) return;
  projected.copy(vector).project(camera);
  element.style.transform = `translate(${(((projected.x + 1) / 2) * stage.clientWidth).toFixed(1)}px, ${(((1 - projected.y) / 2) * stage.clientHeight).toFixed(1)}px)`;
}

renderer.setAnimationLoop((time) => {
  if (!visible) return;
  const progress = readProgress();
  applyView(reduceMotion ? Math.round(progress) : progress);
  const radius = Math.max(view.height, view.width / camera.aspect) / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  target.set(0, view.y, 0);
  camera.position.setFromSpherical(spherical.set(radius, view.phi, view.theta)).add(target);
  camera.lookAt(target);

  for (const layers of Object.values(parts)) {
    for (const layer of layers) layer.group.position.y = layer.offset * layer.lift;
  }
  for (const { holder, direction, base } of pushers) holder.position.copy(base).addScaledVector(direction, 6 * controls.lift);
  crown.position.x = 20.2 + 6 * controls.lift;

  const now = new Date();
  const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
  const minutes = now.getMinutes() + seconds / 60;
  hourHand.rotation.y = -(((now.getHours() % 12) + minutes / 60) * Math.PI) / 6;
  minuteHand.rotation.y = -(minutes * Math.PI) / 30;
  counterHands.seconds.rotation.y = -(Math.floor(seconds * 8) / 8) * (Math.PI / 30);
  chronoHand.rotation.y = -(Math.floor((time / 1000) * 8) / 8) * (Math.PI / 30);

  renderer.render(scene, camera);
  sideways.setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize();
  for (const dimension of dimensions.keys()) project(dimension.anchor, dimension.mark);
  for (const label of labels) project(label.anchor(), label.mark);
});

