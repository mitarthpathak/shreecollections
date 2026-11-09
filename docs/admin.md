# Admin panel

`/admin` lets the shop add, edit and remove sarees and suits from a phone or a computer:
log in with the admin password, then **+ Add product**, edit a product, or remove one.

## Setup (once, about 2 minutes)

The catalogue and the photos live in **Supabase** (a database and photo storage). The code sets
everything up by itself: no tables, SQL or keys to copy by hand.

1. **Connect Supabase.** Vercel → this project → **Storage** → **Create Database** → **Supabase**
   → Continue → Create (any name, region **Mumbai**). Vercel creates the Supabase project and
   adds its settings (`POSTGRES_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, …) to this
   project by itself.
2. **Admin password.** Vercel → Settings → Environment Variables → add `ADMIN_PASSWORD` (at
   least 8 characters; a long passphrase is best).
3. **Redeploy** (Deployments → ⋯ → Redeploy). The first build creates the tables (in a private
   `shree` schema), copies the 24 products from `data/products.json` into them, and the first photo
   you add creates the public `catalog` photo bucket. Then open `https://<your site>/admin`.

That's all. A save is **live on the site in a few seconds**: nothing is rebuilt and nothing is
committed. Changing `ADMIN_PASSWORD` signs everyone out. Never put the password in the code.

What runs on its own: a daily job (`vercel.json` → `/api/admin/cron`) keeps a free Supabase
project from pausing for inactivity and deletes photos that were uploaded but never saved; the
site re-reads the catalogue every hour as well as right after every save; "New" comes off a
product 45 days after it was added.

Made the Supabase project on supabase.com instead? Add these three in Vercel by hand, from the
Supabase dashboard (**Connect** button, and Project Settings → API Keys): `POSTGRES_URL`
(the *Transaction pooler* connection string), `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (or
`SUPABASE_SERVICE_ROLE_KEY`). Then redeploy.

### Without Supabase

Everything still works as before: the site reads `data/products.json`, and the panel saves by
committing to GitHub (set `ADMIN_GITHUB_TOKEN`: a fine-grained token with **Contents: Read and
write** on this repository only; optional `ADMIN_GITHUB_BRANCH` / `ADMIN_GITHUB_REPO`). Each save
is then a commit and is live after Vercel's rebuild (about 2 minutes); one save takes up to 3 MB
of new photos.

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
  `docs/photo-guide.md`. The first photo is the cover; up to 8 per product. With Supabase each
  photo uploads on its own (the Save button counts them); without it, one save takes up to 3 MB
  of new photos (the form shows how much is used).
- **Sample products** (the drawn artwork that came with the site) are marked "No photos"; the
  form shows their artwork. Remove them in one go with **Select all** → **Remove…**, or edit one
  and add photos to turn it into a real product.
- At least one saree and one suit must stay on the site (the home page is built around both).
- A save applies to the latest catalogue, so two people saving at once don't overwrite each other;
  editing a product someone else changed after you opened it is refused with a message (open it
  again to see theirs). Coming back to the tab after a while reloads the list.
- Logins: 7-day session cookie (httpOnly, SameSite=Strict); 8 wrong passwords from one address
  pause logins from it for 15 minutes. With Supabase, sessions are kept in the database: **Log out
  → Log out on every device** signs out every phone and computer. If the session ends while you
  work, a log-in box opens over the page: nothing you typed is lost; log in and press Save again.

## Local development

`npm run dev` with `ADMIN_PASSWORD` set and nothing else: the panel reads and writes the files on
your disk instead (the status pill says "local files"). To try the Supabase path, set
`POSTGRES_URL` (any Postgres works; `localhost` connects without SSL), `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY`; to try the GitHub path against a mock, `ADMIN_GITHUB_TOKEN` and
`ADMIN_GITHUB_API`.
