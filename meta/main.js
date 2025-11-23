// Step 1.1 — Read loc.csv with row conversion
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import scrollama from "https://cdn.jsdelivr.net/npm/[email protected]/+esm";

let xScale;
let yScale;
let colors = d3.scaleOrdinal(d3.schemeTableau10);

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
  return d3.groups(data, (d) => d.commit).map(([commit, lines]) => {
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

    // keep original lines (hidden) for later rollups
    Object.defineProperty(ret, "lines", {
      value: lines,
      enumerable: false,
      writable: false,
      configurable: false,
    });

    return ret;
  });
}

// Step 1.3 — Display Total LOC and Total commits
function renderCommitInfo(data, commits) {
  const dl = d3.select("#stats").append("dl").attr("class", "stats");
  dl.append("dt").html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append("dd").text(data.length);
  dl.append("dt").text("Total commits");
  dl.append("dd").text(commits.length);
}

// ---- Execute steps in order ----
const data = await loadData();
const commits = processCommits(data);
renderCommitInfo(data, commits);

// Step 1.1 / 1.2 — slider + time scale + filtering
let commitProgress = 100;

let timeScale = d3
  .scaleTime()
  .domain([
    d3.min(commits, (d) => d.datetime),
    d3.max(commits, (d) => d.datetime),
  ])
  .range([0, 100]);

let commitMaxTime = timeScale.invert(commitProgress);
// Will get updated as user changes slider
let filteredCommits = commits;

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

  updateScatterPlot(data, filteredCommits);
  updateFileDisplay(filteredCommits);
}

if (sliderEl) {
  sliderEl.addEventListener("input", onTimeSliderChange);
}

// ── Step 3 — Tooltip helpers ───────────────────────────────────
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

// Step 2.2 + 2.3 + 4 + 5 — Scatter, axes, gridlines, sized dots, brushing
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

  // Radius scale from totalLines (sqrt for area perception)
  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines ?? 0, maxLines ?? 1]).range([2, 30]);

  // Gridlines (before axes)
  const gridlines = svg
    .append("g")
    .attr("class", "gridlines")
    .attr("transform", `translate(${usableArea.left}, 0)`);
  gridlines.call(d3.axisLeft(yScale).tickFormat("").tickSize(-usableArea.width));

  // Sort so large circles render first; small ones stay on top for hover
  const sorted = d3.sort(commits, (d) => -d.totalLines);

  // Dots
  const dots = svg
    .append("g")
    .attr("class", "dots")
    .selectAll("circle")
    .data(sorted, (d) => d.id)
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

  // Axes
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

  // ─────────────── Step 5 — Brushing ───────────────

  // 5.1 Setup the brush and 5.2 keep dots above overlay for hover
  svg.call(
    d3
      .brush()
      .extent([
        [usableArea.left, usableArea.top],
        [usableArea.right, usableArea.bottom],
      ])
      .on("start brush end", brushed),
  );
  // Ensure overlay is before dots so hover works
  svg.selectAll(".dots, .overlay ~ *").raise();

  // Helper: whether a commit is inside current selection (in pixel space)
  function isCommitSelected(selection, commit) {
    if (!selection) return false;
    const [[x0, y0], [x1, y1]] = selection;
    const x = xScale(commit.datetime);
    const y = yScale(commit.hourFrac);
    return x0 <= x && x <= x1 && y0 <= y && y <= y1;
  }

  // 5.5 — Count label updater (returns the selected commits)
  function renderSelectionCount(selection) {
    const selected = selection ? commits.filter((d) => isCommitSelected(selection, d)) : [];
    const el = document.querySelector("#selection-count");
    if (el) el.textContent = `${selected.length || "No"} commits selected`;
    return selected;
  }

  // 5.6 — Language breakdown (by line "type" field)
  function renderLanguageBreakdown(selection) {
    const selected = selection ? commits.filter((d) => isCommitSelected(selection, d)) : [];
    const container = document.getElementById("language-breakdown");
    if (!container) return;

    if (selected.length === 0) {
      container.innerHTML = ""; // nothing selected
      return;
    }

    const lines = selected.flatMap((d) => d.lines);
    const breakdown = d3.rollup(
      lines,
      (v) => v.length,
      (d) => d.type, // assumes your loc.csv has a 'type' column
    );

    const total = d3.sum(breakdown.values());
    const fmt = d3.format(".1~%");

    container.innerHTML = "";
    for (const [language, count] of breakdown) {
      const proportion = count / total;
      container.innerHTML += `
        <dt>${language || "Unknown"}</dt>
        <dd>${count} lines (${fmt(proportion)})</dd>
      `;
    }
  }

  // 5.4 — Handle brushing selection
  function brushed(event) {
    const selection = event.selection;

    // highlight selected dots
    dots.classed("selected", (d) => isCommitSelected(selection, d));

    // update count + language breakdown
    renderSelectionCount(selection);
    renderLanguageBreakdown(selection);
  }
}

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

// Step 2.1–2.4 — unit visualization for files
function updateFileDisplay(filteredCommits) {
  const lines = filteredCommits.flatMap((d) => d.lines);
  let files = d3
    .groups(lines, (d) => d.file)
    .map(([name, lines]) => {
      return { name, lines };
    })
    .sort((a, b) => b.lines.length - a.lines.length);

  let filesContainer = d3
    .select("#files")
    .selectAll("div")
    .data(files, (d) => d.name)
    .join((enter) =>
      enter.append("div").call((div) => {
        div.append("dt").append("code");
        div.append("dd");
      }),
    );

  filesContainer.select("dt > code").text((d) => d.name);

  filesContainer
    .select("dd")
    .selectAll("div")
    .data((d) => d.lines)
    .join("div")
    .attr("class", "loc")
    .attr("style", (d) => `--color: ${colors(d.type)}`);
}

// Initial render
renderScatterPlot(data, commits);
updateFileDisplay(filteredCommits);
if (sliderEl) {
  sliderEl.value = String(commitProgress);
}
onTimeSliderChange();

// Step 3.2 — generating commit text for scrollytelling
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
          d3.rollups(
            d.lines,
            (D) => D.length,
            (d) => d.file,
          ).length
        } files.
    		Then I looked over all I had made, and I saw that it was very good.
    	`,
  );

// Step 3.3 — Scrollama setup to update scatter plot on scroll
function onStepEnter(response) {
  const commit = response.element.__data__;
  if (!commit) return;

  commitMaxTime = commit.datetime;
  commitProgress = timeScale(commitMaxTime);

  if (sliderEl) {
    sliderEl.value = String(commitProgress);
  }
  if (timeEl) {
    timeEl.textContent = commitMaxTime.toLocaleString("en", {
      dateStyle: "long",
      timeStyle: "short",
    });
  }

  filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);
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
