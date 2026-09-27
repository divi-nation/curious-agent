// The player: prints a frozen photo's three frames at the size the reader's
// own screen shows them, with site/riso.js — the same print the develop job's
// kit makes, at any width, with no model code on the site. Ours and fixed
// (extension.py's SITE_SCRIPTS); see AUTHORING.md's "Speak at it".
//
// One card prints at a time, the ones nearest the viewport first. A card that
// fails — a frame that will not decode, riso.js not loaded, risoPrint
// throwing — falls back to its still and stops trying.
(function () {
  "use strict";
  // No riso.js, no print: every card shows its still rather than developing
  // for ever.
  if (typeof risoPrint !== "function") {
    var stills = document.querySelectorAll("[data-lomo]");
    for (var s = 0; s < stills.length; s++) showStill(stills[s]);
    return;
  }

  var MAX_WIDTH = 1200;
  var FRAME_MS = 333;
  var RESIZE_DEBOUNCE_MS = 150;
  var reduced = matchMedia("(prefers-reduced-motion: reduce)");

  function widthFor(el) {
    var dpr = window.devicePixelRatio || 1;
    var w = Math.round(el.getBoundingClientRect().width * dpr) || 800;
    return Math.min(w, MAX_WIDTH);
  }

  function printSeed(el) {
    var seed = parseInt(el.getAttribute("data-seed"), 10) || 1;
    var pull = parseInt(el.getAttribute("data-pull"), 10) || 0;
    return (seed * 7919 + pull) % 2147483647 || 1;
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error("could not decode " + src)); };
      img.src = src;
    });
  }

  // After the next paint, not merely the next task: a setTimeout alone can run
  // before the browser paints, so three frames printed in a row held the page
  // in one piece. A hidden tab paints nothing, so a print waits there until
  // the reader comes back.
  function afterPaint() {
    return new Promise(function (resolve) {
      requestAnimationFrame(function () { setTimeout(resolve, 0); });
    });
  }

  // The still, and its caption — never anyone's markup, only attributes and
  // text this same page already carries.
  function showStill(card) {
    var captionEl = card.querySelector(".lomo-caption");
    var text = captionEl ? captionEl.textContent : "";
    var win = card.querySelector(".window"), dev = card.querySelector(".dev");
    if (win) win.remove();
    if (dev) dev.remove();
    var img = document.createElement("img");
    img.width = 960; img.height = 600;
    img.alt = text;
    img.src = card.getAttribute("data-still") || "";
    card.insertBefore(img, card.firstChild);
    card.classList.add("printed");
  }

  function Card(el) {
    this.el = el;
    this.frameUrls = (el.getAttribute("data-frames") || "").split(" ").filter(Boolean);
    this.canvas = null;
    this.frames = null;
    this.frameIndex = 0;
    this.timer = 0;
    this.printedWidth = 0;
    this.printing = false;
    this.visible = false;
    this.failed = false;
  }

  Card.prototype.ensureCanvas = function () {
    if (this.canvas) return;
    var captionEl = this.el.querySelector(".lomo-caption");
    var win = this.el.querySelector(".window"), dev = this.el.querySelector(".dev");
    if (win) win.remove();
    if (dev) dev.remove();
    var canvas = document.createElement("canvas");
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", captionEl ? captionEl.textContent : "");
    this.el.insertBefore(canvas, this.el.firstChild);
    this.el.classList.add("printed");
    this.canvas = canvas;
  };

  Card.prototype.show = function (i) {
    if (!this.frames || !this.canvas) return;
    this.canvas.getContext("2d").drawImage(this.frames[i], 0, 0);
  };

  Card.prototype.startTimer = function () {
    this.stopTimer();
    if (reduced.matches || !this.frames) return;
    var self = this;
    this.timer = setInterval(function () {
      self.frameIndex = (self.frameIndex + 1) % 3;
      self.show(self.frameIndex);
    }, FRAME_MS);
  };

  Card.prototype.stopTimer = function () {
    if (this.timer) { clearInterval(this.timer); this.timer = 0; }
  };

  // One print at the card's current width — a no-op if it is already printed
  // at that width, or has already fallen back to its still. Resolves once the
  // attempt is over, success or failure, so the queue can move on; it never
  // rejects.
  Card.prototype.print = function () {
    if (this.failed) return Promise.resolve();
    var W = widthFor(this.el);
    if (W === this.printedWidth) return Promise.resolve();
    this.printing = true;
    var self = this, seed = printSeed(this.el);
    var H = Math.round(W * 500 / 800), k = W / 800;
    return Promise.all(this.frameUrls.map(loadImage)).then(
      function (images) {
        // One frame per paint, so the page can scroll and paint between them.
        var frames = [];
        return images.reduce(function (done, image, f) {
          return done.then(afterPaint).then(function () {
            var c = document.createElement("canvas");
            c.width = W; c.height = H;
            var g = c.getContext("2d", { willReadFrequently: true });
            g.imageSmoothingQuality = "high";
            g.drawImage(image, 0, 0, W, H);
            frames.push(risoPrint(c, f, seed, k));
          });
        }, Promise.resolve()).then(function () { return frames; });
      }
    ).then(
      function (frames) {
        self.printing = false;
        self.frames = frames;
        self.printedWidth = W;
        self.ensureCanvas();
        self.canvas.width = W; self.canvas.height = H;
        self.frameIndex = 0;
        self.show(0);
        self.startTimer();
      },
      function () {
        self.printing = false;
        self.failed = true;
        self.stopTimer();
        showStill(self.el);
      }
    );
  };

  var cards = new Map();
  function cardFor(el) {
    var card = cards.get(el);
    if (!card) { card = new Card(el); cards.set(el, card); }
    return card;
  }

  var queue = [], pumping = false;

  function pump() {
    if (pumping || !queue.length) return;
    pumping = true;
    var card = queue.shift();
    card.print().then(function () { pumping = false; pump(); });
  }

  function enqueue(card) {
    if (card.failed || card.printing || queue.indexOf(card) !== -1) return;
    queue.push(card);
    pump();
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var card = cardFor(entry.target);
      card.visible = entry.isIntersecting;
      if (entry.isIntersecting) {
        enqueue(card);
        if (card.frames) card.startTimer();
      } else {
        card.stopTimer();
      }
    });
  }, { rootMargin: "200px" });

  var els = document.querySelectorAll("[data-lomo]");
  for (var i = 0; i < els.length; i++) io.observe(els[i]);

  document.addEventListener("visibilitychange", function () {
    cards.forEach(function (card) {
      if (document.hidden) card.stopTimer();
      else if (card.visible) card.startTimer();
    });
  });

  if (typeof reduced.addEventListener === "function") {
    reduced.addEventListener("change", function () {
      cards.forEach(function (card) {
        if (reduced.matches) card.stopTimer();
        else if (card.visible) card.startTimer();
      });
    });
  }

  var resizeTimer = 0;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      cards.forEach(function (card) {
        if (card.visible) enqueue(card);
      });
    }, RESIZE_DEBOUNCE_MS);
  });
})();
