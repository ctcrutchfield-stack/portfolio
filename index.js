import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

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

// 2. Fetch and render GitHub profile statistics
async function loadGitHubStats() {
  // Replace 'giorgianicolaou' with your actual GitHub username!
  const githubData = await fetchGitHubData('ctcrutchfield-stack'); 
  const profileStats = document.querySelector('#profile-stats');

  if (profileStats && githubData) {
    profileStats.innerHTML = `
      <h2>GitHub Stats</h2>
      <dl>
        <dt>Public Repos:</dt><dd>${githubData.public_repos}</dd>
        <dt>Public Gists:</dt><dd>${githubData.public_gists}</dd>
        <dt>Followers:</dt><dd>${githubData.followers}</dd>
        <dt>Following:</dt><dd>${githubData.following}</dd>
      </dl>
    `;
  }
}

// Execute function calls
loadLatestProjects();
loadGitHubStats();