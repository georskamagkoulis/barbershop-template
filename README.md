# Πρότυπο σελίδας barbershop

Στατική σελίδα: HTML + CSS + λίγη JavaScript. Ανοίγεις το `index.html` με διπλό κλικ.

## Τι αλλάζεις (ψάξε το ΟΝΟΜΑ, ΠΟΛΗ, 210 000, Οδός, example.gr)
1. `index.html`: όνομα, πόλη, τηλέφωνα, διευθύνσεις, ωράρια, τιμές, links (Instagram, Google κριτικές), canonical και og:url (το domain σου).
2. Το JSON-LD στο head πρέπει να ταιριάζει ΑΚΡΙΒΩΣ με όσα φαίνονται στη σελίδα (NAP).
3. `script.js`: `WHATSAPP_NUMBER` (π.χ. 306912345678).
4. `styles.css`: χρώματα στο `:root`.

## Εικόνες που χρειάζονται (φάκελος `images/`)
- `hero.jpg` (1920x1080, κάτω από 300 KB)
- `share.jpg` (1200x630, για κοινοποίηση)
- `work-1.jpg` έως `work-6.jpg` (600x600, WebP ή JPG)
Ονόματα: μόνο λατινικά, μικρά, με παύλες.

## Πριν ανεβάσεις
- [ ] Τηλέφωνα, διευθύνσεις, τιμές ελεγμένα με το χέρι
- [ ] Δοκιμή σε 2-3 κινητά
- [ ] Alt σε όλες τις εικόνες που βάζεις
- [ ] Πραγματική πολιτική απορρήτου
- [ ] Τρέξε τον security-reviewer
- [ ] Αν βάλεις analytics ή χάρτη: cookie banner

## Ανέβασμα
GitHub Pages, Netlify ή Cloudflare Pages: ανεβάζεις τον φάκελο και δείχνεις το domain.
Σημείωση: το CSP μπήκε ως meta tag. Τα headers του hosting (π.χ. `_headers` στο Netlify) είναι ισχυρότερα.
