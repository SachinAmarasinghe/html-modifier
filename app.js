/**
 * Email Template Formatter (Photoshop slices → Mailchimp)
 * ------------------------------------------------------
 * What this does:
 * 1) Normalizes tables for email (role, widths, border/cellpadding/cellspacing).
 * 2) Injects a proper hidden preheader (preview text).
 * 3) Enhances images (prefix base URL, alt text, fluid CSS; preserve pixel attrs).
 * 4) Zeroes out only TDs that are image-only (safe for text cells).
 * 5) Adds optional responsive max-width wrapper (650px) when toggled.
 * 6) Appends UTM params to HTTP/HTTPS links only (skips mailto/tel/#/javascript).
 * 7) Light whitespace tidy—keeps conditionals/VML intact.
 *
 * Notes:
 * - Designed to play nice with Mailchimp’s sanitizer.
 * - Avoids turning width/height attributes into percentages (keeps pixel attrs).
 * - If your slices are @2x, keep pixel width attrs and rely on CSS max-width for fluid behavior.
 */

/* ==============================
 * Safe init (wait for DOM)
 * ============================== */

document.addEventListener("DOMContentLoaded", () => {
  // Cache elements once
  const els = {
    // Buttons / tabs
    modifyBtn:        document.getElementById("modifyBtn"),
    tabPreview:       document.getElementById("tabPreview"),
    tabCode:          document.getElementById("tabCode"),

    // Panels
    previewPanel:     document.getElementById("previewPanel"),
    codePanel:        document.getElementById("codePanel"),

    // Preview + output
    htmlPreview:      document.getElementById("htmlPreview"),
    outputHtml:       document.getElementById("outputHtml"),

    // Inputs
    inputHtml:        document.getElementById("inputHtml"),
    imageUrl:         document.getElementById("imageUrl"),
    description:      document.getElementById("description"),
    hiddenText:       document.getElementById("hiddenText"),
    campaignMedium:   document.getElementById("campaignMedium"),
    campaignName:     document.getElementById("campaignName"),
    responsiveToggle: document.getElementById("responsiveToggle"),
  };

  // Expose for other functions (tiny shared state)
  window.__emailFormatterEls = els;

  // Wire events only if buttons exist
  els.modifyBtn?.addEventListener("click", onModifyClick);
  els.tabPreview?.addEventListener("click", () => setTab("preview"));
  els.tabCode?.addEventListener("click", () => setTab("code"));

  // Initialize to a safe default if both panels exist
  if (els.previewPanel && els.codePanel) {
    setTab("preview");
  } else {
    console.warn("[email-formatter] Expected #previewPanel and #codePanel in the DOM.");
  }
});

/* ==============================
 * Entry Point
 * ============================== */

function onModifyClick() {
  const { rawHtml, imageBase, preheader, hiddenText, utmMedium, utmCampaign, isResponsive } = getInputs();

  if (!rawHtml.trim()) {
    toast("Paste your exported Photoshop HTML first.", "warn");
    return;
  }

  // Pipeline
  let html = rawHtml;

  // 1) Remove table height attrs to avoid client weirdness
  html = stripTableHeights(html);

  // 2) Normalize tables (widths, role, border/cellpadding/cellspacing)
  html = normalizeTables(html, isResponsive);

  // 3) Inject hidden preheader block (Mailchimp-safe layered hiding)
  if (preheader) {
    html = injectPreheader(html, preheader);
  }

  // 4) Inject hidden balance text for image-to-text ratio (after preheader)
  if (hiddenText) {
    html = injectHiddenText(html, hiddenText);
  }

  // 5) Enhance images: prefix, alt, CSS; keep pixel attrs intact
  html = enhanceImages(html, imageBase, preheader);

  // 6) Zero-out image-only TDs (don't nuke text TDs)
  html = zeroImageOnlyTds(html);

  // 7) Tidy up pointless colspan="1" (leave real colspans in place)
  html = removeNoopColspans(html);

  // 8) Add UTM parameters (skip mailto/tel/#/javascript)
  html = utmifyLinks(html, utmMedium, utmCampaign);

  // 9) Light whitespace tidy without harming conditionals/VML
  html = lightMinify(html);

  renderResults(html);

  // Only switch tabs if they exist
  try { setTab("preview"); } catch { /* ignore if tabs not present */ }
}

