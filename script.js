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

      instagramLink.textContent = "Discuss Selected Watch";
      instagramLink.classList.remove("btn-outline");
      instagramLink.classList.add("btn-primary");
      instagramLink.setAttribute("aria-label", `Discuss ${watchName} on Instagram`);

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

let activeService = null;

document.querySelectorAll(".js-select-service").forEach((button) => {
  button.addEventListener("click", () => {
    activeService = button.dataset.service;
    document.querySelector("#selected-service").textContent = activeService;

    const clientMessageInput = document.querySelector("#client-message");
    if (clientMessageInput) {
      clientMessageInput.value = `I am interested in scheduling a consultation regarding ${activeService}. `;
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
      'https://raw.githubusercontent.com/Qu4rk/chronotomi-wealth/main/watches.json?t=' + Date.now()
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
