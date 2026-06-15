const generatedStats = document.querySelector('#generated-stats');
const putIntoGardenButton = document.querySelector('[data-action="put-into-garden"]');

generatedStats.innerHTML = renderStatsRows();

putIntoGardenButton.addEventListener('click', () => {
  window.location.href = 'garden.html';
});