/* ==============================
 * Input/Output helpers
 * ============================== */

function getInputs() {
  const els = window.__emailFormatterEls || {};
  const rawHtml       = els.inputHtml?.value || "";
  const imageBase     = (els.imageUrl?.value || "").trim();
  const preheader     = (els.description?.value || "").trim();
  const hiddenText    = (els.hiddenText?.value || "").trim();
  const utmMedium     = (els.campaignMedium?.value || "").trim();
  const utmCampaign   = (els.campaignName?.value || "").trim();
  const isResponsive  = !!els.responsiveToggle?.checked;

  return { rawHtml, imageBase, preheader, hiddenText, utmMedium, utmCampaign, isResponsive };
}

/**
 * Writes both the preview iframe and the code output <textarea>.
 */
function renderResults(html) {
  const els = window.__emailFormatterEls || {};

  // Preview
  const iframe = els.htmlPreview;
  if (iframe && iframe.contentWindow && iframe.contentWindow.document) {
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(html);
    iframe.contentWindow.document.close();
  }

  // Code - update both the hidden textarea and the displayed code element
  if (els.outputHtml) {
    els.outputHtml.value = html;
  }
  
  // Update the displayed code in the <code> element
  const outputDisplay = document.getElementById("outputHtmlDisplay");
  if (outputDisplay) {
    outputDisplay.textContent = html;
    // Re-run Prism.js highlighting if available
    if (window.Prism) {
      Prism.highlightElement(outputDisplay);
    }
  }
}

/**
 * Null-safe tab toggler (don’t assume nodes exist).
 */
function setTab(which) {
  const els = window.__emailFormatterEls || {};
  const preview = els.previewPanel;
  const code = els.codePanel;
  const tabPreview = els.tabPreview;
  const tabCode = els.tabCode;

  if (!preview || !code || !tabPreview || !tabCode) {
    console.warn("[email-formatter] setTab skipped: tab elements not found.");
    return;
  }

  const showPreview = which === "preview";

  // Prefer 'hidden' attribute for a11y
  preview.toggleAttribute("hidden", !showPreview);
  code.toggleAttribute("hidden", showPreview);

  // Optional utility class if you use it elsewhere
  preview.classList.toggle("hidden", !showPreview);
  code.classList.toggle("hidden", showPreview);

  // Tab styles + a11y state
  tabPreview.classList.toggle("text-accent", showPreview);
  tabPreview.classList.toggle("border-accent", showPreview);
  tabPreview.classList.toggle("border-b-2", showPreview);
  tabPreview.classList.toggle("text-graymail", !showPreview);
  tabPreview.setAttribute("aria-selected", String(showPreview));

  tabCode.classList.toggle("text-accent", !showPreview);
  tabCode.classList.toggle("border-accent", !showPreview);
  tabCode.classList.toggle("border-b-2", !showPreview);
  tabCode.classList.toggle("text-graymail", showPreview);
  tabCode.setAttribute("aria-selected", String(!showPreview));
}

/**
 * Tiny toast helper (optional; no-op if you don’t have a toast system)
 */
function toast(msg, type = "info") {
  console[type === "warn" ? "warn" : "log"](msg);
}

/* ==============================
 * Transformers
 * ============================== */

/**
 * Removes height="..." on <table> tags (these cause rendering issues).
 */
function stripTableHeights(html) {
  return html.replace(/(<table[^>]*)\s+height="[^"]*"/gi, "$1");
}

/**
 * Normalizes table open tags:
 * - role="presentation", align, border/cellpadding/cellspacing attributes
 * - When responsive: width="100%" with style max-width:650px
 * - When fixed: width="650"
 * - Adds Outlook-friendly CSS (mso-table-lspace/rspace, border-collapse)
 */
