/* route.js — build the real Leaflet route map + the legs summary strip.
   Geographically accurate harbors; the green line is an approximate water
   route. Each pin sits on the dinghy landing. */
(function () {
  'use strict';

  /* ---- legs summary strip ---- */
  var LEGS = [
    { n: '01', name: 'East Greenwich', meta: 'Cast off · provision' },
    { n: '02', name: 'Newport',        meta: '~4 hr · down the bay' },
    { n: '03', name: 'Cuttyhunk',      meta: '~4 hr · open water' },
    { n: '04', name: 'Vineyard Haven', meta: '~4 hr · the sound' }
  ];
  var legsEl = document.querySelector('.legs');
  if (legsEl) {
    legsEl.innerHTML = LEGS.map(function (l) {
      return '<div class="leg"><div class="lg-num">' + l.n + '</div>' +
             '<div class="lg-name">' + l.name + '</div>' +
             '<div class="lg-meta">' + l.meta + '</div></div>';
    }).join('');
  }

  var mapEl = document.getElementById('map');
  if (!mapEl || typeof L === 'undefined') return;

  /* ---- the four stops: real dinghy-landing coordinates ---- */
  var STOPS = [
    { n: 1, name: 'East Greenwich, RI — home base', ll: [41.6643, -71.4448], target: '#egr',
      land: '“Sunwise” on a mooring at Greenwich Cove Marina (3 Division St)',
      walk: 'Dinghy ashore to the marina or the town dock / Scalloptown; Main St for provisions.',
      dock: [41.6645, -71.4459], dockName: 'Greenwich Cove Marina' },
    { n: 2, name: 'Newport, RI', ll: [41.489437, -71.317795], target: '#newport',
      land: "Newport dinghy dock — main harbor, steps to the wharves & Thames St",
      walk: "Bowen's & Bannister's Wharf, Thames St — steps away.",
      dock: [41.489437, -71.317795], dockName: 'Newport dinghy dock' },
    { n: 3, name: 'Cuttyhunk Island', ll: [41.4258, -70.9270], target: '#cuttyhunk',
      land: 'Cuttyhunk Town Dock (in the pond)',
      walk: 'Lookout hike, general store, beach. The raw-bar boat comes to you.',
      dock: [41.4259, -70.9265], dockName: 'Cuttyhunk Town Dock' },
    { n: 4, name: "Martha's Vineyard — Vineyard Haven", ll: [41.4564, -70.5990], target: '#mv',
      land: 'Tisbury Town Dock — right by the Steamship ferry terminal',
      walk: 'Main St, Black Dog, Owen Park beach. Bus/bikes for Oak Bluffs & Edgartown.',
      dock: [41.4562, -70.5985], dockName: 'Tisbury Town Dock' }
  ];

  /* ---- approximate water route, leg by leg (kept off the land) ---- */
  var ROUTE = [
    [41.6643, -71.4448], // start: "Sunwise" on her mooring, Greenwich Cove Marina
    [41.6560, -71.4445], // south down Greenwich Cove
    [41.6470, -71.4420], // out the cove mouth into Greenwich Bay
    [41.6330, -71.4250], // across Greenwich Bay
    [41.6080, -71.4000], // into the West Passage
    [41.5950, -71.3880], // down the West Passage
    [41.5780, -71.3600], // round the north tip of Conanicut (Conanicut Point)
    [41.5380, -71.3470], // into the East Passage
    [41.5050, -71.3400], // under the Pell (Newport) Bridge
    [41.4920, -71.3300], // Newport Harbor approach
    [41.4885, -71.3260], // into the harbor
    [41.489437, -71.317795], // Newport dinghy dock
    [41.4885, -71.3260], // back out of the harbor
    [41.4520, -71.3150], // out of Newport into Rhode Island Sound
    [41.4080, -71.2300], // across the sound (south of Sakonnet)
    [41.4080, -71.0800],
    [41.4150, -70.9700], // approaching Cuttyhunk from the west
    [41.4258, -70.9270], // Cuttyhunk
    [41.4150, -70.9000], // out along the Elizabeth Islands
    [41.4180, -70.8600], // Quicks Hole
    [41.3880, -70.8000], // into Vineyard Sound
    [41.4200, -70.6700], // across the sound
    [41.4564, -70.5990]  // Vineyard Haven (by the ferry terminal)
  ];

  /* ---- map ---- */
  var map = L.map('map', {
    scrollWheelZoom: false,   // don't hijack page scroll; users can still pinch/drag
    zoomControl: true
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd', maxZoom: 18
  }).addTo(map);

  // nautical seamark overlay (buoys, depths) — thematically perfect, transparent
  L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenSeaMap', maxZoom: 18, opacity: 0.9
  }).addTo(map);

  // a chunky green "hand-drawn" route line (casing + bright core)
  L.polyline(ROUTE, { color: '#0a3147', weight: 9, opacity: 0.5, lineJoin: 'round', lineCap: 'round' }).addTo(map);
  var routeLine = L.polyline(ROUTE, {
    color: '#2fdc5a', weight: 5, opacity: 0.95, dashArray: '1 12', lineCap: 'round'
  }).addTo(map);

  // numbered stop markers (brand-styled divIcons) with rich popups
  var markers = [];
  STOPS.forEach(function (s) {
    var icon = L.divIcon({
      className: 'stop-pin-wrap',
      html: '<div class="stop-pin">' + s.n + '</div>',
      iconSize: [34, 34], iconAnchor: [17, 17]
    });
    var m = L.marker(s.ll, { icon: icon, title: s.name }).addTo(map);
    var gmaps = 'https://www.google.com/maps/search/?api=1&query=' + s.dock[0] + ',' + s.dock[1];
    m.bindPopup(
      '<div class="pop">' +
        '<div class="pop-h"><span class="pop-n">' + s.n + '</span>' + s.name + '</div>' +
        '<div class="pop-row"><b>Land the dinghy:</b> ' + s.land + '</div>' +
        '<div class="pop-row"><b>Walk to:</b> ' + s.walk + '</div>' +
        '<a class="pop-maps" href="' + gmaps + '" target="_blank" rel="noopener">Open ' + s.dockName + ' in Google Maps &#8599;</a>' +
        '<a class="pop-link" href="' + s.target + '">See the day &rarr;</a>' +
      '</div>',
      { maxWidth: 270 }
    );
    markers.push(m);
  });

  // fit the whole route into view
  map.fitBounds(routeLine.getBounds().pad(0.12));

  // popup "See the day" links smooth-scroll to the town section
  map.on('popupopen', function (e) {
    var link = e.popup.getElement().querySelector('.pop-link');
    if (!link) return;
    link.addEventListener('click', function (ev) {
      ev.preventDefault();
      var t = document.querySelector(link.getAttribute('href'));
      if (t) { map.closePopup(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });

  // a little boat that sails the route on a loop
  var boatIcon = L.divIcon({ className: 'boat-wrap', html: '<div class="route-boat"></div>', iconSize: [22, 22], iconAnchor: [11, 11] });
  var boat = L.marker(ROUTE[0], { icon: boatIcon, interactive: false, keyboard: false }).addTo(map);

  // precompute cumulative distances for even-speed travel
  var segLen = [], total = 0;
  for (var i = 1; i < ROUTE.length; i++) {
    var d = map.distance(ROUTE[i - 1], ROUTE[i]);
    segLen.push(d); total += d;
  }
  var TRAVEL_MS = 16000, PAUSE_MS = 1400, t0 = null, leg = 0;
  function lerp(a, b, f) { return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; }
  function frame(ts) {
    if (t0 === null) t0 = ts;
    var elapsed = ts - t0;
    var prog = Math.min(1, elapsed / TRAVEL_MS);
    var want = prog * total, acc = 0, idx = 0;
    while (idx < segLen.length && acc + segLen[idx] < want) { acc += segLen[idx]; idx++; }
    if (idx >= segLen.length) { boat.setLatLng(ROUTE[ROUTE.length - 1]); }
    else {
      var f = segLen[idx] ? (want - acc) / segLen[idx] : 0;
      boat.setLatLng(lerp(ROUTE[idx], ROUTE[idx + 1], f));
    }
    if (prog >= 1) {
      if (elapsed > TRAVEL_MS + PAUSE_MS) { t0 = ts; } // loop after a short pause
    }
    requestAnimationFrame(frame);
  }
  // only animate once the map is on screen
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { requestAnimationFrame(frame); io.disconnect(); } });
    }, { threshold: 0.2 });
    io.observe(mapEl);
  } else { requestAnimationFrame(frame); }

  // keep tiles sharp if the container resizes
  window.addEventListener('resize', function () { map.invalidateSize(); });
})();
