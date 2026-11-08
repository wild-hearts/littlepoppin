# Little Poppin on Pinterest

Every print, e-card, online invitation and printable on littlepoppin.com has a pin ready to go, with a
link back to its own page. This file is the how-to for Naomi; the machinery is described at the end.

What is in the repo after `npm run build:pins`:

| Thing | Where | What it is |
|-------|-------|------------|
| Pin images | `images/pins/<slug>.jpg` | 802 pins, 1000×1500 (Pinterest's 2:3), the artwork with a caption strip in the house fonts |
| Bulk-upload spreadsheets | `pinterest/littlepoppin-pins-01-of-04.csv` … `04-of-04.csv` | 796 Little Poppin pins, 200 a file, in Pinterest's own column layout |
| Tadavite's calendars | `pinterest/tadavite-advent.csv` | 6 pins for tadavite.com/advent (The Unhinged Elf, Luxury Christmas Advent, 24 Days of Us, Rude Christmas, Support for Ukraine, the for-kids page) |
| RSS feed | `https://littlepoppin.com/pinterest.xml` | The newest 50 items, for Pinterest's auto-publish |
| Manifest | `pinterest/pins.json` | Every pin's title, board, date and links; the test suite checks it |

The boards the spreadsheets create (Pinterest makes a board or section the first time it sees the name):

- **Nursery Art**, with sections for Woodland, Ocean, Space, Star Sign, Australian, Mermaid, Dog, Vehicles, Magical and Photo Art
- **Magical Academia Art**
- **Christmas** (festive prints, Christmas and first-Christmas e-cards, Christmas party invitations, and a section for Tadavite's advent calendars)
- **E-cards**, one section per occasion (New Baby, Birthday, Thank You, Mother's Day …)
- **Kids' Party Invitations**, one section per occasion
- **Baby Shower** (baby shower, gender reveal, meet-the-baby and christening invitations)
- **Printables**, and **Free Printables** once the free library has its pages

Publish dates run from the day after the script was run, 15 pins a day for eight weeks, between 13:00 and
01:00 UTC (US daytime, where most of Pinterest is). The Tadavite pins go one a day from tomorrow.

## Naomi's steps

Pinterest's rules that shape these steps (help.pinterest.com, read 8 Nov 2026): the bulk tool takes 200
pins a file; a scheduled pin can be at most 30 days ahead; a scheduled pin's date is read as UTC.

### 1. Open Pinterest Business

1. Go to https://www.pinterest.com/business/hub/ and sign in with the Little Poppin account.
   You will see the business hub with **Create**, **Analytics** and **Ads** across the top. If it asks you to
   convert a personal account, say yes: everything below needs a business account.

### 2. Check the site claim (already done on 14 Aug 2026)

The claim tag is already on every page of littlepoppin.com, so this is a check, not a job.

1. Go to https://www.pinterest.com/settings/claim/ . Under **Websites**, `littlepoppin.com` should show a
   green tick and "Claimed". If it does, skip to step 3.
2. If it is not there, click **Claim**, choose **Add HTML tag**, and copy the tag. It looks like
   `<meta name="p:domain_verify" content="…"/>`. Copy only the long value inside `content`.
3. Winston puts that value into `PINTEREST_DOMAIN_VERIFY` in `scripts/site-config.mjs` and into the matching
   tag at the top of `index.html`, runs `npm run build:site`, and deploys by merging to `main`. (Or do it
   yourself: edit those two places, then run, in Terminal on your Mac, inside the repo:)

   ```bash
   npm run build:site
   ```

4. Once the deploy is live, go back to https://www.pinterest.com/settings/claim/ and click **Continue** /
   **Verify**. You will see "Claimed" with a tick. Pinterest can take up to 24 hours to confirm.

### 3. Turn on Rich Pins

Rich Pins read the page's Open Graph tags (title, description, price, picture) so every pin shows the
current price and the brand name. The pages already carry the tags; Pinterest just needs to see one.

1. Go to https://developers.pinterest.com/tools/url-debugger/ .
2. Paste `https://littlepoppin.com/print/butterfly-garden.html` and click **Validate**.
   You will see the print's title, description and price read from the page, with no errors.
3. Click **Apply** (it may say "Apply now" or "Enable Rich Pins"). You will see a message that Rich Pins are
   being enabled for littlepoppin.com. This covers the whole domain; it can take 24 hours to show on pins.

### 4. Create the boards

Nothing to do: the spreadsheets name the boards and sections, and Pinterest creates them on the first upload.
If you would rather set a cover picture or description first, go to https://www.pinterest.com/ , click your
profile picture, then **+** → **Board**, and make the seven boards named above with exactly those names
(capital letters matter: `Nursery Art`, `Magical Academia Art`, `Christmas`, `E-cards`, `Kids' Party
Invitations`, `Baby Shower`, `Printables`).

### 5. Upload the spreadsheets, one every two weeks

Pinterest will only schedule 30 days ahead, so upload each file when its first date is within the month:

| File | First pin | Last pin | Upload it |
|------|-----------|----------|-----------|
| `pinterest/littlepoppin-pins-01-of-04.csv` | 9 Nov 2026 | 22 Nov 2026 | now |
| `pinterest/littlepoppin-pins-02-of-04.csv` | 22 Nov 2026 | 5 Dec 2026 | now, or from 8 Nov |
| `pinterest/littlepoppin-pins-03-of-04.csv` | 5 Dec 2026 | 19 Dec 2026 | from 20 Nov |
| `pinterest/littlepoppin-pins-04-of-04.csv` | 19 Dec 2026 | 1 Jan 2027 | from 5 Dec |
| `pinterest/tadavite-advent.csv` | 9 Nov 2026 | 14 Nov 2026 | now, before December |

The dates above are what the script wrote on 8 Nov 2026. If you upload later than that, ask Winston to re-run
the build so the dates start tomorrow (or run it yourself: `npm run build:pins -- --start 2026-11-20`,
then `git add pinterest pinterest.xml && git commit`): Pinterest refuses a date in the past. The pin images
must be live on littlepoppin.com before you upload, so this branch has to be merged and deployed first.

1. Go to https://www.pinterest.com/pin-builder/bulk-create/ (or on https://www.pinterest.com/ click **Create**
   at the top left, then **Bulk create Pins**).
2. Click **Upload** next to "Upload .csv or .txt file" and choose the file from the `pinterest/` folder of the
   repo on your Mac (`/Users/naomi/Sites/littlepoppin/pinterest/`).
3. Wait. You will see a progress bar and then "Pins created" with a count; a file of 200 can take a couple of
   hours to finish, and Pinterest emails you when it has. Rows it could not read are listed with the reason.
4. Check https://www.pinterest.com/ → your profile → **Scheduled**: the pins appear there, newest first,
   each on its board, with the date it will go out.
5. Repeat for the next file on the date in the table.

### 6. Add the RSS feed for auto-publish

This keeps going by itself: whenever something new is added to the site and the pins are rebuilt, Pinterest
picks it up from the feed within 24 hours and pins it to the board you choose here.

1. Go to https://www.pinterest.com/settings/bulk-create-pins/ (Settings → **Bulk create Pins** → **Auto-publish**).
2. Under **Auto-publish from RSS feed**, paste `https://littlepoppin.com/pinterest.xml` into the feed box.
3. Choose the board **Nursery Art** for now (the feed mixes ranges; Pinterest puts everything from one feed on
   one board).
4. Click **Save**. You will see the feed listed with "Connected" and the board name. The first pins from it
   arrive within 24 hours; Pinterest publishes new items as they appear and ignores ones it has already pinned.

### 7. Check it worked, a week later

1. Go to https://analytics.pinterest.com/ . You will see impressions and outbound clicks per pin.
2. In Google Analytics, the traffic arrives tagged `utm_source=pinterest / utm_medium=social /
   utm_campaign=catalogue`, so it shows as **pinterest / social** under Acquisition.

## How it works (for whoever opens this next)

- `scripts/build-pins.mjs` (`npm run build:pins`) reads the catalogues (`data/prints.json`, `keepsakes/designs.js`
  for cards and invitations, `lib/extras-products.generated.js` for the paid printables, `data/free-printables.json`
  for the free ones once each has a `page`), renders a pin per item into `images/pins/`, writes the CSVs, the
  manifest and `pinterest.xml`. A pin is only re-rendered when its artwork is newer (`--force` redraws all);
  the CSVs and feed are rewritten every run. `--start YYYY-MM-DD` moves the schedule.
- `scripts/pin-image.mjs` draws the picture: sharp for the image, opentype.js to turn Cormorant Garamond and
  Lato (`assets/fonts`) into SVG paths, so no fontconfig and the same result on any machine. Cream `#FEF9F5`,
  red `#B5223E`, ink `#2b2320`.
- `scripts/build-tadavite-pins.mjs` (`npm run build:pins:tadavite`) fetches the live Tadavite pages for their
  titles, descriptions and first picture, draws them as pins hosted here (Tadavite's share images are 1200×630
  banners, the wrong shape) and writes `pinterest/tadavite-advent.csv`. Needs the network.
- Rich Pins: `scripts/keepsakes-pages.mjs` and `scripts/build-product-pages.mjs` give every card, invitation,
  print and set page `og:type product`, `og:price:amount` / `og:price:currency` (AUD), `og:availability` and the
  2:3 pin as `og:image`. Listing pages stay `website`. `scripts/build-extras.mjs` writes PDFs, not pages, so
  nothing to do there.
- The claim tag comes from `PINTEREST_DOMAIN_VERIFY` in `scripts/site-config.mjs` via `pinterestClaimTag()`,
  used by the three page builders; `index.html` is hand-written and carries the same tag.
- `npm test` has a **Pinterest** group: exact header, ≤200 rows a file, every Media URL and Link a real file
  in the repo, title and description lengths, UTC dates, the feed's shape and enclosures, Rich Pin tags on
  product pages, the claim tag on every page.
- Adding a print, card or invitation: build it as usual, then `npm run build:pins`, then `npm run build:site`
  (so the new page's `og:image` is its pin), commit `images/pins`, `pinterest/` and `pinterest.xml`.
