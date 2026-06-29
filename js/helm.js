// =========================================================================
// Helm 3D — a tiny low-poly sailing game built on Three.js (CDN, pinned).
// No addons, no external models. Chase cam written by hand.
// Palette matches the shared nautical-chart tokens.
// =========================================================================

import * as THREE from 'three';

// ---- palette (mirrors css vars) ----
const COL = {
  seaDeep:   0x0a3147,
  sea:       0x14618f,
  seaMid:    0x2b86b8,
  seaShallow:0x8ecadd,
  seaFoam:   0xd7f0f6,
  parchment: 0xf4ead0,
  land:      0xefe3c0,
  ink:       0x1d3b4d,
  red:       0xd6453d,
  green:     0x2f9e57,
  rope:      0xc9a86a,
  gold:      0xe7b54b,
  hull:      0xb5532e,
  deck:      0xe2d3a8,
  sail:      0xf4ead0,
};

// ---- the four legs (East Greenwich is the start; each leg names where you're going) ----
const LEGS = [
  { dest: 'Newport',        sub: 'Welcome to Newport. Mansions, mooring balls, and a beer.' },
  { dest: 'Cuttyhunk',      sub: 'Welcome to Cuttyhunk. Population: us, plus oysters.' },
  { dest: 'Vineyard Haven', sub: "Welcome to the Vineyard. You actually made it." },
  { dest: 'home',           sub: 'Back in East Greenwich. The trip is logged. Crew dismissed.' },
];

// ---- DOM ----
const canvas   = document.getElementById('helm-canvas');
const stage    = document.getElementById('stage');
const elDest   = document.getElementById('hud-dest');
const elHead   = document.getElementById('hud-head');
const elSpeed  = document.getElementById('hud-speed');
const elDist   = document.getElementById('hud-dist');
const windArrow= document.getElementById('wind-arrow');
const overlay  = document.getElementById('overlay');
const winPanel = document.getElementById('win');
const winTitle = document.getElementById('win-title');
const winSub   = document.getElementById('win-sub');

// =========================================================================
// Renderer / scene / camera
// =========================================================================
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(COL.seaShallow);
scene.fog = new THREE.Fog(COL.seaShallow, 90, 240);

const camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 600);
camera.position.set(0, 14, -22);

// ---- lights ----
scene.add(new THREE.HemisphereLight(0xffffff, COL.sea, 0.95));
const sun = new THREE.DirectionalLight(0xfff3d6, 0.9);
sun.position.set(40, 60, 20);
scene.add(sun);

// =========================================================================
// Water — a segmented plane with a cheap vertex-wave displacement
// =========================================================================
const WATER_SIZE = 600;
const WATER_SEG = 80;
const waterGeo = new THREE.PlaneGeometry(WATER_SIZE, WATER_SIZE, WATER_SEG, WATER_SEG);
waterGeo.rotateX(-Math.PI / 2);
const waterMat = new THREE.MeshPhongMaterial({
  color: COL.sea,
  shininess: 60,
  specular: 0x9fd8ec,
  flatShading: true,
  transparent: false,
});
const water = new THREE.Mesh(waterGeo, waterMat);
scene.add(water);

// store base positions so waves are deterministic
const waterBase = waterGeo.attributes.position.array.slice();

function animateWater(t) {
  const pos = waterGeo.attributes.position;
  const arr = pos.array;
  for (let i = 0; i < arr.length; i += 3) {
    const x = waterBase[i];
    const z = waterBase[i + 2];
    arr[i + 1] =
      Math.sin(x * 0.05 + t * 1.1) * 0.7 +
      Math.cos(z * 0.07 + t * 0.9) * 0.6 +
      Math.sin((x + z) * 0.03 + t * 0.6) * 0.4;
  }
  pos.needsUpdate = true;
  waterGeo.computeVertexNormals();
}

