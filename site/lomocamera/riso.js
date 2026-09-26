// A risograph finish for the sketchbook. Load it after kit-v2.js: the drawing is made
// exactly as before, then each of its three frames is printed in three inks.
//
// The method is borrowed from riso-windowseat (MIT), github.com/sevenevesai/riso-windowseat:
// separate the picture into ink plates, screen each plate into dots at its own angle,
// multiply the inks onto paper, and let the plates miss register a little.
//
// What stays still between frames, and what moves:
// - the paper, the dot screens and the ink starvation are fixed, so nothing crawls;
// - each plate lands a pixel or so off, differently in each frame, like a print
//   fed through the drum by hand; with the pen's wobble, that is the boil;
// - each pull sits out of register its own way, and each dot takes its own share of ink.
// Snow is the brightest thing in the kit, so it separates to no ink at all: bare paper.

const RISO = {
  // Real riso ink colours. Blue carries the line and the night; red is kept for the
  // accent and for deepening darks; yellow warms wood, brass and paper.
  inks: [
    { name: "federal blue", rgb: [0x3d, 0x55, 0x88], angle: 15, shift: [0, 0] },
    { name: "yellow", rgb: [0xff, 0xe8, 0x00], angle: 75, shift: [-1, 1] },
    { name: "bright red", rgb: [0xf1, 0x50, 0x60], angle: 45, shift: [1.5, -0.5] },
  ],
  paper: [0xf6, 0xf0, 0xe2],
  pitch: 4.2,        // dot spacing in canvas pixels, when `lines` is null
  jitter: 1,         // how far a plate may drift from frame to frame, in pixels
  levels: 17,        // the separation table's steps per colour channel
  // From miaai-lab's Riso Lab (2026-09-24); each can be turned off to compare.
  merge: true,       // dots grow on past touching (~78%) until the plate is solid at 100%
  texture: true,     // slow density drift, starvation toward one sheet edge, drag streaks
  rotate: true,      // each plate lands turned a fraction of a degree, as well as shifted
  // Each print is screened in one dot shape, drawn from `shapes` by its seed: "circle",
  // "square" or "line" (a line screen, ruled along each plate's angle). Setting `shape`
  // fixes it for every print; an ink may carry its own `shape` to override both.
  shape: null,
  shapes: ["circle", "square", "line"],
  // Each print's dot size too, as lines across the print (a screen's ruling, as in Riso
  // Lab), drawn from this range; null keeps `pitch`. Counted across, the print looks the
  // same at any size. Much under 120 the drawings lose their detail (operator,
  // 2026-09-24, against Riso Lab at ~400 px wide).
  lines: [120, 160],
  misreg: 1.5,       // how far each plate's usual offset may wander from pull to pull, in pixels
  dotVar: 0,         // how much one dot's ink differs from its neighbour's, as a share of it
  // Which pull this is. The same drawing pulled again prints differently: its paper,
  // starvation, streaks and misregistration all come from the drawing's seed and this.
  // A development passes its date (e.g. 20260925), so every development is a fresh
  // print; 0 keeps a preview the same on every load; ?pull=N in a page's address sets it.
  pull: +(new URLSearchParams(location.search).get("pull") || 0),
  // The camera, not the drawing (the brief still forbids the drawing a vignette): each
  // print is darker toward its corners, by a strength drawn at random per pull, and
  // now and then light has leaked in from an edge or a corner, warm red and orange.
  vignette: [0.15, 0.5],   // the range the corner darkening is drawn from
  leaks: 0.35,             // the chance a print has a light leak
};

// ---- separation: which inks, how much of each, make this colour -----------------------

