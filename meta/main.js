import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

// Step 1.1: Load and parse CSV
async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));
  return data;
}

const data = await loadData();

// Step 1.2: Process raw lines into commit objects (sorted chronologically)
function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      let first = lines[0];
      let { author, date, time, timezone, datetime } = first;

      return {
        id: commit,
        url: 'https://github.com/ctcrutchfield-stack/portfolio/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
        lines: lines,
      };
    })
    .sort((a, b) => a.datetime - b.datetime);
}

const commits = processCommits(data);
let filteredCommits = commits;

// Shared Scales for Scatterplot
let xScale;
let yScale;
let rScale;

// Color scale for unit visualization (Step 2.4)
let colors = d3.scaleOrdinal(d3.schemeTableau10);

// Render summary stats formatted properly with stat cards
function displayStats(data, commits) {
  const statsContainer = d3.select('#stats');
  statsContainer.html('');
  const dl = statsContainer.append('dl').attr('class', 'stats');

  const lines = commits.flatMap((d) => d.lines);

  const statsData = [
    { label: 'Total <abbr title="Lines of code">LOC</abbr>', value: lines.length },
    { label: 'Total commits', value: commits.length },
    { label: 'Number of files', value: d3.group(lines, (d) => d.file).size },
    { label: 'Max depth', value: d3.max(lines, (d) => d.depth) ?? 0 },
    { label: 'Longest line length', value: d3.max(lines, (d) => d.length) ?? 0 },
  ];

  statsData.forEach((stat) => {
    const div = dl.append('div').attr('class', 'stat-card');
    div.append('dt').html(stat.label);
    div.append('dd').text(stat.value);
  });
}

// Initial Scatterplot Render
function renderScatterplot(data, commits) {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 50 };

  const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  // Scales
  xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([margin.left, width - margin.right])
    .nice();

  yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([height - margin.bottom, margin.top]);

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  rScale = d3.scaleSqrt().domain([minLines ?? 1, maxLines ?? 1]).range([3, 20]);

  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

  // Gridlines
  svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(yScale).tickFormat('').tickSize(-width + margin.left + margin.right));

  // Axes
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale).tickFormat((d) => `${String(d).padStart(2, '0')}:00`);

  svg
    .append('g')
    .attr('transform', `translate(0, ${height - margin.bottom})`)
    .attr('class', 'x-axis')
    .call(xAxis);

  svg
    .append('g')
    .attr('transform', `translate(${margin.left}, 0)`)
    .attr('class', 'y-axis')
    .call(yAxis);

  // Layer groups: create dotsGroup first so dots sit under the brush layer
  const dotsGroup = svg.append('g').attr('class', 'dots');
  const brushGroup = svg.append('g').attr('class', 'brush');

  // Render dots with key function (Step 1.3) and --r variable (Step 1.4)
  dotsGroup
    .selectAll('circle')
    .data(sortedCommits, (d) => d.id)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .style('--r', (d) => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, d) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      updateTooltipContent(d);
      updateTooltipPosition(event);
      updateTooltipVisibility(true);
    })
    .on('mousemove', (event) => {
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipContent({});
      updateTooltipVisibility(false);
    });

  // Attach D3 Brush
  const brush = d3.brush().on('start brush end', brushed);
  brushGroup.call(brush);

  function brushed(event) {
    const selection = event.selection;

    dotsGroup
      .selectAll('circle')
      .classed('selected', (d) => isCommitSelected(selection, d))
      .style('fill', (d) => (isCommitSelected(selection, d) ? '#ff6b6b' : 'steelblue'))
      .style('fill-opacity', (d) => (isCommitSelected(selection, d) ? 1 : 0.7));

    const selectedCommits = selection
      ? filteredCommits.filter((d) => isCommitSelected(selection, d))
      : [];

    updateSelectionCount(selectedCommits);
    updateLanguageBreakdown(selectedCommits);
  }

  function isCommitSelected(selection, commit) {
    if (!selection) return false;
    const [[x0, y0], [x1, y1]] = selection;
    const cx = xScale(commit.datetime);
    const cy = yScale(commit.hourFrac);

    return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
  }
}

// Step 1.2 & 1.3: Update existing Scatterplot
function updateScatterplot(data, commits) {
  const svg = d3.select('#chart').select('svg');

  xScale = xScale.domain(d3.extent(commits, (d) => d.datetime)).nice();

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  rScale = d3.scaleSqrt().domain([minLines ?? 1, maxLines ?? 1]).range([3, 20]);

  const xAxis = d3.axisBottom(xScale);

  const xAxisGroup = svg.select('g.x-axis');
  xAxisGroup.selectAll('*').remove();
  xAxisGroup.call(xAxis);

  const dotsGroup = svg.select('g.dots');
  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

  dotsGroup
    .selectAll('circle')
    .data(sortedCommits, (d) => d.id)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .style('--r', (d) => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, d) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      updateTooltipContent(d);
      updateTooltipPosition(event);
      updateTooltipVisibility(true);
    })
    .on('mousemove', (event) => {
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipContent({});
      updateTooltipVisibility(false);
    });
}

