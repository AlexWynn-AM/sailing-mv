/* =========================================================================
   Sailing Summer MV  —  ARCADE
   Three retro-pixel canvas mini-games on one shared canvas.
   Vanilla JS, no libraries.  Desktop (keyboard) + touch (buttons/drag).
   NO EMOJI anywhere.

   Games:
     1  Dinghy Row     — drive the dinghy to the moored boat, dodge pots, beat the current.
     2  Catch Pennant  — time the GRAB when the mooring pennant is in the reach zone.
     3  Trim Sail      — match sail angle to the wind, build power, cross the finish line.
   ========================================================================= */

(function () {
  'use strict';

  /* ---------- palette (mirrors chart.css tokens) ---------- */
  var C = {
    seaDeep:  '#0a3147',
    sea:      '#14618f',
    seaMid:   '#2b86b8',
    seaShal:  '#8ecadd',
    seaFoam:  '#d7f0f6',
    parch:    '#f4ead0',
    parch2:   '#ece0bf',
    ink:      '#1d3b4d',
    red:      '#d6453d',
    green:    '#2f9e57',
    rope:     '#c9a86a',
    ropeDark: '#a9854a',
    route:    '#2fdc5a',
    gold:     '#e7b54b',
    hull:     '#7a4a22',
    hullDark: '#4a2c12',
    white:    '#ffffff'
  };

  /* ---------- canvas / DPR setup ---------- */
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var BASE_W = 860, BASE_H = 540;   // logical drawing units
  var dpr = 1;

  function resizeCanvas() {
    dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));
    // CSS width is fluid (100%); read it back to compute the device pixel size.
    var cssW = canvas.clientWidth || BASE_W;
    var cssH = cssW * (BASE_H / BASE_W);
    canvas.style.height = cssH + 'px';
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    // We draw in BASE_W x BASE_H logical units; scale to fill.
    var sx = canvas.width / BASE_W;
    var sy = canvas.height / BASE_H;
    ctx.setTransform(sx, 0, 0, sy, 0, 0);
  }
  window.addEventListener('resize', resizeCanvas);

  /* ---------- HUD + controls handles ---------- */
  var hudGame  = document.getElementById('hudGame');
  var hudScore = document.getElementById('hudScore');
  var hudTime  = document.getElementById('hudTime');
  var ctlDpad  = document.getElementById('ctlDpad');
  var ctlGrab  = document.getElementById('ctlGrab');
  var ctlTrim  = document.getElementById('ctlTrim');
  var selBtns  = Array.prototype.slice.call(document.querySelectorAll('.sel-btn'));

  function setHUD(game, score, time) {
    hudGame.textContent = game;
    hudScore.textContent = score;
    hudTime.textContent = time;
  }
  function showControls(which) {
    ctlDpad.hidden = which !== 'dpad';
    ctlGrab.hidden = which !== 'grab';
    ctlTrim.hidden = which !== 'trim';
  }

  /* ---------- shared input ---------- */
  var keys = {};
  window.addEventListener('keydown', function (e) {
    var k = e.key.toLowerCase();
    keys[k] = true;
    // prevent page scroll on arrows/space while playing a game
    if (current && current !== menu &&
        (['arrowup','arrowdown','arrowleft','arrowright',' '].indexOf(k) >= 0)) {
      e.preventDefault();
    }
    if (k === ' ') keys['space'] = true;
  }, { passive: false });
  window.addEventListener('keyup', function (e) {
    var k = e.key.toLowerCase();
    keys[k] = false;
    if (k === ' ') keys['space'] = false;
  });

  // Pointer state on canvas (drag-to-move for game 1, tap to advance screens)
  var pointer = { down: false, x: 0, y: 0, justTapped: false };
  function canvasPoint(evt) {
    var r = canvas.getBoundingClientRect();
    var px = (evt.touches ? evt.touches[0].clientX : evt.clientX) - r.left;
    var py = (evt.touches ? evt.touches[0].clientY : evt.clientY) - r.top;
    return { x: px * (BASE_W / r.width), y: py * (BASE_H / r.height) };
  }
  function onDown(evt) {
    var p = canvasPoint(evt);
    pointer.down = true; pointer.x = p.x; pointer.y = p.y; pointer.justTapped = true;
  }
  function onMove(evt) {
    if (!pointer.down) return;
    var p = canvasPoint(evt);
    pointer.x = p.x; pointer.y = p.y;
  }
  function onUp() { pointer.down = false; }
  canvas.addEventListener('mousedown', onDown);
  canvas.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  canvas.addEventListener('touchstart', function (e) { e.preventDefault(); onDown(e); }, { passive: false });
  canvas.addEventListener('touchmove',  function (e) { e.preventDefault(); onMove(e); }, { passive: false });
  canvas.addEventListener('touchend',   function (e) { e.preventDefault(); onUp(e); }, { passive: false });

  // virtual d-pad buttons -> dpadState
  var dpadState = { up: false, down: false, left: false, right: false };
  Array.prototype.forEach.call(document.querySelectorAll('.dpad .pad'), function (btn) {
    var dir = btn.getAttribute('data-dir');
    var press = function (e) { e.preventDefault(); dpadState[dir] = true; };
    var rel   = function (e) { e.preventDefault(); dpadState[dir] = false; };
    btn.addEventListener('mousedown', press);
    btn.addEventListener('mouseup', rel);
    btn.addEventListener('mouseleave', rel);
    btn.addEventListener('touchstart', press, { passive: false });
    btn.addEventListener('touchend', rel, { passive: false });
    btn.addEventListener('touchcancel', rel, { passive: false });
  });

  // grab button (game 2) -> one-shot flag
  var grabPressed = false;
  var grabBtn = document.getElementById('grabBtn');
  function fireGrab(e) { if (e) e.preventDefault(); grabPressed = true; }
  grabBtn.addEventListener('mousedown', fireGrab);
  grabBtn.addEventListener('touchstart', fireGrab, { passive: false });

  // trim buttons (game 3) -> held flags
  var trimState = { left: false, right: false };
  (function () {
    var tl = document.getElementById('trimLeft');
    var tr = document.getElementById('trimRight');
    function bind(el, key) {
      var on  = function (e) { e.preventDefault(); trimState[key] = true; };
      var off = function (e) { e.preventDefault(); trimState[key] = false; };
      el.addEventListener('mousedown', on); el.addEventListener('mouseup', off);
      el.addEventListener('mouseleave', off);
      el.addEventListener('touchstart', on, { passive: false });
      el.addEventListener('touchend', off, { passive: false });
      el.addEventListener('touchcancel', off, { passive: false });
    }
    bind(tl, 'left'); bind(tr, 'right');
  })();

  /* ---------- tiny draw helpers ---------- */
  function rect(x, y, w, h, fill) { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); }
  function circle(x, y, r, fill, stroke, sw) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = sw || 2; ctx.stroke(); }
  }
  function pixText(str, x, y, size, color, align) {
    ctx.fillStyle = color || C.white;
    ctx.font = size + "px 'Press Start 2P', monospace";
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(str, x, y);
  }
  function bodyText(str, x, y, size, color, align) {
    ctx.fillStyle = color || C.ink;
    ctx.font = size + "px 'Bitter', Georgia, serif";
    ctx.textAlign = align || 'left';
    ctx.fillText(str, x, y);
  }
  // word wrap for body text, returns next y
  function wrapText(str, x, y, maxW, lh, size, color, align) {
    ctx.font = size + "px 'Bitter', Georgia, serif";
    ctx.fillStyle = color; ctx.textAlign = align || 'center';
    var words = str.split(' '), line = '', yy = y;
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, yy); line = words[i]; yy += lh;
      } else line = test;
    }
    ctx.fillText(line, x, yy);
    return yy + lh;
  }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  // animated water background (scrolling foam dashes)
  var waterPhase = 0;
  function drawWater(top) {
    top = top || 0;
    var grd = ctx.createLinearGradient(0, top, 0, BASE_H);
    grd.addColorStop(0, C.sea);
    grd.addColorStop(1, C.seaDeep);
    ctx.fillStyle = grd;
    ctx.fillRect(0, top, BASE_W, BASE_H - top);
    ctx.strokeStyle = '#ffffff22';
    ctx.lineWidth = 3;
    for (var row = top + 40; row < BASE_H; row += 46) {
      var off = (waterPhase + row) % 92;
      for (var x = -92 + off; x < BASE_W; x += 92) {
        ctx.beginPath();
        ctx.moveTo(x, row);
        ctx.quadraticCurveTo(x + 12, row - 8, x + 24, row);
        ctx.stroke();
      }
    }
  }

  // draw a small pixel sailboat (top-down) centered at x,y, facing heading (rad)
  function drawBoatTop(x, y, scale, headingRad, sailColor) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(headingRad);
    ctx.scale(scale, scale);
    // hull
    ctx.fillStyle = C.hull; ctx.strokeStyle = C.hullDark; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.quadraticCurveTo(12, -6, 11, 14);
    ctx.lineTo(-11, 14);
    ctx.quadraticCurveTo(-12, -6, 0, -20);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // deck
    rect(-6, -2, 12, 12, C.parch2);
    // sail
    ctx.fillStyle = sailColor || C.white; ctx.strokeStyle = '#9bb6c2'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -16); ctx.lineTo(9, 4); ctx.lineTo(0, 4); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  /* =====================================================================
     GAME FRAMEWORK
     Each game implements: init(), update(dt), draw(), and uses STATE flags
     READY -> PLAY -> WIN/RETRY.  A shared overlay handles start/win screens.
     ===================================================================== */

  var GS = { READY: 0, PLAY: 1, WIN: 2 };

  // ----- overlay helper (start + win screens drawn over the game) -----
  function drawPanel(x, y, w, h) {
    ctx.fillStyle = '#04161fdd';
    ctx.fillRect(0, 0, BASE_W, BASE_H);
    ctx.fillStyle = C.parch;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 4;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    // rope trim
    ctx.strokeStyle = C.rope; ctx.lineWidth = 2;
    ctx.strokeRect(x + 7, y + 7, w - 14, h - 14);
  }

  // A reusable "button" drawn on canvas; tap to fire. Returns true if tapped this frame.
  function canvasButton(label, cx, cy, w, h, bg) {
    var x = cx - w / 2, y = cy - h / 2;
    rect(x, y, w, h, bg || C.sea);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h);
    pixText(label, cx, cy + 5, 11, bg === C.gold ? '#04161f' : C.white, 'center');
    var hit = false;
    if (pointer.justTapped &&
        pointer.x >= x && pointer.x <= x + w &&
        pointer.y >= y && pointer.y <= y + h) {
      hit = true;
    }
    return hit;
  }

  /* =====================================================================
     GAME 1 — DINGHY ROW
     ===================================================================== */
  var G1 = {
    name: '1  DINGHY ROW',
    controls: 'dpad',
    state: GS.READY,
    dinghy: null, target: null, pots: [], current: { x: 0, y: 0 },
    time: 0, hits: 0, started: 0,

    init: function () {
      this.state = GS.READY;
      this.dinghy = { x: 70, y: BASE_H / 2, vx: 0, vy: 0, r: 14 };
      this.target = { x: BASE_W - 90, y: 150, r: 26 };
      this.time = 0; this.hits = 0;
      // drifting current: pushes generally down-left ("set & drift")
      this.current = { x: -14, y: 26 };
      // floating lobster pots (red/green) with slow bob
      this.pots = [];
      var n = 7;
      for (var i = 0; i < n; i++) {
        this.pots.push({
          x: 180 + Math.random() * (BASE_W - 320),
          y: 60 + Math.random() * (BASE_H - 120),
          r: 12,
          color: i % 2 ? C.green : C.red,
          phase: Math.random() * Math.PI * 2,
          cooldown: 0
        });
      }
    },

    update: function (dt) {
      waterPhase += dt * 22;
      if (this.state === GS.READY) {
        if (anyMoveInput() || pointer.justTapped) { this.state = GS.PLAY; this.started = 0; }
        return;
      }
      if (this.state === GS.WIN) return;

      this.time += dt;

      // ---- input -> acceleration ----
      var ax = 0, ay = 0, acc = 220;
      if (keys['arrowup'] || keys['w'] || dpadState.up) ay -= 1;
      if (keys['arrowdown'] || keys['s'] || dpadState.down) ay += 1;
      if (keys['arrowleft'] || keys['a'] || dpadState.left) ax -= 1;
      if (keys['arrowright'] || keys['d'] || dpadState.right) ax += 1;
      // drag-to-move: steer toward pointer when pressed on screen
      if (pointer.down) {
        var ddx = pointer.x - this.dinghy.x, ddy = pointer.y - this.dinghy.y;
        var dl = Math.hypot(ddx, ddy);
        if (dl > 6) { ax += ddx / dl; ay += ddy / dl; }
      }
      var al = Math.hypot(ax, ay);
      if (al > 0) { ax /= al; ay /= al; }

      var d = this.dinghy;
      d.vx += (ax * acc + this.current.x) * dt;
      d.vy += (ay * acc + this.current.y) * dt;
      // drag
      d.vx *= 0.92; d.vy *= 0.92;
      d.x += d.vx * dt; d.y += d.vy * dt;
      // bounds
      d.x = clamp(d.x, d.r, BASE_W - d.r);
      d.y = clamp(d.y, d.r, BASE_H - d.r);

      // pots bob
      for (var i = 0; i < this.pots.length; i++) {
        var p = this.pots[i];
        p.phase += dt * 1.5;
        if (p.cooldown > 0) p.cooldown -= dt;
        var px = p.x + Math.sin(p.phase) * 6;
        var py = p.y + Math.cos(p.phase * 0.8) * 6;
        if (p.cooldown <= 0) {
          var dist = Math.hypot(d.x - px, d.y - py);
          if (dist < d.r + p.r) {
            // hit: time penalty + bounce
            this.time += 3; this.hits++;
            p.cooldown = 1.2;
            var nx = (d.x - px) / (dist || 1), ny = (d.y - py) / (dist || 1);
            d.vx = nx * 140; d.vy = ny * 140;
          }
        }
      }

      // reached the boat?
      var tg = this.target;
      if (Math.hypot(d.x - tg.x, d.y - tg.y) < tg.r + d.r) {
        this.state = GS.WIN;
      }
    },

    draw: function () {
      drawWater(0);

      // dock (left) — wooden planks
      rect(0, BASE_H / 2 - 50, 46, 100, C.hull);
      ctx.strokeStyle = C.hullDark; ctx.lineWidth = 2;
      for (var yy = BASE_H / 2 - 50; yy < BASE_H / 2 + 50; yy += 14) {
        ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(46, yy); ctx.stroke();
      }
      pixText('DOCK', 4, BASE_H / 2 + 4, 8, C.parch, 'left');

      // current arrows
      ctx.save();
      ctx.globalAlpha = 0.5;
      var ang = Math.atan2(this.current.y, this.current.x);
      for (var gx = 120; gx < BASE_W - 80; gx += 150) {
        for (var gy = 90; gy < BASE_H - 40; gy += 150) {
          drawArrow(gx, gy, ang, 26, C.seaFoam);
        }
      }
      ctx.restore();

      // target moored sailboat (with mooring ball + ring)
      var tg = this.target;
      circle(tg.x, tg.y, tg.r + 18, '#2fdc5a22');           // halo
      drawBoatTop(tg.x, tg.y, 1.5, Math.PI * 0.05, C.white);
      circle(tg.x, tg.y + 40, 7, C.gold, C.ink, 2);          // mooring ball
      pixText('REACH', tg.x, tg.y - 44, 8, C.route, 'center');

      // pots
      for (var i = 0; i < this.pots.length; i++) {
        var p = this.pots[i];
        var px = p.x + Math.sin(p.phase) * 6;
        var py = p.y + Math.cos(p.phase * 0.8) * 6;
        circle(px, py, p.r, p.color, C.ink, 2);
        rect(px - 1, py - p.r - 6, 2, 6, C.ink);             // little stick
        circle(px, py - p.r - 7, 2.5, C.parch, C.ink, 1);    // flag dot
      }

      // dinghy (small rowboat) — heading from velocity
      var d = this.dinghy;
      var h = (Math.abs(d.vx) + Math.abs(d.vy) > 6) ? Math.atan2(d.vy, d.vx) + Math.PI / 2 : 0;
      ctx.save();
      ctx.translate(d.x, d.y); ctx.rotate(h);
      ctx.fillStyle = C.hull; ctx.strokeStyle = C.hullDark; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -d.r); ctx.lineTo(d.r - 2, d.r); ctx.lineTo(-(d.r - 2), d.r); ctx.closePath();
      ctx.fill(); ctx.stroke();
      rect(-5, -2, 10, 7, C.parch2);                          // seat
      ctx.restore();

      // HUD on screen
      setHUD(this.name, 'HITS ' + this.hits, 'TIME ' + this.time.toFixed(1));

      if (this.state === GS.READY) {
        drawPanel(150, 150, 560, 240);
        pixText('DINGHY ROW', BASE_W / 2, 210, 18, C.sea, 'center');
        wrapText('Drive the dinghy from the dock to the moored sailboat. The current pushes you down and left, so aim UP-current of the boat. Dodge the lobster pots (red & green) — each bump costs 3 seconds.',
          BASE_W / 2, 250, 480, 22, 13, C.ink, 'center');
        pixText('Arrows / WASD / drag', BASE_W / 2, 345, 9, C.ropeDark, 'center');
        if (canvasButton('START', BASE_W / 2, 372, 150, 34, C.gold)) this.state = GS.PLAY;
      } else if (this.state === GS.WIN) {
        winScreen('YOU MADE IT', this.name,
          'Lesson: current never sleeps. Aim up-current of your target so the set carries you onto it, not past it.',
          'HITS ' + this.hits + '   TIME ' + this.time.toFixed(1) + 's', 1);
      }
    }
  };

  /* =====================================================================
     GAME 2 — CATCH THE PENNANT (timing grab)
     ===================================================================== */
  var G2 = {
    name: '2  CATCH PENNANT',
    controls: 'grab',
    state: GS.READY,
    grabs: 0, need: 3, misses: 0,
    barT: 0, dir: 1, speed: 1.0,
    feedback: '', fbTimer: 0,
    boatX: 0, drift: 0,

    init: function () {
      this.state = GS.READY;
      this.grabs = 0; this.misses = 0;
      this.barT = 0; this.dir = 1; this.speed = 0.9;
      this.feedback = ''; this.fbTimer = 0;
      this.boatX = 120; this.drift = 18;
    },

    // reach zone is centered; width shrinks as you succeed (harder)
    zoneHalf: function () { return clamp(0.16 - this.grabs * 0.025, 0.07, 0.16); },

    update: function (dt) {
      waterPhase += dt * 18;
      if (this.state === GS.READY) {
        if (grabPressed || keys['space'] || pointer.justTapped) { this.state = GS.PLAY; grabPressed = false; }
        return;
      }
      if (this.state === GS.WIN) return;

      // moving timing marker bounces 0..1
      this.barT += this.dir * this.speed * dt;
      if (this.barT > 1) { this.barT = 1; this.dir = -1; }
      if (this.barT < 0) { this.barT = 0; this.dir = 1; }

      // boat drifts slowly toward the mooring on the right
      this.boatX += this.drift * dt;
      if (this.boatX > BASE_W - 230) this.boatX = BASE_W - 230;

      if (this.fbTimer > 0) this.fbTimer -= dt;

      // grab attempt
      if (grabPressed || keys['space']) {
        grabPressed = false; keys['space'] = false;
        var center = 0.5, half = this.zoneHalf();
        if (Math.abs(this.barT - center) <= half) {
          this.grabs++;
          this.feedback = 'GRABBED'; this.fbTimer = 0.9;
          this.speed += 0.25;                 // next one is faster
          this.boatX = 120 + this.grabs * 10; // reset approach a bit
          if (this.grabs >= this.need) this.state = GS.WIN;
        } else {
          this.misses++;
          this.feedback = (this.barT < center) ? 'TOO EARLY' : 'TOO LATE';
          this.fbTimer = 0.9;
          this.boatX = 120;                   // drifted past, come around again
        }
      }
    },

    draw: function () {
      drawWater(0);

      // mooring ball + pennant on the right
      var mx = BASE_W - 120, my = BASE_H / 2;
      // pennant line floating on the water
      ctx.strokeStyle = C.parch; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(mx, my);
      var pend = mx - 70;
      ctx.quadraticCurveTo(mx - 35, my - 10 + Math.sin(waterPhase * 0.1) * 4, pend, my + 6);
      ctx.stroke();
      circle(mx, my, 12, C.gold, C.ink, 2);                 // mooring ball
      pixText('M', mx, my + 4, 8, '#04161f', 'center');
      // pennant flag float
      circle(pend, my + 6, 6, C.red, C.ink, 2);

      // the boat with a boat hook reaching right
      var bx = this.boatX, by = BASE_H / 2;
      drawBoatTop(bx, by, 1.8, Math.PI / 2, C.white);       // facing right
      // boat hook
      ctx.strokeStyle = C.rope; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(bx + 18, by); ctx.lineTo(bx + 70, by - 4); ctx.stroke();
      circle(bx + 70, by - 4, 5, C.ink);                    // hook tip

      // ---- timing bar ----
      var barX = 180, bw = BASE_W - 360, bY = BASE_H - 70, bh = 26;
      rect(barX, bY, bw, bh, '#04161f');
      ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.strokeRect(barX, bY, bw, bh);
      // reach zone (green)
      var half = this.zoneHalf();
      var zx = barX + (0.5 - half) * bw, zw = (half * 2) * bw;
      rect(zx, bY, zw, bh, C.route);
      pixText('REACH ZONE', barX + bw / 2, bY - 10, 8, C.seaFoam, 'center');
      // marker
      var mxk = barX + this.barT * bw;
      rect(mxk - 3, bY - 8, 6, bh + 16, C.gold);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.strokeRect(mxk - 3, bY - 8, 6, bh + 16);

      // progress pips
      for (var i = 0; i < this.need; i++) {
        circle(barX + 14 + i * 28, bY - 34, 9, i < this.grabs ? C.route : '#ffffff33', C.ink, 2);
      }

      // feedback flash
      if (this.fbTimer > 0) {
        var col = this.feedback === 'GRABBED' ? C.route : C.red;
        pixText(this.feedback, BASE_W / 2, 120, 16, col, 'center');
      }

      setHUD(this.name, 'GRABS ' + this.grabs + '/' + this.need, 'MISS ' + this.misses);

      if (this.state === GS.READY) {
        drawPanel(150, 140, 560, 250);
        pixText('CATCH PENNANT', BASE_W / 2, 200, 16, C.sea, 'center');
        wrapText('Pick up the mooring. The marker slides back and forth — hit GRAB (or SPACE / tap) when it is inside the green REACH ZONE. Too early or too late and the boat drifts past. Land 3 clean grabs to make fast.',
          BASE_W / 2, 240, 480, 22, 13, C.ink, 'center');
        pixText('SPACE / GRAB / tap', BASE_W / 2, 345, 9, C.ropeDark, 'center');
        if (canvasButton('START', BASE_W / 2, 372, 150, 34, C.gold)) this.state = GS.PLAY;
      } else if (this.state === GS.WIN) {
        winScreen('MADE FAST', this.name,
          'Lesson: approach slow and grab at the right moment. Rushing the mooring just means you do it again — and the whole harbor is watching.',
          'GRABS ' + this.grabs + '   MISSES ' + this.misses, 2);
      }
    }
  };

  /* =====================================================================
     GAME 3 — TRIM THE SAIL
     ===================================================================== */
  var G3 = {
    name: '3  TRIM SAIL',
    controls: 'trim',
    state: GS.READY,
    windDeg: 0,          // direction wind blows FROM, 0 = from top
    sailDeg: 0,          // sail angle, -90..90 relative to boat centerline
    power: 0,            // 0..1
    speed: 0,            // boat speed
    progress: 0,         // 0..1 toward finish
    time: 0, timeLimit: 35,
    round: 0,
    optDeg: 0, inGreen: false,

    init: function () {
      this.state = GS.READY;
      this.power = 0; this.speed = 0; this.progress = 0;
      this.time = this.timeLimit; this.round = 0;
      this.sailDeg = 0;
      this.newWind();
    },

    // pick a wind direction; compute optimal sail angle for that point of sail
    newWind: function () {
      // wind FROM angle relative to boat (boat sails "up" the screen = 0).
      // Avoid the no-go zone (within ~40deg of dead ahead) so a course exists.
      var a;
      do { a = (Math.random() * 360) - 180; } while (Math.abs(a) < 42);
      this.windDeg = a;
      // optimal sail: roughly half the apparent wind angle off centerline,
      // on the side the wind comes from. Simplified trim model.
      var awa = Math.abs(a);                 // apparent wind angle 42..180
      var opt = clamp((awa - 10) * 0.5, 0, 80);
      this.optDeg = (a < 0 ? -opt : opt);
      this.round++;
    },

    update: function (dt) {
      waterPhase += dt * 14;
      if (this.state === GS.READY) {
        if (trimState.left || trimState.right || keys['arrowleft'] ||
            keys['arrowright'] || keys['a'] || keys['d'] || pointer.justTapped) {
          this.state = GS.PLAY;
        }
        return;
      }
      if (this.state === GS.WIN) return;

      this.time -= dt;
      if (this.time <= 0) { this.time = 0; this.state = GS.WIN; this.failed = true; }

      // ---- adjust sail ----
      var rate = 70; // deg/sec
      if (keys['arrowleft'] || keys['a'] || trimState.left)  this.sailDeg -= rate * dt;
      if (keys['arrowright'] || keys['d'] || trimState.right) this.sailDeg += rate * dt;
      this.sailDeg = clamp(this.sailDeg, -90, 90);

      // ---- how close to optimal? ----
      var err = Math.abs(this.sailDeg - this.optDeg);   // degrees off
      // power: full inside +-8 deg, fades to 0 by +-45 deg
      var p = clamp(1 - (err - 8) / 37, 0, 1);
      this.inGreen = err <= 12;
      // smooth power
      this.power += (p - this.power) * Math.min(1, dt * 4);

      // speed builds while powered, decays otherwise
      this.speed += (this.power - 0.15) * dt * 0.9;
      this.speed = clamp(this.speed, 0, 1);
      this.progress += this.speed * dt * 0.12;

      // new wind shift every time you get well-trimmed for a moment, or periodically
      this.shiftTimer = (this.shiftTimer || 0) + dt;
      if (this.shiftTimer > 6) { this.shiftTimer = 0; this.newWind(); }

      if (this.progress >= 1) { this.progress = 1; this.state = GS.WIN; this.failed = false; }
    },

    draw: function () {
      drawWater(0);

      // ---- progress / finish line at top ----
      var laneY = 60;
      rect(0, laneY - 4, BASE_W, 8, '#ffffff22');
      // finish
      for (var fx = 0; fx < BASE_W; fx += 20) {
        rect(fx, laneY - 14, 10, 10, (fx / 20) % 2 ? C.white : C.ink);
        rect(fx + 10, laneY - 4, 10, 10, (fx / 20) % 2 ? C.ink : C.white);
      }
      pixText('FINISH', BASE_W / 2, laneY - 22, 9, C.seaFoam, 'center');

      // ---- the boat (top-down, sailing UP) ----
      var bx = BASE_W / 2;
      var by = BASE_H - 120 - this.progress * (BASE_H - 220);
      ctx.save();
      ctx.translate(bx, by);
      // hull facing up
      ctx.fillStyle = C.hull; ctx.strokeStyle = C.hullDark; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -34); ctx.quadraticCurveTo(20, -6, 16, 24);
      ctx.lineTo(-16, 24); ctx.quadraticCurveTo(-20, -6, 0, -34);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // mast
      circle(0, -4, 3, C.ink);
      // boom + sail rotated by sailDeg
      ctx.save();
      ctx.rotate(this.sailDeg * Math.PI / 180);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, 34); ctx.stroke();  // boom
      // sail belly
      ctx.fillStyle = this.inGreen ? '#d7f0f6' : '#cfe6ef';
      ctx.strokeStyle = this.inGreen ? C.route : '#9bb6c2';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.quadraticCurveTo(18, 14, 0, 34);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
      ctx.restore();

      // ---- wind indicator (compass, top-left) ----
      var wx = 70, wy = 110;
      circle(wx, wy, 40, '#04161faa', C.rope, 3);
      pixText('WIND', wx, wy - 50, 8, C.seaFoam, 'center');
      // wind blows FROM windDeg (measured from screen-up, clockwise). Arrow points
      // in the direction the wind travels (toward boat).
      var wr = (this.windDeg) * Math.PI / 180;
      var fromX = wx + Math.sin(wr) * 34, fromY = wy - Math.cos(wr) * 34;
      drawArrow(fromX, fromY, Math.atan2(wy - fromY, wx - fromX), 30, C.gold);
      // no-go wedge marker
      ctx.fillStyle = '#d6453d33';
      ctx.beginPath(); ctx.moveTo(wx, wy);
      ctx.arc(wx, wy, 40, -Math.PI / 2 - 0.73, -Math.PI / 2 + 0.73);
      ctx.closePath(); ctx.fill();
      pixText('NO-GO', wx, wy + 56, 7, C.red, 'center');

      // ---- power meter (right side) ----
      var pmX = BASE_W - 70, pmY = 130, pmH = 280, pmW = 30;
      rect(pmX, pmY, pmW, pmH, '#04161f');
      ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.strokeRect(pmX, pmY, pmW, pmH);
      var fillH = this.power * pmH;
      ctx.fillStyle = this.inGreen ? C.route : C.gold;
      ctx.fillRect(pmX, pmY + pmH - fillH, pmW, fillH);
      pixText('POWER', pmX + pmW / 2, pmY - 12, 8, C.seaFoam, 'center');
      // green band marker
      rect(pmX - 6, pmY, 4, pmH * 0.25, C.route);

      // trim readout
      pixText('SAIL ' + Math.round(this.sailDeg) + 'deg', 20, BASE_H - 30, 9, C.seaFoam, 'left');
      if (this.inGreen) pixText('WELL TRIMMED', BASE_W / 2, BASE_H - 30, 10, C.route, 'center');
      else if (this.power < 0.3) pixText('LUFFING - ADJUST', BASE_W / 2, BASE_H - 30, 9, C.red, 'center');

      setHUD(this.name, 'SPD ' + Math.round(this.speed * 100), 'TIME ' + Math.ceil(this.time));

      if (this.state === GS.READY) {
        drawPanel(140, 130, 580, 270);
        pixText('TRIM THE SAIL', BASE_W / 2, 188, 16, C.sea, 'center');
        wrapText('The wind shifts each round. Use EASE / TRIM (or LEFT / RIGHT) to set the sail angle until the POWER meter fills green. Stay trimmed to build speed and cross the finish line before time runs out. Mind the red NO-GO zone — you cannot sail straight into the wind.',
          BASE_W / 2, 228, 500, 22, 13, C.ink, 'center');
        pixText('LEFT/RIGHT = ease/trim', BASE_W / 2, 355, 9, C.ropeDark, 'center');
        if (canvasButton('START', BASE_W / 2, 382, 150, 34, C.gold)) this.state = GS.PLAY;
      } else if (this.state === GS.WIN) {
        if (this.failed) {
          loseScreen('OUT OF TIME', this.name,
            'The wind moved and the sail did not. Keep one hand on the sheet — trim is a verb, not a setting.', 3);
        } else {
          winScreen('FINISH LINE', this.name,
            'Lesson: ease for power, trim for pointing, and re-trim every time the wind shifts. A sail set once is a sail set wrong.',
            'TIME LEFT ' + Math.ceil(this.time) + 's', 3);
        }
      }
    }
  };

  /* ---------- shared win / lose screens ---------- */
  function winScreen(title, sub, tip, stat, gameNum) {
    drawPanel(120, 110, 620, 320);
    pixText(title, BASE_W / 2, 170, 22, C.green, 'center');
    pixText(sub, BASE_W / 2, 200, 9, C.ropeDark, 'center');
    var y = wrapText(tip, BASE_W / 2, 240, 520, 24, 14, C.ink, 'center');
    pixText(stat, BASE_W / 2, y + 6, 10, C.sea, 'center');
    // buttons
    var nextNum = gameNum < 3 ? gameNum + 1 : 1;
    if (canvasButton('REPLAY', BASE_W / 2 - 160, 400, 130, 34, C.sea)) restartCurrent();
    var nextLabel = gameNum < 3 ? 'NEXT GAME' : 'MENU';
    if (canvasButton(nextLabel, BASE_W / 2, 400, 150, 34, C.gold)) {
      gameNum < 3 ? selectGame(nextNum) : selectGame(0);
    }
    if (canvasButton('MENU', BASE_W / 2 + 170, 400, 110, 34, C.ropeDark)) selectGame(0);
  }
  function loseScreen(title, sub, tip, gameNum) {
    drawPanel(120, 130, 620, 280);
    pixText(title, BASE_W / 2, 190, 20, C.red, 'center');
    pixText(sub, BASE_W / 2, 218, 9, C.ropeDark, 'center');
    wrapText(tip, BASE_W / 2, 258, 520, 24, 14, C.ink, 'center');
    if (canvasButton('TRY AGAIN', BASE_W / 2 - 90, 380, 150, 34, C.gold)) restartCurrent();
    if (canvasButton('MENU', BASE_W / 2 + 90, 380, 110, 34, C.ropeDark)) selectGame(0);
  }

  /* ---------- helpers ---------- */
  function drawArrow(x, y, ang, len, color) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(ang);
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-len / 2, 0); ctx.lineTo(len / 2, 0); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(len / 2, 0); ctx.lineTo(len / 2 - 8, -5); ctx.lineTo(len / 2 - 8, 5);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function anyMoveInput() {
    return keys['arrowup'] || keys['arrowdown'] || keys['arrowleft'] || keys['arrowright'] ||
      keys['w'] || keys['a'] || keys['s'] || keys['d'] ||
      dpadState.up || dpadState.down || dpadState.left || dpadState.right;
  }

  /* =====================================================================
     MENU
     ===================================================================== */
  var menu = {
    name: 'CREW TRAINING',
    controls: 'none',
    cards: [
      { n: 1, t: 'DINGHY ROW',   d: 'Row to the boat, beat the current.' },
      { n: 2, t: 'CATCH PENNANT', d: 'Time the grab, pick up the mooring.' },
      { n: 3, t: 'TRIM SAIL',    d: 'Match the wind, build speed, finish.' }
    ],
    bob: 0,
    init: function () {},
    update: function (dt) {
      waterPhase += dt * 16; this.bob += dt;
      // tap a card to launch
      if (pointer.justTapped) {
        for (var i = 0; i < 3; i++) {
          var cx = 150 + i * 240, cy = 250, w = 200, h = 200;
          if (pointer.x >= cx && pointer.x <= cx + w && pointer.y >= cy && pointer.y <= cy + h) {
            selectGame(i + 1); return;
          }
        }
      }
      // number keys 1/2/3
      if (keys['1']) selectGame(1);
      if (keys['2']) selectGame(2);
      if (keys['3']) selectGame(3);
    },
    draw: function () {
      drawWater(0);
      pixText('LEARN THE ROPES', BASE_W / 2, 90, 22, C.gold, 'center');
      bodyText('Pick a mini-game. Silly crew training, secretly useful.',
        BASE_W / 2, 124, 16, C.seaFoam, 'center');

      for (var i = 0; i < 3; i++) {
        var cx = 150 + i * 240, cy = 250 + Math.sin(this.bob * 2 + i) * 4, w = 200, h = 200;
        rect(cx, cy, w, h, C.parch);
        ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.strokeRect(cx, cy, w, h);
        ctx.strokeStyle = C.rope; ctx.lineWidth = 2; ctx.strokeRect(cx + 6, cy + 6, w - 12, h - 12);
        pixText('GAME ' + this.cards[i].n, cx + w / 2, cy + 34, 9, C.red, 'center');
        // little icon
        if (i === 0) { drawBoatTop(cx + w / 2, cy + 90, 1.5, 0.3, C.white); }
        else if (i === 1) { circle(cx + w / 2 + 24, cy + 90, 10, C.gold, C.ink, 2); circle(cx + w / 2 - 18, cy + 90, 6, C.red, C.ink, 2); }
        else { drawBoatTop(cx + w / 2, cy + 90, 1.5, 0, C.route); }
        pixText(this.cards[i].t, cx + w / 2, cy + 140, 8, C.sea, 'center');
        wrapText(this.cards[i].d, cx + w / 2, cy + 162, w - 30, 16, 11, C.ink, 'center');
      }
      pixText('TAP A CARD OR PRESS 1 / 2 / 3', BASE_W / 2, 490, 9, C.ropeDark, 'center');
      setHUD('CREW TRAINING', 'PICK A GAME', 'TIME --');
    }
  };

  /* =====================================================================
     LOOP + GAME SWITCHING
     ===================================================================== */
  var games = [menu, G1, G2, G3];
  var current = menu;

  function selectGame(idx) {
    current = games[idx];
    current.init();
    showControls(current.controls);
    // mark active level button
    selBtns.forEach(function (b) {
      b.classList.toggle('current', parseInt(b.getAttribute('data-game'), 10) === idx);
    });
    // reset transient inputs
    grabPressed = false; keys['space'] = false;
    pointer.justTapped = false;
  }
  function restartCurrent() {
    current.init();
    grabPressed = false; keys['space'] = false;
  }

  selBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      selectGame(parseInt(b.getAttribute('data-game'), 10));
    });
  });

  var last = performance.now();
  function loop(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    current.update(dt);
    current.draw();
    pointer.justTapped = false;   // consume taps after a frame
    requestAnimationFrame(loop);
  }

  /* ---------- boot ---------- */
  function boot() {
    resizeCanvas();
    selectGame(0);
    requestAnimationFrame(loop);
  }
  // Fonts may load late; redraw is continuous so a re-measure isn't critical.
  if (document.readyState === 'complete' || document.readyState === 'interactive') boot();
  else window.addEventListener('DOMContentLoaded', boot);

})();
