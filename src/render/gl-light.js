// The light inside a place drawn by the graphics card (F-294, R-1272), as version C of the light test
// (docs/design/prototypes/light.html): the picture drawn so far is lit point by point, the walls cast shadows, and
// what is bright glows. It takes the place of the light map in light.js where WebGL works and it is chosen; where it
// does not, or it is too slow, the light map is used as before (WG2), and the screen tests always use the light map
// so that their pictures stay the same. Space is lit the same way (F-295): the lights of shots, engines, explosions
// and stations fall on the hulls near them and leave black space black, and what is bright glows.
import { VIEW_W, VIEW_H } from '../config.js';
import { TILE, tileAt } from '../sim/boarding.js';

const KEY = 'critical-light';
// Light that falls nowhere still shows the shapes, in a cold tone: the light map's DARK.
const AMBIENT = [0x1f / 255, 0x23 / 255, 0x38 / 255];

let G = null; // the WebGL state, made on first use
let broken = false; // WebGL failed here: the light map from now on
let slowSince = null; // when the frames began to come too slowly
let last = 0;
let fellBack = false;
let still = false;
// The still mode of the screen tests draws with the light map, so that its pictures stay the same everywhere.
export const setLightStill = (on) => (still = !!on);

// Whether the new light is used: chosen (the default), not in the still mode of the screen tests, and working.
export function glLightOn() {
  if (still || broken) return false;
  try {
    return localStorage.getItem(KEY) !== 'classic';
  } catch {
    return true;
  }
}
export const glLightChoice = () => {
  try {
    return localStorage.getItem(KEY) === 'classic' ? 'classic' : 'new';
  } catch {
    return 'new';
  }
};
export function setGlLight(choice) {
  try {
    localStorage.setItem(KEY, choice);
  } catch {
    // no storage: the choice holds until the page is closed
  }
  if (choice === 'new') {
    fellBack = false;
    slowSince = null;
  }
}
// Whether the game went back to the light map by itself, because the frames came too slowly (WG2).
export const glLightFellBack = () => fellBack;

const stops = (c) => c === '#' || c === 'L' || c === 'D';

