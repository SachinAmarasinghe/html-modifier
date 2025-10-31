/**
 * Email Template Formatter (Photoshop slices → Mailchimp)
 * ------------------------------------------------------
 * What this does:
 * 1) Normalizes tables for email (role, widths, border/cellpadding/cellspacing).
 * 2) Injects a proper hidden preheader (preview text).
 * 3) Enhances images (prefix base URL, alt text, fluid CSS; preserve pixel attrs).
 * 4) Zeroes out only TDs that are image-only (safe for text cells).
 * 5) Adds optional responsive max-width wrapper (600px or 650px) when toggled.
 * 6) Appends UTM params to HTTP/HTTPS links only (skips mailto/tel/#/javascript).
 * 7) Light whitespace tidy—keeps conditionals/VML intact.
 * 8) Adds bgcolor attributes to TDs for Outlook compatibility.
 * 9) Wraps output in proper HTML document structure (DOCTYPE, meta tags, body styling).
 * 10) Supports 600px width option (Mailchimp standard).
 *
 * Notes:
 * - Designed to play nice with Mailchimp's sanitizer.
 * - Avoids turning width/height attributes into percentages (keeps pixel attrs).
 * - If your slices are @2x, keep pixel width attrs and rely on CSS max-width for fluid behavior.
 * - Follows Mailchimp HTML email best practices including Outlook compatibility.
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
    use600pxToggle:   document.getElementById("use600pxToggle"),
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
  const { rawHtml, imageBase, preheader, hiddenText, utmMedium, utmCampaign, isResponsive, use600px } = getInputs();

  if (!rawHtml.trim()) {
    toast("Paste your exported Photoshop HTML first.", "warn");
    return;
  }

  // Pipeline
  let html = rawHtml;

  // 1) Remove table height attrs to avoid client weirdness
  html = stripTableHeights(html);

  // 2) Normalize tables (widths, role, border/cellpadding/cellspacing)
  html = normalizeTables(html, isResponsive, use600px);

  // 3) Inject hidden preheader block (Mailchimp-safe layered hiding)
  if (preheader) {
    html = injectPreheader(html, preheader);
  }

  // 4) Inject hidden balance text for image-to-text ratio (after preheader)
  if (hiddenText) {
    html = injectHiddenText(html, hiddenText);
  }

  // 5) Enhance images: prefix, alt, CSS; keep pixel attrs intact
  html = enhanceImages(html, imageBase, preheader, hiddenText);

  // 6) Zero-out image-only TDs (don't nuke text TDs)
  html = zeroImageOnlyTds(html);

  // 7) Tidy up pointless colspan="1" (leave real colspans in place)
  html = removeNoopColspans(html);

  // 8) Add UTM parameters (skip mailto/tel/#/javascript)
  html = utmifyLinks(html, utmMedium, utmCampaign);

  // 9) Light whitespace tidy without harming conditionals/VML
  html = lightMinify(html);

  // 10) Add bgcolor attributes to TDs for Outlook compatibility
  html = addTdBackgroundColors(html);

  // 11) Wrap in proper HTML document structure if not already wrapped
  html = wrapInEmailDocument(html);

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
  const use600px      = !!els.use600pxToggle?.checked;

  return { rawHtml, imageBase, preheader, hiddenText, utmMedium, utmCampaign, isResponsive, use600px };
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
function normalizeTables(html, isResponsive, use600px) {
  return html.replace(/<table\b[^>]*?>/gi, (tag) => {
    const attrs = normalizeTableAttributes(tag, isResponsive, use600px);
    const style = normalizeTableStyle(tag, isResponsive, use600px);
    return `<table ${attrs}${style}>`;
  });
}

/**
 * Builds normalized attributes string for <table>.
 * Preserves original id/class/lang/dir/data/aria/role attributes.
 */
