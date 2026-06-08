/* ============================================================================
   Ligatures Summer School 2026 — UI behaviour (progressive enhancement).
   The page is fully usable without JS. The CMT acknowledgment is static HTML
   and is never touched by this script.
   ============================================================================ */
(function () {
  "use strict";

  /* ---- Mobile navigation toggle ---- */
  var toggle = document.querySelector(".nav-toggle");
  var menu = document.getElementById("nav-menu");
  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var open = menu.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    // Close the menu after choosing a destination (mobile)
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a") && menu.classList.contains("is-open")) {
        menu.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---- Back-to-top visibility ---- */
  var toTop = document.querySelector(".to-top");
  if (toTop) {
    var onScroll = function () {
      toTop.classList.toggle("is-visible", window.scrollY > 700);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---- Scroll-spy: mark the current section in the nav ---- */
  var links = Array.prototype.slice.call(
    document.querySelectorAll('.nav-menu a[href^="#"]'),
  );
  var sections = links
    .map(function (l) {
      return document.getElementById(l.getAttribute("href").slice(1));
    })
    .filter(Boolean);
  if ("IntersectionObserver" in window && sections.length) {
    var setCurrent = function (id) {
      links.forEach(function (l) {
        if (l.getAttribute("href") === "#" + id)
          l.setAttribute("aria-current", "true");
        else l.removeAttribute("aria-current");
      });
    };
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) setCurrent(entry.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
    );
    sections.forEach(function (s) {
      observer.observe(s);
    });
  }

  /* ---- Discreet light/dark theme toggle ---- */
  var themeBtn = document.querySelector(".theme-toggle");
  if (themeBtn) {
    var mql = window.matchMedia("(prefers-color-scheme: dark)");
    var STORE = "ligatures-theme";
    var root = document.documentElement;
    var current = function () {
      return (
        root.getAttribute("data-theme") || (mql.matches ? "dark" : "light")
      );
    };
    var relabel = function () {
      var next = current() === "dark" ? "light" : "dark";
      themeBtn.setAttribute("aria-label", "Switch to " + next + " theme");
      themeBtn.setAttribute("title", "Switch to " + next + " theme");
    };
    relabel();
    themeBtn.addEventListener("click", function () {
      var next = current() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try {
        localStorage.setItem(STORE, next);
      } catch (e) {}
      relabel();
    });
    if (mql.addEventListener) {
      mql.addEventListener("change", function () {
        if (!root.getAttribute("data-theme")) relabel();
      });
    }
  }

  /* ---- Layout randomizer (design exploration / testing) ------------------
     Randomizes the left-offset + width of every block inside .editorial-flow,
     respecting the 12-col rules:
        offset (cols): 0 · 3 (1/4) · 4 (1/3) · 6 (1/2)  — never more than 1/2 left
        width per offset:  0 → {6,8,9,12}   3 → {6,8,9}   4 → {6,8}   6 → {4,6}
     Flip RANDOMIZE_LAYOUT to randomize on load; press "r" to re-roll, "d" to
     restore the designed layout. Mobile always stays single-column. */
  var RANDOMIZE_LAYOUT = true;
  (function () {
    var items = Array.prototype.slice.call(
      document.querySelectorAll(".editorial-flow > *"),
    );
    if (!items.length) return;
    var OFFSETS = [0, 3, 4, 6];
    var WIDTHS = { 0: [6, 8, 9, 12], 3: [6, 8, 9], 4: [6, 8], 6: [4, 6] };
    var pick = function (arr) {
      return arr[Math.floor(Math.random() * arr.length)];
    };
    var randomize = function () {
      items.forEach(function (el) {
        var off = pick(OFFSETS);
        el.style.setProperty("--start", off + 1);
        el.style.setProperty("--w", pick(WIDTHS[off]));
      });
    };
    var restore = function () {
      items.forEach(function (el) {
        el.style.removeProperty("--start");
        el.style.removeProperty("--w");
      });
    };
    if (RANDOMIZE_LAYOUT) randomize();
    document.addEventListener("keydown", function (e) {
      if (e.key === "r" || e.key === "R") randomize();
      else if (e.key === "d" || e.key === "D") restore();
    });
  })();

  /* ---- FUTURE: Three.js interactive feature (currently inert) -------------
     Plan: mount a fixed full-viewport <canvas id="scene"> behind the content
     (see #scene in style.css). Load LSS_3D_Logo.stl; the logo's letters become
     Ammo.js rigid bodies that fall and collide with the body text blocks when
     the user scrolls past the feature. Reference implementation lives in Ana
     Coelho's version (index.js / static/). Keep it lazy-loaded and gated behind
     `prefers-reduced-motion: no-preference` + a WebGL capability check so the
     static site remains fast and fully functional without it.
     ------------------------------------------------------------------------ */
})();