// Step 2.1 - 2.4: Update Unit Visualization for File Sizes
function updateFileDisplay(commitsSubset) {
  let lines = commitsSubset.flatMap((d) => d.lines);
  let files = d3
    .groups(lines, (d) => d.file)
    .map(([name, lines]) => {
      return { name, lines, type: lines[0]?.type };
    })
    .sort((a, b) => b.lines.length - a.lines.length);

  let filesContainer = d3
    .select('#files')
    .selectAll('div')
    .data(files, (d) => d.name)
    .join(
      (enter) =>
        enter.append('div').call((div) => {
          div.append('dt').append('code');
          div.append('dd');
        })
    );

  filesContainer
    .select('dt')
    .html((d) => `<code>${d.name}</code><small>${d.lines.length} line${d.lines.length === 1 ? "" : "s"}</small>`);

  filesContainer
    .select('dd')
    .selectAll('div')
    .data((d) => d.lines)
    .join('div')
    .attr('class', 'loc')
    .attr('style', (d) => `--color: ${colors(d.type)}`);
}

// Tooltip Helpers
function updateTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');

  if (!commit.id) {
    link.href = '';
    link.textContent = '';
    date.textContent = '';
    return;
  }

  link.href = commit.url;
  link.textContent = commit.id;
  date.textContent = commit.datetime?.toLocaleString('en', {
    dateStyle: 'full',
    timeStyle: 'short',
  });
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX + 10}px`;
  tooltip.style.top = `${event.clientY + 10}px`;
}

// Brush Helpers
function updateSelectionCount(selectedCommits) {
  const countElement = document.getElementById('selection-count');
  countElement.textContent = `${selectedCommits.length || 'No'} commits selected`;
}

function updateLanguageBreakdown(selectedCommits) {
  const container = document.getElementById('language-breakdown');
  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }

  const lines = selectedCommits.flatMap((d) => d.lines);
  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type
  );

  container.innerHTML = '';
  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1%')(proportion);

    container.innerHTML += `
      <div class="stat-card">
        <dt>${language}</dt>
        <dd>${count} lines (${formatted})</dd>
      </div>
    `;
  }
}

// Helper to render clean narrative cards for both scrollytelling sections
function renderStorySteps(containerSelector) {
  d3.select(containerSelector)
    .selectAll('.step')
    .data(commits)
    .join('div')
    .attr('class', 'step')
    .html((d, i) => {
      const fileCount = d3.rollups(
        d.lines,
        (D) => D.length,
        (d) => d.file
      ).length;
      const formattedDate = d.datetime.toLocaleString('en', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      return `
        <div class="step-card">
          <div class="step-header">
            <span class="step-badge">${i === 0 ? 'Initial Commit' : `Commit #${i + 1}`}</span>
            <time>${formattedDate}</time>
          </div>
          <p>
            Pushed <a href="${d.url}" target="_blank"><code>${d.id.slice(0, 7)}</code></a>:
            updated <strong>${d.totalLines} lines</strong> across <strong>${fileCount} ${
              fileCount === 1 ? 'file' : 'files'
            }</strong>.
          </p>
        </div>
      `;
    });
}

// Run initial rendering
displayStats(data, commits);
renderScatterplot(data, commits);
updateFileDisplay(commits);

// Populate both narrative columns
renderStorySteps('#scatter-story');
renderStorySteps('#files-story');

// Step 3.3: Scrollama for Scatterplot (#scrolly-1)
function onScatterStepEnter(response) {
  const commit = response.element.__data__;
  filteredCommits = commits.filter((d) => d.datetime <= commit.datetime);

  d3.select('#scatter-story')
    .selectAll('.step')
    .classed('is-active', (d) => d.id === commit.id);

  displayStats(data, filteredCommits);
  updateScatterplot(data, filteredCommits);
}

const scatterScroller = scrollama();
scatterScroller
  .setup({
    container: '#scrolly-1',
    step: '#scrolly-1 .step',
  })
  .onStepEnter(onScatterStepEnter);

// Step 4: Scrollama for File Sizes Unit Visualization (#scrolly-2)
function onFilesStepEnter(response) {
  const commit = response.element.__data__;
  const fileFilteredCommits = commits.filter((d) => d.datetime <= commit.datetime);

  d3.select('#files-story')
    .selectAll('.step')
    .classed('is-active', (d) => d.id === commit.id);

  updateFileDisplay(fileFilteredCommits);
}

const filesScroller = scrollama();
filesScroller
  .setup({
    container: '#scrolly-2',
    step: '#scrolly-2 .step',
  })
  .onStepEnter(onFilesStepEnter);