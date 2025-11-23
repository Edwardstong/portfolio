// Lab 8: Animation & Scrollytelling
// ---------------------------------
// Step 1 + Step 2 + Step 3 (required parts only)

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import scrollama from "https://esm.sh/scrollama@3.2.0";

let xScale;
let yScale;
let colors = d3.scaleOrdinal(d3.schemeTableau10);

// ---- Summary stats helpers (for the row under files) ----
function computeStats(commitsSubset) {
  const lines = commitsSubset.flatMap((d) => d.lines);

  return {
    commits: commitsSubset.length,
    files: new Set(lines.map((d) => d.file)).size,
    totalLOC: lines.length,
    maxDepth: lines.length ? d3.max(lines, (d) => d.depth) : 0,
    longestLine: lines.length ? d3.max(lines, (d) => d.length) : 0,
    maxLines: commitsSubset.length ? d3.max(commitsSubset, (d) => d.totalLines) : 0,
  };
}

function renderStats(stats) {
  const dl = d3.select("#stats").html("").append("dl").attr("class", "stats");

  dl.append("dt").text("COMMITS");
  dl.append("dd").text(stats.commits);

  dl.append("dt").text("FILES");
  dl.append("dd").text(stats.files);

  dl.append("dt").html('TOTAL <abbr title="Lines of code">LOC</abbr>');
  dl.append("dd").text(stats.totalLOC);

  dl.append("dt").text("MAX DEPTH");
  dl.append("dd").text(stats.maxDepth);

  dl.append("dt").text("LONGEST LINE");
  dl.append("dd").text(stats.longestLine);

  dl.append("dt").text("MAX LINES");
  dl.append("dd").text(stats.maxLines);
}

// Step 1.1 — Read loc.csv with row conversion
async function loadData() {
  const data = await d3.csv("./loc.csv", (row) => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + "T00:00" + row.timezone),
    datetime: new Date(row.datetime),
  }));
  return data;
}

// Step 1.2 — Compute commit data (group by commit)
function processCommits(data) {
  // sort by time so scrollytelling goes in order
  const grouped = d3.groups(data, (d) => d.commit);
  const commits = grouped.map(([commit, lines]) => {
    const first = lines[0];
    const { author, date, time, timezone, datetime } = first;

    const ret = {
      id: commit,
      url: `https://github.com/Edwardstong/portfolio/commit/${commit}`,
      author,
      date,
      time,
      timezone,
      datetime,
      hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
      totalLines: lines.length,
    };

    Object.defineProperty(ret, "lines", {
      value: lines,
      enumerable: false,
    });

    return ret;
  });

  return d3.sort(commits, (d) => d.datetime);
}

// ── Tooltip helpers (unchanged from Lab 6) ─────────────────────
function renderTooltipContent(commit) {
  const link = document.getElementById("commit-link");
  const date = document.getElementById("commit-date");
  if (!commit) return;
  link.href = commit.url;
  link.textContent = commit.id;
  date.textContent = commit.datetime.toLocaleString("en", { dateStyle: "full" });
}
function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById("commit-tooltip");
  tooltip.hidden = !isVisible;
}
function updateTooltipPosition(event) {
  const tooltip = document.getElementById("commit-tooltip");
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
}

