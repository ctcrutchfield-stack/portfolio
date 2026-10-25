import { fetchJSON, renderProjects } from '../global.js';

// 1. Fetch project data from lib/projects.json
const projects = await fetchJSON('../lib/projects.json');

// 2. Select the DOM container
const projectsContainer = document.querySelector('.projects');

// 3. Render projects dynamically (using h2 headings)
if (projects && projectsContainer) {
  renderProjects(projects, projectsContainer, 'h2');
}