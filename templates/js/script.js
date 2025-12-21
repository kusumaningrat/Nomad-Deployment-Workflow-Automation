function showMessageBox(title, content) {
    document.getElementById('messageTitle').textContent = title;
    document.getElementById('messageContent').textContent = content;
    document.getElementById('messageBox').classList.remove('hidden');
    document.getElementById('messageBox').classList.add('flex');
}

/** Hides the custom message box. */
function hideMessageBox() {
    document.getElementById('messageBox').classList.add('hidden');
    document.getElementById('messageBox').classList.remove('flex');
}

/** Copies text content to clipboard using execCommand fallback. */
function copyToClipboard(elementId) {
    const textarea = document.getElementById(elementId);
    textarea.select();
    try {
        const successful = document.execCommand('copy');
        const msg = successful ? 'Successfully copied HCL to clipboard!' : 'Copy failed. Please copy manually.';
        showMessageBox('Copy Status', msg);
    } catch (err) {
        showMessageBox('Copy Status', 'Copy failed: Clipboard access denied. Please copy manually.');
    }
}

/** Implements exponential backoff for API retries. */
async function fetchWithBackoff(url, options, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            if (i < retries - 1) {
                const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                console.warn(`[API] Retrying API call to ${url} in ${delay / 1000}s...`);
            } else {
                throw error;
            }
        }
    }
}

// --- Nomad Job Generation Logic ---

/** Calls the Flask backend to generate the Nomad HCL job. */
async function generateJob() {
    const form = document.getElementById('jobForm');
    const generateBtn = document.getElementById('generateBtn');
    const hclOutput = document.getElementById('hclOutput');
    const deployBtn = document.getElementById('deployBtn');
    const copyBtn = document.getElementById('copyBtn');

    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';
    hclOutput.value = 'Generating Nomad HCL template...';
    deployBtn.disabled = true;
    copyBtn.disabled = true;

    const job_name = form.job_name.value;
    const payload = {
        job_name: job_name,
        namespace: form.namespace.value,
        container_port: form.container_port.value,
        exposed_port: form.exposed_port.value,
        worker_name: form.worker_name.value,
        vault_role: form.vault_role.value,
        cpu: form.cpu.value,
        memory: form.memory.value,
        node: form.node_class.value,
        vault_yaml: form.vault_yaml.value
    };

    try {
        const result = await fetchWithBackoff('/generate_job', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (result.success) {
            hclOutput.value = result.hcl;
            deployBtn.disabled = false;
            copyBtn.disabled = false;
            showMessageBox('Generation Complete', `Nomad job template for "${job_name}" successfully generated.`);
        } else {
            hclOutput.value = `Error: ${result.error}`;
            showMessageBox('Generation Failed', `An error occurred: ${result.error}`);
        }

    } catch (error) {
        console.error('[Generate Job Error]', error);
        hclOutput.value = `API Error: Could not connect to the server or process request. See console for details.`;
        showMessageBox('API Error', 'Failed to communicate with the server to generate the job template.');
    } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Nomad Job (HCL)';
    }
}

// --- Deployment Automation Simulation Logic ---

const pipelineSteps = [
    { id: 'step1', name: '1. Generate Templates (Completed)', status: 'pending' },
    { id: 'step2', name: '2. Create PostgreSQL Database (DBaaS)', status: 'pending' },
    { id: 'step3', name: '3. Create Vault Secret (K/V v2)', status: 'pending' },
    { id: 'step4', name: '4. Push Nomad Job to GitHub', status: 'pending' },
    { id: 'step5', name: '5. Run CI/CD Pipeline (Terraform/Nomad)', status: 'pending' },
    { id: 'step6', name: '6. Deploy Nomad Job', status: 'pending' },
];

/** Renders the initial/updated status list for the pipeline. */
function renderStatusList() {
    const listContainer = document.getElementById('statusList');
    listContainer.innerHTML = pipelineSteps.map(step => {
        let icon = '';
        let color = 'text-gray-500 bg-gray-100'; // Default: Pending
        let animationClass = '';

        if (step.status === 'in-progress') {
            // Spinner icon for in-progress
            icon = `<svg class="animate-spin h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;
            color = 'text-indigo-600 bg-indigo-100 border-indigo-400';
            animationClass = 'border-l-4 border-indigo-500 shadow-md';
        } else if (step.status === 'success') {
            // Checkmark icon for success
            icon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>`;
            color = 'text-green-600 bg-green-100 border-green-400';
        } else if (step.status === 'failed' || step.status === 'stuck') {
            // X icon for failure/stuck
            icon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg>`;
            color = 'text-red-600 bg-red-100 border-red-400';
        } else {
            // Default icon for pending
            icon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5.5 13a1.5 1.5 0 01-1.5-1.5v-5A1.5 1.5 0 015.5 5h9A1.5 1.5 0 0116 6.5v5a1.5 1.5 0 01-1.5 1.5h-9zM7 8a1 1 0 100 2h6a1 1 0 100-2H7z" /></svg>`;
        }

        return `
            <div id="${step.id}" class="flex items-center p-4 rounded-lg transition-all duration-300 ${color} ${animationClass}">
                ${icon}
                <span class="ml-3 font-medium">${step.name}</span>
            </div>
        `;
    }).join('');
}

/** Main function to run the simulated deployment pipeline. */
async function startDeployment() {
    const deployBtn = document.getElementById('deployBtn');
    const deployIcon = document.getElementById('deployIcon');

    pipelineSteps.forEach(step => step.status = 'pending');
    renderStatusList();

    deployBtn.disabled = true;
    deployBtn.textContent = 'Pipeline Running...';
    deployIcon.classList.remove('hidden');

    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    pipelineSteps[0].status = 'in-progress';
    renderStatusList();
    await delay(1000);
    pipelineSteps[0].status = 'success';
    renderStatusList();

    /* ---------------- STEP 2 (REAL BACKEND CALL) ---------------- */
    pipelineSteps[1].status = 'in-progress';
    renderStatusList();

    try {
        await fetchWithBackoff('/start_deployment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                job_name: document.getElementById('job_name').value,
                database: {
                    name: `${document.getElementById('job_name').value}_db`
                }
            })
        });

        pipelineSteps[1].status = 'success';
        renderStatusList();

    } catch (error) {
        pipelineSteps[1].status = 'failed';
        renderStatusList();

        showMessageBox(
            'Deployment Failed',
            `Database creation failed: ${error.message}`
        );

        

        deployBtn.disabled = false;
        deployBtn.textContent = 'Start Deployment Pipeline';
        deployIcon.classList.add('hidden');

        resetDeployment()

        
        return;
    }

    /* ---------------- STEP 3+ (SIMULATED) ---------------- */
    for (let i = 2; i < pipelineSteps.length; i++) {
        pipelineSteps[i].status = 'in-progress';
        renderStatusList();
        await delay(1200);

        pipelineSteps[i].status = 'success';
        renderStatusList();
    }

    showMessageBox(
        'Deployment Success!',
        'All deployment steps completed successfully.'
    );

    deployBtn.disabled = false;
    deployBtn.textContent = 'Start Deployment Pipeline';
    deployIcon.classList.add('hidden');
}

function resetDeployment() {
    const resetBtn = document.getElementById('resetBtn');

    resetBtn.disabled = false;
    resetBtn.textContent = 'Reset Deployment';
    resetBtn.classList.remove('hidden');
}

// --- Initialization ---

window.onload = function () {
    // Set initial state for the deployment pipeline
    renderStatusList();

    // Initial call to generate the default job template on load
    // This is done to pre-populate the HCL output and enable the deploy button.
    // generateJob();
};