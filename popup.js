const manifest = chrome.runtime.getManifest();
const exporterName = manifest.name;
const exporterVersion = manifest.version;

const elements = {
  siteFavicon: document.getElementById("siteFavicon"),
  siteTitle: document.getElementById("siteTitle"),
  siteHost: document.getElementById("siteHost"),
  statusBox: document.getElementById("statusBox"),
  authorizeButton: document.getElementById("authorizeButton"),
  retryButton: document.getElementById("retryButton"),
  copyButton: document.getElementById("copyButton"),
  cookieCount: document.getElementById("cookieCount"),
  storageCount: document.getElementById("storageCount"),
  searchPanel: document.getElementById("searchPanel"),
  keySearch: document.getElementById("keySearch"),
  searchSummary: document.getElementById("searchSummary"),
  searchResults: document.getElementById("searchResults"),
  cookieDiagnostics: document.getElementById("cookieDiagnostics"),
  manualCopy: document.getElementById("manualCopy")
};

let activeTab = null;
let latestJson = "";
let searchableEntries = [];

document.addEventListener("DOMContentLoaded", init);
elements.authorizeButton.addEventListener("click", handleAuthorizeClick);
elements.retryButton.addEventListener("click", handleRetryClick);
elements.copyButton.addEventListener("click", handleCopyClick);
elements.keySearch.addEventListener("input", handleSearchInput);
elements.searchResults.addEventListener("click", handleSearchResultClick);

async function init() {
  setStatus("info", "Inspecting the active tab.");
  toggleManualCopy(false);
  setCookieDiagnostics([]);
  resetSearch();
  setCounts(0, 0);
  setCopyEnabled(false);

  try {
    activeTab = await getActiveTab();
    renderTabMeta(activeTab);

    const gate = getOriginGate(activeTab.url);
    if (!gate.supported) {
      showPermissionState({
        showAuthorize: false,
        showRetry: true
      });
      setStatus("error", "This page is not exportable. Open an http or https page and try again.");
      return;
    }

    showPermissionState({
      showAuthorize: true,
      showRetry: true
    });
    setStatus("info", "Click Read this site to collect cookies and localStorage from this tab.");
  } catch (error) {
    showPermissionState({
      showAuthorize: false,
      showRetry: true
    });
    setStatus("error", getMessage(error, "Failed to initialize the popup."));
  }
}

async function handleAuthorizeClick() {
  if (!activeTab) {
    await init();
    return;
  }

  const gate = getOriginGate(activeTab.url);
  if (!gate.supported) {
    setStatus("error", "This page is not exportable. Open an http or https page and try again.");
    return;
  }

  try {
    await collectActiveTabData(gate.label);
  } catch (error) {
    showPermissionState({
      showAuthorize: true,
      showRetry: true
    });
    setStatus("error", getMessage(error, "Permission request failed."));
  }
}

async function handleRetryClick() {
  await init();
}

async function handleCopyClick() {
  if (!latestJson) {
    setStatus("warning", "Nothing has been captured yet.");
    return;
  }

  await copyText(latestJson, "JSON copied to the clipboard.");
}

async function collectActiveTabData(siteLabel) {
  showPermissionState({
    showAuthorize: false,
    showRetry: true
  });
  toggleManualCopy(false);
  setCopyEnabled(false);
  setStatus("info", "Reading cookies and localStorage from the active tab.");

  let cookieResult;
  try {
    cookieResult = await readCookies(activeTab.url);
  } catch (error) {
    cookieResult = {
      cookies: [],
      diagnostics: [
        "cookies error: " + getMessage(error, "chrome.cookies.getAll failed.")
      ],
      mode: "error"
    };
  }

  const cookies = cookieResult.cookies;

  let localStorageData = {};
  let storageWarning = "";

  try {
    localStorageData = await readLocalStorage(activeTab.id);
  } catch (error) {
    storageWarning = getMessage(error, "localStorage could not be read from this page.");
  }

  const payload = {
    capturedAt: new Date().toISOString(),
    exporter: {
      name: exporterName,
      version: exporterVersion
    },
    tab: {
      url: activeTab.url,
      title: activeTab.title || "",
      host: new URL(activeTab.url).host
    },
    cookies,
    localStorage: localStorageData
  };

  latestJson = JSON.stringify(payload, null, 2);
  setCounts(cookies.length, Object.keys(localStorageData).length);
  setSearchableEntries(cookies, localStorageData);
  setCookieDiagnostics(cookieResult.diagnostics);
  setCopyEnabled(true);

  if (storageWarning) {
    setStatus("warning", "Cookies captured. localStorage was not fully available: " + storageWarning);
  } else if (cookieResult.mode === "fallback") {
    setStatus("success", "Capture complete for " + siteLabel + ". Cookies were found via domain fallback.");
  } else if (cookies.length === 0) {
    setStatus("warning", "Capture complete, but no cookies were returned for this tab. Check the query details below.");
  } else {
    setStatus("success", "Capture complete for " + siteLabel + ".");
  }
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (!tabs.length) {
    throw new Error("No active tab was found.");
  }

  return tabs[0];
}

