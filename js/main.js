// Turn every <i data-lucide="..."> into an SVG icon
lucide.createIcons();

// Mobile menu open / close
const menuBtn = document.getElementById('menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
menuBtn.addEventListener('click', () => {
  const isOpen = !mobileMenu.classList.toggle('hidden');
  menuBtn.setAttribute('aria-expanded', String(isOpen));
});
mobileMenu.querySelectorAll('a').forEach(link =>
  link.addEventListener('click', () => mobileMenu.classList.add('hidden'))
);

// Display-only countdown in the dark banner (loops from 02:00)
let seconds = 120;
const countdownEl = document.getElementById('countdown');
setInterval(() => {
  seconds = seconds > 0 ? seconds - 1 : 120;
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  countdownEl.textContent = `${m}:${s}`;
}, 1000);
