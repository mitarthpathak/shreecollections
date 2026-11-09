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

- **Finding things** (built for thousands of products): the left column (chips on a phone) lists
  Sarees and Suits with every type under them (Anarkali, Sharara, Banarasi…) and how many each
  has. Filter by fabric, colour, stock, photos and badge; search by name, ID, fabric, colour or
  price; sort or group by type. The four numbers at the top (sarees, suits, out of stock, without
  photos) are shortcuts. Filters stay in the address, so a refresh or a bookmark keeps them. The
  list shows 60 at a time (**Show more**), with small thumbnails.
- **Many at once**: tick products (or a whole type, or **Select all matching**), then use the bar
  at the bottom: In stock, Out of stock, add or remove a badge, Remove. Each row also has a quick
  In stock / Out of stock switch.
- **Photos** are cropped to 4:5 from the centre and resized to at most 1600 × 2000 in the browser
  before upload (WebP, or JPEG on Safari). Shoot them as in `docs/photo-guide.md`. The first photo
  is the cover; up to 8 per product.
- **Sample products** (the drawn artwork that came with the site) are marked "sample (no photo)".
  Remove them in one go with **Select all shown** → **Remove selected**, or edit one and add
  photos to turn it into a real product.
- At least one saree and one suit must stay on the site (the home page is built around both).
- A save applies to the latest catalogue on GitHub, so two people saving at once don't overwrite
  each other.
- Logins: 7-day session cookie (httpOnly, SameSite=Strict); 8 wrong passwords from one address
  pause logins from it for 15 minutes.

## Local development

`npm run dev` with `ADMIN_PASSWORD` set and no token: the panel reads and writes the files on
your disk instead (a "local mode" notice says so). To try the GitHub path against a different
repository or a mock, set `ADMIN_GITHUB_TOKEN` and `ADMIN_GITHUB_API`.
