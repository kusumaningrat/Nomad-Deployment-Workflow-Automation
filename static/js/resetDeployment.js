function resetDeployment() {
  const deployBtn = document.getElementById("deployBtn");
  const deployIcon = document.getElementById("deployIcon");
  const resetBtn = document.getElementById("resetBtn");

  // Reset pipeline step states
  pipelineSteps.forEach((step) => (step.status = "pending"));
  renderStatusList();

  // Reset deploy button
  deployBtn.disabled = false;
  deployBtn.textContent = "Start Deployment Pipeline";
  deployIcon.classList.add("hidden");

  // Hide reset button
  resetBtn.disabled = true;
  resetBtn.classList.add("hidden");
}

// --- Initialization ---

window.onload = function () {
  // Set initial state for the deployment pipeline
  renderStatusList();

  // Initial call to generate the default job template on load
  // This is done to pre-populate the HCL output and enable the deploy button.
  // generateJob();
};