// Halftone dots of different inks overlap at random, so the colour a set of coverages
// prints is the paper times, per ink, (1 - c + c * ink).
function risoPrinted(c, inks) {
  const out = [1, 1, 1];
  for (let i = 0; i < inks.length; i++)
    for (let k = 0; k < 3; k++) out[k] *= 1 - c[i] + c[i] * inks[i][k];
  return out;
}
function risoFit(target, inks) {
  // Coarse grid, then a finer one round the best. Each ink used costs a little, so a
  // colour is made from one or two inks where it can be, as a printer would, and a
  // near-paper colour takes none: all three at a trace print a grey speckle.
  const n = inks.length, err = c => {
    const p = risoPrinted(c, inks);
    let e = 0;
    for (let k = 0; k < 3; k++) { const d = p[k] - target[k]; e += d * d; }
    for (const v of c) if (v > 0.001) e += 0.002 * v + 0.004;
    return e;
  };
  let best = new Array(n).fill(0), bestE = err(best);
  const search = (centre, step, span) => {
    const steps = Math.round(span / step), c = new Array(n);
    const walk = i => {
      if (i === n) { const e = err(c); if (e < bestE) { bestE = e; best = c.slice(); } return; }
      for (let s = -steps; s <= steps; s++) {
        c[i] = Math.min(1, Math.max(0, centre[i] + s * step));
        walk(i + 1);
      }
    };
    walk(0);
  };
  search(new Array(n).fill(0.5), 0.1, 0.5);
  search(best.slice(), 0.025, 0.1);
  return best;
}
function risoTable() {
  if (RISO.table) return RISO.table;
  const L = RISO.levels, inks = RISO.inks.map(i => i.rgb.map(v => v / 255));
  const white = RISO.paper.map(v => v / 255), n = inks.length;
  const table = new Float32Array(L * L * L * n);
  for (let r = 0; r < L; r++) for (let g = 0; g < L; g++) for (let b = 0; b < L; b++) {
    // Colours are measured against the paper: anything as bright as it takes no ink.
    const target = [r, g, b].map((v, k) => Math.min(1, v / (L - 1) / white[k]));
    const c = risoFit(target, inks), at = ((r * L + g) * L + b) * n;
    for (let i = 0; i < n; i++) table[at + i] = c[i];
  }
  return (RISO.table = table);
}
// Coverage of every ink at every pixel, interpolated from the table.
function risoSeparate(img) {
  const L = RISO.levels, n = RISO.inks.length, table = risoTable(), d = img.data;
  const planes = RISO.inks.map(() => new Float32Array(img.width * img.height));
  const s = (L - 1) / 255;
  for (let p = 0, q = 0; p < d.length; p += 4, q++) {
    const fr = d[p] * s, fg = d[p + 1] * s, fb = d[p + 2] * s;
    const r0 = Math.min(L - 2, fr | 0), g0 = Math.min(L - 2, fg | 0), b0 = Math.min(L - 2, fb | 0);
    const tr = fr - r0, tg = fg - g0, tb = fb - b0;
    for (let i = 0; i < n; i++) {
      let v = 0;
      for (let cr = 0; cr < 2; cr++) for (let cg = 0; cg < 2; cg++) for (let cb = 0; cb < 2; cb++) {
        const wgt = (cr ? tr : 1 - tr) * (cg ? tg : 1 - tg) * (cb ? tb : 1 - tb);
        v += wgt * table[(((r0 + cr) * L + g0 + cg) * L + b0 + cb) * n + i];
      }
      planes[i][q] = v;
    }
  }
  return planes;
}

// ---- paper, screens, starvation: made once, the same for all three frames -------------

