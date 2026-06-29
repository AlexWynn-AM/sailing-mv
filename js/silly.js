/* silly.js — the fun layer: the Binnacle oracle, a flyby seagull,
   the hero chaos meter, and a Konami "grog mode" easter egg. */
(function () {
  'use strict';

  /* ---------- hero chaos meter: settle to a suspiciously specific value ---------- */
  var fill = document.querySelector('.chaos-fill');
  var val  = document.querySelector('.chaos-val');
  var CHAOS = [
    [62, 'manageable'], [74, 'spicy'], [88, 'concerning'],
    [55, 'pre-coffee'], [69, 'nice'], [96, 'send help'], [42, 'suspiciously calm']
  ];
  if (fill && val) {
    var pick = CHAOS[Math.floor((Date.now() / 86400000) % CHAOS.length)];
    setTimeout(function () { fill.style.width = pick[0] + '%'; val.textContent = pick[1]; }, 400);
  }

  /* ---------- the Binnacle: ask the boat ---------- */
  var oracle = document.getElementById('oracle');
  var ANSWERS = {
    sail: [
      'Yes. The wind is perfect, which is deeply suspicious. Go now, ask questions later.',
      'Sail. The raw-bar skiff at Cuttyhunk stops at dark, so this is technically a race.',
      'No. The forecast is "character-building." Stay in the harbor and build character instead.',
      'Maybe. Flip a fender: heads we sail, tails we get a second breakfast.',
      'Absolutely. Worst case we anchor early and blame the wind. (See the other button.)',
      'The boat says yes. The First Mate of Anxiety says "let me just check one more app."',
      'Yes, but only if someone other than the DJ is on the helm.'
    ],
    anchor: [
      'The wind died and morale, frankly, required oysters.',
      'It was 5 o’clock in a time zone we could clearly see from the cockpit.',
      'Someone’s hat went overboard. We held a 40-minute search for a $12 hat.',
      'The forecast said "lumpy." We respect lumpy.',
      'Dani declared the water "swimmable," and that was legally binding.',
      'We ran out of ice. This is, and I cannot stress this enough, a safety issue.',
      'A seagull made direct eye contact. We took the hint.',
      'The next harbor had a better-looking happy hour. We are not made of stone.'
    ],
    blame: [
      'The DJ. It’s always the DJ.',
      'Whoever said "it’s basically right there" four hours ago.',
      'The lobster pot. It started it.',
      'Not the Captain of Vibes. The Captain of Vibes was, per record, vibing.',
      'The person who packed "enough" ice. We see you.',
      'The wind. The wind cannot defend itself, so: the wind.',
      'Camron. (Camron is innocent, but tradition is tradition.)',
      'Mercury, probably. Or the tide. One of the celestial ones.'
    ]
  };
  function speak(kind) {
    if (!oracle) return;
    var list = ANSWERS[kind];
    var line = list[Math.floor(Math.random() * list.length)];
    oracle.classList.add('flip');
    setTimeout(function () { oracle.textContent = line; oracle.classList.remove('flip'); }, 160);
  }
  var b1 = document.getElementById('ask-sail');
  var b2 = document.getElementById('ask-anchor');
  var b3 = document.getElementById('ask-blame');
  if (b1) b1.addEventListener('click', function () { speak('sail'); });
  if (b2) b2.addEventListener('click', function () { speak('anchor'); });
  if (b3) b3.addEventListener('click', function () { speak('blame'); });

  /* ---------- flyby seagull ---------- */
  var GULL_SAYS = ['MINE', 'any fries?', 'that’s MY piling', 'caw means caw', 'nice boat. mine now', 'snack?'];
  var gullSVG =
    '<svg width="58" height="34" viewBox="0 0 58 34" aria-hidden="true">' +
      '<path d="M2 18 Q14 2 28 16 Q42 2 56 18" fill="none" stroke="#1d3b4d" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M24 15 Q28 19 32 15" fill="none" stroke="#1d3b4d" stroke-width="4" stroke-linecap="round"/>' +
      '<circle cx="28" cy="17" r="2.5" fill="#e7b54b"/>' +
    '</svg>';
  function flyGull() {
    if (window.innerWidth < 560) { schedule(); return; }
    var g = document.createElement('div');
    g.className = 'seagull';
    var say = GULL_SAYS[Math.floor(Math.random() * GULL_SAYS.length)];
    g.innerHTML = gullSVG + '<span class="say">' + say + '</span>';
    var topY = 70 + Math.random() * 160;
    g.style.top = topY + 'px';
    document.body.appendChild(g);
    var dist = window.innerWidth + 240;
    var dur = 7000 + Math.random() * 3000;
    var t0 = null;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = (ts - t0) / dur;
      if (p >= 1) { g.remove(); return; }
      var x = -120 + p * dist;
      var bobY = Math.sin(p * Math.PI * 6) * 10;
      g.style.transform = 'translate(' + x + 'px,' + bobY + 'px)';
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
    schedule();
  }
  function schedule() { setTimeout(flyGull, 14000 + Math.random() * 16000); }
  setTimeout(flyGull, 4000);

  /* ---------- Konami code -> GROG MODE ---------- */
  var SEQ = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  var pos = 0;
  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 400); }, 2600);
  }
  function grogOn() {
    if (document.body.classList.contains('grog')) return;
    document.body.classList.add('grog');
    var tent = document.createElement('img');
    // a tiny inline tentacle drawn as SVG data URI (kraken says hi)
    tent.className = 'tentacle';
    tent.alt = '';
    tent.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="230" viewBox="0 0 120 230">' +
      '<path d="M60 230 C 40 170 90 150 55 110 C 30 80 80 60 60 20" fill="none" stroke="%232f9e57" stroke-width="16" stroke-linecap="round"/>' +
      '<circle cx="60" cy="18" r="11" fill="%232f9e57"/>' +
      '<circle cx="56" cy="14" r="3" fill="%23fff"/>' +
      '<g fill="%23d7f0f6"><circle cx="58" cy="120" r="5"/><circle cx="70" cy="80" r="5"/><circle cx="50" cy="160" r="5"/></g>' +
      '</svg>'
    );
    document.body.appendChild(tent);
    toast('GROG MODE ENGAGED — the kraken approves');
  }
  window.addEventListener('keydown', function (e) {
    var k = e.key;
    if (k && k.toLowerCase() === SEQ[pos].toLowerCase()) {
      pos++;
      if (pos === SEQ.length) { pos = 0; grogOn(); }
    } else {
      pos = (k === SEQ[0]) ? 1 : 0;
    }
  });

  /* ---------- trip bingo ---------- */
  var BINGO_POOL = [
    "“That’s a whale!” (it’s a lobster pot)",
    "Phone dropped in the water",
    "Anchor early “for lunch” (it’s 5pm)",
    "Ice runs out before Cuttyhunk",
    "DJ privileges formally revoked",
    "“It’s basically right there” (4 hrs)",
    "Sunscreen regret sets in",
    "Seagull steals a snack",
    "Someone circles the mooring twice",
    "We blame the wind",
    "A hat goes overboard",
    "Flip-flop lost at sea",
    "Raw-bar boat sighted; cheering",
    "Sunglasses “lost” (on their head)",
    "“Five more minutes” = an hour",
    "Swim “just to check the water”",
    "Good snacks gone by noon",
    "Weathered in, calls it “research”",
    "Speaker dies mid-banger",
    "A knot no one can untie",
    "Detour for “better happy hour”",
    "Someone points the wrong way",
    "Group chat goes silent at 5:55",
    "Oysters wildly over-ordered",
    "Dinghy won’t start (3 tries)",
    "Aggressive GPS narration",
    "Sunset photo blocks the helm",
    "“I read it on a website” (this one)",
    "Captain of Vibes overrules logic",
    "A nautical word said very wrong",
    "Anchor drags at 2am — whole crew up",
    "“Did we set the anchor?” at midnight"
  ];
  var FREE = "“This is the life”";
  var grid = document.getElementById('bingo-grid');
  var statusEl = document.getElementById('bingo-status');

  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function checkBingo() {
    var cells = grid.children;
    function m(i) { return cells[i].classList.contains('marked'); }
    var lines = [], r, c;
    for (r = 0; r < 5; r++) lines.push([r*5, r*5+1, r*5+2, r*5+3, r*5+4]);
    for (c = 0; c < 5; c++) lines.push([c, c+5, c+10, c+15, c+20]);
    lines.push([0, 6, 12, 18, 24]);
    lines.push([4, 8, 12, 16, 20]);
    var won = null;
    for (var L = 0; L < lines.length; L++) {
      if (lines[L].every(m)) { won = lines[L]; break; }
    }
    if (won) {
      Array.prototype.forEach.call(cells, function (el) { el.classList.remove('win'); });
      won.forEach(function (i) { cells[i].classList.add('win'); });
      statusEl.textContent = 'BINGO. It was always going to happen.';
      toast('BINGO — the sea provides');
    }
  }

  function buildBingo() {
    if (!grid) return;
    var items = shuffle(BINGO_POOL).slice(0, 24);
    items.splice(12, 0, FREE); // center free space
    grid.innerHTML = '';
    items.forEach(function (txt, idx) {
      var cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'bingo-cell' + (idx === 12 ? ' free marked' : '');
      cell.textContent = txt;
      if (idx !== 12) {
        cell.addEventListener('click', function () {
          cell.classList.toggle('marked');
          checkBingo();
        });
      }
      grid.appendChild(cell);
    });
    if (statusEl) statusEl.textContent = 'Tap a square when it happens.';
  }

  var bnew = document.getElementById('bingo-new');
  if (bnew) bnew.addEventListener('click', buildBingo);
  buildBingo();
})();
