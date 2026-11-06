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
      url: 'https://github.com/YOUR_USERNAME/YOUR_REPO/commit/' + commit,
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

// Step 1.3: Render summary stats
function displayStats(data, commits) {
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');

  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(data.length);

  dl.append('dt').text('Total commits');
  dl.append('dd').text(commits.length);

  dl.append('dt').text('Number of files');
  dl.append('dd').text(d3.group(data, (d) => d.file).size);

  dl.append('dt').text('Max depth');
  dl.append('dd').text(d3.max(data, (d) => d.depth));

  dl.append('dt').text('Longest line length');
  dl.append('dd').text(d3.max(data, (d) => d.length));
}

// Step 2 & 4: Render quantitative scatterplot
function renderScatterplot(data, commits) {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 50 };

  const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  // X and Y Scales
  const xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([margin.left, width - margin.right])
    .nice();

  const yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([height - margin.bottom, margin.top]);

  // Step 4: Radius scale for area perception
  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([3, 20]);

  // Sort commits so smaller circles sit on top of larger ones
  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

  // Horizontal Grid Lines
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
    .call(xAxis);

  svg
    .append('g')
    .attr('transform', `translate(${margin.left}, 0)`)
    .call(yAxis);

  // Dots
  const dots = svg.append('g').attr('class', 'dots');

  dots
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
}

// Step 3: Tooltip functions
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

// Initialize
displayStats(data, commits);
renderScatterplot(data, commits);