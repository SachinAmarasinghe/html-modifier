document.getElementById('modifyBtn1').addEventListener('click', function() {
    // Get the input HTML
    let html = document.getElementById('inputHtml').value;

    // Get the user-defined image base URL, description, campaign medium, and campaign name
    const imageUrl = document.getElementById('imageUrl').value;
    const description = document.getElementById('description').value.trim();
    const campaignMedium = document.getElementById('campaignMedium').value.trim();
    const campaignName = document.getElementById('campaignName').value.trim();
    const isResponsive = document.getElementById("responsiveToggle").checked;

    // 1. Remove height attribute from <table>
    html = html.replace(/(<table[^>]*) height="[^"]*"/g, '$1');
    
    // 2. Add role="presentation", align="center", width="700", border="0", cellpadding="0", cellspacing="0" to all <table>
    html = html.replace(/<table(.*?)>/g, '<table role="presentation" align="center" width="700" border="0" cellpadding="0" cellspacing="0"$1>');

    // 3. Add style="font-size: 0px; padding: 0px;" to <td> elements
    html = html.replace(/<td(?![^>]*style)/g, '<td style="font-size: 0px; padding: 0px;"');
    html = html.replace(/<td([^>]*)style="([^"]*)"/g, (match, p1, p2) => {
        return `<td${p1} style="font-size: 0px; padding: 0px; ${p2}"`;
    });

    // 4. Remove colspan attributes from <td>
    html = html.replace(/<td[^>]*colspan="[^"]*"[^>]*>/g, '<td>');

    // 5. Add or merge styles to <img> elements
    html = html.replace(/<img([^>]*)src="([^"]*)"/g, (match, p1, src) => {
        let newSrc = imageUrl ? `${imageUrl}${src}` : src; // Prepend the base URL, keep the rest of the src intact
        let styleMatch = /style="([^"]*)"/.exec(p1);
        let newStyle = 'display:block;line-height:0;font-size:0;height:auto;';
        
        if (styleMatch) {
            newStyle = `${newStyle} ${styleMatch[1]}`;  // Merge styles if 'style' already exists
            return `<img${p1.replace(styleMatch[0], '')} style="${newStyle}" src="${newSrc}"`;  // Replace existing style
        } else {
            return `<img${p1} style="${newStyle}" src="${newSrc}"`;  // Add style if not present
        }
    });

    // 6. Insert the description as the first row in the table
    if (description) {
        const descriptionRow = `<tr><td style="font-size: 0px; color: #fff; padding: 0px;">${description}</td></tr>`;
        html = html.replace(/(<table[^>]*>)/, `$1${descriptionRow}`);
    }

    // 7. Handle multi-column rows (two or more <td> elements in a <tr> but NOT colspan)
    const tableParser = document.createElement('div');
    tableParser.innerHTML = html;

    tableParser.querySelectorAll('table').forEach(table => {
        const rows = table.querySelectorAll('tr');
        rows.forEach(row => {
            const columns = row.querySelectorAll('td');

            // If the row has two or more columns and doesn't use colspan, move it to a separate inner table
            if (columns.length > 1 && !Array.from(columns).some(td => td.hasAttribute('colspan'))) {
                const newTable = document.createElement('table');
                newTable.setAttribute('role', 'presentation');
                newTable.setAttribute('align', 'center');
                newTable.setAttribute('width', '700');
                newTable.setAttribute('border', '0');
                newTable.setAttribute('cellpadding', '0');
                newTable.setAttribute('cellspacing', '0');

                newTable.appendChild(row.cloneNode(true)); // Move the multi-column row into the new table
                
                // Clear the row in the original table and insert the new table
                row.innerHTML = `<td style="font-size: 0px; padding: 0px;"></td>`;
                row.querySelector('td').appendChild(newTable);
            }
        });
    });

    // Update the modified HTML back to string format
    html = tableParser.innerHTML;

    // Clean up duplicate styles in <td>
    html = html.replace(/style="([^"]*?)(font-size: 0px; padding: 0px; )(.*?)(font-size: 0px; padding: 0px; )([^"]*?)"/g, 'style="$1$3$5"');
    html = html.replace(/style="([^"]*?)(font-size: 0px; padding: 0px; )([^"]*)"/g, 'style="$1$3"');

    // 8. Add UTM parameters to all links in the HTML
    if (campaignMedium && campaignName) {
        html = html.replace(/<a([^>]*)href="([^"]*)"/g, (match, p1, href) => {
            // Add UTM parameters to the URL
            const url = new URL(href, window.location.href);
            url.searchParams.set('utm_medium', campaignMedium);
            url.searchParams.set('utm_campaign', campaignName);
            return `<a${p1}href="${url.toString()}"`;
        });
    }

    // Set the modified HTML in the output textarea
    document.getElementById('outputHtml').value = html;
});