// =========================================================================
// The boat — built from primitives, grouped so we can move/turn it as one.
// Local +Z is "forward" (bow).
// =========================================================================
function buildBoat() {
  const g = new THREE.Group();

  // hull — a tapered box-ish shape
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 1.1, 6),
    new THREE.MeshPhongMaterial({ color: COL.hull, flatShading: true })
  );
  hull.position.y = 0.35;
  g.add(hull);

  // bow wedge (pointy front)
  const bow = new THREE.Mesh(
    new THREE.ConeGeometry(1.2, 2.2, 4),
    new THREE.MeshPhongMaterial({ color: COL.hull, flatShading: true })
  );
  bow.rotation.x = Math.PI / 2;
  bow.rotation.y = Math.PI / 4;
  bow.scale.set(1, 0.9, 1);
  bow.position.set(0, 0.35, 3.6);
  g.add(bow);

  // deck
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.2, 5.4),
    new THREE.MeshPhongMaterial({ color: COL.deck, flatShading: true })
  );
  deck.position.y = 0.95;
  g.add(deck);

  // mast
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.14, 7, 8),
    new THREE.MeshPhongMaterial({ color: COL.rope, flatShading: true })
  );
  mast.position.set(0, 4.3, 0.4);
  g.add(mast);

  // mainsail — a triangle (plane with shaped geometry)
  const sailGeo = new THREE.BufferGeometry();
  sailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    0, 0.2, 0.4,    // tack (bottom front, at mast base)
    0, 7.2, 0.4,    // head (top of mast)
    0, 0.4, -3.2,   // clew (bottom back)
  ]), 3));
  sailGeo.computeVertexNormals();
  const sailMat = new THREE.MeshPhongMaterial({
    color: COL.sail, side: THREE.DoubleSide, flatShading: true,
  });
  const mainsail = new THREE.Mesh(sailGeo, sailMat);
  g.add(mainsail);

  // jib — smaller triangle forward
  const jibGeo = new THREE.BufferGeometry();
  jibGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    0, 0.4, 0.6,
    0, 5.6, 0.6,
    0, 0.4, 3.4,
  ]), 3));
  jibGeo.computeVertexNormals();
  const jib = new THREE.Mesh(jibGeo, new THREE.MeshPhongMaterial({
    color: 0xe9dcb8, side: THREE.DoubleSide, flatShading: true,
  }));
  g.add(jib);

  // a tiny gold flag at the masthead so heading is readable
  const flag = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.4, 0.05),
    new THREE.MeshPhongMaterial({ color: COL.gold, flatShading: true })
  );
  flag.position.set(0.45, 7.2, 0.4);
  g.add(flag);

  return g;
}
const boat = buildBoat();
scene.add(boat);

// =========================================================================
// Course objects: buoys, dock, obstacles — rebuilt per leg.
// The channel runs along +Z toward a dock at a fixed distance.
// =========================================================================
const courseGroup = new THREE.Group();
scene.add(courseGroup);

const DOCK_Z = 200;            // distance to the dock down the channel
let dockZone = new THREE.Vector3(0, 0, DOCK_Z);
let obstacles = [];            // {pos:Vector3, r:number}

function makeBuoy(color) {
  const grp = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.ConeGeometry(1.1, 2.4, 10),
    new THREE.MeshPhongMaterial({ color, flatShading: true })
  );
  body.position.y = 1.2;
  grp.add(body);
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 10, 8),
    new THREE.MeshPhongMaterial({ color, flatShading: true })
  );
  ball.position.y = 2.7;
  grp.add(ball);
  grp.userData.bob = Math.random() * Math.PI * 2;
  return grp;
}

function makeRock() {
  const m = new THREE.Mesh(
    new THREE.DodecahedronGeometry(2.2, 0),
    new THREE.MeshPhongMaterial({ color: 0x6b5b43, flatShading: true })
  );
  m.position.y = 0.6;
  m.rotation.set(Math.random(), Math.random(), Math.random());
  return m;
}

