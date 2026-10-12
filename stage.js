const vertexSource = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const tileSource = `#version 300 es
precision highp float;
uniform vec2 uSize;
uniform float uTime;
uniform vec3 uTurn;
uniform vec3 uShape;
uniform float uFront;
uniform float uSwell;
uniform int uKind[2];
uniform vec3 uColor[2];
uniform float uRough[2];
out vec4 outColor;

mat3 rotateX(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c);
}

mat3 rotateY(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c);
}

mat3 rotateZ(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0);
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float front(vec2 p) {
  float wave = 0.2 * sin(p.y * 2.4 - p.x * 0.9 + uTime * 0.6) + 0.07 * sin(p.x * 5.3 + p.y * 3.1 - uTime);
  return dot(p, vec2(0.8, 0.6)) - uFront + wave;
}

float outline(vec2 p) {
  vec2 q = abs(p) - (1.0 - uShape.x);
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uShape.x;
}

float tile(vec3 p) {
  float f = front(p.xy);
  float rise = uSwell * (0.045 * smoothstep(0.15, -0.15, f) + 0.03 * exp(-f * f * 40.0));
  float depth = uShape.y + uShape.z * max(1.0 - dot(p.xy, p.xy) * 0.7, 0.0) + rise;
  float edge = depth * 0.92;
  vec2 w = vec2(outline(p.xy) + edge, abs(p.z) - depth + edge);
  return min(max(w.x, w.y), 0.0) + length(max(w, 0.0)) - edge;
}

vec3 normalAt(vec3 p) {
  vec2 k = vec2(1.0, -1.0) * 0.001;
  return normalize(k.xyy * tile(p + k.xyy) + k.yyx * tile(p + k.yyx) + k.yxy * tile(p + k.yxy) + k.xxx * tile(p + k.xxx));
}

vec3 studio(vec3 d, float blur) {
  float soft = 0.08 + blur * 0.5;
  vec3 color = vec3(0.03);
  color += 3.0 * smoothstep(0.55 - soft, 0.62 + soft, d.y) * smoothstep(0.99 + soft, 0.9 - soft, d.y);
  color += 1.4 * smoothstep(0.12 + soft, 0.12 - soft, abs(abs(d.x) - 0.82)) * smoothstep(-0.6, 0.2, d.y);
  color += 0.3 * smoothstep(0.1, -0.8, d.y);
  return color;
}

vec3 behind(vec3 d) {
  return mix(studio(d, 0.0), vec3(1.8), smoothstep(-0.8, -0.95, d.z));
}

vec3 shade(int side, vec3 p, vec3 normal, vec3 v, mat3 turn) {
  int kind = uKind[side];
  vec3 albedo = uColor[side];
  float rough = uRough[side];
  float face = smoothstep(0.5, 0.9, abs(normal.z));
  vec3 bump = vec3(0.0);
  float stitch = 0.0;
  if (kind == 2) {
    vec2 grain = p.xy * 44.0;
    float h = noise(grain);
    bump = vec3(h - noise(grain + vec2(0.4, 0.0)), h - noise(grain + vec2(0.0, 0.4)), 0.0) * 0.3;
    float band = smoothstep(0.016, 0.004, abs(outline(p.xy) + 0.14));
    stitch = band * step(0.4, fract(atan(p.y, p.x) * 11.5)) * face;
  }
  if (kind == 4) {
    bump = vec3(0.0, noise(vec2(p.x * 2.0, p.y * 520.0)) - 0.5, 0.0) * 0.16;
  }
  vec3 n = normalize(turn * normalize(normal + bump * face));
  vec3 r = reflect(-v, n);
  float cosine = max(dot(n, v), 0.0);
  float fresnel = pow(1.0 - cosine, 5.0);
  if (kind == 0 || kind == 4) {
    return studio(r, rough) * (albedo + (1.0 - albedo) * fresnel);
  }
  if (kind == 1) {
    vec3 back = turn * vec3(normal.xy, -normal.z);
    vec3 through;
    for (int c = 0; c < 3; c++) {
      float ior = 1.77 + float(c - 1) * 0.045;
      vec3 inside = refract(-v, n, 1.0 / ior);
      vec3 outgoing = refract(inside, -back, ior);
      if (dot(outgoing, outgoing) == 0.0) outgoing = reflect(inside, -back);
      through[c] = behind(outgoing)[c];
    }
    vec3 coating = 0.75 + 0.25 * cos(6.2831 * (cosine * 1.3 + vec3(0.62, 0.45, 0.25)));
    return mix(through * albedo, studio(r, 0.0) * coating, 0.077 + 0.923 * fresnel);
  }
  vec3 diffuse = mix(albedo, vec3(0.62, 0.56, 0.44), stitch) * studio(n, 1.0);
  float reflectance = 0.04 + 0.96 * fresnel;
  return diffuse * (1.0 - reflectance) + studio(r, rough) * reflectance;
}

void main() {
  float scale = min(uSize.x, uSize.y);
  vec2 uv = vec2(gl_FragCoord.x - 0.5 * uSize.x, 0.5 * uSize.y - gl_FragCoord.y) / scale;
  mat3 turn = rotateY(uTurn.x) * rotateX(uTurn.y) * rotateZ(uTurn.z);
  vec3 rd = normalize(vec3(uv * 0.55, -1.0));
  vec3 lo = vec3(0.0, 0.0, 7.0) * turn;
  vec3 ld = rd * turn;
  float b = dot(lo, ld);
  float h = b * b - dot(lo, lo) + 3.0;
  if (h < 0.0) {
    outColor = vec4(0.0);
    return;
  }
  h = sqrt(h);
  float t = -b - h;
  float end = -b + h;
  float closest = 1e9;
  float closestT = t;
  bool hit = false;
  for (int i = 0; i < 96; i++) {
    float d = tile(lo + ld * t);
    if (d < closest) {
      closest = d;
      closestT = t;
    }
    if (d < 0.0004) {
      hit = true;
      break;
    }
    t += d * 0.7;
    if (t > end) break;
  }
  float pixel = 0.55 * 7.0 / scale;
  float coverage = hit ? 1.0 : 1.0 - smoothstep(0.0, pixel, closest);
  if (coverage <= 0.0) {
    outColor = vec4(0.0);
    return;
  }
  vec3 p = lo + ld * (hit ? t : closestT);
  vec3 normal = normalAt(p);
  vec3 v = -rd;
  float f = front(p.xy);
  float ahead = smoothstep(-pixel, pixel, f);
  vec3 color = ahead > 0.999 ? shade(0, p, normal, v, turn) : ahead < 0.001 ? shade(1, p, normal, v, turn) : mix(shade(1, p, normal, v, turn), shade(0, p, normal, v, turn), ahead);
  vec3 fringe = vec3(exp(-pow((f - 0.015) * 70.0, 2.0)), exp(-pow(f * 70.0, 2.0)), exp(-pow((f + 0.015) * 70.0, 2.0)));
  color += fringe * uSwell * 1.5;
  color = pow(1.0 - exp(-color * 1.15), vec3(1.0 / 2.2));
  outColor = vec4(color * coverage, coverage);
}`;

