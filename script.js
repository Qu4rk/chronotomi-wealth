// Preloader Logic
const preloaderEl = document.getElementById('preloader');

if (!sessionStorage.getItem('chronotomi-preloader-shown')) {
  let preloaderProgress = 0;
  const preloaderFillEl = document.querySelector('.preloader-text-fill');

  const preloaderInterval = setInterval(() => {
    preloaderProgress += Math.random() * 15;
    if (preloaderProgress > 90) preloaderProgress = 90;
    if (preloaderFillEl) preloaderFillEl.style.width = `${preloaderProgress}%`;
  }, 150);

  window.addEventListener('load', () => {
    clearInterval(preloaderInterval);
    if (preloaderFillEl) preloaderFillEl.style.width = '100%';
    setTimeout(() => {
      if (preloaderEl) preloaderEl.classList.add('is-hidden');
      sessionStorage.setItem('chronotomi-preloader-shown', 'true');
    }, 400); // slight delay to show 100% full text
  });
}

const INSTAGRAM_URL =
  "https://www.instagram.com/chronotomi.wealth?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==";

const inventoryGrid = document.querySelector("#inventory-grid");
const filterButtons = document.querySelectorAll(".filter-chip");
const selectedWatch = document.querySelector("#selected-watch");
const selectedMessage = document.querySelector("#selected-message");
const copyButton = document.querySelector("#copy-reference");
const copyFeedback = document.querySelector("#copy-feedback");
const instagramLink = document.querySelector("#instagram-inquire");

let activeWatch = null;

// Intersection Observer for Reveal animations
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
      }
    });
  },
  {
    threshold: 0.05,
    rootMargin: "0px 0px -10% 0px"
  }
);

function renderInventory(filter = "All") {
  if (!inventoryGrid) return;

  const filteredWatches =
    filter === "All" ? watches : watches.filter((watch) => watch.brand === filter);

  if (filteredWatches.length === 0) {
    inventoryGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 4rem;">
        <span class="eyebrow">No Matches</span>
        <h3>No watches are listed in this category right now.</h3>
        <p style="color: var(--muted); margin-top: 1rem;">Please check another brand or inquire directly.</p>
      </div>
    `;
    return;
  }

  inventoryGrid.innerHTML = filteredWatches
    .map(
      (watch) => `
        <article class="inventory-card reveal" style="position: relative; overflow: hidden;">
          <div class="inventory-image" style="position: relative; z-index: 1;">
            <picture>
              <source type="image/avif" srcset="${watch.image.replace(/\.(png|jpe?g)$/i, '.avif')}" />
              <source type="image/webp" srcset="${watch.image.replace(/\.(png|jpe?g)$/i, '.webp')}" />
              <img src="${watch.image}" alt="${watch.brand} ${watch.model}" loading="lazy" decoding="async" />
            </picture>
          </div>
          <div style="padding: 0 2rem 3rem;">
            <span class="inventory-brand text-mask"><span class="text-mask-inner">${watch.brand}</span></span>
            <div class="inventory-copy">
              <span class="eyebrow text-mask" style="margin-bottom: 0.5rem; letter-spacing: 0.1em; color: var(--text);"><span class="text-mask-inner delay-1">${watch.reference}</span></span>
              <h3><span class="text-mask"><span class="text-mask-inner delay-2">${watch.model}</span></span></h3>
            </div>

            <div class="inventory-specs" style="margin-bottom: 3rem;">
              <span>${watch.caseSize}</span>
            </div>

            <div class="inventory-actions">
              <button
                class="btn-primary js-select-watch"
                type="button"
                data-watch="${watch.brand} ${watch.model}"
                data-reference="${watch.reference}"
                style="width: 100%;"
              >
                Inquire
              </button>
            </div>
          </div>
        </article>
      `
    )
    .join("");

  document.querySelectorAll(".js-select-watch").forEach((button) => {
    button.addEventListener("click", () => {
      const watchName = button.dataset.watch;
      const reference = button.dataset.reference;

      activeWatch = watches.find((watch) => watch.reference === reference) ?? activeWatch;
      selectedWatch.textContent = watchName;
      selectedMessage.textContent =
        "Reference loaded. Reach out via Instagram or send a direct email.";
      copyFeedback.textContent = "Ready to discuss privately.";

      const clientMessageInput = document.querySelector("#client-message");
      if (clientMessageInput) {
        clientMessageInput.value = `I am inquiring about the ${watchName} (Ref. ${reference}). `;
      }

      const whatsappLink = document.querySelector("#whatsapp-inquire");
      if (whatsappLink) {
        whatsappLink.href = `https://wa.me/35799426514?text=${encodeURIComponent(`Hello, I would like to inquire about the ${watchName} (Ref. ${reference}).`)}`;
      }

      document.querySelector("#inquire").scrollIntoView({ behavior: "smooth" });
    });
  });

  // Observe newly created cards
  requestAnimationFrame(() => {
    document.querySelectorAll(".inventory-card").forEach((card) => {
      revealObserver.observe(card);
    });
  });
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filterButtons.forEach((chip) => chip.classList.remove("is-active"));
    button.classList.add("is-active");
    renderInventory(button.dataset.filter);
  });
});

