import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

const projects = await fetchJSON('../lib/projects.json');

const title = document.querySelector('.projects-title');
if (title) title.textContent = `Projects (${Array.isArray(projects) ? projects.length : 0})`;

const projectsContainer = document.querySelector('.projects');
renderProjects(projects, projectsContainer, 'h2');

// ----------------------------
// Step 3.1 — use d3.rollups to group by year, then map to {label, value}
const rolledData = d3.rollups(
  projects,
  v => v.length,          // reducer: count projects in the bucket
  d => String(d.year ?? 'Unknown')  // key: year as a string
);

const data = rolledData
  .sort((a, b) => d3.ascending(a[0], b[0]))
  .map(([year, count]) => ({ label: year, value: count }));

const svg = d3.select('#projects-pie-plot');
const radius = 50;

const color = d3.scaleOrdinal()
  .domain(data.map(d => d.label))
  .range(d3.schemeTableau10);

const pie = d3.pie().sort(null).value(d => d.value);
const arc = d3.arc().innerRadius(0).outerRadius(radius);

const g = svg.append('g').attr('transform', 'translate(0,0)');

g.selectAll('path')
  .data(pie(data))
  .join('path')
  .attr('d', arc)
  .attr('fill', d => color(d.data.label))
  .attr('stroke', 'white')
  .attr('stroke-width', 1)
  .on('mouseenter', function() { d3.select(this).attr('opacity', 0.8); })
  .on('mouseleave', function() { d3.select(this).attr('opacity', 1); });

const legend = d3.select('.legend');
legend.selectAll('li')
  .data(data)
  .join('li')
  .attr('class', 'legend-item')
  .attr('style', d => `--color:${color(d.label)}`)
  .html(d => `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);

console.log('[rollups]', rolledData);
console.log('[data]', data);

// ----------------------------
// Step 4.4 — visualize only visible (filtered) projects
// ----------------------------
function renderPieChart(filteredProjects) {
  // recompute grouped data for the visible subset
  const rolled = d3.rollups(
    filteredProjects,
    v => v.length,
    d => String(d.year ?? 'Unknown')
  );
  const d2 = rolled.sort((a, b) => d3.ascending(a[0], b[0]))
                  .map(([year, count]) => ({ label: year, value: count }));

  // clear old chart + legend
  svg.selectAll('*').remove();
  legend.selectAll('*').remove();

  // rebuild color, pie, arc for subset
  const color2 = d3.scaleOrdinal()
    .domain(d2.map(d => d.label))
    .range(d3.schemeTableau10);

  const pie2 = d3.pie().sort(null).value(d => d.value);
  const arc2 = d3.arc().innerRadius(0).outerRadius(radius);

  const g2 = svg.append('g').attr('transform', 'translate(0,0)');
  g2.selectAll('path')
    .data(pie2(d2))
    .join('path')
    .attr('d', arc2)
    .attr('fill', d => color2(d.data.label))
    .attr('stroke', 'white')
    .attr('stroke-width', 1)
    .on('mouseenter', function() { d3.select(this).attr('opacity', 0.8); })
    .on('mouseleave', function() { d3.select(this).attr('opacity', 1); })
    .style('cursor', 'pointer');

  let selectedIndex = -1;
  g2.selectAll('path').on('click', function (event, d, i) {
    selectedIndex = selectedIndex === i ? -1 : i;
    g2.selectAll('path').attr('class', (p, j) => (j === selectedIndex ? 'selected' : ''));
    legend.selectAll('li').attr('class', (p, j) => (j === selectedIndex ? 'selected' : ''));
  });

  // rebuild legend for subset
  legend.selectAll('li')
    .data(d2)
    .join('li')
    .attr('class', 'legend-item')
    .attr('style', d => `--color:${color2(d.label)}`)
    .html(d => `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
}


// ----------------------------
// Step 4 — search functionality + reactive pie chart
// ----------------------------
let query = "";
const searchInput = document.querySelector(".searchBar");

searchInput?.addEventListener("input", (event) => {
  query = event.target.value.toLowerCase();

  const filteredProjects = projects.filter((project) => {
    const values = Object.values(project).join(" ").toLowerCase();
    return values.includes(query);
  });

  renderProjects(filteredProjects, projectsContainer, "h2");

  // Step 4.4: re-render pie chart + legend for filtered subset
  renderPieChart(filteredProjects);
});
