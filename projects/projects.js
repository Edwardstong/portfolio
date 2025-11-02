import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

const projects = await fetchJSON('../lib/projects.json');

const title = document.querySelector('.projects-title');
if (title) title.textContent = `Projects (${Array.isArray(projects) ? projects.length : 0})`;

const projectsContainer = document.querySelector('.projects');
renderProjects(projects, projectsContainer, 'h2');

const svgRoot    = d3.select('#projects-pie-plot');
const legendRoot = d3.select('.legend');
const radius     = 50;

const pie  = d3.pie().sort(null).value(d => d.value);
const arc  = d3.arc().innerRadius(0).outerRadius(radius);

function byYearData(arr) {
  return Array.from(
    d3.rollups(arr, v => v.length, d => String(d.year ?? 'Unknown')),
    ([label, value]) => ({ label, value })
  ).sort((a, b) => d3.ascending(a.label, b.label));
}

let query = '';
let selectedYear = null;

function renderPieChart(baseArr) {
  const data = byYearData(baseArr);

  svgRoot.selectAll('*').remove();
  legendRoot.selectAll('*').remove();

  const color = d3.scaleOrdinal()
    .domain(data.map(d => d.label))
    .range(d3.schemeTableau10);

  const g = svgRoot.append('g').attr('transform', 'translate(0,0)');

  const slices = g.selectAll('path')
    .data(pie(data))
    .join('path')
    .attr('d', arc)
    .attr('fill', d => color(d.data.label))
    .attr('stroke', 'white')
    .attr('stroke-width', 1)
    .attr('class', d => (d.data.label === selectedYear ? 'selected' : null))
    .style('cursor', 'pointer');

  slices.on('click', (event, d) => {
    const y = d.data.label;
    selectedYear = (selectedYear === y ? null : y);
    applyFiltersAndRender(); // keeps pie reactive + filters cards
  });

  const items = legendRoot.selectAll('li')
    .data(data)
    .join('li')
    .attr('class', d => `legend-item${d.label === selectedYear ? ' selected' : ''}`)
    .attr('style', d => `--color:${color(d.label)}`)
    .html(d => `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
    .style('cursor', 'pointer');

  items.on('click', (_, d) => {
    const y = d.label;
    selectedYear = (selectedYear === y ? null : y);
    applyFiltersAndRender();
  });
}

function applyFiltersAndRender() {
  const searchFiltered = projects.filter(p =>
    Object.values(p).join(' ').toLowerCase().includes(query)
  );

  const presentYears = new Set(searchFiltered.map(p => String(p.year ?? 'Unknown')));
  if (selectedYear && !presentYears.has(selectedYear)) selectedYear = null;

  renderPieChart(searchFiltered);

  const final = selectedYear
    ? searchFiltered.filter(p => String(p.year ?? 'Unknown') === selectedYear)
    : searchFiltered;

  renderProjects(final, projectsContainer, 'h2');
}

const searchInput = document.querySelector('.searchBar');
searchInput?.addEventListener('input', (event) => {
  query = (event.target.value || '').toLowerCase();
  applyFiltersAndRender();
});

applyFiltersAndRender();