if (instagramLink) {
  instagramLink.href = INSTAGRAM_URL;
}

if (copyButton) {
  copyButton.addEventListener("click", async () => {
    if (!activeWatch) {
      copyFeedback.textContent = "Please select a watch first.";
      return;
    }
    const details = `${selectedWatch.textContent} | Ref. ${activeWatch.reference}`;

    try {
      await navigator.clipboard.writeText(details);
      copyFeedback.textContent = "Watch reference copied.";
    } catch (error) {
      copyFeedback.textContent = "Copy is not available here. Mention the selected watch manually.";
    }
  });
}

const advisoryInstagram = document.querySelector("#advisory-instagram");
if (advisoryInstagram) {
  advisoryInstagram.href = INSTAGRAM_URL;
}

const advisoryCopyButton = document.querySelector("#advisory-copy");
const advisoryCopyFeedback = document.querySelector("#copy-feedback");
if (advisoryCopyButton) {
  advisoryCopyButton.addEventListener("click", async () => {
    if (!activeService) {
      advisoryCopyFeedback.textContent = "Please select a service first.";
      return;
    }
    const details = `${activeService} Service`;

    try {
      await navigator.clipboard.writeText(details);
      advisoryCopyFeedback.textContent = "Service copied.";
    } catch (error) {
      advisoryCopyFeedback.textContent = "Copy is not available here. Mention the service manually.";
    }
  });
}

let activeService = null;

document.querySelectorAll(".js-select-service").forEach((button) => {
  button.addEventListener("click", () => {
    activeService = button.dataset.service;
    document.querySelector("#selected-service").textContent = activeService;

    const clientMessageInput = document.querySelector("#client-message");
    if (clientMessageInput) {
      clientMessageInput.value = `I am interested in scheduling a consultation regarding ${activeService}. `;
    }

    const whatsappLink = document.querySelector("#advisory-whatsapp");
    if (whatsappLink) {
      whatsappLink.href = `https://wa.me/35799426514?text=${encodeURIComponent(`Hello, I would like to discuss the ${activeService} service.`)}`;
    }
    
    if (copyFeedback) {
      copyFeedback.textContent = "Ready to discuss securely.";
    }

    document.querySelector("#inquire").scrollIntoView({ behavior: "smooth" });
  });
});

// --- Email Form Handlers (Automatic Background Sending) ---
function sendEmailData(data, formElement) {
  const button = formElement.querySelector('button[type="submit"]');
  const originalText = button.textContent;
  button.textContent = "Sending...";
  button.disabled = true;

  fetch("https://formsubmit.co/ajax/info@chronotomi.com", {
    method: "POST",
    headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    body: JSON.stringify(data)
  })
  .then(response => response.json())
  .then(result => {
    if(result.success) {
      button.textContent = "Sent Successfully";
      formElement.reset();
    } else {
      button.textContent = "Error Sending";
    }
    setTimeout(() => {
      button.textContent = originalText;
      button.disabled = false;
    }, 4000);
  })
  .catch(error => {
    console.error("Email send error:", error);
    button.textContent = "Error Sending";
    setTimeout(() => {
      button.textContent = originalText;
      button.disabled = false;
    }, 4000);
  });
}

