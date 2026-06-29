# Sailing Summer MV

A silly, useful, day-by-day chart for the crew's July 2026 sail from
**East Greenwich, RI** down to **Martha's Vineyard**, hopping through
**Newport** and **Cuttyhunk**. Four ~4-hour legs, easy life.

Crew: Austin, Camron, Dani, Evan, Gabri & co. Cast off Fri/Sat/Sun, July 17–19, 2026.

## What's here

- **Chart + itinerary** (`index.html`) — an animated, hand-plotted route map
  (tap a buoy to jump to that stop) and a day-by-day float plan with
  things-to-do for each town.
- **Arcade** (`arcade.html`) — three retro-pixel 2D mini-games:
  - *Dinghy Row* — drive the dinghy to the moored boat through the current.
  - *Catch the Pennant* — time the boat-hook grab to pick up a mooring.
  - *Trim the Sail* — match your sail to the wind and beat the clock.
- **Helm 3D** (`helm.html`) — a small Three.js game: take the wheel and
  steer a low-poly boat down the channel into the next harbor.

All static, no build step. Plain HTML/CSS/JS; Three.js loads from a CDN.

## Run locally

Any static server works:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy

Hosted on GitHub Pages from the `main` branch root.

---

*Plotted with love and zero navigational authority. Do not navigate by this.*
