/* route.js — animate the chart route, ride a boat along it, wire the buoys */
(function () {
  'use strict';

  /* ---- build the "legs" summary strip ---- */
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

  var line = document.getElementById('routeLine');
  var boat = document.getElementById('routeBoat');
  if (!line) return;

  var len = line.getTotalLength();
  line.style.strokeDasharray = len;
  line.style.strokeDashoffset = len;

  var DUR = 2600; // ms
  var started = false;

  function easeInOut(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }

  function animate(ts0) {
    function frame(ts) {
      var t = Math.min(1, (ts - ts0) / DUR);
      var e = easeInOut(t);
      line.style.strokeDashoffset = len * (1 - e);
      if (boat) {
        var p = line.getPointAtLength(e * len);
        var p2 = line.getPointAtLength(Math.min(len, e * len + 1));
        var ang = Math.atan2(p2.y - p.y, p2.x - p.x) * 180 / Math.PI;
        boat.setAttribute('transform', 'translate(' + p.x + ',' + p.y + ') rotate(' + (ang + 90) + ')');
        boat.style.opacity = t > 0 && t < 1 ? 1 : (t >= 1 ? 1 : 0);
      }
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // park the boat at the start until we animate
  if (boat) {
    var s = line.getPointAtLength(0);
    boat.setAttribute('transform', 'translate(' + s.x + ',' + s.y + ') rotate(0)');
    boat.style.opacity = 0;
  }

  // kick off when the chart scrolls into view
  var box = document.getElementById('routeMap');
  if ('IntersectionObserver' in window && box) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && !started) {
          started = true;
          requestAnimationFrame(animate);
          io.disconnect();
        }
      });
    }, { threshold: 0.35 });
    io.observe(box);
  } else {
    started = true;
    requestAnimationFrame(animate);
  }

  /* ---- waypoint clicks -> smooth scroll to the town ---- */
  document.querySelectorAll('.wp').forEach(function (wp) {
    function go() {
      var sel = wp.getAttribute('data-target');
      var t = sel && document.querySelector(sel);
      if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    wp.addEventListener('click', go);
    wp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
    });
  });
})();
