# Photoshop Export → Mailchimp/HubSpot Checklist

Use this checklist when converting a Photoshop-exported HTML slice file for use in Mailchimp or HubSpot. Only the `<table>` is pasted into the platform — the outer HTML/head/body is not needed.

---

## 1. Table

- [ ] Wrap `<table>` in a `<center>` tag
- [ ] Add `role="presentation"` to `<table>`
- [ ] Remove fixed `width` and `height` attributes from `<table>`
- [ ] Replace with responsive CSS on the `<table>` style attribute:
  ```
  mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; min-width: 400px; max-width: 700px;
  ```
- [ ] Add `align="center"` to `<table>`

---

## 2. Images

- [ ] Replace all relative `src="images/..."` paths with absolute URLs (e.g. `https://yourdomain.com/.../images/image.jpg`)
- [ ] Remove `height` attributes from all `<img>` tags
- [ ] Add `border="0"` to any `<img>` tags missing it
- [ ] Add to all `<img>` tags:
  ```
  style="display: block; max-width: 100%; height: auto;"
  ```

---

## 3. Table Cells

- [ ] Add `valign="top"` to every `<td>`
- [ ] Add to every `<td>` style attribute:
  ```
  font-size: 0; line-height: 0; vertical-align: top;
  ```

---

## 4. Links

- [ ] Add to every `<a>` tag:
  ```
  style="border: 0; text-decoration: none;"
  ```

---

## 5. Spacer Row

- [ ] Keep the spacer GIF row at the bottom of the table (it defines column widths)
- [ ] Update spacer GIF `src` to use the same absolute URL base as the other images:
  ```html
  <tr>
    <td><img src="https://yourdomain.com/.../images/spacer.gif" width="350" height="1" alt="" /></td>
    <td><img src="https://yourdomain.com/.../images/spacer.gif" width="265" height="1" alt="" /></td>
    <td><img src="https://yourdomain.com/.../images/spacer.gif" width="37" height="1" alt="" /></td>
    <td><img src="https://yourdomain.com/.../images/spacer.gif" width="48" height="1" alt="" /></td>
  </tr>
  ```
  > Column widths will vary per design — match them to your original spacer row values.