function setup() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: true });
  if (!gl) throw new Error('no WebGL');
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const program = (fs) => {
    const p = gl.createProgram();
    const v = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(
      v,
      'attribute vec2 p; varying vec2 uv; void main(){ uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }',
    );
    gl.compileShader(v);
    const f = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(f, 'precision mediump float; varying vec2 uv;\n' + fs);
    gl.compileShader(f);
    if (!gl.getShaderParameter(f, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(f) || 'shader');
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link');
    const u = {};
    return { p, u: (name) => (u[name] ??= gl.getUniformLocation(p, name)) };
  };
  const texture = (w, h, nearest) => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, nearest ? gl.NEAREST : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, nearest ? gl.NEAREST : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (w) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    return t;
  };
  const target = (w, h) => {
    const tex = texture(w, h, false);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { tex, fb, w, h };
  };
  // One light: how much of it falls on each point of the screen. `world` turns a point of the screen into a point
  // of the place, and the place's tiles say where walls stand (red) and what is inside (green). A light that walls
  // do not stop (`solid` 0) is a small one; a beam has a heading and a half width.
  const light = program(`
    uniform sampler2D walls; uniform vec2 worldSize; uniform vec2 origin; uniform vec2 view;
    uniform vec2 pos; uniform float radius; uniform vec3 color; uniform float power; uniform float far;
    uniform float solid; uniform vec2 dir; uniform float spread;
    void main(){
      vec2 px = vec2(uv.x, 1.0 - uv.y) * view;
      float d = distance(px, pos);
      if (d > radius) { gl_FragColor = vec4(0.0); return; }
      if (spread < 3.0 && d > 0.5) {
        float c = dot(normalize(px - pos), dir);
        float edge = cos(spread);
        if (c < edge) { gl_FragColor = vec4(0.0); return; }
      }
      float lit = 1.0;
      if (solid > 0.5) {
        // Walk from the point toward the light: a wall on the way puts the point in shadow, softly at the edge.
        for (int i = 1; i < 20; i++) {
          vec2 q = mix(px, pos, float(i) / 20.0) - origin;
          float w = texture2D(walls, q / worldSize).r;
          lit = min(lit, 1.0 - w * 0.95);
        }
        // Light reaches a little way into the wall it falls on, so that the wall itself is seen.
        float onWall = texture2D(walls, (px - origin) / worldSize).r;
        lit = max(lit, onWall * 0.35);
      }
      float v = d / radius;
      float mid = far > 0.5 ? 0.65 : 0.45;
      float at = far > 0.5 ? 0.7 : 0.4;
      float f = v < mid ? mix(1.0, at, v / mid) : mix(at, 0.0, (v - mid) / (1.0 - mid));
      gl_FragColor = vec4(color * power * f * lit * 0.5, 1.0);
    }`);
  // The picture drawn so far, lit: inside the place by the lights and the cold of the dark, outside as it was.
  const compose = program(`
    uniform sampler2D albedo; uniform sampler2D lights; uniform sampler2D walls;
    uniform vec2 worldSize; uniform vec2 origin; uniform vec2 view; uniform vec3 ambient;
    void main(){
      vec3 a = texture2D(albedo, vec2(uv.x, 1.0 - uv.y)).rgb;
      vec2 px = vec2(uv.x, 1.0 - uv.y) * view;
      float inside = texture2D(walls, (px - origin) / worldSize).g;
      vec3 l = texture2D(lights, uv).rgb * 2.0 + ambient;
      vec3 lit = a * l + a * l * l * 0.25;
      gl_FragColor = vec4(mix(a, lit, inside), 1.0);
    }`);
  // Space: a light brightens what it falls on most, and colours the dark round it a little, as a glow.
  const space = program(`
    uniform sampler2D albedo; uniform sampler2D lights;
    void main(){
      vec3 a = texture2D(albedo, vec2(uv.x, 1.0 - uv.y)).rgb;
      vec3 l = texture2D(lights, uv).rgb * 2.0;
      gl_FragColor = vec4(a + a * l * 3.0 + l * l * 0.35 + l * 0.12, 1.0);
    }`);
  const bright = program(`
    uniform sampler2D scene; uniform float from;
    void main(){ vec3 c = texture2D(scene, uv).rgb; float b = max(c.r, max(c.g, c.b));
      gl_FragColor = vec4(c * smoothstep(from, 0.95, b), 1.0); }`);
  const blur = program(`
    uniform sampler2D src; uniform vec2 dir;
    void main(){
      vec3 c = texture2D(src, uv).rgb * 0.227;
      c += (texture2D(src, uv + dir * 1.385).rgb + texture2D(src, uv - dir * 1.385).rgb) * 0.316;
      c += (texture2D(src, uv + dir * 3.231).rgb + texture2D(src, uv - dir * 3.231).rgb) * 0.070;
      gl_FragColor = vec4(c, 1.0);
    }`);
  const final = program(`
    uniform sampler2D scene; uniform sampler2D bloom; uniform float strength;
    void main(){ gl_FragColor = vec4(texture2D(scene, uv).rgb + texture2D(bloom, uv).rgb * strength, 1.0); }`);
  return {
    canvas,
    gl,
    quad,
    light,
    compose,
    space,
    bright,
    blur,
    final,
    texture,
    target,
    albedo: texture(0, 0, true),
    walls: texture(0, 0, false),
    wallsKey: null,
    wallsSize: [1, 1],
    lightT: target(VIEW_W, VIEW_H),
    b1: target(VIEW_W / 2, VIEW_H / 2),
    b2: target(VIEW_W / 2, VIEW_H / 2),
    sceneT: null,
  };
}