function risoRng(s) { return () => (s = (s * 16807) % 2147483647) / 2147483647; }
// Scrambles a seed, so that seeds close together (pulls on dates a few days apart) start
// the generator in unrelated places; unscrambled, their first draws come out alike.
function risoHash(s) {
  s = Math.imul(s ^ (s >>> 16), 0x45d9f3b); s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
  return ((s ^ (s >>> 16)) >>> 0) % 2147483646 + 1;
}
// Smooth noise in [0, 1]: random values on a coarse grid, blended across it.
function risoNoise(w, h, cell, rand) {
  const gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2;
  const grid = Float32Array.from({ length: gw * gh }, rand), out = new Float32Array(w * h);
  const ease = t => t * t * (3 - 2 * t);
  for (let y = 0; y < h; y++) {
    const gy = y / cell, y0 = gy | 0, ty = ease(gy - y0);
    for (let x = 0; x < w; x++) {
      const gx = x / cell, x0 = gx | 0, tx = ease(gx - x0);
      const a = grid[y0 * gw + x0], b = grid[y0 * gw + x0 + 1];
      const c = grid[(y0 + 1) * gw + x0], d = grid[(y0 + 1) * gw + x0 + 1];
      out[y * w + x] = (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
    }
  }
  return out;
}
// The screen this print is made with: its dot shape and its pitch, from its seed alone,
// on a generator of their own so that nothing else about the print moves with them.
// w is the print's width in the pixels it is printed at; k is those pixels per drawing
// pixel. Counted in lines across, the screen is the same at any size.
function risoScreenFor(seed, w = 800, k = 1) {
  const rand = risoRng(risoHash(seed * 71 + 3)), s = RISO.shapes, L = RISO.lines;
  const shape = s[Math.min(s.length - 1, (rand() * s.length) | 0)], r = rand();
  const lines = L ? Math.round(L[0] + r * (L[1] - L[0])) : Math.round(w / (RISO.pitch * k));
  return { shape: RISO.shape || shape, lines, pitch: w / lines };
}

// Everything below is measured in drawing pixels and scaled by k, so that a print made
// at any size is the same print: its paper, its starvation, its streaks.
function risoPress(w, h, seed, k = 1) {
  const key = `${w}x${h}:${k}:${seed}:${+RISO.merge}${+RISO.texture}${+RISO.rotate}:` +
    `${RISO.shape}:${RISO.shapes}:${RISO.lines}:${RISO.pitch}:${RISO.inks.map(i => i.shape || "")}:${RISO.dotVar}`;
  const scr = risoScreenFor(seed, w, k);
  if (RISO.press && RISO.press.key === key) return RISO.press;
  const rand = risoRng(risoHash(seed * 31 + 7));
  // Paper: warm, cloudy rather than finely grained, with a few flecks.
  const m1 = risoNoise(w, h, 180 * k, rand), m2 = risoNoise(w, h, 60 * k, rand);
  const paper = new Float32Array(w * h * 3);
  for (let q = 0; q < w * h; q++) {
    const cloud = 1 - 0.05 * m1[q] - 0.03 * m2[q];
    for (let k = 0; k < 3; k++) paper[q * 3 + k] = RISO.paper[k] / 255 * cloud;
  }
  // Flecks and voids are counted by the pixel, so they draw on generators of their own:
  // the rest of the print then comes out the same at any size.
  const fleck = risoRng(risoHash(seed * 37 + 1));
  for (let i = 0; i < w * h / 300; i++) {
    const q = (fleck() * w * h) | 0, v = fleck() < 0.6 ? 0.9 : 1.02;
    for (let k = 0; k < 3; k++) paper[q * 3 + k] = Math.min(1, paper[q * 3 + k] * v);
  }
  // Per ink: a threshold screen at its own angle, and starvation, the uneven way a
  // drum lays ink: broad patches a little thin, and small voids in the solids.
  const inks = RISO.inks.map((ink, n) => {
    const a = ink.angle * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a), P = scr.pitch;
    const shape = ink.shape || scr.shape;
    // The coverage a dot needs before it reaches the point (x, y): the share of its cell
    // the dot covers once it has grown that far, so every shape prints its coverage as
    // area. A round dot touches its neighbours at pi/4 (~78%); with merge, it grows on
    // past its cell's edges (only the part inside the cell counts) until it fills the
    // corners at full coverage. Without merge it stops at touching. A square dot fills its
    // cell as it grows; a line thickens across its cell.
    const need = (x, y) => {
      let u = (x * ca + y * sa) / P, v = (-x * sa + y * ca) / P;
      u -= Math.round(u); v -= Math.round(v);
      if (shape === "square") return 4 * Math.max(u * u, v * v);
      if (shape === "line") return 2 * Math.abs(v);
      const d2 = u * u + v * v;
      if (d2 <= 0.25) return Math.PI * d2;
      if (!RISO.merge) return 2;
      // A disc of radius d on a unit cell, less the four caps beyond the cell's edges.
      const d = Math.sqrt(d2);
      return Math.PI * d2 - 4 * (d2 * Math.acos(0.5 / d) - 0.5 * Math.sqrt(d2 - 0.25));
    };
    // Each pixel is inked by the share of it the dot covers, not by whether its centre is
    // inside: the least and most coverage needed across the pixel (its centre and four
    // corners) bound a ramp one pixel wide. So a dot prints its true area wherever it
    // falls on the pixel grid; judged at the centre alone, small dots grow and shrink with
    // where they land, and that repeats across the print as broad bands (moiré).
    const screen = new Float32Array(w * h), span = new Float32Array(w * h), dot = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const q = y * w + x;
      let lo = need(x, y), hi = lo;
      for (const [ox, oy] of [[-.5, -.5], [.5, -.5], [-.5, .5], [.5, .5]]) {
        const s = need(x + ox, y + oy); if (s < lo) lo = s; if (s > hi) hi = s;
      }
      screen[q] = lo; span[q] = Math.max(hi - lo, 1e-4);
      // Each dot takes a little more or less ink than its neighbours, fixed for the pull.
      const iu = Math.round((x * ca + y * sa) / P), iv = Math.round((-x * sa + y * ca) / P);
      const r = risoHash((iu * 73856093 ^ iv * 19349663 ^ (n + 1) * 83492791 ^ seed) >>> 0) / 2147483647;
      dot[q] = 1 + RISO.dotVar * (2 * r - 1);
    }
    const thin = risoNoise(w, h, 90 * k, rand), starve = new Float32Array(w * h);
    const empty = risoRng(risoHash(seed * 41 + n * 7 + 3));
    for (let q = 0; q < w * h; q++) starve[q] = (0.86 + 0.14 * thin[q]) * (empty() < 0.012 ? 0.3 : 1) * dot[q];
    // Drawn whether texture is on or not, so that turning it off changes nothing else.
    const drift = risoNoise(w, h, 260 * k, rand), side = rand() < 0.5, streaks = [];
    for (let j = 0; j < 3; j++) streaks.push([rand() * w, (1 + rand() * 2.5) * k, 0.82 + rand() * 0.1]);
    if (RISO.texture) {
      // Three more scales of uneven ink: a slow drift across the sheet, starvation toward
      // one edge (each drum its own), and a few faint vertical drag streaks.
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const q = y * w + x, t = side ? x / w : 1 - x / w;
        let thinner = (0.9 + 0.1 * drift[q]) * (1 - 0.16 * Math.max(0, 1 - t * 2));
        for (const [sx, sw, sv] of streaks) if (Math.abs(x - sx) < sw) thinner *= sv;
        starve[q] *= thinner;
      }
    }
    // With rotate, the plate lands turned by up to a twentieth of a degree.
    const turn = RISO.rotate ? (rand() - 0.5) * 2 * 0.0009 : 0;
    return { screen, span, starve, turn };
  });
  return (RISO.press = { key, paper, inks });
}

