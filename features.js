const vertexSource = `#version 300 es
in vec2 aPosition;
uniform vec2 uSize;
out vec2 vPos;
void main() {
  vPos = vec2(aPosition.x * 0.5 + 0.5, 0.5 - aPosition.y * 0.5) * uSize;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const fragmentSource = `#version 300 es
precision highp float;
uniform sampler2D uImage;
uniform sampler2D uSky;
uniform vec4 uImageRect;
uniform vec4 uSkyRect;
uniform vec2 uTexel;
uniform float uLife;
uniform vec2 uPointer;
uniform int uMode;
uniform vec4 uGlass;
uniform vec4 uMasks[3];
in vec2 vPos;
out vec4 outColor;

float luma(vec3 color) {
  return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

vec4 photo(vec2 uv, float lod) {
  bool outside = uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0;
  return outside ? vec4(0.0) : textureLod(uImage, uv, lod);
}

float inRect(vec2 uv, vec4 rect) {
  vec2 inside = step(rect.xy, uv) * step(uv, rect.zw);
  return inside.x * inside.y;
}

void main() {
  vec3 sky = texture(uSky, (vPos - uSkyRect.xy) / uSkyRect.zw).rgb;
  vec2 uv = (vPos - uImageRect.xy) / uImageRect.zw;
  uv += (luma(photo(uv, 4.0).rgb) - 0.3) * 0.006 * uPointer;

  vec4 texel = photo(uv, 0.0);
  float alpha = texel.a * smoothstep(0.0, 0.07, uv.y) * smoothstep(1.0, 0.93, uv.y);
  vec3 color = texel.a > 0.0 ? texel.rgb / texel.a : vec3(0.0);
  float brightness = luma(color);
  float high = max(color.r, max(color.g, color.b));
  float saturation = high > 0.0 ? (high - min(color.r, min(color.g, color.b))) / high : 0.0;

  vec2 step2 = uTexel * 5.0;
  float solid = smoothstep(0.92, 1.0, photo(uv, 2.0).a);
  float left = luma(photo(uv - vec2(step2.x, 0.0), 2.0).rgb);
  float right = luma(photo(uv + vec2(step2.x, 0.0), 2.0).rgb);
  float up = luma(photo(uv - vec2(0.0, step2.y), 2.0).rgb);
  float down = luma(photo(uv + vec2(0.0, step2.y), 2.0).rgb);
  vec3 normal = normalize(vec3((left - right) * 4.0 * solid, (up - down) * 4.0 * solid, 1.0));
  float angle = mix(3.5, 5.9, uLife) + uPointer.x * 0.5;
  vec3 halfway = normalize(normalize(vec3(cos(angle), sin(angle), 0.75)) + vec3(0.0, 0.0, 1.0));
  float metal = (1.0 - smoothstep(0.1, 0.45, saturation)) * smoothstep(0.25, 0.75, brightness);
  color += pow(max(dot(normal, halfway), 0.0), 48.0) * metal * 1.0;

  vec2 glass = (uv - uGlass.xy) / uGlass.zw;
  float onGlass = 1.0 - smoothstep(0.97, 1.0, length(glass));
  if (uMode == 3) {
    float streak = uv.x - mix(-0.1, 1.1, uLife);
    color += exp(-streak * streak / 0.004) * metal * 0.6;
  } else {
    float sweep = dot(glass, normalize(vec2(0.82, -0.57))) - mix(-1.7, 1.7, uLife);
    float sheen = exp(-sweep * sweep / 0.22) * 0.16 + exp(-(sweep + 0.42) * (sweep + 0.42) / 0.005) * 0.12;
    color = mix(color, vec3(1.0), sheen * onGlass);
  }

  if (uMode == 1) {
    float night = smoothstep(0.38, 0.6, uLife);
    float printed = max(max(inRect(uv, uMasks[0]), inRect(uv, uMasks[1])), inRect(uv, uMasks[2]));
    float dial = (1.0 - smoothstep(0.86, 0.9, length(glass))) * (1.0 - printed);
    float paint = smoothstep(0.5, 0.75, luma(photo(uv, 2.0).rgb)) * (1.0 - smoothstep(0.08, 0.22, saturation)) * dial;
    float halo = smoothstep(0.25, 0.7, luma(photo(uv, 4.5).rgb)) * dial;
    color = color * mix(1.0, 0.07, night) + vec3(0.6, 1.0, 0.82) * (paint * 1.15 + halo * 0.3) * night;
    sky *= mix(1.0, 0.1, night);
  }

  outColor = vec4(sky * (1.0 - alpha) + color * alpha, 1.0);
}`;

const framings = {
  1: { aspect: 1440 / 1824, focus: [0.4967, 0.499], height: 1.12, width: 0.913, glass: [0.4967, 0.499, 0.375, 0.2961] },
  2: { aspect: 1440 / 1824, focus: [0.5, 0.4974], height: 1.12, width: 0.917, glass: [0.5, 0.4974, 0.2925, 0.2309] },
  3: { aspect: 1, focus: [0.47, 0.47], height: 1.18, width: 0.866, glass: [0.455, 0.465, 0.3, 0.33] },
  5: { aspect: 1, focus: [0.505, 0.51], height: 1.06, width: 0.79, glass: [0, 0, 1, 1] },
};

const printedAreas = [0.594, 0.483, 0.747, 0.514, 0.625, 0.438, 0.68, 0.47, 0.585, 0.52, 0.755, 0.54];

const list = document.querySelector('.features__cards');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (value) => Math.min(Math.max(value, 0), 1);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
let variant = current;
let near = false;
let pitch = 0;

const cards = [...list.querySelectorAll('.card')].map((element) => ({
  element,
  inner: element.querySelector('.card__inner'),
  shade: element.querySelector('.card__shade'),
  canvas: element.querySelector('.card__canvas'),
  view: element.dataset.view,
  mode: Number(element.dataset.mode),
  pointer: { x: 0, y: 0, targetX: 0, targetY: 0 },
  life: 0,
  drawn: '',
}));

function compile(gl) {
  const program = gl.createProgram();
  for (const [type, source] of [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragmentSource]]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const uniforms = {};
  for (let i = 0; i < gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS); i++) {
    const name = gl.getActiveUniform(program, i).name.replace('[0]', '');
    uniforms[name] = gl.getUniformLocation(program, name);
  }
  gl.uniform1i(uniforms.uImage, 0);
  gl.uniform1i(uniforms.uSky, 1);
  gl.uniform4fv(uniforms.uMasks, printedAreas);
  return uniforms;
}

function upload(gl, unit, image) {
  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}

async function load(card) {
  const wanted = variant;
  const [image, sky] = await Promise.all(
    [`assets/detail/${wanted.id}-${card.view}.webp`, `assets/sky/${wanted.sky}.jpg`].map((src) => {
      const element = new Image();
      element.src = src;
      return element.decode().then(() => element);
    }),
  );
  if (wanted !== variant) return;
  const { gl } = card;
  gl.deleteTexture(card.image);
  gl.deleteTexture(card.sky);
  card.image = upload(gl, 0, image);
  card.sky = upload(gl, 1, sky);
  card.imageSize = [image.naturalWidth, image.naturalHeight];
  card.drawn = '';
}

function setup(card) {
  card.gl = card.canvas.getContext('webgl2', { antialias: false, alpha: false });
  card.uniforms = compile(card.gl);
  card.inner.addEventListener('pointermove', (event) => {
    const box = card.inner.getBoundingClientRect();
    card.pointer.targetX = ((event.clientX - box.left) / box.width) * 2 - 1;
    card.pointer.targetY = ((event.clientY - box.top) / box.height) * 2 - 1;
  });
  card.inner.addEventListener('pointerleave', () => {
    card.pointer.targetX = 0;
    card.pointer.targetY = 0;
  });
  load(card);
}

function draw(card) {
  const { gl, uniforms, canvas } = card;
  const ratio = Math.min(devicePixelRatio, 1.5);
  const width = card.inner.clientWidth;
  const height = card.inner.clientHeight;
  if (canvas.width !== Math.round(width * ratio)) {
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
  }
  const key = `${card.life.toFixed(4)} ${card.pointer.x.toFixed(3)} ${card.pointer.y.toFixed(3)} ${canvas.width}x${canvas.height}`;
  if (!card.image || key === card.drawn) return;
  card.drawn = key;

  const framing = framings[card.view];
  const portrait = width < height;
  const [anchorX, anchorY] = portrait ? [0.5, 0.42] : [0.6, 0.5];
  const imageHeight = Math.min(height * framing.height, (width * (portrait ? 0.92 : 0.6)) / (framing.width * framing.aspect));
  const imageWidth = imageHeight * framing.aspect;
  const skyScale = Math.max(width / 2400, height / 1500);

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.uniform2f(uniforms.uSize, canvas.width, canvas.height);
  gl.uniform4f(uniforms.uImageRect, (width * anchorX - imageWidth * framing.focus[0]) * ratio, (height * anchorY - imageHeight * framing.focus[1]) * ratio, imageWidth * ratio, imageHeight * ratio);
  gl.uniform4f(uniforms.uSkyRect, ((width - 2400 * skyScale) / 2) * ratio, ((height - 1500 * skyScale) / 2) * ratio, 2400 * skyScale * ratio, 1500 * skyScale * ratio);
  gl.uniform2f(uniforms.uTexel, 1 / card.imageSize[0], 1 / card.imageSize[1]);
  gl.uniform1f(uniforms.uLife, card.life);
  gl.uniform2f(uniforms.uPointer, card.pointer.x, card.pointer.y);
  gl.uniform1i(uniforms.uMode, card.mode);
  gl.uniform4fv(uniforms.uGlass, framing.glass);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, card.image);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, card.sky);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function measure() {
  const listTop = list.getBoundingClientRect().top + scrollY;
  const gap = parseFloat(getComputedStyle(list).rowGap);
  const stick = parseFloat(getComputedStyle(cards[0].element).top);
  pitch = cards[0].element.offsetHeight + gap;
  cards.forEach((card, index) => {
    const top = listTop + index * pitch;
    card.enter = top - innerHeight;
    card.dock = top - stick;
  });
}

function update() {
  if (!near) return;
  const y = scrollY;
  cards.forEach((card, index) => {
    const next = cards[index + 1];
    const after = cards[index + 2];
    const enter = clamp((y - card.enter) / (card.dock - card.enter));
    const past = Math.min(Math.max((y - card.dock) / pitch, 0), 2);
    const cover = next ? clamp((y - next.enter) / (next.dock - next.enter)) : 0;
    const gone = after ? clamp((y - after.enter) / (after.dock - after.enter)) : 0;
    const end = next ? next.dock : card.dock + innerHeight * 0.5;
    card.life = clamp((y - card.enter) / (end - card.enter));
    card.element.style.transform = `translateY(${(card.enter - card.dock) * (1 - enter) * enter * enter}px) scale(${0.9 + 0.1 * easeOut(enter)})`;
    card.inner.style.transform = `translateY(${-Math.min(past, 1) * 1.25}rem) scale(${1 - past * 0.05})`;
    card.shade.style.opacity = String(cover * 0.5);
    card.inner.style.opacity = String(1 - gone);

    if (!reduceMotion) {
      card.pointer.x += (card.pointer.targetX - card.pointer.x) * 0.08;
      card.pointer.y += (card.pointer.targetY - card.pointer.y) * 0.08;
    }
    if (card.gl && enter > 0 && gone < 1) draw(card);
  });
}

const cardObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      const card = cards.find((item) => item.element === entry.target);
      if (entry.isIntersecting && !card.gl) setup(card);
    }
  },
  { rootMargin: '100% 0px' },
);
for (const card of cards) cardObserver.observe(card.element);

new IntersectionObserver(([entry]) => (near = entry.isIntersecting), { rootMargin: '50% 0px' }).observe(list);

document.addEventListener('variant', (event) => {
  variant = event.detail;
  for (const card of cards) if (card.gl) load(card);
});

new ResizeObserver(measure).observe(document.body);
gsap.ticker.add(update);