const compositeSource = `#version 300 es
precision highp float;
uniform sampler2D uFrom;
uniform sampler2D uTo;
uniform vec4 uFromRect;
uniform vec4 uToRect;
uniform vec2 uSize;
uniform float uProgress;
uniform float uDirection;
uniform vec2 uAxis;
uniform float uTime;
out vec4 outColor;

vec4 layer(sampler2D image, vec4 rect, vec2 position) {
  vec2 uv = (position - rect.xy) / rect.zw;
  vec2 inside = step(vec2(0.0), uv) * step(uv, vec2(1.0));
  return texture(image, uv) * inside.x * inside.y;
}

void main() {
  vec2 position = vec2(gl_FragCoord.x, uSize.y - gl_FragCoord.y);
  float unit = min(uSize.x, uSize.y);
  vec2 q = (position - 0.5 * uSize) / unit;
  float along = dot(q, vec2(-uAxis.y, uAxis.x));
  float wave = 0.05 * sin(along * 6.0 + uTime * 1.2) + 0.025 * sin(along * 13.0 - uTime * 1.9);
  float f = dot(q, uAxis) * uDirection + wave - mix(0.95, -0.95, uProgress);
  vec2 bend = -uAxis * uDirection * unit * 0.035 * exp(-f * f * 220.0);
  vec4 old = layer(uFrom, uFromRect, position + bend);
  vec4 next = vec4(layer(uTo, uToRect, position + bend * 1.4).r, layer(uTo, uToRect, position + bend).g, layer(uTo, uToRect, position + bend * 0.6).ba);
  vec4 color = mix(old, next, smoothstep(-1.5 / unit, 1.5 / unit, f));
  vec3 fringe = vec3(exp(-pow((f - 0.01) * 80.0, 2.0)), exp(-pow(f * 80.0, 2.0)), exp(-pow((f + 0.01) * 80.0, 2.0)));
  color.rgb += fringe * max(old.a, next.a) * 0.9 + exp(-pow((f - 0.04) * 22.0, 2.0)) * next.a * 0.35;
  outColor = color;
}`;

