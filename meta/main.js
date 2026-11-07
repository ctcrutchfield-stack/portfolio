import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

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

// Step 1.2: Process raw lines into commit objects
function processCommits(data) {
  return d3.groups(data, (d) => d.commit).map(([commit, lines]) => {
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
  });
}

const commits = processCommits(data);

// Step 1.3: Render summary stats formatted properly with div cards
function displayStats(data, commits) {
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');

  const statsData = [
    { label: 'Total <abbr title="Lines of code">LOC</abbr>', value: data.length },
    { label: 'Total commits', value: commits.length },
    { label: 'Number of files', value: d3.group(data, (d) => d.file).size },
    { label: 'Max depth', value: d3.max(data, (d) => d.depth) },
    { label: 'Longest line length', value: d3.max(data, (d) => d.length) },
  ];

  statsData.forEach((stat) => {
    const div = dl.append('div').attr('class', 'stat-card');
    div.append('dt').html(stat.label);
    div.append('dd').text(stat.value);
  });
}

// Step 2, 4 & 5: Render quantitative scatterplot with brushing
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
  const xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([margin.left, width - margin.right])
    .nice();

  const yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([height - margin.bottom, margin.top]);

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([3, 20]);

  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

  // Grid lines
  svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(yScale).tickFormat('').tickSize(-width + margin.left + margin.right));

  // Axes
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale).tickFormat((d) => `${String(d).padStart(2, '0')}:00`);

  // Fixed Syntax Error Here
  svg
    .append('g')
    .attr('transform', `translate(0, ${height - margin.bottom})`)
    .call(xAxis);

  svg
    .append('g')
    .attr('transform', `translate(${margin.left}, 0)`)
    .call(yAxis);

  // Brush Group
  const brushGroup = svg.append('g').attr('class', 'brush');

  // Dots Group
  const dotsGroup = svg.append('g').attr('class', 'dots');

  const dots = dotsGroup
    .selectAll('circle')
    .data(sortedCommits)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
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

    dots.selectAll('circle').classed('selected', (d) => isCommitSelected(selection, d));

    const selectedCommits = selection
      ? commits.filter((d) => isCommitSelected(selection, d))
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

// Step 3: Tooltip Helpers
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

// Step 5: Brush Helpers
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

// Run initial rendering
displayStats(data, commits);
renderScatterplot(data, commits);