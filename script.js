// ===== ΡΥΘΜΙΣΕΙΣ: άλλαξε τον αριθμό WhatsApp (χώρα + αριθμός, χωρίς + και κενά) =====
const WHATSAPP_NUMBER = "306900000000";

// Λέει στο CSS ότι δουλεύει η JavaScript (ώστε να ενεργοποιηθούν τα animations)
document.documentElement.classList.add("js");

// ===== Μενού κινητού =====
const toggle = document.querySelector(".menu-toggle");
const nav = document.getElementById("site-nav");

function setMenu(open) {
  nav.classList.toggle("open", open);
  toggle.setAttribute("aria-expanded", String(open));
}

toggle.addEventListener("click", () => {
  setMenu(toggle.getAttribute("aria-expanded") !== "true");
});

// Κλείνει το μενού όταν πατάς σύνδεσμο ή το πλήκτρο Escape
nav.addEventListener("click", (event) => {
  if (event.target.closest("a")) setMenu(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setMenu(false);
});

// ===== Έτος στο footer =====
document.getElementById("year").textContent = new Date().getFullYear();

// ===== Animation εμφάνισης στο scroll =====
const revealItems = document.querySelectorAll(".reveal");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if ("IntersectionObserver" in window && !reduceMotion) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("visible"));
}

// ===== Φόρμα ραντεβού -> μήνυμα WhatsApp =====
const form = document.getElementById("booking-form");
const message = document.getElementById("form-message");
const dateInput = document.getElementById("date");

// Δεν επιτρέπονται ημερομηνίες στο παρελθόν
dateInput.min = new Date().toISOString().split("T")[0];

function showMessage(text, isError) {
  message.textContent = text; // textContent, ποτέ innerHTML με είσοδο χρήστη
  message.classList.toggle("error", isError);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = form.elements.name.value.trim().slice(0, 60);
  const service = form.elements.service.value;
  const shop = form.elements.shop.value;
  const date = form.elements.date.value;
  const time = form.elements.time.value;

  // Έλεγχος εισόδου (ο πραγματικός έλεγχος σε σύστημα με server γίνεται στον server)
  if (!name || !service || !shop || !date || !time) {
    showMessage("Συμπλήρωσε όλα τα πεδία.", true);
    return;
  }

  const text =
    "Γεια σας! Θα ήθελα ραντεβού.\n" +
    "Όνομα: " + name + "\n" +
    "Υπηρεσία: " + service + "\n" +
    "Κατάστημα: " + shop + "\n" +
    "Ημερομηνία: " + date + "\n" +
    "Ώρα: " + time;

  const url = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(text);
  showMessage("Ανοίγει το WhatsApp...", false);
  window.open(url, "_blank", "noopener,noreferrer");
});
