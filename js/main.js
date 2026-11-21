/* Sisters Sharing With A Purpose — site behavior (no dependencies) */
(function () {
  "use strict";

  var DESKTOP = window.matchMedia("(min-width: 960px)");

  /* ---------- Header shadow on scroll ---------- */
  var header = document.querySelector(".site-header");
  function onScroll() {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 8);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Announcement bar ----------
     Dismissal is remembered per data-announce-id, so changing the id in the
     HTML shows a new announcement to everyone again. The inline script after
     the bar hides it before first paint for visitors who already closed it. */
  var announce = document.getElementById("announce");
  if (announce) {
    var announceId = announce.getAttribute("data-announce-id");
    var closeBtn = announce.querySelector(".announce-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        announce.hidden = true;
        try { localStorage.setItem("announce-dismissed", announceId); } catch (e) {}
      });
    }
  }

  /* ---------- Mobile nav ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("primary-nav");

  function setNav(open) {
    if (!toggle || !nav) return;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.querySelector(".toggle-label").textContent = open ? "Close" : "Menu";
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("nav-open", open && !DESKTOP.matches);
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      setNav(toggle.getAttribute("aria-expanded") !== "true");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setNav(false);
    });
    DESKTOP.addEventListener("change", function () { setNav(false); closeAllSubs(); });
  }

  /* ---------- Dropdown (Get Involved) ---------- */
  var subs = Array.prototype.slice.call(document.querySelectorAll(".has-sub"));

  function closeAllSubs(except) {
    subs.forEach(function (li) {
      if (li === except) return;
      li.classList.remove("is-open");
      var b = li.querySelector(".sub-toggle");
      if (b) b.setAttribute("aria-expanded", "false");
    });
  }

  subs.forEach(function (li) {
    var btn = li.querySelector(".sub-toggle");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var open = !li.classList.contains("is-open");
      closeAllSubs(li);
      li.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
    });
    // Desktop: close when focus leaves the dropdown
    li.addEventListener("focusout", function (e) {
      if (DESKTOP.matches && !li.contains(e.relatedTarget)) {
        li.classList.remove("is-open");
        btn.setAttribute("aria-expanded", "false");
      }
    });
  });

  document.addEventListener("click", function (e) {
    if (DESKTOP.matches && !e.target.closest(".has-sub")) closeAllSubs();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    var openSub = document.querySelector(".has-sub.is-open");
    if (openSub) {
      closeAllSubs();
      var b = openSub.querySelector(".sub-toggle");
      if (b) b.focus();
      return;
    }
    if (nav && nav.classList.contains("is-open")) {
      setNav(false);
      toggle.focus();
    }
  });

  /* ---------- Image fallbacks ----------
     Until real photos are added to /images, show a styled placeholder
     instead of a broken-image icon. */
  function markMissing(img) {
    var wrap = img.closest(".media, .hero-media");
    if (wrap) wrap.classList.add("is-missing");
  }
  document.querySelectorAll(".media img, .hero-media img").forEach(function (img) {
    if (img.complete && img.naturalWidth === 0) markMissing(img);
    img.addEventListener("error", function () { markMissing(img); });
  });

  /* ---------- Forms ----------
     Forms whose action is "#" run in demo mode: they validate and show the
     thank-you message without sending anything. Point the action at a real
     form handler (Formspree, Netlify Forms, Mailchimp, etc.) to go live. */
  document.querySelectorAll("form[data-form]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      var action = form.getAttribute("action");
      if (action && action !== "#") return; // real endpoint: let it submit
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      form.classList.add("is-sent");
      form.reset();
      var status = form.querySelector(".form-status") || form.parentElement.querySelector(".form-status");
      if (status) { status.setAttribute("tabindex", "-1"); status.focus(); }
    });
  });

  /* ---------- Copy to clipboard (Cash App handle) ---------- */
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      var done = function () {
        var original = btn.textContent;
        btn.textContent = "Copied!";
        setTimeout(function () { btn.textContent = original; }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () {});
      }
    });
  });

  /* ---------- Lightbox ---------- */
  var tiles = Array.prototype.slice.call(document.querySelectorAll("[data-lightbox]"));
  if (tiles.length && typeof HTMLDialogElement === "function") {
    var icon = function (d) {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>";
    };
    var dlg = document.createElement("dialog");
    dlg.className = "lightbox";
    dlg.setAttribute("aria-label", "Photo viewer");
    dlg.innerHTML =
      '<figure><img alt=""><figcaption></figcaption></figure>' +
      '<button class="lb-btn lb-close" type="button" aria-label="Close">' + icon('<path d="M18 6 6 18M6 6l12 12"/>') + "</button>" +
      '<button class="lb-btn lb-prev" type="button" aria-label="Previous photo">' + icon('<path d="m15 18-6-6 6-6"/>') + "</button>" +
      '<button class="lb-btn lb-next" type="button" aria-label="Next photo">' + icon('<path d="m9 18 6-6-6-6"/>') + "</button>";
    document.body.appendChild(dlg);

    var lbImg = dlg.querySelector("img");
    var lbCap = dlg.querySelector("figcaption");
    var group = [];
    var index = 0;

    function show(i) {
      index = (i + group.length) % group.length;
      var t = group[index];
      var img = t.querySelector("img");
      lbImg.src = t.getAttribute("href");
      lbImg.alt = img ? img.alt : "";
      var cap = t.getAttribute("data-caption") || (img ? img.alt : "");
      lbCap.textContent = cap + (group.length > 1 ? "  (" + (index + 1) + " of " + group.length + ")" : "");
      var multi = group.length > 1;
      dlg.querySelector(".lb-prev").hidden = !multi;
      dlg.querySelector(".lb-next").hidden = !multi;
    }

    tiles.forEach(function (t) {
      t.addEventListener("click", function (e) {
        // If the photo hasn't been added yet, don't open an empty viewer.
        if (t.querySelector(".media.is-missing")) { e.preventDefault(); return; }
        e.preventDefault();
        var name = t.getAttribute("data-lightbox");
        group = tiles.filter(function (x) { return x.getAttribute("data-lightbox") === name; });
        show(group.indexOf(t));
        dlg.showModal();
      });
    });

    dlg.querySelector(".lb-close").addEventListener("click", function () { dlg.close(); });
    dlg.querySelector(".lb-prev").addEventListener("click", function () { show(index - 1); });
    dlg.querySelector(".lb-next").addEventListener("click", function () { show(index + 1); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") show(index - 1);
      if (e.key === "ArrowRight") show(index + 1);
    });

    // Swipe on touch screens
    var startX = null;
    dlg.addEventListener("touchstart", function (e) { startX = e.touches[0].clientX; }, { passive: true });
    dlg.addEventListener("touchend", function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
      startX = null;
    });
  }

  /* ---------- Donation modal (Givebutter) ----------
     A link like <a href="https://givebutter.com/XXXX" data-donate-modal="https://givebutter.com/embed/c/XXXX">
     opens the campaign's embed page in a popup. Givebutter's regular campaign page refuses to load in
     an iframe (X-Frame-Options: sameorigin); the /embed/c/ URL is the one built for framing. Without
     JavaScript or <dialog> support the link just opens Givebutter. */
  var donateLinks = document.querySelectorAll("[data-donate-modal]");
  if (donateLinks.length && typeof HTMLDialogElement === "function") {
    var donateDlg = null;
    var donateFrame = null;
    var donateOpener = null;
    var buildDonateDialog = function () {
      var x = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
      var ext = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>';
      donateDlg = document.createElement("dialog");
      donateDlg.className = "donate-modal";
      donateDlg.setAttribute("aria-labelledby", "donate-modal-title");
      donateDlg.innerHTML =
        '<div class="donate-modal-panel">' +
          '<div class="donate-modal-bar">' +
            '<p class="donate-modal-title" id="donate-modal-title"></p>' +
            '<a class="donate-modal-ext" target="_blank" rel="noopener">Open in new tab ' + ext + "</a>" +
            '<button class="donate-modal-close" type="button" aria-label="Close donation form">' + x + "</button>" +
          "</div>" +
          '<div class="donate-modal-body"><p class="donate-modal-loading">Loading secure donation form&hellip;</p>' +
            '<iframe allow="payment"></iframe></div>' +
        "</div>";
      document.body.appendChild(donateDlg);
      donateFrame = donateDlg.querySelector("iframe");
      donateFrame.addEventListener("load", function () { donateDlg.classList.add("is-loaded"); });
      donateDlg.querySelector(".donate-modal-close").addEventListener("click", function () { donateDlg.close(); });
      // Click on the dimmed backdrop (outside the panel) closes it.
      donateDlg.addEventListener("click", function (e) { if (e.target === donateDlg) donateDlg.close(); });
      donateDlg.addEventListener("close", function () {
        document.documentElement.classList.remove("modal-open");
        if (donateOpener) donateOpener.focus();
      });
    };
    Array.prototype.forEach.call(donateLinks, function (link) {
      link.addEventListener("click", function (e) {
        // Let modified clicks (new tab/window) behave like a normal link.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        if (!donateDlg) buildDonateDialog();
        var src = link.getAttribute("data-donate-modal");
        var title = link.getAttribute("data-donate-title") || "Donate";
        donateDlg.querySelector(".donate-modal-title").textContent = title;
        donateDlg.querySelector(".donate-modal-ext").href = link.href;
        donateFrame.title = title + " donation form (Givebutter)";
        // Load the form only on first open, so pages don't pull in Givebutter until someone asks.
        if (donateFrame.getAttribute("src") !== src) {
          donateDlg.classList.remove("is-loaded");
          donateFrame.src = src;
        }
        donateOpener = link;
        document.documentElement.classList.add("modal-open");
        donateDlg.showModal();
      });
    });
  }

  /* ---------- Hero carousel (home page) ----------
     Two slides (headline, quote) with one round "next" button. A gold ring on the button fills up over
     INTERVAL ms; when it's full the next slide shows and the ring starts again. The ring is driven by the
     Web Animations API (element.animate), which restarts reliably in every browser, and its "finish" event
     is the slide timer, so the ring and the slide change can never drift apart.
     Pauses (ring frozen) while hovered, while keyboard focus is inside, and while the tab is hidden.
     Clicking "next" moves on and restarts the countdown. No autoplay with "reduce motion" on. */
  var carousel = document.querySelector(".hero-carousel");
  if (carousel) {
    var INTERVAL = 8000;
    var slides = Array.prototype.slice.call(carousel.querySelectorAll(".hero-slide"));
    var nextBtn = carousel.querySelector(".hero-next");
    var ring = carousel.querySelector(".hero-ring-fill");
    var live = carousel.querySelector(".hero-slides");
    var autoplay = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var canAnimate = !!(ring && ring.animate);
    var current = 0;
    var ringAnim = null;
    var timer = null;          // fallback timer, only for browsers without element.animate
    var startedAt = 0;
    var remaining = INTERVAL;
    var hovering = false;
    var keyboardInside = false;

    var isHeld = function () { return hovering || keyboardInside || document.hidden; };
    var pauseTimer = function () {
      if (!timer) return;
      remaining = Math.max(0, remaining - (Date.now() - startedAt));
      clearTimeout(timer); timer = null;
    };
    var resumeTimer = function () {
      if (timer || !autoplay) return;
      startedAt = Date.now();
      timer = setTimeout(function () { timer = null; show(current + 1); }, remaining);
    };
    var stopCountdown = function () {
      if (ringAnim) { ringAnim.onfinish = null; ringAnim.cancel(); ringAnim = null; } // cancel = ring back to empty
      if (timer) { clearTimeout(timer); timer = null; }
    };
    var startCountdown = function () {
      stopCountdown();
      if (!autoplay) return;
      if (canAnimate) {
        ringAnim = ring.animate(
          [{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }],
          { duration: INTERVAL, easing: "linear", fill: "forwards" }
        );
        ringAnim.onfinish = function () { show(current + 1); };
        if (isHeld()) ringAnim.pause();
      } else {
        remaining = INTERVAL;
        if (!isHeld()) resumeTimer();
      }
    };
    var syncHold = function () {
      var held = isHeld();
      carousel.classList.toggle("is-paused", held && autoplay);
      // Announce slide changes when a keyboard user is driving, not while it rotates on its own.
      live.setAttribute("aria-live", autoplay && !keyboardInside ? "off" : "polite");
      if (ringAnim) {
        if (held && ringAnim.playState === "running") ringAnim.pause();
        else if (!held && ringAnim.playState === "paused") ringAnim.play();
      } else if (!canAnimate && autoplay) {
        if (held) pauseTimer(); else resumeTimer();
      }
    };
    function show(i) {
      current = (i + slides.length) % slides.length;
      slides.forEach(function (s, n) {
        var on = n === current;
        s.classList.toggle("is-active", on);
        s.toggleAttribute("inert", !on); // hidden slide's links can't be tabbed to
        if (on) s.removeAttribute("aria-hidden"); else s.setAttribute("aria-hidden", "true");
      });
      startCountdown();
    }

    nextBtn.addEventListener("click", function () { show(current + 1); });
    nextBtn.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      show(current + (e.key === "ArrowRight" ? 1 : -1));
    });
    carousel.addEventListener("mouseenter", function () { hovering = true; syncHold(); });
    carousel.addEventListener("mouseleave", function () { hovering = false; syncHold(); });
    // Only keyboard focus pauses it. A mouse click also focuses the button in some browsers,
    // and that shouldn't leave the slideshow frozen after the pointer moves away.
    carousel.addEventListener("focusin", function (e) {
      var kb = true;
      try { kb = e.target.matches(":focus-visible"); } catch (err) { /* older browsers: treat as keyboard */ }
      keyboardInside = kb;
      syncHold();
    });
    carousel.addEventListener("focusout", function (e) {
      if (!carousel.contains(e.relatedTarget)) { keyboardInside = false; syncHold(); }
    });
    document.addEventListener("visibilitychange", syncHold);

    // Slide 1 is already showing (and rising in via CSS); this sets up inert/aria state and starts the ring.
    carousel.classList.add("is-ready");
    carousel.classList.toggle("is-stopped", !autoplay);
    syncHold();
    show(0);
  }

  /* ---------- Phone-only collapsing ----------
     Below 720px, long content folds away; at 720px and up everything is open, as before.
     1. <details class="m-collapse">: closed on phones (unless it has data-open-mobile), always open and
        not toggleable on wider screens. A link to an id inside one (or to a section holding one) opens it.
     2. data-readmore on a block of prose: clamped on phones, with a "Read more / Show less" button.
        Optional data-readmore="14em" sets the clamped height.
     3. data-show-more="N" on a list or grid: only the first N children show on phones, plus a
        "Show more" button. Without JavaScript, all three simply show everything. */
  var WIDE = window.matchMedia("(min-width: 720px)");
  var collapses = Array.prototype.slice.call(document.querySelectorAll("details.m-collapse"));

  function syncCollapses() {
    collapses.forEach(function (d) {
      var summary = d.querySelector(":scope > summary");
      if (WIDE.matches) {
        d.open = true;
        if (summary) summary.setAttribute("tabindex", "-1"); // reads as a heading, not a control
      } else {
        d.open = d.hasAttribute("data-open-mobile");
        if (summary) summary.removeAttribute("tabindex");
      }
    });
  }
  function collapseFor(el) {
    if (!el) return null;
    if (el.matches && el.matches("details.m-collapse")) return el;
    return el.closest("details.m-collapse") || el.querySelector("details.m-collapse");
  }
  function openTarget(id, scroll) {
    var el = id && document.getElementById(id);
    var d = collapseFor(el);
    if (!d || d.open) return;
    d.open = true;
    if (scroll) el.scrollIntoView();
  }

  if (collapses.length) {
    syncCollapses();
    WIDE.addEventListener("change", syncCollapses);
    document.addEventListener("click", function (e) {
      // Wider screens: keep every panel open.
      var s = e.target.closest("details.m-collapse > summary");
      if (s && WIDE.matches) { e.preventDefault(); return; }
      // In-page links (e.g. the gallery's album chips) open their panel before the browser scrolls to it.
      var a = e.target.closest('a[href*="#"]');
      if (a && a.pathname === location.pathname && a.hash) openTarget(decodeURIComponent(a.hash.slice(1)), false);
    });
    window.addEventListener("hashchange", function () { openTarget(decodeURIComponent(location.hash.slice(1)), true); });
    if (location.hash) openTarget(decodeURIComponent(location.hash.slice(1)), true);
  }

  Array.prototype.forEach.call(document.querySelectorAll("[data-readmore]"), function (box, n) {
    if (!box.id) box.id = "readmore-" + (n + 1);
    var h = box.getAttribute("data-readmore");
    if (h) box.style.setProperty("--readmore-height", h);
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "readmore-btn";
    btn.setAttribute("aria-controls", box.id);
    btn.setAttribute("aria-expanded", "false");
    box.insertAdjacentElement("afterend", btn);

    function update() {
      var expanded = btn.getAttribute("aria-expanded") === "true";
      box.classList.remove("is-clamped");
      if (WIDE.matches) { btn.hidden = true; return; }
      box.classList.add("is-clamped");
      var overflows = box.scrollHeight > box.clientHeight + 8;
      if (!overflows && !expanded) { box.classList.remove("is-clamped"); btn.hidden = true; return; }
      btn.hidden = false;
      if (expanded) box.classList.remove("is-clamped");
      btn.textContent = expanded ? "Show less" : "Read more";
    }
    btn.addEventListener("click", function () {
      var expand = btn.getAttribute("aria-expanded") !== "true";
      btn.setAttribute("aria-expanded", String(expand));
      update();
      if (!expand && box.getBoundingClientRect().top < 0) box.scrollIntoView({ block: "start" });
    });
    WIDE.addEventListener("change", update);
    window.addEventListener("load", update); // re-measure once fonts and images are in
    update();
  });

  Array.prototype.forEach.call(document.querySelectorAll("[data-show-more]"), function (list, n) {
    var limit = parseInt(list.getAttribute("data-show-more"), 10) || 4;
    var items = Array.prototype.slice.call(list.children);
    if (items.length <= limit) return;
    if (!list.id) list.id = "show-more-" + (n + 1);
    var expanded = false;
    var wrap = document.createElement("div");
    wrap.className = "show-more-wrap";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "show-more-btn";
    btn.setAttribute("aria-controls", list.id);
    btn.setAttribute("aria-expanded", "false");
    btn.textContent = (list.getAttribute("data-show-more-label") || "Show {n} more").replace("{n}", items.length - limit);
    wrap.appendChild(btn);
    list.insertAdjacentElement("afterend", wrap);

    function update() {
      var fold = !WIDE.matches && !expanded;
      items.forEach(function (it, i) { it.hidden = fold && i >= limit; });
      wrap.hidden = !fold;
    }
    btn.addEventListener("click", function () {
      expanded = true;
      btn.setAttribute("aria-expanded", "true");
      update();
      // Move focus to the first newly shown item so keyboard users land on the new content.
      var first = items[limit];
      var target = first.matches("a, button") ? first : first.querySelector("a, button");
      if (target) target.focus();
    });
    WIDE.addEventListener("change", update);
    update();
  });

  /* ---------- Parallax (desktop only) ----------
     On screens 960px+ with a mouse or trackpad, and only when the visitor hasn't asked for reduced motion,
     this adds html.parallax-on and sets --p on each section below as it scrolls by: -1 when it enters at the
     bottom of the window, 0 when centered, 1 when it leaves at the top. css/styles.css ("Parallax") turns --p
     into small movements of the layers inside (butterflies, photos, frames). To add a section, give it
     data-parallax and write a rule for its layers. Phones, tablets and reduced-motion visitors get nothing. */
  var PARALLAX_ON = window.matchMedia("(min-width: 960px) and (hover: hover) and (prefers-reduced-motion: no-preference)");
  var layers = Array.prototype.slice.call(document.querySelectorAll(".hero--butterfly, .page-hero, .feature-band, .media-frame, [data-parallax]"));
  if (layers.length && "IntersectionObserver" in window) {
    var onScreen = [];
    var ticking = false;
    var paint = function () {
      ticking = false;
      if (!PARALLAX_ON.matches) return;
      var vh = window.innerHeight;
      onScreen.forEach(function (el) {
        var r = el.getBoundingClientRect(); // the section itself never moves, only its layers, so this is stable
        var p = (vh / 2 - (r.top + r.height / 2)) / ((vh + r.height) / 2);
        el.style.setProperty("--p", Math.max(-1, Math.min(1, p)).toFixed(4));
      });
    };
    var requestPaint = function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(paint); }
    };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var i = onScreen.indexOf(en.target);
        if (en.isIntersecting && i < 0) onScreen.push(en.target);
        if (!en.isIntersecting && i >= 0) onScreen.splice(i, 1);
      });
      requestPaint();
    }, { rootMargin: "120px 0px" });
    var setParallax = function () {
      var on = PARALLAX_ON.matches;
      document.documentElement.classList.toggle("parallax-on", on);
      if (on) {
        layers.forEach(function (el) { io.observe(el); });
        window.addEventListener("scroll", requestPaint, { passive: true });
        window.addEventListener("resize", requestPaint, { passive: true });
        requestPaint();
      } else {
        io.disconnect();
        onScreen = [];
        window.removeEventListener("scroll", requestPaint);
        window.removeEventListener("resize", requestPaint);
        layers.forEach(function (el) { el.style.removeProperty("--p"); });
      }
    };
    PARALLAX_ON.addEventListener("change", setParallax);
    setParallax();
  }

  /* ---------- Fade in on scroll ----------
     Blocks inside each section (headings, text, photos) fade and rise into place as they come on screen;
     items in a row of cards, photos or stats arrive one after another. Anything already on screen when the
     page opens is left alone (hiding it after the first paint would make it flicker). After its animation each element goes back to normal (so hover effects aren't slowed down).
     Skipped entirely for "reduce motion" visitors and browsers without IntersectionObserver: everything
     simply shows. Without JavaScript nothing is ever hidden. */
  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)");
  if ("IntersectionObserver" in window && !REDUCED.matches) {
    var ROWS = ".grid, .grid-2, .grid-3, .post-grid, .photo-grid, .stats, .area-list, .steps, .split, .event-facts, .spotlight-facts";
    var SKIP = "script, style, .hero-butterfly, .page-hero-art, [aria-hidden='true']";
    var revealTargets = [];
    var fold = window.innerHeight;
    var addReveal = function (el, i) {
      var r = el.getBoundingClientRect();
      if (r.height === 0 || r.top < fold) return; // on screen already, or hidden (closed panel, "show more")
      el.classList.add("reveal");
      if (i) el.style.setProperty("--reveal-i", Math.min(i, 5));
      revealTargets.push(el);
    };
    var walk = function (parent, stagger) {
      var kids = Array.prototype.filter.call(parent.children, function (c) { return !c.matches(SKIP); });
      var isRow = stagger || parent.matches(ROWS);
      kids.forEach(function (c, i) {
        if (!isRow && c.matches(ROWS)) walk(c, false); // reveal the row's items one by one
        else addReveal(c, isRow ? i : 0);
      });
    };
    document.querySelectorAll("main > .section > .container").forEach(function (c) { walk(c, false); });

    var finish = function (el) {
      el.classList.remove("reveal", "is-visible");
      el.style.removeProperty("--reveal-i");
    };
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        revealIO.unobserve(el);
        el.classList.add("is-visible");
        var done = function (e) {
          if (e && e.target !== el) return; // ignore transitions bubbling up from children
          el.removeEventListener("transitionend", done);
          finish(el);
        };
        el.addEventListener("transitionend", done);
        setTimeout(function () { finish(el); }, 1600); // in case transitionend never fires
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    document.documentElement.classList.add("reveal-ready");
    revealTargets.forEach(function (el) { revealIO.observe(el); });
  }

  /* ---------- Footer year ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