const kinds = { metal: 0, glass: 1, leather: 2, rubber: 3, brushed: 4 };

const caseFinishes = {
  'Stainless steel': { kind: kinds.metal, color: [0.6, 0.6, 0.62], rough: 0.05, shape: [0.42, 0.12, 0.1] },
  '18 ct 5N gold': { kind: kinds.metal, color: [0.9, 0.52, 0.36], rough: 0.06, shape: [0.42, 0.12, 0.1] },
};

const sapphire = { kind: kinds.glass, color: [0.93, 0.95, 1], rough: 0, shape: [1, 0.07, 0.16] };

const strapFinishes = {
  388101: { kind: kinds.leather, color: [0.012, 0.022, 0.06], rough: 0.6, shape: [0.5, 0.15, 0.08] },
  388103: { kind: kinds.leather, color: [0.05, 0.02, 0.01], rough: 0.6, shape: [0.5, 0.15, 0.08] },
  388111: { kind: kinds.leather, color: [0.006, 0.006, 0.007], rough: 0.6, shape: [0.5, 0.15, 0.08] },
  388117: { kind: kinds.rubber, color: [0.11, 0.2, 0.26], rough: 0.45, shape: [0.56, 0.17, 0.05] },
  388110: { kind: kinds.rubber, color: [0.006, 0.045, 0.025], rough: 0.45, shape: [0.56, 0.17, 0.05] },
  388102: { kind: kinds.brushed, color: [0.6, 0.6, 0.62], rough: 0.22, shape: [0.3, 0.11, 0.03] },
};

const stage = document.querySelector('.buy__stage');
const canvas = stage.querySelector('.buy__canvas');
const items = [...document.querySelectorAll('.material')];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const desktop = matchMedia('(min-width: 1024px)');
const gl = canvas.getContext('webgl2', { antialias: false });
const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
const transition = { progress: 1, direction: 1, axis: [0.3, 1] };
const viewNames = { 1: 'front', 2: 'case back', 3: 'detail', 5: 'profile' };
const clamp01 = (t) => Math.min(Math.max(t, 0), 1);
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
let sequence = [caseFinishes[current.case], sapphire, strapFinishes[current.strap]];
let view = '1';
let from = null;
let to = null;
let pending = null;
let dirty = true;