function makeMooredBoat() {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(2, 0.9, 5),
    new THREE.MeshPhongMaterial({ color: 0x3a6e8c, flatShading: true })
  );
  hull.position.y = 0.4;
  g.add(hull);
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.12, 5, 6),
    new THREE.MeshPhongMaterial({ color: COL.rope, flatShading: true })
  );
  mast.position.y = 2.8;
  g.add(mast);
  return g;
}

function buildCourse(legIndex) {
  // clear
  while (courseGroup.children.length) courseGroup.remove(courseGroup.children[0]);
  obstacles = [];

  // channel buoys: red on +X (starboard going out), green on -X
  const pairs = 6;
  const channelHalf = 9;
  for (let i = 1; i <= pairs; i++) {
    const z = (DOCK_Z / (pairs + 1)) * i;
    // gentle S-curve to the channel so it isn't a straight gimme
    const bend = Math.sin((i / pairs) * Math.PI) * (legIndex % 2 === 0 ? 8 : -8);

    const red = makeBuoy(COL.red);
    red.position.set(bend + channelHalf, 0, z);
    courseGroup.add(red);

    const green = makeBuoy(COL.green);
    green.position.set(bend - channelHalf, 0, z);
    courseGroup.add(green);
  }

  // dock marker at the end
  dockZone = new THREE.Vector3(
    Math.sin(Math.PI) * 0, 0, DOCK_Z
  );
  // recompute dock x to sit on the channel centerline at the end (~0 since sin(pi)=0)
  dockZone.x = 0;

  const dockPlatform = new THREE.Mesh(
    new THREE.BoxGeometry(16, 0.6, 6),
    new THREE.MeshPhongMaterial({ color: COL.land, flatShading: true })
  );
  dockPlatform.position.set(dockZone.x, 0.4, dockZone.z + 2);
  courseGroup.add(dockPlatform);

  // pier posts
  for (let i = -1; i <= 1; i++) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, 2.4, 6),
      new THREE.MeshPhongMaterial({ color: COL.rope, flatShading: true })
    );
    post.position.set(dockZone.x + i * 5, 1, dockZone.z - 1.5);
    courseGroup.add(post);
  }

  // dock flag / gateway markers (gold poles)
  for (const sx of [-7, 7]) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 6, 6),
      new THREE.MeshPhongMaterial({ color: COL.gold, flatShading: true })
    );
    pole.position.set(dockZone.x + sx, 3, dockZone.z);
    courseGroup.add(pole);
  }

  // obstacles: a couple of rocks + one moored boat, off-center but in the lane
  const obstSpecs = [
    { kind: 'rock', x: 4,  z: 70,  r: 3 },
    { kind: 'rock', x: -5, z: 130, r: 3 },
    { kind: 'boat', x: 3,  z: 160, r: 3.5 },
  ];
  for (const s of obstSpecs) {
    const m = s.kind === 'rock' ? makeRock() : makeMooredBoat();
    m.position.x = s.x; m.position.z = s.z;
    courseGroup.add(m);
    obstacles.push({ pos: new THREE.Vector3(s.x, 0, s.z), r: s.r });
  }
}

// =========================================================================
// Game state
// =========================================================================
const state = {
  legIndex: 0,
  heading: 0,        // radians; 0 = +Z (toward dock)
  speed: 0,          // world units / sec
  throttle: 0,       // 0..1 target
  pos: new THREE.Vector3(0, 0, 0),
  running: false,
  won: false,
  windDir: 0,        // radians, direction wind blows TOWARD (world)
};

const MAX_SPEED = 26;
const ACCEL = 14;
const DRAG = 0.9;
const TURN_RATE = 1.5; // rad/sec at speed

function resetLeg() {
  state.heading = 0;
  state.speed = 0;
  state.throttle = 0;
  state.pos.set(0, 0, 0);
  state.won = false;
  // wind: random-ish but stable per leg, leans toward a quartering breeze
  state.windDir = (Math.random() * 0.8 - 0.4) + Math.PI * 0.25 * (state.legIndex % 2 ? 1 : -1);
  buildCourse(state.legIndex);
  elDest.textContent = LEGS[state.legIndex].dest;
  updateWindArrow();
  placeBoat();
  winPanel.classList.add('hidden');
}

