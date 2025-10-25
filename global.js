console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// const navLinks = $$("nav a");

// let currentLink = navLinks.find(
//   (a) => a.host === location.host && a.pathname === location.pathname,
// );

// if (currentLink) {
//   // or if (currentLink !== undefined)
//   currentLink.classList.add('current');
// }

const BASE_PATH =
  (location.hostname === "localhost" || location.hostname === "127.0.0.1")
    ? "/"
    : "/portfolio/";

let pages = [
  { url: "",          title: "Home" },
  { url: "projects/", title: "Projects" },
  { url: "contact/",  title: "Contact" },
  { url: "CV/",       title: "CV" },
  { url: "https://github.com/Edwardstong", title: "My GitHub Page" },
];

let nav = document.createElement("nav");
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
  nav.append(a);

  a.classList.toggle(
    'current',
    a.host === location.host && a.pathname === location.pathname
  );

  if (a.host !== location.host) {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  }
}

document.body.insertAdjacentHTML(
  'afterbegin',
  `
  <label class="color-scheme">
    Theme:
    <select>
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
  `
);

const select = document.querySelector('.color-scheme select');

select?.addEventListener('input', (event) => {
  console.log('color scheme changed to', event.target.value);
  document.documentElement.style.setProperty('color-scheme', event.target.value);
});

// Step 5 — mailto with proper percent-encoding
const form = document.querySelector('form');

form?.addEventListener('submit', (event) => {
  event.preventDefault();

  const data = new FormData(form);
  const pairs = [];
  for (let [name, value] of data) {
    pairs.push(`${name}=${encodeURIComponent(value)}`);
  }

  const action = form.getAttribute('action') || '';
  const sep = action.includes('?') ? '&' : '?';
  const url = `${action}${pairs.length ? sep + pairs.join('&') : ''}`;

  location.href = url;
});

export async function fetchJSON(url) {
  try {
    // Fetch the JSON file from the given URL
    const response = await fetch(url);

    console.log(response)

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
  if (!(containerElement instanceof Element)) return;
  const valid = new Set(['h1','h2','h3','h4','h5','h6']);
  if (!valid.has(headingLevel)) headingLevel = 'h2';
  if (!Array.isArray(projects)) projects = projects ? [projects] : [];
  containerElement.innerHTML = '';
  for (const p of projects) {
    const article = document.createElement('article');
    const h = document.createElement(headingLevel);
    h.textContent = p?.title ?? 'Untitled Project';
    const img = document.createElement('img');
    if (p?.image) { img.src = p.image; img.alt = p?.title || ''; } else { img.style.display = 'none'; }
    const desc = document.createElement('p');
    desc.textContent = p?.description ?? '';
    article.append(h, img, desc);
    containerElement.appendChild(article);
  }
}

export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${encodeURIComponent(username)}`);
}

