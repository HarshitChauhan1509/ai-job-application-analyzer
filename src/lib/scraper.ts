export interface ScrapedJobResult {
  success: boolean;
  url: string;
  isProtected?: boolean;
  domain?: string;
  title?: string;
  company?: string;
  description?: string;
  location?: string;
  employmentType?: string;
  error?: string;
}

/**
 * Strips HTML tags and unescapes common HTML entities to return clean readable text.
 */
function cleanHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, "")
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "")
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, "")
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, "")
    .replace(/<\/(p|div|h[1-6]|li|tr|section|article)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

/**
 * Extracts Schema.org JSON-LD data for JobPosting if available.
 */
function extractJsonLdJobPosting(html: string): Partial<ScrapedJobResult> | null {
  const jsonLdRegex = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      const items = Array.isArray(parsed) ? parsed : parsed["@graph"] ? parsed["@graph"] : [parsed];

      for (const item of items) {
        if (item["@type"] === "JobPosting") {
          let company: string | undefined;
          if (typeof item.hiringOrganization === "string") {
            company = item.hiringOrganization;
          } else if (item.hiringOrganization?.name) {
            company = item.hiringOrganization.name;
          }

          let location: string | undefined;
          if (typeof item.jobLocation === "string") {
            location = item.jobLocation;
          } else if (item.jobLocation?.address) {
            const addr = item.jobLocation.address;
            if (typeof addr === "string") {
              location = addr;
            } else {
              const parts = [addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean);
              if (parts.length > 0) location = parts.join(", ");
            }
          }

          const description = cleanHtml(item.description || "");

          return {
            title: item.title,
            company,
            description,
            location,
            employmentType: item.employmentType,
          };
        }
      }
    } catch {
      // Ignore JSON parse errors for malformed script blocks
    }
  }

  return null;
}

/**
 * Extracts OpenGraph and standard meta tags from HTML.
 */
function extractMetaTags(html: string): { title?: string; company?: string; description?: string } {
  const getMeta = (propOrName: string) => {
    const regex = new RegExp(`<meta\\s+(?:property|name)=["']${propOrName}["']\\s+content=["']([^"']*)["']`, "i");
    const m = html.match(regex);
    return m ? m[1].trim() : undefined;
  };

  const ogTitle = getMeta("og:title");
  const metaDesc = getMeta("description") || getMeta("og:description");
  const siteName = getMeta("og:site_name");

  let docTitle: string | undefined;
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (titleMatch) {
    docTitle = titleMatch[1].trim();
  }

  return {
    title: ogTitle || docTitle,
    company: siteName,
    description: metaDesc,
  };
}

/**
 * Main URL scraping function.
 * Handles both open career pages and anti-bot protected domains (Indeed, LinkedIn).
 */
export async function scrapeJobUrl(rawUrl: string): Promise<ScrapedJobResult> {
  let url = rawUrl.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return {
      success: false,
      url,
      error: "Invalid URL provided. Please check the link and try again.",
    };
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // Known anti-bot / Cloudflare protected platforms
  const isIndeed = hostname.includes("indeed.com");
  const isLinkedIn = hostname.includes("linkedin.com");
  const isGlassdoor = hostname.includes("glassdoor.com");

  if (isIndeed || isLinkedIn || isGlassdoor) {
    const domainName = isIndeed ? "Indeed" : isLinkedIn ? "LinkedIn" : "Glassdoor";
    return {
      success: false,
      isProtected: true,
      domain: domainName,
      url,
      error: `${domainName} protects its job postings with Cloudflare bot verification, preventing automated server requests. Please paste the job description text below — we'll save your ${domainName} URL and extract all job details!`,
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
      redirect: "follow",
    });

    clearTimeout(timeoutId);

    if (response.status === 403 || response.status === 429) {
      return {
        success: false,
        isProtected: true,
        domain: hostname,
        url,
        error: `This job site (${hostname}) blocked automated fetching (status ${response.status}). Please paste the job description text below — we will link your original URL and extract all details!`,
      };
    }

    if (!response.ok) {
      return {
        success: false,
        url,
        error: `Failed to fetch page (HTTP ${response.status}). You can paste the job description text directly.`,
      };
    }

    const html = await response.text();

    // Check if Cloudflare challenge / Turnstile page was returned with a 200 OK
    if (
      html.includes("cf-turnstile") ||
      html.includes("challenge-platform") ||
      html.includes("cf-browser-verification") ||
      html.includes("Just a moment...")
    ) {
      return {
        success: false,
        isProtected: true,
        domain: hostname,
        url,
        error: `A Cloudflare security verification was triggered by ${hostname}. Please paste the job description text below.`,
      };
    }

    // 1. Try JSON-LD JobPosting
    const jsonLdData = extractJsonLdJobPosting(html);
    if (jsonLdData && jsonLdData.description && jsonLdData.description.length > 80) {
      return {
        success: true,
        url,
        title: jsonLdData.title,
        company: jsonLdData.company,
        description: jsonLdData.description,
        location: jsonLdData.location,
        employmentType: jsonLdData.employmentType,
      };
    }

    // 2. Try OpenGraph / Meta and clean body text
    const meta = extractMetaTags(html);
    const bodyText = cleanHtml(html);

    if (bodyText.length < 50) {
      return {
        success: false,
        url,
        error: "Could not extract sufficient text from this URL. Please paste the job description text manually.",
      };
    }

    return {
      success: true,
      url,
      title: meta.title,
      company: meta.company,
      description: bodyText.substring(0, 15000),
    };
  } catch (error: any) {
    if (error.name === "AbortError") {
      return {
        success: false,
        url,
        error: "Request timed out while connecting to the job site. Please paste the job description text directly.",
      };
    }
    return {
      success: false,
      url,
      error: error?.message || "Failed to reach the provided URL. Please paste the job description text directly.",
    };
  }
}
