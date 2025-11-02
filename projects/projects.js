// import { fetchJSON, renderProjects } from '../global.js';

// const projects = await fetchJSON('../lib/projects.json');

// const title = document.querySelector('.projects-title');
// if (title) title.textContent = `Projects (${Array.isArray(projects) ? projects.length : 0})`;

// const projectsContainer = document.querySelector('.projects');
// renderProjects(projects, projectsContainer, 'h2');

// import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

// // group by year
// const byYear = Array.from(
//   d3.rollup(projects, v => v.length, d => String(d.year ?? 'Unknown')),
//   ([key, value]) => ({ key, value })
// ).sort((a, b) => d3.ascending(a.key, b.key));

// console.log(byYear);

// // select your existing SVG
// const svg = d3.select('#projects-pie-plot');
// const radius = 50;

// // color scale
// const color = d3.scaleOrdinal()
//   .domain(byYear.map(d => d.key))
//   .range(d3.schemeTableau10);

// // pie + arc
// const pie = d3.pie()
//   .sort(null)
//   .value(d => d.value);

// const arc = d3.arc()
//   .innerRadius(0)       // set >0 for donut
//   .outerRadius(radius);

// // center group
// const g = svg.append('g').attr('transform', 'translate(0,0)');

// // draw slices
// g.selectAll('path')
//   .data(pie(byYear))
//   .join('path')
//   .attr('d', arc)
//   .attr('fill', d => color(d.data.key))
//   .attr('stroke', 'white')
//   .attr('stroke-width', 1);

// // hover highlight
// g.selectAll('path')
//   .on('mouseenter', function() {
//     d3.select(this).attr('opacity', 0.8);
//   })
//   .on('mouseleave', function() {
//     d3.select(this).attr('opacity', 1);
//   });

// const legend = d3.select('.legend');

// byYear.forEach(d => {
//   legend
//     .append('li')
//     .attr('class', 'legend-item')
//     .attr('style', `--color:${color(d.key)}`)
//     .html(`<span class="swatch"></span> ${d.key} <em>(${d.value})</em>`);
// });

// const data = byYear.map(d => ({ label: d.key, value: d.value }));

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
// rolledData looks like: [ ['2024', 3], ['2023', 4], ... ]

const data = rolledData
  .sort((a, b) => d3.ascending(a[0], b[0]))
  .map(([year, count]) => ({ label: year, value: count }));
// data looks like: [ {label:'2021', value:2}, {label:'2022', value:3}, ... ]
// ----------------------------

const svg = d3.select('#projects-pie-plot');
const radius = 50;

// color scale keyed by label (year)
const color = d3.scaleOrdinal()
  .domain(data.map(d => d.label))
  .range(d3.schemeTableau10);

// pie + arc
const pie = d3.pie().sort(null).value(d => d.value);
const arc = d3.arc().innerRadius(0).outerRadius(radius);

// draw slices
const g = svg.append('g').attr('transform', 'translate(0,0)');

g.selectAll('path')
  .data(pie(data))                      // <-- use Step 3 data
  .join('path')
  .attr('d', arc)
  .attr('fill', d => color(d.data.label))   // <-- label, not key
  .attr('stroke', 'white')
  .attr('stroke-width', 1)
  .on('mouseenter', function(){ d3.select(this).attr('opacity', 0.8); })
  .on('mouseleave', function(){ d3.select(this).attr('opacity', 1); });

// HTML legend (under the SVG)
const legend = d3.select('.legend');
legend.selectAll('li')
  .data(data)                            // <-- use Step 3 data
  .join('li')
  .attr('class', 'legend-item')
  .attr('style', d => `--color:${color(d.label)}`)
  .html(d => `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);

console.log('[rollups]', rolledData); // For step 3 check
console.log('[data]', data);          // For step 3 check

//Step 4
let query = "";
const searchInput = document.querySelector(".searchBar");

searchInput?.addEventListener("input", (event) => {
  // update the query value
  query = event.target.value.toLowerCase();

  // filter the projects list by title
  const filteredProjects = projects.filter((p) =>
    p.title.toLowerCase().includes(query)
  );

  // re-render the visible projects list
  renderProjects(filteredProjects, projectsContainer, "h2");
});

