
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
            <img src="${watch.image}" alt="${watch.brand} ${watch.model}" loading="lazy" />
          </div>
          <div style="padding: 0 2rem 3rem;">
            <span class="inventory-brand text-mask"><span class="text-mask-inner">${watch.brand}</span></span>
            <div class="inventory-copy">
              <span class="eyebrow text-mask" style="margin-bottom: 0.5rem; letter-spacing: 0.1em; color: var(--text);"><span class="text-mask-inner delay-1">${watch.reference}</span></span>
              <h3><span class="text-mask"><span class="text-mask-inner delay-2">${watch.model}</span></span></h3>
              <p class="text-mask" style="font-size: 0.7rem; color: var(--muted); text-transform: uppercase;"><span class="text-mask-inner delay-3">${watch.status}</span></p>
            </div>

            <div class="inventory-specs" style="margin-bottom: 3rem;">
              <span>${watch.year}</span>
              <span>${watch.condition}</span>
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
// ═══════════════════════════════════════
// EMAIL FORM SUBMISSION LOGIC
// ═══════════════════════════════════════
async function submitToWeb3Forms(form, subject, name, email, message, successText) {
  const submitBtn = form.querySelector('button[type="submit"]');
  if (!submitBtn) return;
  const originalBtnText = submitBtn.innerText;
  
  // Web3Forms AJAX is blocked by Cloudflare when running locally (file://, localhost, 127.0.0.1).
  const isLocal = window.location.protocol === 'file:' || 
                  window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1';

  if (isLocal) {
    let msgDiv = form.querySelector('.form-status-msg');
    if (!msgDiv) {
      msgDiv = document.createElement('div');
      msgDiv.className = 'form-status-msg error';
      form.appendChild(msgDiv);
    }
    msgDiv.innerText = "Forms cannot be submitted from a local environment. This will work perfectly once uploaded to chronotomi.com!";
    msgDiv.style.display = "block";
    return;
  }

  submitBtn.innerText = "Sending...";
  submitBtn.disabled = true;
  
  try {
    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        access_key: WEB3FORMS_ACCESS_KEY,
        subject: subject,
        name: name,
        email: email,
        message: message,
        from_name: "Chronotomi Wealth Site",
      }),
    });
    
    const result = await response.json();
    if (response.status === 200) {
      form.reset();
      submitBtn.innerText = "Sent Successfully!";
      submitBtn.style.backgroundColor = "var(--gold)";
      submitBtn.style.color = "#000";
      
      let msgDiv = form.querySelector('.form-status-msg');
      if (!msgDiv) {
        msgDiv = document.createElement('div');
        msgDiv.className = 'form-status-msg success';
        form.appendChild(msgDiv);
      }
      msgDiv.innerText = successText || "Thank you. We will be in touch shortly.";
      msgDiv.style.display = "block";
    } else {
      throw new Error(result.message || "Failed to send");
    }
  } catch (error) {
    submitBtn.innerText = "Error Sending";
    let msgDiv = form.querySelector('.form-status-msg');
    if (!msgDiv) {
      msgDiv = document.createElement('div');
      msgDiv.className = 'form-status-msg error';
      form.appendChild(msgDiv);
    }
    msgDiv.innerText = "Something went wrong. Please try again or email us directly at sales@chronotomi.com";
    msgDiv.style.display = "block";
  } finally {
    setTimeout(() => {
      submitBtn.innerText = originalBtnText;
      submitBtn.disabled = false;
      submitBtn.style.backgroundColor = "";
      submitBtn.style.color = "";
      
      const msgDiv = form.querySelector('.form-status-msg');
      if (msgDiv) msgDiv.style.display = "none";
    }, 5000);
  }
}

// 1. Timepiece Inquiry Form
const contactForm = document.querySelector("#contact-form");
if (contactForm) {
  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.querySelector("#client-name").value;
    const email = document.querySelector("#client-email").value;
    const message = document.querySelector("#client-message").value;

    const subject = activeWatch ? `Inquiry: ${activeWatch.brand} ${activeWatch.model}` : "General Inquiry from Chronotomi Wealth";
    const body = `Message:\n${message}`;

    submitToWeb3Forms(contactForm, subject, name, email, body, "Thank you for your inquiry. A concierge will be in touch shortly.");
  });
}

// 2. Advisory Inquiry Form
const advisoryContactForm = document.querySelector("#advisory-contact-form");
if (advisoryContactForm) {
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

  advisoryContactForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.querySelector("#client-name").value;
    const email = document.querySelector("#client-email").value;
    const message = document.querySelector("#client-message").value;

    const subject = activeService ? `Advisory Inquiry: ${activeService}` : "Advisory Consultation Inquiry";
    const body = `Executive Summary:\n${message}`;

    submitToWeb3Forms(advisoryContactForm, subject, name, email, body, "Thank you. We will contact you to schedule a consultation.");
  });
}

// 3. Sourcing Request Form
const sourceForm = document.querySelector("#source-form");
if (sourceForm) {
  sourceForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const brand = document.querySelector("#source-brand").value;
    const ref = document.querySelector("#source-ref").value;
    const name = document.querySelector("#source-name").value;
    const email = document.querySelector("#source-email").value;
    const countryCode = document.querySelector("#source-country-code").value;
    const phone = document.querySelector("#source-phone").value;
    const details = document.querySelector("#source-details").value;

    const subject = `Sourcing Request: ${brand} ${ref}`;
    const body = `Sourcing Request Details:
-------------------------
Brand: ${brand}
Reference: ${ref}

Client Phone: ${countryCode} ${phone}

Additional Details:
-------------------------
${details || "None provided."}`;

    submitToWeb3Forms(sourceForm, subject, name, email, body, "Thank you. Our sourcing team will contact you privately.");
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
        // Trigger resize event to recalculate role-switch slider position
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
// (critical when hosted on GoDaddy or any non-GitHub-Pages host)
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

  // Fallback in case fonts load quickly or are cached
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