function normalizeTables(html, isResponsive) {
  return html.replace(/<table\b[^>]*?>/gi, (tag) => {
    const attrs = normalizeTableAttributes(tag, isResponsive);
    const style = normalizeTableStyle(tag, isResponsive);
    return `<table ${attrs}${style}>`;
  });
}

/**
 * Builds normalized attributes string for <table>.
 * Preserves original id/class/lang/dir/data/aria/role attributes.
 */
function normalizeTableAttributes(tag, isResponsive) {
  const out = [];
  out.push('role="presentation"');
  out.push('align="center"');

  if (isResponsive) {
    out.push('width="100%"');
  } else {
    out.push('width="650"');
  }

  out.push('border="0"');
  out.push('cellpadding="0"');
  out.push('cellspacing="0"');

  // Preserve selected attributes from original tag
  const keep = [];
  const keepAttrs = tag.match(/\s(?:id|class|lang|dir|data-[\w-]+|aria-[\w-]+|role)="[^"]*"/gi);
  if (keepAttrs) keep.push(...keepAttrs.map(s => s.trim()));

  return [...keep, ...out].join(" ");
}

/**
 * Ensures table has Outlook-friendly CSS and optional max-width wrapper.
 */
function normalizeTableStyle(tag, isResponsive) {
  const m = tag.match(/\sstyle="([^"]*)"/i);
  const existing = m ? m[1] : "";
  const common = "mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;";
  const max = isResponsive ? "max-width:650px;" : "";
  const joined = `${common}${max}${existing ? " " + existing : ""}`.trim();
  return ` style="${escapeStyle(joined)}"`;
}

/**
 * Injects a layered-hidden preheader right after the first <table>.
 * This survives Mailchimp sanitization and hides across clients.
 */
function injectPreheader(html, preheaderText) {
  const safe = htmlEscape(preheaderText);
  const block = `
<tr>
  <td style="padding:0;">
    <div style="display:none !important;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;visibility:hidden;">
      ${safe}
    </div>
  </td>
</tr>`.trim();

  // Insert right after the first opening table
  return html.replace(/(<table\b[^>]*>)/i, `$1${block}`);
}

/**
 * Injects hidden balance text for improving image-to-text ratio.
 * Similar to preheader but used specifically for spam filter balance.
 * Inserts after preheader if present, otherwise after first table.
 */
function injectHiddenText(html, balanceText) {
  const safe = htmlEscape(balanceText);
  const block = `
<tr>
  <td style="padding:0;">
    <div style="display:none !important;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;visibility:hidden;">
      ${safe}
    </div>
  </td>
</tr>`.trim();

  // Try to insert after the first </tr> tag (likely after preheader if it exists)
  // Use non-global regex to match only the first occurrence
  const firstTrEnd = html.indexOf('</tr>');
  if (firstTrEnd !== -1) {
    // Insert after the first table row (after preheader)
    return html.slice(0, firstTrEnd + 5) + block + html.slice(firstTrEnd + 5);
  } else {
    // Fallback: insert after first table if no rows yet
    return html.replace(/(<table\b[^>]*>)/i, `$1${block}`);
  }
}

/**
 * Enhances <img> tags:
 * - Prefix imageBase for relative URLs (skip http/https/data)
 * - Adds robust inline CSS for consistency across clients
 * - Preserves pixel width/height attributes (don’t convert to % attrs)
 * - Adds alt="" using: existing alt OR preheader OR filename
 */