function draw(g, prog) {
  const gl = g.gl;
  gl.useProgram(prog.p);
  gl.bindBuffer(gl.ARRAY_BUFFER, g.quad);
  const loc = gl.getAttribLocation(prog.p, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}
function bind(g, prog, name, unit, tex) {
  const gl = g.gl;
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.useProgram(prog.p);
  gl.uniform1i(prog.u(name), unit);
}

// The place's tiles as a picture, one point per pixel of the place: red where a wall stops light, green inside.
// Made again only when a tile has changed (a door opened, a wall blown).
function walls(g, it) {
  const key = it.tiles.join('');
  if (g.wallsKey === key && g.wallsIt === it) return;
  const w = it.w * TILE,
    h = it.h * TILE;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = '#000';
  x.fillRect(0, 0, w, h);
  for (let ty = 0; ty < it.h; ty++)
    for (let tx = 0; tx < it.w; tx++) {
      const t = tileAt(it, tx, ty);
      const r = stops(t) ? 255 : 0;
      const gr = t !== ' ' && t !== 'X' ? 255 : 0;
      if (!r && !gr) continue;
      x.fillStyle = `rgb(${r},${gr},0)`;
      x.fillRect(tx * TILE, ty * TILE, TILE, TILE);
    }
  const gl = g.gl;
  gl.bindTexture(gl.TEXTURE_2D, g.walls);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
  g.wallsKey = key;
  g.wallsIt = it;
  g.wallsSize = [w, h];
}

const rgbOf = (s) => s.split(',').map((n) => Number(n) / 255);

// The work of a frame starts here: the frames are watched, and the WebGL state made on first use. Null when the
// light map, or the old light in space, is to be used instead.
function begin() {
  const now = performance.now();
  // Frames that come too slowly for three seconds: back to the light map, which is lighter on the machine (WG2).
  if (last && now - last < 500) {
    if (now - last > 40) slowSince ??= now;
    else slowSince = null;
    if (slowSince !== null && now - slowSince > 3000) {
      setGlLight('classic');
      fellBack = true;
      return null;
    }
  }
  last = now;
  try {
    G ??= setup();
  } catch (e) {
    broken = true;
    console.warn('The new light could not start; using the light map.', e);
    return null;
  }
  return G;
}

// The picture drawn so far, to the graphics card, and the screen-sized target ready.
function takePicture(g, ctx) {
  const gl = g.gl;
  const src = ctx.canvas;
  const W = src.width,
    H = src.height;
  if (g.canvas.width !== W || g.canvas.height !== H) {
    g.canvas.width = W;
    g.canvas.height = H;
    g.sceneT = null;
  }
  g.sceneT ??= g.target(W, H);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, g.albedo);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  return { W, H };
}

// The lights, one after the other, added up at the game's own size. `ox`, `oy` move them onto the screen.
function addLights(g, lights, ox, oy) {
  const gl = g.gl;
  gl.bindFramebuffer(gl.FRAMEBUFFER, g.lightT.fb);
  gl.viewport(0, 0, VIEW_W, VIEW_H);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);
  bind(g, g.light, 'walls', 0, g.walls);
  gl.uniform2f(g.light.u('worldSize'), g.wallsSize[0], g.wallsSize[1]);
  gl.uniform2f(g.light.u('origin'), ox, oy);
  gl.uniform2f(g.light.u('view'), VIEW_W, VIEW_H);
  for (const l of lights) {
    const x = l.x + ox,
      y = l.y + oy;
    if (x + l.r < 0 || x - l.r > VIEW_W || y + l.r < 0 || y - l.r > VIEW_H || l.power <= 0.004) continue;
    const c = rgbOf(l.rgb);
    gl.uniform2f(g.light.u('pos'), x, y);
    gl.uniform1f(g.light.u('radius'), l.r);
    gl.uniform3f(g.light.u('color'), c[0], c[1], c[2]);
    gl.uniform1f(g.light.u('power'), l.power);
    gl.uniform1f(g.light.u('far'), l.far ? 1 : 0);
    gl.uniform1f(g.light.u('solid'), l.area ? 1 : 0);
    gl.uniform2f(g.light.u('dir'), Math.cos(l.dir || 0), Math.sin(l.dir || 0));
    gl.uniform1f(g.light.u('spread'), l.half === undefined ? 4 : l.half);
    draw(g, g.light);
  }
  gl.disable(gl.BLEND);
}

