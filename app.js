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
      '<table role="presentation" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;max-width:650px;">'
    );
  } else {
    html = html.replace(
      /<table[^>]*>/g,
      '<table role="presentation" align="center" width="700" border="0" cellpadding="0" cellspacing="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;">'
    );
  }

  html = html.replace(
    /<td(?![^>]*style)/g,
    '<td style="font-size:0;line-height:0;padding:0;mso-line-height-rule:exactly;"'
  );
  html = html.replace(
    /<td([^>]*)style="([^"]*)"/g,
    (match, p1, p2) => `<td${p1} style="font-size:0;line-height:0;padding:0;mso-line-height-rule:exactly; ${p2}"`
  );

  html = html.replace(/<td[^>]*colspan="[^"]*"[^>]*>/g, () => "<td>");

  html = html.replace(/<img([^>]*)src="([^"]*)"/g, (_match, p1, src) => {
    let newSrc = imageUrl ? `${imageUrl}${src}` : src;
    let styleMatch = /style="([^"]*)"/.exec(p1);
    let newStyle = "display:block;line-height:0;font-size:0;max-width:100%;border:0;outline:none;text-decoration:none;";
    if (styleMatch) {
      newStyle += " " + styleMatch[1];
      return `<img${p1.replace(styleMatch[0], "")} border="0" style="${newStyle}" src="${newSrc}"`;
    } else {
      return `<img${p1} border="0" style="${newStyle}" src="${newSrc}"`;
    }
  });

  if (isResponsive) {
    html = html.replace(/<img([^>]*)width="[^"]*"/g, '<img$1 width="100%"');
    html = html.replace(/<img([^>]*)height="[^"]*"/g, '<img$1 height="auto"');
  }

  if (description) {
    const descRow = `<tr><td style="padding:0;font-size:0;line-height:0;mso-line-height-rule:exactly;"><div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;">${description}</div></td></tr>`;
    html = html.replace(/(<table[^>]*>)/, `$1${descRow}`);
  }

  const parser = document.createElement("div");
  parser.innerHTML = html;
  parser.querySelectorAll("table").forEach((table) => {
    const rows = table.querySelectorAll("tr");
    rows.forEach((row) => {
      const columns = row.querySelectorAll("td");
      if (
        columns.length > 1 &&
        !Array.from(columns).some((td) => td.hasAttribute("colspan"))
      ) {
        const newTable = document.createElement("table");
        newTable.setAttribute("role", "presentation");
        newTable.setAttribute("align", "center");
        if (isResponsive) {
          newTable.setAttribute("width", "100%");
          newTable.setAttribute("style", "max-width: 650px;");
        } else {
          newTable.setAttribute("width", "650");
        }
        newTable.setAttribute("border", "0");
        newTable.setAttribute("cellpadding", "0");
        newTable.setAttribute("cellspacing", "0");
        newTable.appendChild(row.cloneNode(true));
        row.innerHTML = `<td style="font-size:0;line-height:0;padding:0;mso-line-height-rule:exactly;"></td>`;
        row.querySelector("td").appendChild(newTable);
      }
    });
  });

  html = parser.innerHTML;
  html = html.replace(
    /style="([^"]*?)(font-size:0;line-height:0;padding:0;mso-line-height-rule:exactly; )(.*?)(font-size:0;line-height:0;padding:0;mso-line-height-rule:exactly; )([^"]*?)"/g,
    'style="$1$3$5"'
  );
  html = html.replace(
    /style="([^"]*?)(font-size:0;line-height:0;padding:0;mso-line-height-rule:exactly; )([^"]*)"/g,
    'style="$1$3"'
  );

  if (campaignMedium || campaignName) {
    html = html.replace(/<a([^>]*)href="([^"]*)"/g, (_match, p1, href) => {
      if (/^(mailto:|tel:|#|javascript:)/i.test(href)) return `<a${p1}href="${href}"`;
      try {
        const url = new URL(href, "https://example.com");
        if (campaignMedium) url.searchParams.set("utm_medium", campaignMedium);
        if (campaignName) url.searchParams.set("utm_campaign", campaignName);
        const finalHref = url.toString().replace("https://example.com", "");
        return `<a${p1}href="${finalHref}"`;
      } catch {
        return `<a${p1}href="${href}"`;
      }
    });
  }

  // Update both output areas
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
document.getElementById("tabCode").addEventListener("click", () => {
  document.getElementById("codeView").classList.remove("hidden");
  document.getElementById("previewView").classList.add("hidden");
  document
    .getElementById("tabCode")
    .classList.add("text-accent", "border-accent", "border-b-2");
  document.getElementById("tabCode").classList.remove("text-graymail");
  document
    .getElementById("tabPreview")
    .classList.remove("text-accent", "border-accent", "border-b-2");
  document.getElementById("tabPreview").classList.add("text-graymail");
});

document.getElementById("tabPreview").addEventListener("click", () => {
  document.getElementById("codeView").classList.add("hidden");
  document.getElementById("previewView").classList.remove("hidden");
  document
    .getElementById("tabPreview")
    .classList.add("text-accent", "border-accent", "border-b-2", "text-accent");
  document.getElementById("tabPreview").classList.remove("text-graymail");
  document
    .getElementById("tabCode")
    .classList.remove(
      "text-accent",
      "border-accent",
      "border-b-2",
      "text-accent"
    );
  document.getElementById("tabCode").classList.add("text-graymail");
});