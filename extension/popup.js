document.addEventListener("DOMContentLoaded", async () => {
  const formView = document.getElementById("formView");
  const resultView = document.getElementById("resultView");
  const errorBanner = document.getElementById("errorBanner");
  const errorMessage = document.getElementById("errorMessage");

  const titleInput = document.getElementById("jobTitle");
  const companyInput = document.getElementById("jobCompany");
  const locationInput = document.getElementById("jobLocation");
  const descInput = document.getElementById("jobDescription");
  const charCount = document.getElementById("charCount");
  const clipBtn = document.getElementById("clipBtn");
  const btnText = document.getElementById("btnText");
  const apiHostInput = document.getElementById("apiHost");

  const resultRole = document.getElementById("resultRole");
  const matchScoreVal = document.getElementById("matchScoreVal");
  const skillsPreview = document.getElementById("skillsPreview");
  const viewAppBtn = document.getElementById("viewAppBtn");
  const outreachBtn = document.getElementById("outreachBtn");
  const clipAnotherBtn = document.getElementById("clipAnotherBtn");

  let currentTabUrl = "";

  // 1. Load Host preference from chrome.storage
  try {
    const stored = await chrome.storage.local.get(["careerPilotHost"]);
    if (stored.careerPilotHost) {
      apiHostInput.value = stored.careerPilotHost;
    }
  } catch (e) {}

  apiHostInput.addEventListener("change", () => {
    chrome.storage.local.set({ careerPilotHost: apiHostInput.value.trim() });
  });

  const updateCharCount = () => {
    const len = descInput.value.length;
    charCount.textContent = `${len.toLocaleString()} chars`;
  };

  descInput.addEventListener("input", updateCharCount);

  // 2. Query active tab and request scraped job data from content script
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      currentTabUrl = tab.url || "";

      // Try sending message to content script
      chrome.tabs.sendMessage(tab.id, { action: "GET_JOB_DATA" }, (response) => {
        if (chrome.runtime.lastError || !response || !response.success) {
          // Fallback if content script not loaded
          if (tab.title) {
            const parts = tab.title.split("-");
            titleInput.value = parts[0]?.trim() || tab.title;
            companyInput.value = parts[1]?.trim() || "";
          }
          return;
        }

        const data = response.data;
        if (data.title) titleInput.value = data.title;
        if (data.company) companyInput.value = data.company;
        if (data.location) locationInput.value = data.location;
        if (data.description) {
          descInput.value = data.description;
          updateCharCount();
        }
      });
    }
  } catch (err) {
    console.warn("Could not query active tab:", err);
  }

  // 3. Handle Clip Action
  clipBtn.addEventListener("click", async () => {
    hideError();

    const title = titleInput.value.trim();
    const company = companyInput.value.trim();
    const location = locationInput.value.trim();
    const description = descInput.value.trim();

    if (!title && !description) {
      showError("Please specify a job title or paste description text.");
      return;
    }

    const selectedStage =
      document.querySelector('input[name="targetStage"]:checked')?.value || "SAVED";

    const host = (apiHostInput.value || "http://localhost:3000").replace(/\/$/, "");

    // Set Loading State
    clipBtn.disabled = true;
    btnText.textContent = "Analyzing & Clipping...";

    try {
      const response = await fetch(`${host}/api/clipper`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          company,
          location,
          rawText: description,
          url: currentTabUrl,
          targetStage: selectedStage,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || `Server responded with status ${response.status}`);
      }

      // Display Success State
      formView.style.display = "none";
      resultView.style.display = "block";

      resultRole.textContent = `${data.position} at ${data.company}`;
      matchScoreVal.textContent = `${data.matchScore || 80}%`;

      // Populate skills chips
      skillsPreview.innerHTML = "";
      (data.requiredSkills || []).slice(0, 6).forEach((skill) => {
        const chip = document.createElement("span");
        chip.className = "skill-chip";
        chip.textContent = skill;
        skillsPreview.appendChild(chip);
      });

      // Set link buttons
      viewAppBtn.href = data.viewUrl;
      outreachBtn.href = data.outreachUrl;
    } catch (err) {
      console.error("Clipper request failed:", err);
      showError(
        err.message?.includes("Failed to fetch")
          ? `Could not connect to ${host}. Please ensure CareerPilot is running locally.`
          : err.message || "Failed to clip job posting"
      );
    } finally {
      clipBtn.disabled = false;
      btnText.textContent = "Clip & Analyze Fit";
    }
  });

  // 4. Clip Another Button
  clipAnotherBtn.addEventListener("click", () => {
    resultView.style.display = "none";
    formView.style.display = "block";
    hideError();
  });

  function showError(msg) {
    errorMessage.textContent = msg;
    errorBanner.style.display = "block";
  }

  function hideError() {
    errorBanner.style.display = "none";
  }
});
