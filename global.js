console.log("IT'S ALIVE!");

// Helper function to query multiple elements as an Array
function \$\$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// -----------------------------------------------------------
// Automatic Navigation Menu
// -----------------------------------------------------------

// Detect local vs GitHub Pages base path (Replace 'portfolio' with your repo name)
const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/"
  : "/portfolio/"; 

let pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'contact/', title: 'Contact' },
  { url: 'https://github.com/your-username', title: 'GitHub' } 
];

let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
  let url = p.url;
  let title = p.title;

  if (!url.startsWith('http')) {
    url = BASE_PATH + url;
  }

  let a = document.createElement('a');
  a.href = url;
  a.textContent = title;

  // Highlight current page
  if (a.host === location.host && a.pathname === location.pathname) {
    a.classList.add('current');
  }

  // Open external links in a new tab
  if (a.host !== location.host) {
    a.target = '_blank';
  }

  nav.append(a);
}

// -----------------------------------------------------------
// Dark Mode Switcher & Persistence
// -----------------------------------------------------------

document.body.insertAdjacentHTML(
  'afterbegin',
  `
  <label class="color-scheme">
    Theme:
    <select id="theme-select">
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
  `
);

const select = document.querySelector('#theme-select');

function setColorScheme(colorScheme) {
  document.documentElement.style.setProperty('color-scheme', colorScheme);
  select.value = colorScheme;
}

select.addEventListener('input', function (event) {
  const colorScheme = event.target.value;
  setColorScheme(colorScheme);
  localStorage.colorScheme = colorScheme;
});

if ('colorScheme' in localStorage) {
  setColorScheme(localStorage.colorScheme);
}