// Step 2 scatter: initial render (same as Lab 6/7 + minor tweaks)
function renderScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;

  const margin = { top: 10, right: 10, bottom: 30, left: 40 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3
    .select("#chart")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("overflow", "visible");

  xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines ?? 0, maxLines ?? 1]).range([2, 30]);

  const gridlines = svg
    .append("g")
    .attr("class", "gridlines")
    .attr("transform", `translate(${usableArea.left}, 0)`);
  gridlines.call(d3.axisLeft(yScale).tickFormat("").tickSize(-usableArea.width));

  const sorted = d3.sort(commits, (d) => -d.totalLines);

  const dots = svg
    .append("g")
    .attr("class", "dots")
    .selectAll("circle")
    .data(sorted, (d) => d.id) // Step 1.3: stable circles
    .join("circle")
    .attr("cx", (d) => xScale(d.datetime))
    .attr("cy", (d) => yScale(d.hourFrac))
    .attr("r", (d) => rScale(d.totalLines))
    .attr("fill", "steelblue")
    .attr("fill-opacity", 0.7)
    .on("mouseenter", (event, commit) => {
      d3.select(event.currentTarget).style("fill-opacity", 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on("mousemove", (event) => updateTooltipPosition(event))
    .on("mouseleave", (event) => {
      d3.select(event.currentTarget).style("fill-opacity", 0.7);
      updateTooltipVisibility(false);
    });

  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3
    .axisLeft(yScale)
    .tickFormat((d) => String(d % 24).padStart(2, "0") + ":00");

  svg
    .append("g")
    .attr("transform", `translate(0, ${usableArea.bottom})`)
    .attr("class", "x-axis")
    .call(xAxis);

  svg
    .append("g")
    .attr("transform", `translate(${usableArea.left}, 0)`)
    .attr("class", "y-axis")
    .call(yAxis);

  // keep brushing as in Lab 6 if you had it; omitted here since it’s not Lab 8-specific
}

// Step 1.2/1.3 — updateScatterPlot for filteredCommits
function updateScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 40 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3.select("#chart").select("svg");

  xScale = xScale.domain(d3.extent(commits, (d) => d.datetime));

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  const xAxis = d3.axisBottom(xScale);
  const xAxisGroup = svg.select("g.x-axis");
  xAxisGroup.selectAll("*").remove();
  xAxisGroup.call(xAxis);

  const dots = svg.select("g.dots");
  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

  dots
    .selectAll("circle")
    .data(sortedCommits, (d) => d.id)
    .join("circle")
    .attr("cx", (d) => xScale(d.datetime))
    .attr("cy", (d) => yScale(d.hourFrac))
    .attr("r", (d) => rScale(d.totalLines))
    .attr("fill", "steelblue")
    .style("fill-opacity", 0.7)
    .on("mouseenter", (event, commit) => {
      d3.select(event.currentTarget).style("fill-opacity", 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on("mousemove", (event) => updateTooltipPosition(event))
    .on("mouseleave", (event) => {
      d3.select(event.currentTarget).style("fill-opacity", 0.7);
      updateTooltipVisibility(false);
    });
}

// Step 2 — files unit visualization
function updateFileDisplay(filteredCommits) {
  const lines = filteredCommits.flatMap((d) => d.lines);

  let files = d3
    .groups(lines, (d) => d.file)
    .map(([name, lines]) => ({ name, lines }))
    .sort((a, b) => b.lines.length - a.lines.length); // Step 2.3: sort

  let filesContainer = d3
    .select("#files")
    .selectAll("div")
    .data(files, (d) => d.name)
    .join((enter) =>
      enter.append("div").call((div) => {
        div.append("dt");
        div.append("dd");
      })
    );

  // dt: filename + “N lines” label
  filesContainer
    .select("dt")
    .html((d) => `<code>${d.name}</code><small>${d.lines.length} lines</small>`);

  // dd: unit visualization dots, one per edited line, colored by type
  filesContainer
    .select("dd")
    .selectAll("div")
    .data((d) => d.lines)
    .join("div")
    .attr("class", "loc")
    .attr("style", (d) => `--color: ${colors(d.type)}`); // Step 2.4: color by technology
}

// ── Main async flow ────────────────────────────────────────────
const data = await loadData();
const commits = processCommits(data);

// Step 1.1 – slider + timeScale + filteredCommits
let commitProgress = 100;
let timeScale = d3
  .scaleTime()
  .domain([
    d3.min(commits, (d) => d.datetime),
    d3.max(commits, (d) => d.datetime),
  ])
  .range([0, 100]);

let commitMaxTime = timeScale.invert(commitProgress);
let filteredCommits = commits;

// initial stats (for all commits) and elements
renderStats(computeStats(filteredCommits));

const sliderEl = document.getElementById("commit-progress");
const timeEl = document.getElementById("commit-time");

function onTimeSliderChange() {
  if (!sliderEl) return;

  commitProgress = Number(sliderEl.value);
  commitMaxTime = timeScale.invert(commitProgress);

  if (timeEl) {
    timeEl.textContent = commitMaxTime.toLocaleString("en", {
      dateStyle: "long",
      timeStyle: "short",
    });
  }

  filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);

  renderStats(computeStats(filteredCommits));
  updateScatterPlot(data, filteredCommits);
  updateFileDisplay(filteredCommits);
}

if (sliderEl) {
  sliderEl.value = String(commitProgress);
  sliderEl.addEventListener("input", onTimeSliderChange);
}

// initial render
renderScatterPlot(data, commits);
updateFileDisplay(filteredCommits);
onTimeSliderChange();

// Step 3.2 — generate commit text
d3
  .select("#scatter-story")
  .selectAll(".step")
  .data(commits)
  .join("div")
  .attr("class", "step")
  .html(
    (d, i) => `
      On ${d.datetime.toLocaleString("en", {
        dateStyle: "full",
        timeStyle: "short",
      })},
      I made <a href="${d.url}" target="_blank">${
        i > 0 ? "another glorious commit" : "my first commit, and it was glorious"
      }</a>.
      I edited ${d.totalLines} lines across ${
        d3.rollups(d.lines, (D) => D.length, (d) => d.file).length
      } files.
      Then I looked over all I had made, and I saw that it was very good.
    `
  );

// Step 3.3 — Scrollama hookup
function onStepEnter(response) {
  const commit = response.element.__data__;
  if (!commit) return;

  commitMaxTime = commit.datetime;
  commitProgress = timeScale(commitMaxTime);

  if (sliderEl) sliderEl.value = String(commitProgress);
  if (timeEl) {
    timeEl.textContent = commitMaxTime.toLocaleString("en", {
      dateStyle: "long",
      timeStyle: "short",
    });
  }

  filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);
  renderStats(computeStats(filteredCommits));
  updateScatterPlot(data, filteredCommits);
  updateFileDisplay(filteredCommits);
}

const scroller = scrollama();
scroller
  .setup({
    container: "#scrolly-1",
    step: "#scrolly-1 .step",
  })
  .onStepEnter(onStepEnter);
