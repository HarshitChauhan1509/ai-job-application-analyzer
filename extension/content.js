/**
 * CareerPilot Web Clipper — Content Script
 * Platform-specific DOM scrapers for LinkedIn, Indeed, Greenhouse, Lever, Ashby & YC
 */

function extractJobData() {
  const url = window.location.href;
  const hostname = window.location.hostname;

  let title = "";
  let company = "";
  let location = "";
  let description = "";

  // 1. JSON-LD Structured Data Extraction (Gold Standard if present)
  try {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent || "{}");
        const item = data["@type"] === "JobPosting" ? data : (data["@graph"] || []).find((g) => g["@type"] === "JobPosting");
        if (item) {
          if (item.title) title = item.title;
          if (item.hiringOrganization?.name) company = item.hiringOrganization.name;
          if (item.jobLocation?.address?.addressLocality) {
            location = item.jobLocation.address.addressLocality;
          }
          if (item.description) {
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = item.description;
            description = tempDiv.textContent || tempDiv.innerText || "";
          }
          if (title && description) break;
        }
      } catch (e) {}
    }
  } catch (e) {}

  // 2. Platform-Specific DOM Selectors
  if (hostname.includes("linkedin.com")) {
    title = title || getText([
      ".job-details-jobs-unified-top-card__job-title",
      ".jobs-unified-top-card__job-title",
      "h1.t-24",
      ".jobs-details__main-content h1",
      ".artdeco-entity-lockup__title",
    ]);

    company = company || getText([
      ".job-details-jobs-unified-top-card__company-name a",
      ".jobs-unified-top-card__company-name a",
      ".jobs-unified-top-card__company-name",
      ".job-details-jobs-unified-top-card__company-name",
    ]);

    location = location || getText([
      ".job-details-jobs-unified-top-card__workplace-type",
      ".jobs-unified-top-card__bullet",
      ".job-details-jobs-unified-top-card__primary-description",
    ]);

    description = description || getText([
      ".jobs-description__content",
      ".jobs-box__html-content",
      "#job-details",
      ".jobs-description",
    ]);
  } else if (hostname.includes("indeed.com")) {
    title = title || getText([
      '[data-testid="jobsearch-JobInfoHeader-title"]',
      "h1.jobsearch-JobInfoHeader-title",
      "h2.jobTitle",
    ]);

    company = company || getText([
      '[data-testid="inlineHeader-companyName"]',
      ".jobsearch-InlineCompanyRating-companyHeader",
      ".companyName",
    ]);

    location = location || getText([
      '[data-testid="inlineHeader-companyLocation"]',
      ".jobsearch-JobInfoHeader-companyLocation",
      ".companyLocation",
    ]);

    description = description || getText([
      "#jobDescriptionText",
      ".jobsearch-JobComponent-description",
    ]);
  } else if (hostname.includes("greenhouse.io")) {
    title = title || getText([".app-title", "h1.app-title", "h1"]);
    company = company || getText([".company-name", "meta[property='og:site_name']"]);
    location = location || getText([".location"]);
    description = description || getText(["#content", "#main", "div.body"]);
  } else if (hostname.includes("lever.co")) {
    title = title || getText([".posting-headline h2", "h2"]);
    company = company || document.title.split("-")[1]?.trim() || "";
    location = location || getText([".workplaceTypes", ".location"]);
    description = description || getText([".section-wrapper", ".content"]);
  } else if (hostname.includes("ashbyhq.com")) {
    title = title || getText(["[data-testid='job-title']", "h1"]);
    company = company || document.title.split("-")[1]?.trim() || "";
    location = location || getText(["[data-testid='job-location']"]);
    description = description || getText([".ashby-job-posting-description", "main"]);
  } else if (hostname.includes("workatastartup.com")) {
    title = title || getText([".company-header h1", "h1"]);
    company = company || getText([".company-name", "h2"]);
    location = location || getText([".location"]);
    description = description || getText([".job-description", ".prose"]);
  }

  // 3. Fallbacks using Document Meta Tags & OpenGraph
  if (!title) {
    const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute("content");
    title = ogTitle || document.title.split("|")[0]?.split("-")[0]?.trim() || "Software Engineer";
  }

  if (!company) {
    const ogSite = document.querySelector('meta[property="og:site_name"]')?.getAttribute("content");
    company = ogSite || (hostname.replace(/^www\./, "").split(".")[0]);
    if (company) {
      company = company.charAt(0).toUpperCase() + company.slice(1);
    }
  }

  if (!description) {
    const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute("content");
    description = ogDesc || (document.querySelector("main") || document.body).innerText.slice(0, 3000);
  }

  return {
    url,
    title: title.trim(),
    company: company.trim(),
    location: (location || "Remote / Flexible").trim(),
    description: description.trim(),
  };
}

function getText(selectors) {
  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel);
      if (el) {
        const text = el.innerText || el.textContent || "";
        if (text.trim().length > 0) return text.trim();
      }
    } catch (e) {}
  }
  return "";
}

// Listen for messages from extension popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GET_JOB_DATA") {
    const data = extractJobData();
    sendResponse({ success: true, data });
  }
  return true;
});
