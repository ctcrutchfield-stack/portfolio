console.log("IT'S ALIVE!");

// Helper function to query multiple elements as an Array
function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// -----------------------------------------------------------
// STEP 3: Automatic Navigation Menu
// -----------------------------------------------------------

// Detect local vs GitHub Pages base path
// Replace 'ctcrutchfield-stack' with your exact GitHub repository name if different
const BASE_PATH =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "/"
    : "/ctcrutchfield-stack/";

let pages = [
  { url: "", title: "Home" },
  { url: "projects/", title: "Projects" },
  { url: "contact/", title: "Contact" },
  { url: "cv/", title: "Resume" },
  { url: "https://github.com/ctcrutchfield-stack", title: "GitHub" },
];

let nav = document.createElement("nav");
document.body.prepend(nav);

for (let p of pages) {
  let url = p.url;
  let title = p.title;

  // Prefix relative URLs with BASE_PATH
  if (!url.startsWith("http")) {
    url = BASE_PATH + url;
  }

  let a = document.createElement("a");
  a.href = url;
  a.textContent = title;

  // Step 3.2: Highlight current page link
  if (a.host === location.host && a.pathname === location.pathname) {
    a.classList.add("current");
  }

  // Step 3.2: Open external links in a new tab
  if (a.host !== location.host) {
    a.target = "_blank";
  }

  nav.append(a);
}

// -----------------------------------------------------------
// STEP 4: Dark Mode Switcher & Persistence
// -----------------------------------------------------------

// Step 4.2: Add HTML for theme selector dropdown
document.body.insertAdjacentHTML(
  "afterbegin",
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

const select = document.querySelector("#theme-select");

// Step 4.4: Function to apply color scheme
function setColorScheme(colorScheme) {
  document.documentElement.style.setProperty("color-scheme", colorScheme);
  select.value = colorScheme;
}

// Step 4.4: Save preference on selection change
select.addEventListener("input", function (event) {
  const colorScheme = event.target.value;
  setColorScheme(colorScheme);
  localStorage.colorScheme = colorScheme;
});

// Step 4.5: Restore saved preference on load
if ("colorScheme" in localStorage) {
  setColorScheme(localStorage.colorScheme);
}