function compile(fragmentSource) {
  const program = gl.createProgram();
  for (const [type, source] of [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragmentSource]]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
  }
  gl.bindAttribLocation(program, 0, 'aPosition');
  gl.linkProgram(program);
  const uniforms = {};
  for (let i = 0; i < gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS); i++) {
    const name = gl.getActiveUniform(program, i).name.replace('[0]', '');
    uniforms[name] = gl.getUniformLocation(program, name);
  }
  return { program, uniforms };
}

function upload(image) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}

const tile = compile(tileSource);
const composite = compile(compositeSource);
const empty = upload(new ImageData(1, 1));
const tileTexture = gl.createTexture();
const tileFrame = gl.createFramebuffer();

gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

gl.bindTexture(gl.TEXTURE_2D, tileTexture);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

function resize() {
  const width = Math.round(canvas.clientWidth * Math.min(devicePixelRatio, 2));
  const height = Math.round(canvas.clientHeight * Math.min(devicePixelRatio, 2));
  if (canvas.width === width && canvas.height === height) return;
  canvas.width = width;
  canvas.height = height;
  gl.bindTexture(gl.TEXTURE_2D, tileTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, Math.round(canvas.clientWidth * Math.min(devicePixelRatio, 1.5)), Math.round(canvas.clientHeight * Math.min(devicePixelRatio, 1.5)), 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, tileFrame);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tileTexture, 0);
}

function readProgress() {
  const line = innerHeight / 2;
  const tops = items.map((item) => item.getBoundingClientRect().top - line);
  let index = 0;
  while (index < tops.length - 1 && tops[index + 1] <= 0) index++;
  if (index === tops.length - 1 || tops[index] > 0) return index;
  const local = -tops[index] / (tops[index + 1] - tops[index]);
  return index + ease(clamp01((local - 0.2) / 0.6));
}

function cycle(time) {
  const phase = (time / 2.5) % 4;
  const position = phase < 2 ? phase : 4 - phase;
  const index = Math.min(Math.floor(position), 1);
  return index + ease(clamp01((position - index - 0.3) / 0.4));
}

function drawTile(progress, time) {
  const width = Math.round(canvas.clientWidth * Math.min(devicePixelRatio, 1.5));
  const height = Math.round(canvas.clientHeight * Math.min(devicePixelRatio, 1.5));
  const index = Math.min(Math.floor(progress), sequence.length - 2);
  const t = progress - index;
  const start = sequence[index];
  const end = sequence[index + 1];
  const blend = t * t * (3 - 2 * t);
  const { program, uniforms } = tile;

  gl.useProgram(program);
  gl.bindFramebuffer(gl.FRAMEBUFFER, tileFrame);
  gl.viewport(0, 0, width, height);
  gl.uniform2f(uniforms.uSize, width, height);
  gl.uniform1f(uniforms.uTime, time);
  gl.uniform3f(uniforms.uTurn, 0.3 * Math.sin(time * 0.35) + pointer.x * 0.25 + (progress - 1) * 0.35, -0.4 + 0.08 * Math.sin(time * 0.27) - pointer.y * 0.15, Math.PI / 4 + progress * 0.2);
  gl.uniform3fv(uniforms.uShape, start.shape.map((value, i) => value + (end.shape[i] - value) * blend));
  gl.uniform1f(uniforms.uFront, -2.2 + 4.4 * t);
  gl.uniform1f(uniforms.uSwell, Math.sin(Math.PI * t));
  gl.uniform1iv(uniforms.uKind, [start.kind, end.kind]);
  gl.uniform3fv(uniforms.uColor, [...start.color, ...end.color]);
  gl.uniform1fv(uniforms.uRough, [start.rough, end.rough]);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function place(layer, scale, shift) {
  const fit = layer === 'tile' ? 1 : Math.min(canvas.width / layer.width, canvas.height / layer.height);
  const width = (layer === 'tile' ? canvas.width : layer.width * fit) * scale;
  const height = (layer === 'tile' ? canvas.height : layer.height * fit) * scale;
  return [(canvas.width - width) / 2 + shift * transition.axis[0] * canvas.width, (canvas.height - height) / 2 + shift * transition.axis[1] * canvas.height, width, height];
}

function bind(unit, layer) {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, layer === 'tile' ? tileTexture : layer ? layer.texture : empty);
}

