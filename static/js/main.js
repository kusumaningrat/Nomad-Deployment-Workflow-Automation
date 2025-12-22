function showMessageBox(title, content) {
  document.getElementById("messageTitle").textContent = title;
  document.getElementById("messageContent").textContent = content;
  document.getElementById("messageBox").classList.remove("hidden");
  document.getElementById("messageBox").classList.add("flex");
}

/** Hides the custom message box. */
function hideMessageBox() {
  document.getElementById("messageBox").classList.add("hidden");
  document.getElementById("messageBox").classList.remove("flex");
}

/** Copies text content to clipboard using execCommand fallback. */
function copyToClipboard(elementId) {
  const textarea = document.getElementById(elementId);
  textarea.select();
  try {
    const successful = document.execCommand("copy");
    const msg = successful
      ? "Successfully copied HCL to clipboard!"
      : "Copy failed. Please copy manually.";
    showMessageBox("Copy Status", msg);
  } catch (err) {
    showMessageBox(
      "Copy Status",
      "Copy failed: Clipboard access denied. Please copy manually."
    );
  }
}

/** Implements exponential backoff for API retries. */
async function fetchWithBackoff(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      let data;

      try {
        data = await response.json();
      } catch {
        data = null;
      }
      if (!response.ok) {
        throw new Error(data?.error || `HTTP ${response.status}`);
      }
      return data;
    } catch (error) {
      if (i === retries - 1) {
        throw error;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

function renderStatusList() {
  const listContainer = document.getElementById("statusList");
  listContainer.innerHTML = pipelineSteps
    .map((step) => {
      let icon = "";
      let color = "text-gray-500 bg-gray-100"; // Default: Pending
      let animationClass = "";

      if (step.status === "in-progress") {
        // Spinner icon for in-progress
        icon = `<svg class="animate-spin h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;
        color = "text-indigo-600 bg-indigo-100 border-indigo-400";
        animationClass = "border-l-4 border-indigo-500 shadow-md";
      } else if (step.status === "success") {
        // Checkmark icon for success
        icon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>`;
        color = "text-green-600 bg-green-100 border-green-400";
      } else if (step.status === "failed" || step.status === "stuck") {
        // X icon for failure/stuck
        icon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg>`;
        color = "text-red-600 bg-red-100 border-red-400";
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
    })
    .join("");
}
