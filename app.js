document.getElementById("modifyBtn").addEventListener("click", function () {
  let html = document.getElementById("inputHtml").value;

  if (!html.trim()) {
    const btn = document.getElementById("modifyBtn");
    const original = btn.textContent;
    btn.textContent = "⚠️ Paste HTML first";
    setTimeout(() => { btn.textContent = original; }, 2000);
    return;
  }
  const imageUrl = document.getElementById("imageUrl").value;
  const description = document.getElementById("description").value.trim();
  const campaignMedium = document.getElementById("campaignMedium").value.trim();
  const campaignName = document.getElementById("campaignName").value.trim();
  const isResponsive = document.getElementById("responsiveToggle").checked;

  html = html.replace(/(<table[^>]*) height="[^"]*"/g, "$1");

  if (isResponsive) {
    html = html.replace(
      /<table[^>]*>/g,
      '<table role="presentation" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;max-width:700px;">'
    );
  } else {
    html = html.replace(
      /<table[^>]*>/g,
      '<table role="presentation" align="center" width="700" border="0" cellpadding="0" cellspacing="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;">'
    );
  }

  const tdStyle = "font-size:0;line-height:0;padding:0;mso-line-height-rule:exactly;";
  html = html.replace(/<td([^>]*)>/g, (match, attrs) => {
    if (/\bstyle="/.test(attrs)) return match.replace(/\bstyle="/, `style="${tdStyle} `);
    return `<td${attrs} style="${tdStyle}">`;
  });

  html = html.replace(/<td(?![^>]*valign)/g, '<td valign="top"');

  html = html.replace(/<img([^>]*)>/g, (_match, attrs) => {
    const srcMatch = /\bsrc="([^"]*)"/i.exec(attrs);
    if (!srcMatch) return _match;
    const src = srcMatch[1];
    const newSrc = imageUrl && !src.startsWith('http')
      ? `${imageUrl.replace(/\/+$/, '')}/${src.replace(/^\/+/, '')}`
      : src;
    const styleMatch = /\bstyle="([^"]*)"/i.exec(attrs);
    let newStyle = isResponsive
      ? "display:block;line-height:0;font-size:0;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;"
      : "display:block;line-height:0;font-size:0;max-width:100%;border:0;outline:none;text-decoration:none;";
    if (styleMatch) newStyle += " " + styleMatch[1];
    let cleanAttrs = attrs
      .replace(/\bsrc="[^"]*"/i, '')
      .replace(/\bstyle="[^"]*"/i, '')
      .replace(/\bborder="[^"]*"/i, '');
    if (isResponsive) {
      cleanAttrs = cleanAttrs
        .replace(/\bwidth="(\d+)"/i, (m, w) => parseInt(w) < 150 ? m : 'width="100%"')
        .replace(/\bheight="[^"]*"/i, '');
    } else {
      const widthMatch = /\bwidth="(\d+)"/i.exec(cleanAttrs);
      if (widthMatch && parseInt(widthMatch[1]) > 700) {
        cleanAttrs = cleanAttrs
          .replace(/\bwidth="(\d+)"/i, 'width="700"')
          .replace(/\bheight="[^"]*"/i, '');
      }
    }
    cleanAttrs = cleanAttrs.replace(/\s+/g, ' ').trim();
    return `<img${cleanAttrs ? ' ' + cleanAttrs : ''} border="0" style="${newStyle}" src="${newSrc}">`;
  });

  if (description) {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    const firstTable = tempDiv.querySelector("table");
    let maxCols = 1;
    if (firstTable) {
      firstTable.querySelectorAll("tr").forEach((tr) => {
        let cols = 0;
        tr.querySelectorAll("td").forEach((td) => {
          cols += parseInt(td.getAttribute("colspan") || "1", 10);
        });
        if (cols > maxCols) maxCols = cols;
      });
    }
    const colspanAttr = maxCols > 1 ? ` colspan="${maxCols}"` : "";
    const descRow = `<tr><td${colspanAttr} style="padding:0;font-size:0;line-height:0;mso-line-height-rule:exactly;"><div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;">${description}</div></td></tr>`;
    html = html.replace(/(<table[^>]*>)/, `$1${descRow}`);
  }

  const parser = document.createElement("div");
  parser.innerHTML = html;
  parser.querySelectorAll("table").forEach((table) => {
    const hasRowspan = table.querySelector("td[rowspan]") !== null;
    const rows = table.querySelectorAll("tr");
    rows.forEach((row) => {
      const columns = row.querySelectorAll("td");
      if (
        !hasRowspan &&
        columns.length > 1 &&
        !Array.from(columns).some((td) => td.hasAttribute("colspan"))
      ) {
        const newTable = document.createElement("table");
        newTable.setAttribute("role", "presentation");
        newTable.setAttribute("align", "center");
        if (isResponsive) {
          newTable.setAttribute("width", "100%");
          newTable.setAttribute("style", "mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;");
        } else {
          newTable.setAttribute("width", "700");
          newTable.setAttribute("style", "mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;");
        }
        newTable.setAttribute("border", "0");
        newTable.setAttribute("cellpadding", "0");
        newTable.setAttribute("cellspacing", "0");
        newTable.appendChild(row.cloneNode(true));
        row.innerHTML = `<td valign="top" style="font-size:0;line-height:0;padding:0;mso-line-height-rule:exactly;"></td>`;
        row.querySelector("td").appendChild(newTable);
      }
    });
  });

  html = parser.innerHTML;
  html = html.replace(/ style=""/g, '');

  html = html.replace(/<a\b(?![^>]*\bstyle=)/g, '<a style="border: 0; text-decoration: none;"');

  if (campaignMedium || campaignName) {
    html = html.replace(/<a([^>]*)href="([^"]*)"/g, (_match, p1, href) => {
      if (/^(mailto:|tel:|#|javascript:)/i.test(href)) return `<a${p1}href="${href}"`;
      try {
        const url = new URL(href, "https://example.com");
        if (campaignMedium) url.searchParams.set("utm_medium", campaignMedium);
        if (campaignName) url.searchParams.set("utm_campaign", campaignName);
        const finalHref = url.toString().replace(/^https:\/\/example\.com/, "");
        return `<a${p1}href="${finalHref}"`;
      } catch {
        return `<a${p1}href="${href}"`;
      }
    });
  }

  // Update both output areas
  document.getElementById("outputHtml").value = html;
  const display = document.getElementById("outputHtmlDisplay");
  display.textContent = html;
  Prism.highlightElement(display);

  // ✅ Show live preview
  const previewFrame = document.getElementById("previewFrame");
  previewFrame.srcdoc = html;
});