function renderTabMeta(tab) {
  elements.siteTitle.textContent = tab.title || "(untitled tab)";

  if (tab.url) {
    try {
      elements.siteHost.textContent = new URL(tab.url).host;
    } catch (error) {
      elements.siteHost.textContent = tab.url;
    }
  } else {
    elements.siteHost.textContent = "-";
  }

  if (tab.favIconUrl) {
    elements.siteFavicon.src = tab.favIconUrl;
    elements.siteFavicon.hidden = false;
  } else {
    elements.siteFavicon.hidden = true;
    elements.siteFavicon.removeAttribute("src");
  }
}

function getOriginGate(urlValue) {
  if (!urlValue) {
    return { supported: false };
  }

  try {
    const url = new URL(urlValue);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { supported: false };
    }

    return {
      supported: true,
      label: url.protocol + "//" + url.hostname
    };
  } catch (error) {
    return { supported: false };
  }
}

async function readCookies(urlValue) {
  let hostname = "";
  const diagnostics = [];
  try {
    hostname = new URL(urlValue).hostname;
  } catch (error) {
    diagnostics.push("invalid url: " + urlValue);
    return { cookies: [], diagnostics };
  }

  const directCookies = await chrome.cookies.getAll({
    url: urlValue
  });
  diagnostics.push("url: " + directCookies.length);

  if (directCookies.length > 0) {
    return {
      cookies: directCookies,
      diagnostics,
      mode: "url"
    };
  }

  const collected = [];
  for (const domain of getCookieFallbackDomains(hostname)) {
    try {
      const cookies = await chrome.cookies.getAll({ domain });
      diagnostics.push("domain " + domain + ": " + cookies.length);
      collected.push(...cookies);
    } catch (error) {
      diagnostics.push("domain " + domain + " error: " + getMessage(error, "query failed"));
    }
  }

  return {
    cookies: dedupeCookies(collected),
    diagnostics,
    mode: collected.length > 0 ? "fallback" : "none"
  };
}

function getCookieFallbackDomains(hostname) {
  const domains = [hostname];
  const noWww = hostname.replace(/^www\./, "");
  if (noWww !== hostname) {
    domains.push(noWww);
  }

  const apex = getApexishDomain(hostname);
  if (apex) {
    domains.push(apex);
  }

  const dottedDomains = domains
    .filter((domain) => domain.includes("."))
    .map((domain) => "." + domain.replace(/^\.+/, ""));

  return Array.from(new Set(domains.concat(dottedDomains)));
}

function getApexishDomain(hostname) {
  const parts = hostname.split(".").filter(Boolean);
  if (parts.length <= 2) {
    return hostname;
  }

  const last = parts[parts.length - 1];
  const secondLast = parts[parts.length - 2];
  const thirdLast = parts[parts.length - 3];
  const countryCodeLike = last.length === 2 && secondLast.length <= 3;

  if (countryCodeLike && thirdLast) {
    return [thirdLast, secondLast, last].join(".");
  }

  return [secondLast, last].join(".");
}

function dedupeCookies(cookies) {
  const seen = new Set();
  const unique = [];

  for (const cookie of cookies) {
    const key = JSON.stringify({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      storeId: cookie.storeId,
      hostOnly: cookie.hostOnly,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
      session: cookie.session,
      expirationDate: cookie.expirationDate,
      partitionKey: cookie.partitionKey || null,
      sourceScheme: cookie.sourceScheme || null,
      sourcePort: cookie.sourcePort || null
    });

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(cookie);
  }

  return unique;
}

async function readLocalStorage(tabId) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const output = {};
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index);
        if (key !== null) {
          output[key] = window.localStorage.getItem(key);
        }
      }
      return output;
    }
  });

  if (!results.length) {
    return {};
  }

  return results[0].result || {};
}

function setStatus(kind, message) {
  elements.statusBox.className = "status " + kind;
  elements.statusBox.textContent = message;
}

function showPermissionState({ showAuthorize, showRetry }) {
  elements.authorizeButton.hidden = !showAuthorize;
  elements.retryButton.hidden = !showRetry;
}

function setCounts(cookieCount, storageCount) {
  elements.cookieCount.textContent = String(cookieCount);
  elements.storageCount.textContent = String(storageCount);
}

