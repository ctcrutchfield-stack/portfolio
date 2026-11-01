import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// 1. Fetch project data from lib/projects.json
const projects = await fetchJSON('../lib/projects.json');

// 2. Select the DOM containers
const projectsContainer = document.querySelector('.projects');
const searchInput = document.querySelector('.search-bar');

// 3. Render initial projects list
if (projects && projectsContainer) {
  renderProjects(projects, projectsContainer, 'h2');
}

// -----------------------------------------------------------
// LAB 5: D3 PIE CHART & LEGEND FILTERING
// -----------------------------------------------------------

let selectedYear = null; // Tracks clicked/selected year label

function renderPieChart(projectsGiven) {
  // Aggregate projects count grouped by year
  let rolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year
  );

  // Map to array of objects: [{ value: count, label: year }, ...]
  let data = rolledData.map(([year, count]) => ({
    value: count,
    label: year,
  }));

  // Clear existing SVG paths and legend items before re-rendering
  let svg = d3.select('#projects-pie-plot');
  svg.selectAll('*').remove();

  let legend = d3.select('.legend');
  legend.selectAll('*').remove();

  if (data.length === 0) return;

  // D3 Generators & Color Scale
  let sliceGenerator = d3.pie().value((d) => d.value);
  let arcData = sliceGenerator(data);
  let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
  let colors = d3.scaleOrdinal(d3.schemeTableau10);

  // Draw pie slices and legend items
  arcData.forEach((d, idx) => {
    let yearLabel = d.data.label;
    let isSelected = selectedYear === yearLabel;

    // Append path wedge
    let path = svg
      .append('path')
      .attr('d', arcGenerator(d))
      .attr('fill', colors(idx))
      .attr('class', isSelected ? 'selected' : '');

    // Append corresponding legend item
    let legendItem = legend
      .append('li')
      .attr('class', isSelected ? 'legend-item selected' : 'legend-item')
      .html(
        `<span class="swatch" style="background-color: ${colors(idx)}"></span> ${yearLabel} <em>(${d.data.value})</em>`
      );

    // Click event handler for wedge & legend filtering
    const toggleSelection = () => {
      // Toggle selection state
      selectedYear = selectedYear === yearLabel ? null : yearLabel;

      // Filter projects based on current search query AND selected year
      applyFilters();
    };

    path.on('click', toggleSelection);
    legendItem.on('click', toggleSelection);
  });
}

// Helper function to apply both search query and year wedge filter concurrently
function applyFilters() {
  let query = searchInput ? searchInput.value.toLowerCase() : '';

  // 1. Filter by search query across all metadata fields
  let filtered = projects.filter((project) => {
    let matchesQuery = Object.values(project)
      .join(' ')
      .toLowerCase()
      .includes(query);

    let matchesYear = selectedYear ? project.year === selectedYear : true;

    return matchesQuery && matchesYear;
  });

  // 2. Render filtered project cards
  renderProjects(filtered, projectsContainer, 'h2');

  // 3. Update title count if element exists or title class exists
  const titleEl = document.querySelector('.projects-title');
  if (titleEl) {
    titleEl.textContent = `Projects (${filtered.length})`;
  }

  // 4. Re-render pie chart for projects matching current search query
  let searchOnlyFiltered = projects.filter((project) => {
    return Object.values(project).join(' ').toLowerCase().includes(query);
  });

  renderPieChart(searchOnlyFiltered);
}

// Search input event listener
if (searchInput) {
  searchInput.addEventListener('input', () => {
    applyFilters();
  });
}

// Initial render of pie chart
if (projects && projects.length > 0) {
  renderPieChart(projects);
}