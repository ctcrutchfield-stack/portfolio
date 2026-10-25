console.log("IT'S ALIVE!");

// Helper function to query multiple elements as an Array
function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// -----------------------------------------------------------
// STEP 3: Automatic Navigation Menu
// -----------------------------------------------------------

// Detect local server vs GitHub Pages base path
const BASE_PATH =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "/"
    : "/portfolio/";

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

export async function fetchJSON(url) {
  try {
    const response = await fetch(url);
    
    // Step 1.2 requirement: inspect the response object
    console.log('Fetch Response Object:', response);

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
  }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  if (!containerElement) return;

  containerElement.innerHTML = '';

  if (!projects || projects.length === 0) {
    containerElement.innerHTML = '<p>No projects found.</p>';
    return;
  }

  // Check if current page is inside a subfolder
  const isSubfolder = window.location.pathname.includes('/projects/');

  for (let project of projects) {
    const article = document.createElement('article');

    // Fix image URL for subfolders if it's a relative path and doesn't start with http
    let imagePath = project.image;
    if (isSubfolder && !imagePath.startsWith('http') && !imagePath.startsWith('../')) {
      imagePath = `../${imagePath}`;
    }

    article.innerHTML = `
      <${headingLevel}>${project.title}</${headingLevel}>
      <img src="${imagePath}" alt="${project.title}">
      <p>${project.description}</p>
    `;

    containerElement.appendChild(article);
  }
}
export async function fetchGitHubData(username) {
  // Reuses your existing fetchJSON helper to call the public GitHub API
  return fetchJSON(`https://api.github.com/users/${username}`);
}