function placeBoat() {
  boat.position.copy(state.pos);
  boat.position.y = 0;
  boat.rotation.y = state.heading;
}

// =========================================================================
// Input — keyboard + touch
// =========================================================================
const keys = { left: false, right: false, up: false, down: false };

window.addEventListener('keydown', (e) => {
  switch (e.key) {
    case 'ArrowLeft': case 'a': case 'A': keys.left = true; break;
    case 'ArrowRight': case 'd': case 'D': keys.right = true; break;
    case 'ArrowUp': case 'w': case 'W': keys.up = true; break;
    case 'ArrowDown': case 's': case 'S': keys.down = true; break;
  }
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) e.preventDefault();
});
window.addEventListener('keyup', (e) => {
  switch (e.key) {
    case 'ArrowLeft': case 'a': case 'A': keys.left = false; break;
    case 'ArrowRight': case 'd': case 'D': keys.right = false; break;
    case 'ArrowUp': case 'w': case 'W': keys.up = false; break;
    case 'ArrowDown': case 's': case 'S': keys.down = false; break;
  }
});

function bindTouch(id, key) {
  const el = document.getElementById(id);
  const on  = (e) => { e.preventDefault(); keys[key] = true; };
  const off = (e) => { e.preventDefault(); keys[key] = false; };
  el.addEventListener('touchstart', on, { passive: false });
  el.addEventListener('touchend', off, { passive: false });
  el.addEventListener('touchcancel', off, { passive: false });
  el.addEventListener('mousedown', on);
  el.addEventListener('mouseup', off);
  el.addEventListener('mouseleave', off);
}
bindTouch('t-left', 'left');
bindTouch('t-right', 'right');
bindTouch('t-up', 'up');
bindTouch('t-down', 'down');

document.getElementById('restart').addEventListener('click', () => resetLeg());

document.getElementById('start-btn').addEventListener('click', () => {
  overlay.classList.add('hidden');
  state.running = true;
});

document.getElementById('next-leg').addEventListener('click', () => {
  state.legIndex = (state.legIndex + 1) % LEGS.length;
  resetLeg();
  state.running = true;
});

// =========================================================================
// HUD helpers
// =========================================================================
const COMPASS = ['N','NE','E','SE','S','SW','W','NW'];
function headingLabel(rad) {
  // heading 0 = +Z. Map to compass; +Z = N (toward dock).
  let deg = (rad * 180 / Math.PI) % 360;
  if (deg < 0) deg += 360;
  const idx = Math.round(deg / 45) % 8;
  return COMPASS[idx];
}
function updateWindArrow() {
  // arrow points the direction the wind blows toward, relative to N(+Z up screen)
  const deg = state.windDir * 180 / Math.PI;
  windArrow.style.transform = `translate(-50%, -100%) rotate(${deg}deg)`;
}

// =========================================================================
// Win check
// =========================================================================
function checkWin() {
  const d = Math.hypot(state.pos.x - dockZone.x, state.pos.z - dockZone.z);
  if (d < 10 && !state.won) {
    state.won = true;
    state.running = false;
    const leg = LEGS[state.legIndex];
    winTitle.textContent = leg.dest === 'home' ? 'Home Port!' : `Docked at ${leg.dest}!`;
    winSub.textContent = leg.sub;
    winPanel.classList.remove('hidden');
  }
}

// =========================================================================
// Main loop
// =========================================================================
const clock = new THREE.Clock();

