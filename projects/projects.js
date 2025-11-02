import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');

const title = document.querySelector('.projects-title');
if (title) title.textContent = `Projects (${Array.isArray(projects) ? projects.length : 0})`;

const projectsContainer = document.querySelector('.projects');
renderProjects(projects, projectsContainer, 'h2');

import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

// group by year
const byYear = Array.from(
  d3.rollup(projects, v => v.length, d => String(d.year ?? 'Unknown')),
  ([key, value]) => ({ key, value })
).sort((a, b) => d3.ascending(a.key, b.key));

console.log(byYear);

// select your existing SVG
const svg = d3.select('#projects-pie-plot');
const radius = 50;

// color scale
const color = d3.scaleOrdinal()
  .domain(byYear.map(d => d.key))
  .range(d3.schemeTableau10);

// pie + arc
const pie = d3.pie()
  .sort(null)
  .value(d => d.value);

const arc = d3.arc()
  .innerRadius(0)       // set >0 for donut
  .outerRadius(radius);

// center group
const g = svg.append('g').attr('transform', 'translate(0,0)');

// draw slices
g.selectAll('path')
  .data(pie(byYear))
  .join('path')
  .attr('d', arc)
  .attr('fill', d => color(d.data.key))
  .attr('stroke', 'white')
  .attr('stroke-width', 1);

// hover highlight
g.selectAll('path')
  .on('mouseenter', function() {
    d3.select(this).attr('opacity', 0.8);
  })
  .on('mouseleave', function() {
    d3.select(this).attr('opacity', 1);
  });

const legend = d3.select('.legend');

byYear.forEach(d => {
  legend
    .append('li')
    .attr('class', 'legend-item')
    .attr('style', `--color:${color(d.key)}`)
    .html(`<span class="swatch"></span> ${d.key} <em>(${d.value})</em>`);
});