function normalizeTableAttributes(tag, isResponsive, use600px) {
  const out = [];
  out.push('role="presentation"');
  out.push('align="center"');

  const width = use600px ? '600' : '650';
  if (isResponsive) {
    out.push('width="100%"');
  } else {
    out.push(`width="${width}"`);
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
function normalizeTableStyle(tag, isResponsive, use600px) {
  const m = tag.match(/\sstyle="([^"]*)"/i);
  const existing = m ? m[1] : "";
  const common = "mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;";
  const maxWidth = use600px ? "600px" : "650px";
  const max = isResponsive ? `max-width:${maxWidth};` : "";
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
 * - Preserves pixel width/height attributes (don't convert to % attrs)
 * - Adds unique alt="" using: existing alt OR smart filename parsing OR contextual fallback
 * - Avoids duplicate alt text to prevent spam filtering
 */
function enhanceImages(html, imageBase, preheader, hiddenText) {
  let imageIndex = 0;
  const usedAlts = new Set(); // Track used alt texts to prevent exact duplicates
  
  // Single pass: replace images with enhanced versions, tracking uniqueness
  return html.replace(/<img\b([^>]*)>/gi, (imgTag, attrs) => {
    const currentIndex = imageIndex++;
    
    // Extract src
    const srcMatch = attrs.match(/\ssrc="([^"]*)"/i);
    const src = srcMatch ? srcMatch[1] : "";
    
    // Extract existing alt
    const altMatch = attrs.match(/\salt="([^"]*)"/i);
    const existingAlt = altMatch ? altMatch[1].trim() : "";

    // Determine final src
    const isAbs = /^https?:\/\//i.test(src) || /^data:/i.test(src);
    const srcFinal =
      imageBase && !isAbs ? joinUrl(imageBase, src) : src;

    // Generate unique alt text
    let alt = "";
    
    if (existingAlt) {
      // Use existing alt if provided (user intent)
      alt = existingAlt;
      // Track it to detect if we need to make it unique
      if (usedAlts.has(alt.toLowerCase())) {
        // Duplicate detected - append index to make unique
        alt = `${alt} ${currentIndex + 1}`;
      }
      usedAlts.add(alt.toLowerCase());
    } else {
      // Generate smart alt text from filename - guaranteed unique per image
      alt = generateUniqueAltText(src, currentIndex, preheader, hiddenText);
      
      // Ensure uniqueness even if generateUniqueAltText somehow creates duplicates
      let uniqueAlt = alt;
      let suffix = 1;
      while (usedAlts.has(uniqueAlt.toLowerCase())) {
        uniqueAlt = `${alt} variant ${suffix}`;
        suffix++;
      }
      alt = uniqueAlt;
      usedAlts.add(alt.toLowerCase());
    }

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
 * Generates unique, descriptive alt text from image filename and context.
 * Avoids repeating the same alt text across multiple images.
 */
function generateUniqueAltText(src, index, preheader, hiddenText) {
  // Extract filename and parse it intelligently
  const filename = src.split("/").pop() || "";
  const basename = filename
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/^index_/, "") // Remove common Photoshop export prefixes
    .replace(/^slice_/, "")
    .replace(/^image_/, "")
    .replace(/^img_/, "")
    .trim();

  // Parse filename for meaningful parts
  let altParts = [];
  
  // Extract numbers (e.g., "01", "02" from "index_01.jpg")
  const numberMatch = basename.match(/(\d+)/);
  const hasNumber = numberMatch && numberMatch[1];
  
  // Extract descriptive words from filename
  const words = basename
    .replace(/\d+/g, "")
    .split(/[-_\s]+/)
    .filter(w => w.length > 2) // Only meaningful words
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .filter(Boolean);

  // Build descriptive alt text
  if (words.length > 0) {
    // Use filename-derived description
    altParts.push(...words);
    if (hasNumber) {
      altParts.push(`section ${hasNumber}`);
    }
  } else if (hasNumber) {
    // Just a number - use contextual description
    altParts.push("Image");
    altParts.push(hasNumber);
  } else {
    // Generic but unique
    altParts.push("Content image");
    altParts.push(`${index + 1}`);
  }

  // Create unique alt text
  let alt = altParts.join(" ");
  
  // If we still have duplicates or empty, make it more unique using context
  if (!alt || alt.length < 3) {
    // Use parts of preheader or hidden text as inspiration if available
    const contextText = (hiddenText || preheader || "").trim();
    if (contextText) {
      const contextWords = contextText
        .split(/\s+/)
        .filter(w => w.length > 4)
        .slice(0, 2);
      if (contextWords.length > 0) {
        alt = `${contextWords.join(" ")} visual ${index + 1}`;
      } else {
        alt = `Email content image ${index + 1}`;
      }
    } else {
      alt = `Email content image ${index + 1}`;
    }
  }

  return alt.trim();
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

/**
 * Wraps HTML in a proper email document structure if not already wrapped.
 * Adds DOCTYPE, HTML structure, meta tags, and body styling for email clients.
 */
function wrapInEmailDocument(html) {
  // Check if already wrapped in HTML document
  const hasHtmlTag = /^\s*<html[^>]*>/i.test(html.trim());
  const hasDoctype = /^\s*<!DOCTYPE/i.test(html.trim());
  
  if (hasDoctype && hasHtmlTag) {
    // Already wrapped, but ensure body has proper styling
    return ensureBodyStyles(html);
  }
  
  // Extract body content if wrapped in body tags, otherwise use all HTML
  let bodyContent = html;
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    bodyContent = bodyMatch[1];
  } else {
    // Remove any existing html/head/body tags if present
    bodyContent = html.replace(/<\/?(html|head|body)[^>]*>/gi, '');
  }
  
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <title>Email</title>
</head>
<body style="margin:0;padding:0;width:100%!important;min-width:100%;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;background-color:#ffffff;" bgcolor="#ffffff">
${bodyContent}
</body>
</html>`;
}

/**
 * Ensures body tag has proper email client styling if HTML structure exists.
 */
function ensureBodyStyles(html) {
  // Check if body exists and has proper styling
  if (!/<body/i.test(html)) {
    return html;
  }
  
  // Add Outlook-safe attributes to body if missing
  return html.replace(/<body([^>]*)>/i, (match, attrs) => {
    // Check if bgcolor exists
    const hasBgcolor = /bgcolor=/i.test(attrs);
    // Check if style exists with background
    const hasBackgroundStyle = /style="[^"]*background/i.test(attrs);
    
    let updated = attrs;
    
    // Add bgcolor if missing
    if (!hasBgcolor) {
      const bgMatch = attrs.match(/style="([^"]*)"/i);
      if (bgMatch) {
        const bgColor = extractBackgroundColor(bgMatch[1]) || '#ffffff';
        updated = updated.replace(/style="([^"]*)"/i, `style="$1" bgcolor="${bgColor}"`);
      } else {
        updated = `${updated} bgcolor="#ffffff"`;
      }
    }
    
    // Ensure essential email styles are present
    const styleMatch = updated.match(/style="([^"]*)"/i);
    const existingStyle = styleMatch ? styleMatch[1] : '';
    const essentialStyles = [
      'margin:0',
      'padding:0',
      'width:100%!important',
      '-webkit-text-size-adjust:100%',
      '-ms-text-size-adjust:100%'
    ];
    
    let finalStyle = existingStyle;
    for (const style of essentialStyles) {
      const [prop] = style.split(':');
      if (!new RegExp(`${prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:`, 'i').test(finalStyle)) {
        finalStyle = finalStyle ? `${finalStyle}; ${style}` : style;
      }
    }
    
    if (styleMatch) {
      updated = updated.replace(/style="[^"]*"/i, `style="${escapeStyle(finalStyle)}"`);
    } else {
      updated = `${updated} style="${escapeStyle(finalStyle)}"`;
    }
    
    return `<body${updated}>`;
  });
}

/**
 * Extracts background color from CSS style string.
 */
function extractBackgroundColor(style) {
  const match = style.match(/background(?:-color)?\s*:\s*([^;]+)/i);
  if (match) {
    return match[1].trim();
  }
  return null;
}

/**
 * Adds bgcolor attribute to TDs that have background colors in style.
 * This is critical for Outlook which ignores CSS background-color in some cases.
 */
function addTdBackgroundColors(html) {
  return html.replace(/<td\b([^>]*)>/gi, (match, attrs) => {
    // Skip if bgcolor already exists
    if (/bgcolor=/i.test(attrs)) {
      return match;
    }
    
    // Check for background-color in style
    const styleMatch = attrs.match(/style="([^"]*)"/i);
    if (styleMatch) {
      const bgColor = extractBackgroundColor(styleMatch[1]);
      if (bgColor) {
        // Add bgcolor attribute for Outlook
        return `<td${attrs} bgcolor="${bgColor.replace(/['"]/g, '')}">`;
      }
    }
    
    return match;
  });
}
