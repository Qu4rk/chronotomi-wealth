const watches = [
  {
    brand: "Rolex",
    model: "Daytona 126500LN",
    reference: "126500LN",
    year: "2024",
    condition: "Unworn",
    set: "Full Set",
    caseSize: "40mm",
    status: "In Stock",
    image: "assets/gen_rolex_1_1776373698477.png",
  },
  {
    brand: "Patek Philippe",
    model: "Nautilus 5712/1A",
    reference: "5712/1A-001",
    year: "2023",
    condition: "Excellent",
    set: "Box + Papers",
    caseSize: "40mm",
    status: "In Stock",
    image: "assets/gen_patek_1_1776373728459.png",
  },
  {
    brand: "Audemars Piguet",
    model: "Royal Oak 15510ST",
    reference: "15510ST.OO.1320ST.04",
    year: "2024",
    condition: "Excellent",
    set: "Full Set",
    caseSize: "41mm",
    status: "In Stock",
    image: "assets/gen_ap_1776373758039.png",
  },
  {
    brand: "Cartier",
    model: "Santos de Cartier",
    reference: "WSSA0030",
    year: "2025",
    condition: "Unworn",
    set: "Full Set",
    caseSize: "Large",
    status: "In Stock",
    image: "assets/gen_cartier_1776373771506.png",
  },
  {
    brand: "Rolex",
    model: "GMT-Master II Sprite",
    reference: "126720VTNR",
    year: "2024",
    condition: "Excellent",
    set: "Full Set",
    caseSize: "40mm",
    status: "In Stock",
    image: "assets/gen_rolex_2_1776373712151.png",
  },
  {
    brand: "Patek Philippe",
    model: "Aquanaut 5167A",
    reference: "5167A-001",
    year: "2023",
    condition: "Excellent",
    set: "Box + Papers",
    caseSize: "40.8mm",
    status: "In Stock",
    image: "assets/gen_patek_2_1776373744165.png",
  },
];

const INSTAGRAM_URL =
  "https://www.instagram.com/chronotomiwealth/?utm_source=ig_web_button_share_sheet";

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
    rootMargin: "0px 0px -50px 0px" 
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
  document.querySelectorAll(".inventory-card").forEach((card) => {
    revealObserver.observe(card);
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

const contactForm = document.querySelector("#contact-form");
if (contactForm) {
  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.querySelector("#client-name").value;
    const email = document.querySelector("#client-email").value;
    const message = document.querySelector("#client-message").value;

    const subject = activeWatch ? `Inquiry: ${activeWatch.brand} ${activeWatch.model}` : "General Inquiry from Chronotomi Wealth";
    const body = `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`;

    window.location.href = `mailto:sales@chronotomi.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
}

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
    const body = `Name: ${name}\nEmail: ${email}\n\nExecutive Summary:\n${message}`;

    window.location.href = `mailto:sales@chronotomi.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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