// ---- the camera: vignette and light leaks, before the inks are separated -------------

// Chosen once per print from its seed, so all three frames of a pull have the same
// vignette and the same leak, as a real photograph would.
function risoFilmFor(w, h, seed, k = 1) {
  const key = `${w}x${h}:${k}:${seed}:${RISO.vignette}:${RISO.leaks}`;
  if (RISO.film && RISO.film.key === key) return RISO.film;
  const rand = risoRng(risoHash(seed * 131 + 17));
  const [v0, v1] = RISO.vignette;
  const film = { vig: v0 + rand() * (v1 - v0), vx: w / 2 + (rand() - .5) * w * .12, vy: h / 2 + (rand() - .5) * h * .12, leak: null };
  if (rand() < RISO.leaks) {
    // A band in from one edge (the commonest, like a back that was opened a crack), or
    // a flare in one corner; warm, strongest at the edge, fading in.
    const edge = (rand() * 4) | 0, corner = rand() < .35;
    film.leak = { edge, corner, at: .15 + rand() * .7, reach: (.12 + rand() * .3) * Math.min(w, h),
                  strength: .45 + rand() * .45, warm: rand() < .6 ? [255, 70, 50] : [255, 140, 40],
                  wave: risoNoise(w, h, 140 * k, rand) };
  }
  film.key = key;
  return (RISO.film = film);
}
function risoFilm(img, seed, k = 1) {
  const w = img.width, h = img.height, d = img.data, f = risoFilmFor(w, h, seed, k), L = f.leak;
  const far = Math.hypot(w / 2, h / 2);
  for (let y = 0, q = 0; y < h; y++) for (let x = 0; x < w; x++, q++) {
    const p = q * 4;
    // Vignette: nothing in the middle, darkening smoothly toward the corners.
    const r = Math.hypot(x - f.vx, y - f.vy) / far, t = Math.min(1, Math.max(0, (r - .45) / .6));
    let k = 1 - f.vig * t * t * (3 - 2 * t);
    let a = 0;
    if (L) {
      // Distance in from the leak's edge (or its corner), wavering along the edge.
      const dist = L.corner
        ? Math.hypot(L.edge & 1 ? w - x : x, L.edge & 2 ? h - y : y)
        : [x, w - x, y, h - y][L.edge] + Math.abs((L.edge < 2 ? y / h : x / w) - L.at) * L.reach * 1.6;
      a = L.strength * Math.exp(-Math.pow(dist / (L.reach * (.7 + .6 * L.wave[q])), 2));
    }
    for (let c = 0; c < 3; c++) {
      const dark = d[p + c] * k;
      d[p + c] = L ? Math.min(255, dark * (1 - a) + L.warm[c] * a) : dark;
    }
  }
}