const sourceForm = document.getElementById('source-form');
if (sourceForm) {
  sourceForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const data = {
      _subject: "New Sourcing Request from Website",
      Brand: document.getElementById('source-brand').value,
      Reference: document.getElementById('source-ref').value,
      Name: document.getElementById('source-name').value,
      Email: document.getElementById('source-email').value,
      Phone: document.getElementById('source-country-code').value + " " + document.getElementById('source-phone').value,
      Details: document.getElementById('source-details').value || 'None provided'
    };
    sendEmailData(data, sourceForm);
  });
}

const contactForm = document.getElementById('contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const data = {
      _subject: activeWatch ? `Inquiry: ${activeWatch.brand} ${activeWatch.model}` : "General Inquiry from Chronotomi Wealth",
      Name: document.getElementById('client-name').value,
      Email: document.getElementById('client-email').value,
      Phone: document.getElementById('client-country-code').value + ' ' + document.getElementById('client-phone').value,
      Message: document.getElementById('client-message').value
    };
    sendEmailData(data, contactForm);
  });
}

const advisoryContactForm = document.getElementById('advisory-contact-form');
if (advisoryContactForm) {
  advisoryContactForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const data = {
      _subject: activeService ? `Advisory Inquiry: ${activeService}` : "Advisory Consultation Inquiry",
      Name: document.getElementById('client-name').value,
      Email: document.getElementById('client-email').value,
      Phone: document.getElementById('client-country-code').value + ' ' + document.getElementById('client-phone').value,
      Executive_Summary: document.getElementById('client-message').value
    };
    sendEmailData(data, advisoryContactForm);
  });
}

document.querySelectorAll(".reveal").forEach((element) => {
  revealObserver.observe(element);
});

// Navigation Toggle Logic
document.addEventListener("DOMContentLoaded", () => {
  const navToggle = document.getElementById("nav-toggle");
  const body = document.body;
  const navLinks = document.querySelectorAll(".nav-links a");

  if (navToggle) {
    navToggle.addEventListener("click", () => {
      const isOpen = body.classList.toggle("nav-open");
      navToggle.setAttribute("aria-expanded", isOpen);
      if (isOpen) {
        window.dispatchEvent(new Event('resize'));
      }
    });
  }

  navLinks.forEach(link => {
    link.addEventListener("click", () => {
      if (body.classList.contains("nav-open")) {
        body.classList.remove("nav-open");
        if (navToggle) navToggle.setAttribute("aria-expanded", "false");
      }
    });
  });
});

renderInventory();

// Fetch latest inventory from GitHub to ensure data is current
(async function fetchLatestInventory() {
  try {
    const res = await fetch(
      'watches.json?t=' + Date.now()
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        watches = data;
        renderInventory();
      }
    }
  } catch (e) {
    // Fallback to local watches.js — already rendered above
  }
})();

// Role Switch Sliding Animation Logic
document.addEventListener("DOMContentLoaded", () => {
  const switchBox = document.querySelector(".role-switch");
  const slider = document.querySelector(".role-slider");
  if (!switchBox || !slider) return;

  const activeLink = switchBox.querySelector(".role-active");

  function updateSlider(link, instant = false) {
    if (!link) return;
    if (instant) {
      slider.style.transition = "none";
    }
    slider.style.width = `${link.offsetWidth}px`;
    slider.style.transform = `translateX(${link.offsetLeft}px)`;
    if (instant) {
      void slider.offsetWidth; // force reflow
      slider.style.transition = "";
    }
  }

  document.fonts.ready.then(() => {
    const currentActive = switchBox.querySelector(".role-active");
    if (currentActive) {
      updateSlider(currentActive, true);
      slider.style.opacity = "1";
    }
  });

  const currentActiveFallback = switchBox.querySelector(".role-active");
  if (currentActiveFallback) {
    updateSlider(currentActiveFallback, true);
    slider.style.opacity = "1";
  }

  switchBox.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", (e) => {
      if (link.classList.contains("role-active")) return;

      e.preventDefault();
      updateSlider(link, false);
      switchBox.querySelectorAll("a").forEach(l => l.classList.remove("role-active"));
      link.classList.add("role-active");

      const targetHref = link.getAttribute("href");
      setTimeout(() => {
        document.body.classList.add("page-leaving");
      }, 200);

      setTimeout(() => {
        window.location.href = targetHref;
      }, 550);
    });
  });

  window.addEventListener("resize", () => {
    const currentActive = switchBox.querySelector(".role-active");
    updateSlider(currentActive, true);
  });
});

