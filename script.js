// =====================================================================
// ΡΥΘΜΙΣΕΙΣ ΚΡΑΤΗΣΕΩΝ
// ---------------------------------------------------------------------
// Η διαθεσιμότητα έρχεται από το Cal.com (δωρεάν λογαριασμός):
//  1. Φτιάξε λογαριασμό στο cal.com για κάθε κατάστημα (ή έναν για όλα).
//  2. Φτιάξε ένα "Event Type" για κάθε υπηρεσία με τη σωστή διάρκεια
//     και βάλε το ωράριο του καταστήματος στο Availability.
//  3. Συμπλήρωσε παρακάτω το username και τα slugs (από το link, π.χ.
//     cal.com/sala-kentro/kourema -> username "sala-kentro", slug "kourema").
// Όσο το username είναι κενό, η φόρμα δουλεύει σε ΛΕΙΤΟΥΡΓΙΑ ΔΟΚΙΜΗΣ:
// οι ώρες βγαίνουν από το demoHours και η κράτηση στέλνεται με WhatsApp.
// =====================================================================
const BOOKING = {
  timeZone: "Europe/Athens",
  daysAhead: 14,
  shops: {
    "Κέντρο": { username: "" },
    "Βόρεια": { username: "" }
  },
  services: {
    "Ανδρικό κούρεμα": { slug: "kourema", minutes: 30 },
    "Γενειάδα": { slug: "geneiada", minutes: 20 },
    "Κούρεμα και γενειάδα": { slug: "kourema-geneiada", minutes: 45 }
  },
  // Μόνο για λειτουργία δοκιμής: ωράριο ανά ημέρα (0 = Κυριακή, κλειστά)
  demoHours: {
    1: ["10:00", "21:00"], 2: ["10:00", "21:00"], 3: ["10:00", "21:00"],
    4: ["10:00", "21:00"], 5: ["10:00", "21:00"], 6: ["10:00", "17:00"]
  },
  demoStepMinutes: 30
};

// WhatsApp (χώρα + αριθμός, χωρίς + και κενά): εναλλακτική αν αποτύχει το Cal.com
const WHATSAPP_NUMBER = "306900000000";

const CAL_API = "https://api.cal.com/v2";
const CAL_SLOTS_VERSION = "2024-09-04";
const CAL_BOOKINGS_VERSION = "2026-02-25";

// Λέει στο CSS ότι δουλεύει η JavaScript (ώστε να ενεργοποιηθούν τα animations)
document.documentElement.classList.add("js");

// ===== Μενού κινητού =====
const toggle = document.querySelector(".menu-toggle");
const nav = document.getElementById("site-nav");
const header = document.querySelector(".site-header");

function setMenu(open) {
  nav.classList.toggle("open", open);
  header.classList.toggle("menu-open", open);
  toggle.setAttribute("aria-expanded", String(open));
}

// ===== Header: διάφανο πάνω από το hero, μαύρο όταν κάνεις scroll =====
function updateHeader() {
  header.classList.toggle("scrolled", window.scrollY > 40);
}
updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

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

// =====================================================================
// ΚΡΑΤΗΣΗ: ημέρες και ώρες με διαθεσιμότητα
// =====================================================================
const form = document.getElementById("booking-form");
const message = document.getElementById("form-message");
const serviceSelect = document.getElementById("service");
const shopSelect = document.getElementById("shop");
const dayList = document.getElementById("day-list");
const hourList = document.getElementById("hour-list");
const slotStatus = document.getElementById("slot-status");
const demoNote = document.getElementById("demo-note");
const submitBtn = document.getElementById("booking-submit");
const done = document.getElementById("booking-done");
const doneText = document.getElementById("done-text");
const againBtn = document.getElementById("booking-again");

const slotCache = new Map(); // "κατάστημα|υπηρεσία" -> { "YYYY-MM-DD": [slot, ...] }
let currentSlots = {};
let requestId = 0;