function setSearchableEntries(cookies, localStorageData) {
  searchableEntries = [];

  for (const cookie of cookies) {
    searchableEntries.push({
      key: cookie.name,
      source: "cookie",
      detail: [
        cookie.domain || "(domain unavailable)",
        cookie.path || "/"
      ].join(" | "),
      value: cookie.value == null ? "" : String(cookie.value)
    });
  }

  for (const key of Object.keys(localStorageData)) {
    searchableEntries.push({
      key,
      source: "localStorage",
      detail: "key",
      value: localStorageData[key] == null ? "" : String(localStorageData[key])
    });
  }

  elements.searchPanel.hidden = false;
  elements.keySearch.value = "";
  updateSearchResults("");
}

function resetSearch() {
  searchableEntries = [];
  elements.searchPanel.hidden = true;
  elements.keySearch.value = "";
  elements.searchSummary.textContent = "0 matches";
  elements.searchResults.innerHTML = "";
}

function handleSearchInput(event) {
  updateSearchResults(event.target.value);
}

async function handleSearchResultClick(event) {
  const button = event.target.closest("button[data-entry-index][data-copy-type]");
  if (!button) {
    return;
  }

  const entryIndex = Number(button.getAttribute("data-entry-index"));
  const copyType = button.getAttribute("data-copy-type");
  const entry = searchableEntries[entryIndex];

  if (!entry) {
    setStatus("warning", "Search result is no longer available. Try searching again.");
    return;
  }

  if (copyType === "key") {
    await copyText(entry.key, "Key copied: " + entry.key);
    return;
  }

  if (copyType === "value") {
    await copyText(entry.value, "Value copied for: " + entry.key);
  }
}

function updateSearchResults(rawQuery) {
  const query = String(rawQuery || "").trim().toLowerCase();
  const matches = [];

  for (let index = 0; index < searchableEntries.length; index += 1) {
    const entry = searchableEntries[index];
    if (!query || entry.key.toLowerCase().includes(query)) {
      matches.push({ entry, index });
    }
  }

  elements.searchSummary.textContent = matches.length + " matches / " + searchableEntries.length + " keys";

  if (!matches.length) {
    elements.searchResults.innerHTML = '<div class="result-item"><p class="result-key">No matching keys</p><p class="result-meta">Try a shorter fuzzy search.</p></div>';
    return;
  }

  elements.searchResults.innerHTML = matches
    .map(({ entry, index }) =>
      '<div class="result-item">' +
        '<div class="result-top">' +
          '<p class="result-key">' + escapeHtml(entry.key) + '</p>' +
          '<div class="result-actions">' +
            '<button class="mini-button" type="button" data-entry-index="' + index + '" data-copy-type="key">Copy key</button>' +
            '<button class="mini-button" type="button" data-entry-index="' + index + '" data-copy-type="value">Copy value</button>' +
          '</div>' +
        '</div>' +
        '<p class="result-meta">' + escapeHtml(entry.source + " | " + entry.detail) + '</p>' +
        '<p class="result-preview">' + escapeHtml(getValuePreview(entry.value)) + '</p>' +
      '</div>'
    )
    .join("");
}

function setCookieDiagnostics(lines) {
  if (!lines.length) {
    elements.cookieDiagnostics.hidden = true;
    elements.cookieDiagnostics.textContent = "";
    return;
  }

  elements.cookieDiagnostics.hidden = false;
  elements.cookieDiagnostics.textContent = "Cookie queries\n" + lines.join("\n");
}

function setCopyEnabled(enabled) {
  elements.copyButton.disabled = !enabled;
}

function toggleManualCopy(show) {
  elements.manualCopy.hidden = !show;
  if (!show) {
    elements.manualCopy.value = "";
  }
}

async function copyText(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    toggleManualCopy(false);
    setStatus("success", successMessage);
  } catch (error) {
    elements.manualCopy.value = text;
    toggleManualCopy(true);
    elements.manualCopy.focus();
    elements.manualCopy.select();
    setStatus("warning", "Clipboard write failed. Copy the selected text manually.");
  }
}

function getMessage(error, fallback) {
  if (chrome.runtime.lastError && chrome.runtime.lastError.message) {
    return chrome.runtime.lastError.message;
  }

  if (error && typeof error.message === "string" && error.message) {
    return error.message;
  }

  return fallback;
}

function getValuePreview(value) {
  if (value === "") {
    return "Value: (empty)";
  }

  const compact = String(value).replace(/\s+/g, " ").trim();
  if (!compact) {
    return "Value: (whitespace)";
  }

  const maxLength = 72;
  return "Value: " + (compact.length > maxLength ? compact.slice(0, maxLength) + "..." : compact);
}

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, function(character) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[character];
  });
}
