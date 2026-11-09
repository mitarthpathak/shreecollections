# Admin panel

`/admin` lets the shop add, edit and remove sarees and suits from a phone or a computer:
log in with the admin password, then use **+ Add saree** / **+ Add suit**, **Edit** or **Remove**.

Each save is one commit to the branch the live site is built from (Vercel's production branch) (`data/products.json` and the photos in
`public/products/<slug>/`). Vercel rebuilds the site from it, so a change is live about two
minutes later; the panel shows when it is.

## One-time setup (Vercel)

1. **Admin password**: Vercel → the project → Settings → Environment Variables → add
   `ADMIN_PASSWORD` (at least 8 characters; a long passphrase is best). Environment:
   Production (and Preview if you want the panel on previews too).
2. **GitHub token**, so the panel can save:
   - GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** →
     Generate new token.
   - Repository access: **Only select repositories** → `mitarthpathak/shreecollections`.
   - Permissions → Repository permissions → **Contents: Read and write** (nothing else).
   - Expiration: up to a year; put a reminder to renew it.
   - Add it in Vercel as `ADMIN_GITHUB_TOKEN`.
3. Optional: `ADMIN_GITHUB_BRANCH` and `ADMIN_GITHUB_REPO`. By default the panel saves to the
   branch the live deployment was built from (Vercel's production branch), in this repository.
4. Redeploy (Deployments → ⋯ → Redeploy) so the new variables are picked up, then open
   `https://<your site>/admin`.

Changing `ADMIN_PASSWORD` signs everyone out. Never put the password or the token in the code.

## How it behaves

- **Its own screen**: the panel has its own top bar (theme, View site, Log out) and none of the
  shop's header, footer, tab bar, cursor or grain. The pill in the top bar says what a save is
  doing: Saving… → Updating the site (about 2 min) → Live on the site (or what went wrong).
- **Finding things** (built for thousands of products): the left column (chips on a phone) lists
  Sarees and Suits with every type under them (Anarkali, Sharara, Banarasi…) and how many each
  has. Filter by fabric, colour, stock, photos and badge (on a phone: the Filters button); search
  by name, ID, fabric, colour or price; sort by name or price from the column headings, or group
  by type. The four numbers at the top (sarees, suits, out of stock, without photos) are filters
  too: press again to turn one off. Filters stay in the address, so a refresh or a bookmark keeps
  them. The list shows 60 at a time (**Show more**), with small thumbnails. Keys: **/** searches,
  **N** adds a product.
- **Each row**: tap the product to edit it. The switch sets In stock / Out of stock at once (it
  saves in the background; the message at the bottom has **Undo**). **⋯** has Edit, View on site
  and Remove.
- **Many at once**: tick products (or a whole type, or **Select all**), then use the bar at the
  bottom: Mark in stock, Mark out of stock, add or remove a badge (with **Undo**), Remove. Only
  products the filters show are changed: ticked ones hidden by a filter are left out, and the bar
  says so. Remove always asks first, with the products listed; above 10 it asks you to type DELETE.
- **The product form**: Close or Escape asks before throwing away changes. Problems are marked
  next to the field, and the bar at the bottom says what stops a save. Ctrl/⌘ S saves. Switching
  Saree ↔ Suit takes that category's defaults (sizes, stitched, care, fabric). A type typed in
  another case ("anarkali") joins the existing one ("Anarkali"). On a computer, a preview shows
  how the card will look in the shop.
- **Photos** are cropped to 4:5 and resized to at most 1600 × 2000 in the browser before upload
  (WebP, or JPEG on Safari). Add them with the button or by dropping them on the photo area;
  drag (or ← →) to reorder; **⋯** → Make it the cover, Adjust the crop (for photos that are not
  already 4:5: slide to keep the left, middle or right) and Remove. Shoot them as in
  `docs/photo-guide.md`. The first photo is the cover; up to 8 per product, and one save takes up
  to 3 MB of new photos (the form shows how much is used).
- **Sample products** (the drawn artwork that came with the site) are marked "No photos"; the
  form shows their artwork. Remove them in one go with **Select all** → **Remove…**, or edit one
  and add photos to turn it into a real product.
- At least one saree and one suit must stay on the site (the home page is built around both).
- A save applies to the latest catalogue on GitHub, so two people saving at once don't overwrite
  each other. Coming back to the tab after a while reloads the list.
- Logins: 7-day session cookie (httpOnly, SameSite=Strict); 8 wrong passwords from one address
  pause logins from it for 15 minutes. If the session ends while you work, a log-in box opens
  over the page: nothing you typed is lost; log in and press Save again.

## Local development

`npm run dev` with `ADMIN_PASSWORD` set and no token: the panel reads and writes the files on
your disk instead (a "local mode" notice says so). To try the GitHub path against a different
repository or a mock, set `ADMIN_GITHUB_TOKEN` and `ADMIN_GITHUB_API`.