function step(dt) {
  // throttle
  if (keys.up)   state.throttle = Math.min(1, state.throttle + dt * 1.5);
  if (keys.down) state.throttle = Math.max(0, state.throttle - dt * 1.5);
  if (!keys.up && !keys.down) {
    // ease throttle gently back down
    state.throttle = Math.max(0, state.throttle - dt * 0.25);
  }

  // wind effect: compare boat heading vs wind direction. Following wind = faster.
  const fwd = new THREE.Vector2(Math.sin(state.heading), Math.cos(state.heading));
  const wind = new THREE.Vector2(Math.sin(state.windDir), Math.cos(state.windDir));
  const align = fwd.dot(wind);                 // -1 (into) .. 1 (following)
  const windFactor = 0.75 + 0.35 * align;      // 0.40 .. 1.10

  // target speed from throttle + wind
  const target = state.throttle * MAX_SPEED * windFactor;
  if (state.speed < target) state.speed += ACCEL * dt;
  else state.speed -= ACCEL * DRAG * dt;
  state.speed = Math.max(0, Math.min(MAX_SPEED * 1.15, state.speed));

  // steering — only effective with some way on
  const steerAuth = Math.min(1, state.speed / 6 + 0.15);
  if (keys.left)  state.heading += TURN_RATE * steerAuth * dt;
  if (keys.right) state.heading -= TURN_RATE * steerAuth * dt;

  // advance position
  state.pos.x += Math.sin(state.heading) * state.speed * dt;
  state.pos.z += Math.cos(state.heading) * state.speed * dt;

  // obstacle collision — forgiving nudge + speed bleed
  for (const o of obstacles) {
    const dx = state.pos.x - o.pos.x;
    const dz = state.pos.z - o.pos.z;
    const dist = Math.hypot(dx, dz);
    const minD = o.r + 1.6;
    if (dist < minD) {
      const nx = dx / (dist || 1);
      const nz = dz / (dist || 1);
      state.pos.x = o.pos.x + nx * minD;
      state.pos.z = o.pos.z + nz * minD;
      state.speed *= 0.45;        // bleed off speed, don't stop dead
    }
  }

  // keep player in a sane box
  state.pos.x = Math.max(-60, Math.min(60, state.pos.x));
  state.pos.z = Math.max(-30, Math.min(DOCK_Z + 20, state.pos.z));

  placeBoat();
  checkWin();
}

function updateCamera() {
  // chase cam: behind and above the boat, looking ahead of it
  const back = 22, up = 12, ahead = 12;
  const camX = state.pos.x - Math.sin(state.heading) * back;
  const camZ = state.pos.z - Math.cos(state.heading) * back;
  camera.position.lerp(new THREE.Vector3(camX, up, camZ), 0.08);
  const look = new THREE.Vector3(
    state.pos.x + Math.sin(state.heading) * ahead,
    1.5,
    state.pos.z + Math.cos(state.heading) * ahead
  );
  camera.lookAt(look);
}

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05); // clamp big frame gaps
  const t = clock.elapsedTime;

  animateWater(t);

  // bob the buoys
  for (const c of courseGroup.children) {
    if (c.userData && c.userData.bob !== undefined) {
      c.position.y = Math.sin(t * 1.6 + c.userData.bob) * 0.25;
    }
  }

  if (state.running) step(dt);

  // gentle boat bob even when idle
  boat.position.y = Math.sin(t * 1.4) * 0.18;
  boat.rotation.z = Math.sin(t * 1.1) * 0.03 + (keys.left ? 0.12 : keys.right ? -0.12 : 0) * 0.6;

  updateCamera();

  // HUD
  elHead.textContent = headingLabel(state.heading);
  elSpeed.textContent = (state.speed * 0.35).toFixed(1) + ' kn';
  const toGo = Math.max(0, Math.hypot(state.pos.x - dockZone.x, state.pos.z - dockZone.z));
  elDist.textContent = toGo > 9999 ? '--' : Math.round(toGo) + ' m';

  renderer.render(scene, camera);
}

// =========================================================================
// Resize — keep renderer + camera matched to the stage box (16:9)
// =========================================================================
function resize() {
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  if (w === 0 || h === 0) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

// =========================================================================
// Boot
// =========================================================================
resetLeg();
resize();
tick();