// --- Βοηθητικά για ημερομηνίες στη ζώνη ώρας του καταστήματος ---
function partsInZone(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BOOKING.timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type).value;
  return { key: get("year") + "-" + get("month") + "-" + get("day"), minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

function addDays(key, n) {
  const d = new Date(key + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function dayInfo(key) {
  const d = new Date(key + "T12:00:00Z");
  const fmt = (opts) => new Intl.DateTimeFormat("el-GR", { timeZone: "UTC", ...opts }).format(d);
  return {
    weekday: fmt({ weekday: "short" }).replace(".", ""),
    day: fmt({ day: "numeric" }),
    month: fmt({ month: "short" }).replace(".", ""),
    long: fmt({ weekday: "long", day: "numeric", month: "long" }),
    dow: d.getUTCDay()
  };
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function minutesToLabel(min) {
  return String(Math.floor(min / 60)).padStart(2, "0") + ":" + String(min % 60).padStart(2, "0");
}

function timeLabel(iso) {
  return new Intl.DateTimeFormat("el-GR", { timeZone: BOOKING.timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
}

function isDemo(shop) {
  return !BOOKING.shops[shop] || !BOOKING.shops[shop].username;
}

// --- Πηγές διαθεσιμότητας ---
function demoSlots(service) {
  const now = partsInZone(new Date());
  const duration = BOOKING.services[service].minutes;
  const result = {};
  for (let i = 0; i < BOOKING.daysAhead; i++) {
    const key = addDays(now.key, i);
    const hours = BOOKING.demoHours[dayInfo(key).dow];
    if (!hours) continue;
    const list = [];
    for (let m = toMinutes(hours[0]); m + duration <= toMinutes(hours[1]); m += BOOKING.demoStepMinutes) {
      if (i === 0 && m <= now.minutes + 30) continue; // όχι ώρες που πέρασαν
      list.push({ label: minutesToLabel(m), start: null });
    }
    if (list.length) result[key] = list;
  }
  return result;
}

async function calSlots(shop, service) {
  const today = partsInZone(new Date()).key;
  const params = new URLSearchParams({
    eventTypeSlug: BOOKING.services[service].slug,
    username: BOOKING.shops[shop].username,
    start: today,
    end: addDays(today, BOOKING.daysAhead - 1),
    timeZone: BOOKING.timeZone
  });
  const res = await fetch(CAL_API + "/slots?" + params, { headers: { "cal-api-version": CAL_SLOTS_VERSION } });
  if (!res.ok) throw new Error("slots " + res.status);
  const json = await res.json();
  const result = {};
  Object.entries(json.data || {}).forEach(([key, list]) => {
    const slots = list
      .map((s) => (typeof s === "string" ? s : s.start))
      .filter(Boolean)
      .map((start) => ({ start, label: timeLabel(start) }));
    if (slots.length) result[key] = slots;
  });
  return result;
}

// --- Εμφάνιση ημερών και ωρών (μόνο DOM μέθοδοι, ποτέ innerHTML) ---
function pill(name, value, lines, disabled) {
  const label = document.createElement("label");
  label.className = "pill";
  const input = document.createElement("input");
  input.type = "radio"; input.name = name; input.value = value; input.disabled = disabled;
  label.appendChild(input);
  const face = document.createElement("span");
  face.className = "pill-face";
  lines.forEach(([cls, text]) => {
    const s = document.createElement("span");
    s.className = cls; s.textContent = text;
    face.appendChild(s);
  });
  label.appendChild(face);
  return label;
}

function setStatus(text) { slotStatus.textContent = text; }

function renderDays() {
  dayList.replaceChildren();
  hourList.replaceChildren();
  const today = partsInZone(new Date()).key;
  let first = null;
  for (let i = 0; i < BOOKING.daysAhead; i++) {
    const key = addDays(today, i);
    const info = dayInfo(key);
    const has = Boolean(currentSlots[key]);
    const el = pill("day", key, [["pill-small", i === 0 ? "Σήμερα" : info.weekday], ["pill-big", info.day], ["pill-small", info.month]], !has);
    el.querySelector("input").setAttribute("aria-label", info.long + (has ? "" : ", χωρίς διαθεσιμότητα"));
    dayList.appendChild(el);
    if (has && !first) first = el;
  }
  if (first) {
    first.querySelector("input").checked = true;
    renderHours(first.querySelector("input").value);
  } else {
    setStatus("Δεν υπάρχουν ελεύθερες ώρες τις επόμενες " + BOOKING.daysAhead + " ημέρες. Κάλεσέ μας στο τηλέφωνο.");
  }
}

function renderHours(key) {
  hourList.replaceChildren();
  const slots = currentSlots[key] || [];
  slots.forEach((slot, index) => hourList.appendChild(pill("hour", String(index), [["pill-time", slot.label]], false)));
  setStatus(slots.length ? slots.length + " ελεύθερες ώρες, " + dayInfo(key).long + "." : "Καμία ελεύθερη ώρα αυτή την ημέρα.");
}

async function loadSlots(force) {
  const service = serviceSelect.value;
  const shop = shopSelect.value;
  dayList.replaceChildren();
  hourList.replaceChildren();
  currentSlots = {};
  if (!service || !shop) {
    setStatus("Διάλεξε υπηρεσία και κατάστημα για να δεις τις ελεύθερες ώρες.");
    return;
  }
  demoNote.hidden = !isDemo(shop);
  const cacheKey = shop + "|" + service;
  if (!force && slotCache.has(cacheKey)) {
    currentSlots = slotCache.get(cacheKey);
    renderDays();
    return;
  }
  const id = ++requestId;
  setStatus("Έλεγχος διαθεσιμότητας...");
  form.setAttribute("aria-busy", "true");
  try {
    const slots = isDemo(shop) ? demoSlots(service) : await calSlots(shop, service);
    if (id !== requestId) return; // ήρθε νεότερο αίτημα στο μεταξύ
    slotCache.set(cacheKey, slots);
    currentSlots = slots;
    renderDays();
  } catch (err) {
    if (id !== requestId) return;
    setStatus("Δεν ήταν δυνατός ο έλεγχος διαθεσιμότητας. Δοκίμασε ξανά ή κάλεσέ μας.");
  } finally {
    if (id === requestId) form.removeAttribute("aria-busy");
  }
}

serviceSelect.addEventListener("change", () => loadSlots(false));
shopSelect.addEventListener("change", () => loadSlots(false));
dayList.addEventListener("change", (event) => {
  if (event.target.name === "day") renderHours(event.target.value);
});

// --- Υποβολή ---
function showMessage(text, isError) {
  message.textContent = text; // textContent, ποτέ innerHTML με είσοδο χρήστη
  message.classList.toggle("error", isError);
}

function internationalPhone(raw) {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("00")) return "+" + digits.slice(2);
  if (/^(69|2)\d{8,9}$/.test(digits)) return "+30" + digits;
  return digits;
}

function whatsappFallback(details) {
  const text =
    "Γεια σας! Θα ήθελα ραντεβού.\n" +
    "Όνομα: " + details.name + "\n" +
    "Τηλέφωνο: " + details.phone + "\n" +
    "Υπηρεσία: " + details.service + "\n" +
    "Κατάστημα: " + details.shop + "\n" +
    "Ημέρα: " + details.dayLong + "\n" +
    "Ώρα: " + details.time;
  window.open("https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(text), "_blank", "noopener,noreferrer");
}

function showDone(details, confirmed) {
  doneText.textContent = (confirmed
    ? "Σε περιμένουμε " + details.dayLong + " στις " + details.time + ", κατάστημα " + details.shop + ". Θα λάβεις email επιβεβαίωσης."
    : "Άνοιξε το WhatsApp με το ραντεβού σου (" + details.dayLong + ", " + details.time + "). Στείλε το μήνυμα και θα σου επιβεβαιώσουμε την ώρα.");
  form.hidden = true;
  done.hidden = false;
  done.focus();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = form.elements.name.value.trim().slice(0, 60);
  const phone = form.elements.phone.value.trim().slice(0, 20);
  const email = form.elements.email.value.trim().slice(0, 100);
  const service = serviceSelect.value;
  const shop = shopSelect.value;
  const dayInput = form.querySelector('input[name="day"]:checked');
  const hourInput = form.querySelector('input[name="hour"]:checked');

  // Έλεγχος εισόδου (ο τελικός έλεγχος γίνεται από το Cal.com)
  if (!service || !shop) return showMessage("Διάλεξε υπηρεσία και κατάστημα.", true);
  if (!dayInput || !hourInput) return showMessage("Διάλεξε ημέρα και ώρα.", true);
  if (!name || !phone) return showMessage("Συμπλήρωσε όνομα και τηλέφωνο.", true);
  if (!/^[+\d][\d\s-]{7,}$/.test(phone)) return showMessage("Το τηλέφωνο δεν φαίνεται σωστό.", true);
  if (!isDemo(shop) && !form.elements.email.checkValidity()) return showMessage("Συμπλήρωσε σωστό email για την επιβεβαίωση.", true);

  const slot = currentSlots[dayInput.value][Number(hourInput.value)];
  const details = { name, phone, service, shop, dayLong: dayInfo(dayInput.value).long, time: slot.label };

  if (isDemo(shop)) {
    showMessage("", false);
    whatsappFallback(details);
    showDone(details, false);
    return;
  }

  submitBtn.disabled = true;
  showMessage("Κλείνουμε το ραντεβού σου...", false);
  try {
    const res = await fetch(CAL_API + "/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json", "cal-api-version": CAL_BOOKINGS_VERSION },
      body: JSON.stringify({
        start: new Date(slot.start).toISOString(),
        eventTypeSlug: BOOKING.services[service].slug,
        username: BOOKING.shops[shop].username,
        attendee: { name, email, timeZone: BOOKING.timeZone, phoneNumber: internationalPhone(phone) },
        metadata: { phone, shop, service }
      })
    });
    if (!res.ok) {
      // Η ώρα πιάστηκε στο μεταξύ ή άλλο σφάλμα: ανανέωση διαθεσιμότητας
      showMessage("Η ώρα αυτή δεν είναι πλέον διαθέσιμη. Διάλεξε άλλη ώρα.", true);
      await loadSlots(true);
      return;
    }
    showMessage("", false);
    slotCache.delete(shop + "|" + service);
    showDone(details, true);
  } catch (err) {
    showMessage("Δεν ήταν δυνατή η σύνδεση. Δοκίμασε ξανά ή κάλεσέ μας.", true);
  } finally {
    submitBtn.disabled = false;
  }
});

againBtn.addEventListener("click", () => {
  done.hidden = true;
  form.hidden = false;
  form.reset();
  showMessage("", false);
  loadSlots(true);
  serviceSelect.focus();
});

loadSlots(false);