function drawComposite(time) {
  const t = transition.progress;
  const { program, uniforms } = composite;

  gl.useProgram(program);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.uniform1i(uniforms.uFrom, 0);
  gl.uniform1i(uniforms.uTo, 1);
  gl.uniform2f(uniforms.uSize, canvas.width, canvas.height);
  gl.uniform1f(uniforms.uProgress, t);
  gl.uniform1f(uniforms.uDirection, transition.direction);
  gl.uniform2fv(uniforms.uAxis, transition.axis);
  gl.uniform1f(uniforms.uTime, time);
  gl.uniform4fv(uniforms.uFromRect, from ? place(from, 1 - 0.06 * t, -0.03 * transition.direction * t) : [0, 0, 1, 1]);
  gl.uniform4fv(uniforms.uToRect, place(to, 1.08 - 0.08 * t, 0.03 * transition.direction * (1 - t)));
  bind(0, from);
  bind(1, to);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function release(layer) {
  if (layer && layer !== 'tile') gl.deleteTexture(layer.texture);
}

function start(layer, direction) {
  gsap.killTweensOf(transition);
  release(from);
  from = to;
  to = layer;
  transition.direction = direction;
  transition.axis = desktop.matches ? [0.3, 1] : [1, 0.3];
  transition.progress = 0;
  dirty = true;
  gsap.to(transition, {
    progress: 1,
    duration: reduceMotion ? 0 : 1.3,
    ease: 'power3.inOut',
    onUpdate: () => (dirty = true),
    onComplete: () => {
      release(from);
      from = null;
    },
  });
}

function show(next, direction) {
  view = next;
  pending = null;
  if (view === 'shape') {
    canvas.ariaLabel = 'Case, glass and strap materials';
    start('tile', direction);
    return;
  }
  const image = new Image();
  image.src = `assets/gallery/${current.id}-${view}.webp`;
  pending = image;
  image.decode().then(() => {
    if (image !== pending) return;
    canvas.ariaLabel = `Pilot’s Watch Chronograph 41 IW${current.id}, ${viewNames[view]}`;
    if (!to) document.dispatchEvent(new CustomEvent('land'));
    start({ texture: upload(image), width: image.naturalWidth, height: image.naturalHeight }, direction);
  });
}

stage.addEventListener('pointermove', (event) => {
  const box = canvas.getBoundingClientRect();
  pointer.targetX = ((event.clientX - box.left) / box.width) * 2 - 1;
  pointer.targetY = ((event.clientY - box.top) / box.height) * 2 - 1;
});

stage.addEventListener('pointerleave', () => {
  pointer.targetX = 0;
  pointer.targetY = 0;
});

document.addEventListener('view', (event) => show(event.detail.view, event.detail.direction));

document.addEventListener('variant', (event) => {
  sequence = [caseFinishes[event.detail.case], sapphire, strapFinishes[event.detail.strap]];
  if (view !== 'shape') show(view, 1);
});

new ResizeObserver(() => (dirty = true)).observe(canvas);

gsap.ticker.add((time) => {
  const tiled = from === 'tile' || to === 'tile';
  if (!to || (!dirty && !tiled)) return;
  dirty = false;
  resize();
  if (tiled) {
    const position = desktop.matches ? readProgress() : cycle(time);
    const progress = reduceMotion ? Math.round(position) : position;
    items.forEach((item, index) => item.classList.toggle('is-current', index === Math.round(progress)));
    if (!reduceMotion) {
      pointer.x += (pointer.targetX - pointer.x) * 0.08;
      pointer.y += (pointer.targetY - pointer.y) * 0.08;
    }
    drawTile(progress, reduceMotion ? 0 : time);
  }
  drawComposite(time);
});

show(view, 1);