document.getElementById("copyBtn").addEventListener("click", () => {
  const htmlContent = document.getElementById("outputHtml").value;
  const btn = document.getElementById("copyBtn");

  function flashBtn(text) {
    const original = btn.textContent;
    btn.textContent = text;
    setTimeout(() => { btn.textContent = original; }, 2000);
  }

  navigator.clipboard
    .writeText(htmlContent)
    .then(() => flashBtn("✅ Copied!"))
    .catch(() => flashBtn("❌ Failed"));
});

// Tab toggle logic
function setActiveTab(activeTabId, inactiveTabId, showViewId, hideViewId) {
  document.getElementById(showViewId).classList.remove("hidden");
  document.getElementById(hideViewId).classList.add("hidden");
  document.getElementById(activeTabId).classList.add("text-accent", "border-accent", "border-b-2");
  document.getElementById(activeTabId).classList.remove("text-graymail");
  document.getElementById(inactiveTabId).classList.remove("text-accent", "border-accent", "border-b-2");
  document.getElementById(inactiveTabId).classList.add("text-graymail");
}

document.getElementById("tabCode").addEventListener("click", () =>
  setActiveTab("tabCode", "tabPreview", "codeView", "previewView")
);

document.getElementById("tabPreview").addEventListener("click", () =>
  setActiveTab("tabPreview", "tabCode", "previewView", "codeView")
);