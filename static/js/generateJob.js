async function generateJob() {
  const form = document.getElementById("jobForm");
  const generateBtn = document.getElementById("generateBtn");
  const hclOutput = document.getElementById("hclOutput");
  const deployBtn = document.getElementById("deployBtn");
  const copyBtn = document.getElementById("copyBtn");

  generateBtn.disabled = true;
  generateBtn.textContent = "Generating...";
  hclOutput.value = "Generating Nomad HCL template...";
  deployBtn.disabled = true;
  copyBtn.disabled = true;

  const job_name = form.job_name.value;
  const payload = {
    job_name: job_name,
    datacenter_name: form.datacenter_name.value,
    namespace: form.namespace.value,
    container_port: form.container_port.value,
    exposed_port: form.exposed_port.value,
    worker_name: form.worker_name.value,
    vault_role: form.vault_role.value,
    cpu: form.cpu.value,
    memory: form.memory.value,
    node: form.node_class.value,
    vault_yaml: form.vault_yaml.value,
  };

  try {
    const result = await fetchWithBackoff("/generate_job", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (result.success) {
      hclOutput.value = result.hcl;
      deployBtn.disabled = false;
      copyBtn.disabled = false;
      showMessageBox(
        "Generation Complete",
        `Nomad job template for "${job_name}" successfully generated.`
      );
    } else {
      hclOutput.value = `Error: ${result.error}`;
      showMessageBox("Generation Failed", `An error occurred: ${result.error}`);
    }
  } catch (error) {
    console.error("[Generate Job Error]", error);
    hclOutput.value = `Error: ${error.message}`;
    showMessageBox("Job Generation Failed", error.message);
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = "Generate Nomad Job (HCL)";
  }
}