// React Bits DepthCarousel Controller
function initDepthCarousel() {
  const root = document.getElementById('testimonials-depth-carousel');
  if (!root) return;

  const cardEls = Array.from(root.querySelectorAll('.depth-carousel__card'));
  const overlayEls = Array.from(root.querySelectorAll('.depth-carousel__tint'));
  const dotEls = Array.from(root.querySelectorAll('.depth-carousel__dot'));
  const prevBtn = root.querySelector('.depth-carousel__arrow--prev');
  const nextBtn = root.querySelector('.depth-carousel__arrow--next');

  const count = cardEls.length;
  if (!count) return;

  // Configuration matching React Bits DepthCarousel specs
  const cfg = {
    count: count,
    cardWidth: 450,
    cardHeight: 310,
    radius: 16,
    tint: '#000000',
    depth: 170,
    spread: 80,
    tilt: 18,
    tiltDirection: 'right',
    perspective: 1400,
    visibleCards: 3,
    falloff: 0.22,
    blur: 4,
    duration: 700,
    ease: 'power3.out',
    autoplay: true,
    autoplayDelay: 4000,
    loop: true
  };

  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  let pos = 0;
  let focusIdx = 0;
  let scale = 1;
  let tween = null;
  let autoTimer = null;
  let isHovered = false;
  let isFocused = false;
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Apply card dimensions
  cardEls.forEach(card => {
    card.style.width = `${cfg.cardWidth}px`;
    card.style.height = `${cfg.cardHeight}px`;
    card.style.borderRadius = `${cfg.radius}px`;
  });

  // Exact 3D Layout calculation from React Bits
  function layout(p) {
    const n = cfg.count;
    if (!n) return;
    const dir = cfg.tiltDirection === 'left' ? -1 : 1;
    const sc = scale;

    for (let i = 0; i < n; i++) {
      const el = cardEls[i];
      if (!el) continue;

      let d = i - p;
      if (cfg.loop && n > 1) {
        d = ((d % n) + n) % n;
        if (d > n / 2) d -= n;
      }

      const back = Math.max(0, d);
      const az = Math.abs(d);
      const shown = az <= cfg.visibleCards + 0.5;

      const tz = -cfg.depth * d;
      const tx = dir * cfg.spread * d;
      const ry = dir * cfg.tilt * clamp(d, 0, 1);

      let opacity = d < 0 ? Math.max(0, 1 + d) : 1;
      if (!shown) opacity = 0;

      const brightness = Math.max(0.15, 1 - back * cfg.falloff);
      const blurPx = cfg.blur > 0 ? Math.min(cfg.blur, (back / Math.max(1, cfg.visibleCards)) * cfg.blur) : 0;
      const zi = Math.round(2000 - d * 20);

      el.style.transform = `translate(-50%, -50%) scale(${sc}) translateX(${tx.toFixed(2)}px) translateZ(${tz.toFixed(2)}px) rotateY(${ry.toFixed(3)}deg)`;
      el.style.opacity = opacity.toFixed(3);
      el.style.filter = `brightness(${brightness.toFixed(3)}) blur(${blurPx.toFixed(2)}px)`;
      el.style.zIndex = String(zi);
      el.style.pointerEvents = shown && opacity > 0.05 ? 'auto' : 'none';

      const ov = overlayEls[i];
      if (ov) ov.style.opacity = clamp(back * cfg.falloff * 1.25, 0, 0.86).toFixed(3);
    }
  }

  function updateActiveUI(idx) {
    dotEls.forEach((dot, i) => {
      const isActive = i === idx;
      dot.classList.toggle('is-active', isActive);
      dot.setAttribute('aria-selected', isActive);
    });

    cardEls.forEach((card, i) => {
      card.setAttribute('aria-hidden', i !== idx);
    });
  }

  function tweenTo(target, animate = true) {
    if (tween) tween.kill();
    const dur = animate && !reducedMotion ? cfg.duration / 1000 : 0;
    const proxy = { p: pos };

    if (window.gsap && dur > 0) {
      tween = gsap.to(proxy, {
        p: target,
        duration: dur,
        ease: cfg.ease,
        onUpdate: () => {
          pos = proxy.p;
          layout(proxy.p);
        },
        onComplete: () => {
          const n = cfg.count;
          if (n > 0) pos = ((pos % n) + n) % n;
          layout(pos);
        }
      });
    } else {
      pos = target;
      const n = cfg.count;
      if (n > 0) pos = ((pos % n) + n) % n;
      layout(pos);
    }
  }

  function setFocus(rawIndex, animate = true) {
    const n = cfg.count;
    if (!n) return;
    const idx = cfg.loop ? ((rawIndex % n) + n) % n : clamp(rawIndex, 0, n - 1);
    let delta = idx - pos;
    if (cfg.loop && n > 1) {
      delta = ((delta % n) + n) % n;
      if (delta > n / 2) delta -= n;
    }
    tweenTo(pos + delta, animate);
    if (idx !== focusIdx) {
      focusIdx = idx;
      updateActiveUI(idx);
    }
  }

  function navigateBy(step) {
    setFocus(focusIdx + step, true);
  }

  // Responsive scale observer
  const ro = new ResizeObserver(entries => {
    const w = entries[0].contentRect.width;
    const needed = cfg.cardWidth + Math.abs(cfg.spread) * 1.5 + 40;
    scale = clamp(w / needed, 0.65, 1);
    layout(pos);
  });
  ro.observe(root);

  // Pointer drag / swipe handling
  let drag = null;

  root.addEventListener('pointerdown', e => {
    if (cfg.count < 2) return;
    if (tween) tween.kill();
    drag = {
      x: e.clientX,
      startPos: pos,
      lastX: e.clientX,
      lastT: performance.now(),
      v: 0,
      moved: false,
      id: e.pointerId
    };
  });

  root.addEventListener('pointermove', e => {
    if (!drag) return;
    const stepPx = Math.max(cfg.cardWidth * 0.55 * scale, 40);
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 4) {
      drag.moved = true;
      try { root.setPointerCapture(drag.id); } catch (_) {}
    }
    if (!drag.moved) return;
    const now = performance.now();
    const dt = Math.max(now - drag.lastT, 1);
    drag.v = (e.clientX - drag.lastX) / dt;
    drag.lastX = e.clientX;
    drag.lastT = now;
    pos = drag.startPos - dx / stepPx;
    layout(pos);
  });

  const onPointerEnd = () => {
    if (!drag) return;
    const wasMoved = drag.moved;
    const dragV = drag.v;
    drag = null;
    if (!wasMoved) return;
    const stepPx = Math.max(cfg.cardWidth * 0.55 * scale, 40);
    const projected = pos - (dragV * 180) / stepPx;
    setFocus(Math.round(projected), true);
  };

  root.addEventListener('pointerup', onPointerEnd);
  root.addEventListener('pointercancel', onPointerEnd);

  // Card click to focus
  cardEls.forEach((card, i) => {
    card.addEventListener('click', () => {
      if (drag && drag.moved) return;
      setFocus(i, true);
      resetAuto();
    });
  });

  // Arrow buttons
  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      navigateBy(-1);
      resetAuto();
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      navigateBy(1);
      resetAuto();
    });
  }

  // Dots
  dotEls.forEach((dot, i) => {
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      setFocus(i, true);
      resetAuto();
    });
  });

  // Keyboard navigation
  root.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      navigateBy(-1);
      resetAuto();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      navigateBy(1);
      resetAuto();
    }
  });

  // Autoplay
  function startAuto() {
    stopAuto();
    if (!cfg.autoplay || reducedMotion || count < 2) return;
    autoTimer = setInterval(() => {
      if (!isHovered && !isFocused) {
        navigateBy(1);
      }
    }, Math.max(cfg.autoplayDelay, 1000));
  }

  function stopAuto() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  }

  function resetAuto() {
    stopAuto();
    startAuto();
  }

  root.addEventListener('mouseenter', () => { isHovered = true; });
  root.addEventListener('mouseleave', () => { isHovered = false; });
  root.addEventListener('focusin', () => { isFocused = true; });
  root.addEventListener('focusout', () => { isFocused = false; });

  // Intersection observer for viewport visibility
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        startAuto();
      } else {
        stopAuto();
      }
    });
  }, { threshold: 0.15 });
  observer.observe(root);

  // Initial render
  layout(0);
  updateActiveUI(0);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDepthCarousel);
} else {
  initDepthCarousel();
}