// The glow of what is bright, and the whole back onto the game's picture in place of what was there. `from` is
// how bright a point must be to glow, and `strength` how strongly it does.
function glowAndShow(g, ctx, W, H, from, strength) {
  const gl = g.gl;
  gl.bindFramebuffer(gl.FRAMEBUFFER, g.b1.fb);
  gl.viewport(0, 0, VIEW_W / 2, VIEW_H / 2);
  bind(g, g.bright, 'scene', 0, g.sceneT.tex);
  gl.uniform1f(g.bright.u('from'), from);
  draw(g, g.bright);
  for (let i = 0; i < 3; i++) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, g.b2.fb);
    bind(g, g.blur, 'src', 0, g.b1.tex);
    gl.uniform2f(g.blur.u('dir'), (1.5 + i) / (VIEW_W / 2), 0);
    draw(g, g.blur);
    gl.bindFramebuffer(gl.FRAMEBUFFER, g.b1.fb);
    bind(g, g.blur, 'src', 0, g.b2.tex);
    gl.uniform2f(g.blur.u('dir'), 0, (1.5 + i) / (VIEW_H / 2));
    draw(g, g.blur);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, W, H);
  bind(g, g.final, 'scene', 0, g.sceneT.tex);
  bind(g, g.final, 'bloom', 1, g.b1.tex);
  gl.uniform1f(g.final.u('strength'), strength);
  draw(g, g.final);
  if (gl.getError() !== gl.NO_ERROR) {
    broken = true;
    return false;
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'copy';
  ctx.drawImage(g.canvas, 0, 0);
  ctx.restore();
  return true;
}

// Lights what has been drawn of the place so far, in place of shade() in light.js. `ox`, `oy` are where the place
// is drawn on the screen. Returns false when it could not, and the light map is to be used instead.
export function shadeGL(ctx, it, ox, oy, lights) {
  const g = begin();
  if (!g) return false;
  const gl = g.gl;
  const { W, H } = takePicture(g, ctx);
  walls(g, it);
  addLights(g, lights, ox, oy);
  // The lit picture at the screen's size.
  gl.bindFramebuffer(gl.FRAMEBUFFER, g.sceneT.fb);
  gl.viewport(0, 0, W, H);
  bind(g, g.compose, 'albedo', 0, g.albedo);
  bind(g, g.compose, 'lights', 1, g.lightT.tex);
  bind(g, g.compose, 'walls', 2, g.walls);
  gl.uniform2f(g.compose.u('worldSize'), g.wallsSize[0], g.wallsSize[1]);
  gl.uniform2f(g.compose.u('origin'), ox, oy);
  gl.uniform2f(g.compose.u('view'), VIEW_W, VIEW_H);
  gl.uniform3f(g.compose.u('ambient'), AMBIENT[0], AMBIENT[1], AMBIENT[2]);
  draw(g, g.compose);
  return glowAndShow(g, ctx, W, H, 0.45, 1.6);
}

// Lights space as it has been drawn so far (F-295), in place of the old light in space.js. The lights are where
// they are on the screen. Returns false when it could not, and the old light is to be used instead.
export function lightSpaceGL(ctx, lights) {
  const g = begin();
  if (!g) return false;
  const gl = g.gl;
  const { W, H } = takePicture(g, ctx);
  addLights(g, lights, 0, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, g.sceneT.fb);
  gl.viewport(0, 0, W, H);
  bind(g, g.space, 'albedo', 0, g.albedo);
  bind(g, g.space, 'lights', 1, g.lightT.tex);
  draw(g, g.space);
  return glowAndShow(g, ctx, W, H, 0.35, 1.7);
}