// ---- printing one frame ----------------------------------------------------------------

// k: the canvas's pixels per drawing pixel. Offsets are set in drawing pixels.
function risoPrint(canvas, frame, seed, k = 1) {
  const w = canvas.width, h = canvas.height, g = canvas.getContext("2d");
  const img = g.getImageData(0, 0, w, h);
  risoFilm(img, seed, k);
  const planes = risoSeparate(img);
  const press = risoPress(w, h, seed, k), drift = risoRng(risoHash(seed * 97 + frame * 7919));
  const out = new Float32Array(press.paper);
  // This pull's registration: each plate's usual offset, moved by up to misreg pixels.
  const reg = risoRng(risoHash(seed * 53 + 11));
  RISO.inks.forEach((ink, i) => {
    const plate = planes[i], { screen, span, starve, turn } = press.inks[i];
    const ox = ink.shift[0] + (reg() - 0.5) * 2 * RISO.misreg;
    const oy = ink.shift[1] + (reg() - 0.5) * 2 * RISO.misreg;
    // Where the plate lands this frame: this pull's offset, plus a little drift, turned by
    // its fixed fraction of a degree about the sheet's centre.
    const dx = Math.round((ox + (drift() - 0.5) * 2 * RISO.jitter) * k);
    const dy = Math.round((oy + (drift() - 0.5) * 2 * RISO.jitter) * k);
    const col = ink.rgb.map(v => v / 255), ct = Math.cos(turn), st = Math.sin(turn);
    for (let y = 0; y < h; y++) {
      const ry = y - h / 2;
      for (let x = 0; x < w; x++) {
        const rx = x - w / 2;
        const sx = turn ? Math.round(ct * rx + st * ry + w / 2) - dx : x - dx;
        const sy = turn ? Math.round(-st * rx + ct * ry + h / 2) - dy : y - dy;
        if (sx < 0 || sx >= w || sy < 0 || sy >= h) continue;
        // Starvation thins the ink. In the lights and middles that shows as smaller dots;
        // toward a solid it shows as paler ink instead, as a starved drum's solids do, so
        // a solid stays solid rather than opening gaps between its dots and lines.
        const q = y * w + x, p = plate[sy * w + sx], s = starve[q];
        const u = p <= 0.6 ? 0 : p >= 0.95 ? 1 : (p - 0.6) / 0.35, near = u * u * (3 - 2 * u);
        const c = p * (s + (1 - s) * near), pale = Math.min(1, 1 - (1 - s) * near * 0.6);
        // The share of this pixel the dot covers (see the screen in risoPress).
        const a = (c - screen[q]) / span[q];
        if (a <= 0) continue;
        const t = (a >= 1 ? 1 : a) * pale;
        for (let k = 0; k < 3; k++) out[q * 3 + k] *= 1 - t * (1 - col[k]);
      }
    }
  });
  for (let q = 0, p = 0; q < w * h; q++, p += 4) {
    img.data[p] = out[q * 3] * 255; img.data[p + 1] = out[q * 3 + 1] * 255;
    img.data[p + 2] = out[q * 3 + 2] * 255; img.data[p + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return canvas;
}

// The kit's sketchbook(), with every frame printed before it is played.
//
// The canvas's width and height are the drawing's size (800 x 800); the page decides how
// big it is shown, with CSS, and may change that at any time. The print is made at the
// size it is shown, in the screen's own pixels, and made again when that changes (a
// window resized, a phone turned, a template that lays it out differently): a halftone
// scaled by the browser beats against the screen's pixels as broad bands (moiré). The
// screen is counted in lines across, so the print looks the same at every size; only
// its dots grow and shrink with it.
function sketchbook(canvas, draw, { seed = 1, shadow = [-12, 14] } = {}) {
  if (canvas.risoStop) canvas.risoStop();  // printed before: stop its timer and watcher
  // The drawing is the same on every pull; only the print's seed takes the pull.
  const print = RISO.pull ? (seed * 7919 + RISO.pull) % 2147483647 || 1 : seed;
  const W0 = canvas.risoSize ? canvas.risoSize[0] : canvas.width;
  const H0 = canvas.risoSize ? canvas.risoSize[1] : canvas.height;
  canvas.risoSize = [W0, H0];
  canvas.width = W0; canvas.height = H0;
  surveyLines(canvas, draw, seed, shadow);  // the kit's: which outlines to draw
  const drawn = [0, 1, 2].map(f => {
    const off = document.createElement("canvas");
    off.width = W0; off.height = H0;
    useCanvas(off, seed, shadow, f); draw();
    return off;
  });
  // Keep the drawing's shape whatever width the page gives it. A page that sets no width
  // would otherwise see the canvas grow each time it is printed bigger: pin it to the
  // size it is first shown at, and never wider than its container.
  canvas.style.aspectRatio = `${W0} / ${H0}`;
  canvas.style.maxWidth = canvas.style.maxWidth || "100%";
  const before = canvas.getBoundingClientRect().width;
  canvas.width = W0 + 1;
  if (before && canvas.getBoundingClientRect().width !== before) canvas.style.width = before + "px";
  canvas.width = W0;

  const view = canvas.getContext("2d");
  let frames = [], printed = 0, i = 0;
  const show = () => { if (frames.length) { view.drawImage(frames[i], 0, 0); i = (i + 1) % 3; } };
  const printAt = W => {
    const H = Math.round(W * H0 / W0), k = W / W0;
    frames = drawn.map((d, f) => {
      const c = document.createElement("canvas");
      c.width = W; c.height = H;
      const g = c.getContext("2d", { willReadFrequently: true });
      g.imageSmoothingQuality = "high"; g.drawImage(d, 0, 0, W, H);
      return risoPrint(c, f, print, k);
    });
    printed = W; canvas.width = W; canvas.height = H;
    // All three frames of this print, for a page that saves them rather than plays them.
    canvas.risoFrames = frames;
    // What this print was given, for a page that wants to say so.
    canvas.riso = { print, width: W, ...risoScreenFor(print, W, k), film: risoFilmFor(W, H, print, k) };
    show();
    canvas.dispatchEvent(new Event("risoprint"));
  };
  // The width it is shown at, in the screen's pixels; the drawing's own size if it is
  // not on a page yet (it is printed again once it is).
  const shown = () => Math.round(canvas.getBoundingClientRect().width * devicePixelRatio) || W0;
  printAt(shown());

  let wait = 0;
  const watch = new ResizeObserver(([e]) => {
    const box = e.devicePixelContentBoxSize && e.devicePixelContentBoxSize[0];
    const W = box ? box.inlineSize : Math.round(e.contentRect.width * devicePixelRatio);
    // A pixel either way is a scale of a thousandth: not worth a second print.
    if (!W || Math.abs(W - printed) <= 1) return;
    clearTimeout(wait); wait = setTimeout(() => printAt(W), 150);
  });
  try { watch.observe(canvas, { box: "device-pixel-content-box" }); } catch (e) { watch.observe(canvas); }
  const timer = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : setInterval(show, 333);
  canvas.risoStop = () => { clearInterval(timer); clearTimeout(wait); watch.disconnect(); };
  return frames;
}