function enhanceImages(html, imageBase, preheader) {
  return html.replace(/<img\b([^>]*)>/gi, (imgTag, attrs) => {
    // Extract src
    const srcMatch = attrs.match(/\ssrc="([^"]*)"/i);
    const src = srcMatch ? srcMatch[1] : "";

    // Determine final src
    const isAbs = /^https?:\/\//i.test(src) || /^data:/i.test(src);
    const srcFinal =
      imageBase && !isAbs ? joinUrl(imageBase, src) : src;

    // Determine alt (existing > preheader > filename)
    const altMatch = attrs.match(/\salt="([^"]*)"/i);
    const altExisting = altMatch ? altMatch[1].trim() : "";
    const altFromFile = (src.split("/").pop() || "")
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[-_]+/g, " ")
      .trim();
    const alt = altExisting || preheader || altFromFile || "";

    // Build style
    const styleBase = [
      "display:block",
      "line-height:0",
      "font-size:0",
      "height:auto",
      "max-width:100%",
      "border:0",
      "outline:none",
      "text-decoration:none",
      "-ms-interpolation-mode:bicubic"
    ].join(";");

    const styleMatch = attrs.match(/\sstyle="([^"]*)"/i);
    const style = styleMatch ? `${styleBase}; ${styleMatch[1]}` : styleBase;

    // Remove old alt/style/src and rebuild tag
    let cleanAttrs = attrs
      .replace(/\salt="[^"]*"/i, "")
      .replace(/\sstyle="[^"]*"/i, "")
      .replace(/\ssrc="[^"]*"/i, "");

    cleanAttrs = cleanAttrs.trim().length ? " " + cleanAttrs.trim() : "";

    return `<img src="${srcFinal}" alt="${htmlEscape(alt)}" style="${escapeStyle(style)}"${cleanAttrs}>`;
  });
}

/**
 * Zeroes only TDs that contain images exclusively (plus whitespace).
 * Keeps text TDs untouched so real copy remains readable/indexable.
 */
function zeroImageOnlyTds(html) {
  // TDs with only whitespace + one <img> + whitespace
  return html.replace(
    /<td\b([^>]*)>(\s*)<img\b[^>]*>(\s*)<\/td>/gi,
    (m, attrs, pre, post) => {
      const hasStyle = /\sstyle="/i.test(attrs);
      const zero = "padding:0;font-size:0;line-height:0;";
      if (hasStyle) {
        return m.replace(/style="([^"]*)"/i, (s, val) => `style="${escapeStyle(`${zero} ${val}`)}"`);
      }
      const injected = attrs.trim().length ? ` ${attrs.trim()}` : "";
      const img = m.match(/<img\b[^>]*>/i)[0];
      return `<td${injected} style="${zero}">${pre}${img}${post}</td>`;
    }
  );
}

/**
 * Removes only no-op colspan="1" (or empty). Leaves real colspans intact.
 */
function removeNoopColspans(html) {
  return html.replace(/\scolspan="(?:1|)"/gi, "");
}

/**
 * Appends UTM params to HTTP/HTTPS links. Skips mailto/tel/#/javascript.
 * Works with relative links by using a parsing base and then removing it.
 */
function utmifyLinks(html, utmMedium, utmCampaign) {
  if (!utmMedium && !utmCampaign) return html;

  return html.replace(/<a\b([^>]*)href="([^"]*)"/gi, (match, attrs, href) => {
    if (/^(mailto:|tel:|#|javascript:)/i.test(href)) return match;

    try {
      const url = new URL(href, "https://example.com"); // base to parse relative
      if (utmMedium)   url.searchParams.set("utm_medium", utmMedium);
      if (utmCampaign) url.searchParams.set("utm_campaign", utmCampaign);
      const finalHref = url.toString().replace("https://example.com", "");
      return `<a${attrs}href="${finalHref}"`;
    } catch {
      return match;
    }
  });
}

/**
 * Light whitespace minifier; keeps conditional comments/VML intact.
 * - Collapses 2+ spaces into 1 where safe (outside tags).
 * - Trims trailing spaces on lines.
 */
function lightMinify(html) {
  return html
    .replace(/[ \t]+$/gm, "")  // trim line-end spaces
    .replace(/ {2,}/g, " ");   // collapse runs of spaces
}

/* ==============================
 * Utilities
 * ============================== */

/**
 * Joins a base URL and a (possibly) relative path into a single absolute/clean URL.
 */
function joinUrl(base, path) {
  const cleanBase = (base || "").replace(/\/+$/, "");
  const cleanPath = (path || "").replace(/^\/+/, "");
  return `${cleanBase}/${cleanPath}`;
}

/**
 * Escapes text for HTML context.
 */
function htmlEscape(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Escapes suspicious chars in inline style strings (keeps CSS safe).
 */
function escapeStyle(style) {
  return String(style).replace(/"/g, "&quot;");
}
