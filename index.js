import { fetchJSON, renderProjects } from './global.js';

// 1. Fetch all projects and render the latest 3 on the homepage
async function loadLatestProjects() {
  const projects = await fetchJSON('./lib/projects.json');

  if (projects) {
    // Slice array to get only the first 3 projects
    const latestProjects = projects.slice(0, 3);
    const projectsContainer = document.querySelector('.projects');

    if (projectsContainer) {
      renderProjects(latestProjects, projectsContainer, 'h2');
    }
  }
}

// Execute function calls
loadLatestProjects();