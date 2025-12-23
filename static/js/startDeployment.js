const pipelineSteps = [
  { id: "step1", name: "1. Create PostgreSQL Database", status: "pending" },
  { id: "step2", name: "2. Create Vault Secret (K/V v2)", status: "pending" },
  { id: "step3", name: "3. Push Nomad Job to GitHub", status: "pending" },
  {
    id: "step4",
    name: "4. Generate CI/CD Config & Push to Github",
    status: "pending",
  },
  {
    id: "step5",
    name: "5. Run CI/CD Pipeline & Deploy Job",
    status: "pending",
  },
];

async function startDeployment() {
  const deployBtn = document.getElementById("deployBtn");
  const deployIcon = document.getElementById("deployIcon");
  const job_name = document.getElementById("job_name").value;
  const hclOutput = document.getElementById("hclOutput").value;
  const vault_yaml = document.getElementById("vault_yaml").value;
  const resetBtn = document.getElementById("resetBtn");

  deployBtn.disabled = true;
  deployBtn.textContent = "Pipeline Running...";
  // deployIcon.classList.remove("hidden");

  resetBtn.disabled = true;
  resetBtn.classList.add("hidden");

  const steps = [
    {
      id: "step1",
      api: "/db_prepare",
      payload: { database: { name: job_name } },
    },
    { id: "step2", api: "/deploy_vault", payload: { vault_yaml } },
    { id: "step3", api: "/deploy_git", payload: { job_name, hclOutput } },
    { id: "step4", api: "/generate_ci", payload: { job_name } },
    { id: "step5", api: "/run_deploy", payload: { job_name } },
  ];

  for (let i = 0; i < steps.length; i++) {
    if (i > 0 && pipelineSteps[i - 1].status !== "success") {
      pipelineSteps[i].status = "pending";
      renderStatusList();
      break;
    }
    pipelineSteps[i].status = "in-progress"; // step1 is template
    renderStatusList();

    try {
      const result = await fetchWithBackoff(steps[i].api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(steps[i].payload),
      });

      if (result.success) {
        pipelineSteps[i].status = "success";
      } else {
        throw new Error(result.error || "Step failed");
      }
      const resetBtn = document.getElementById("resetBtn");
      resetBtn.disabled = false;
      resetBtn.classList.remove("hidden");
    } catch (err) {
      pipelineSteps[i].status = "failed";
      renderStatusList();
      showMessageBox(
        "Deployment Failed",
        `Step ${i + 1} failed: ${err.message}`
      );
      deployBtn.disabled = false;
      deployBtn.textContent = "Start Deployment Pipeline";
      // deployIcon.classList.add("hidden");

      resetBtn.disabled = false;
      resetBtn.classList.remove("hidden");

      return;
    }

    renderStatusList();
  }

  showMessageBox("Deployment Success", "All steps completed successfully.");
  deployBtn.disabled = false;
  deployBtn.textContent = "Start Deployment Pipeline";
  // deployIcon.classList.add("hidden");

  resetBtn.disabled = false;
  resetBtn.classList.remove("hidden");
}
