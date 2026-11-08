# Little Poppin on Pinterest

Every print, e-card, online invitation and printable on littlepoppin.com has a pin ready to go, with a
link back to its own page. This file is the how-to for Naomi; the machinery is described at the end.

What is in the repo after `npm run build:pins`:

| Thing | Where | What it is |
|-------|-------|------------|
| Pin images | `images/pins/<slug>.jpg` | 857 pins, 1000×1500 (Pinterest's 2:3), the artwork with a caption strip in the house fonts |
| Bulk-upload spreadsheets | `pinterest/littlepoppin-pins-01-of-09.csv` … `09-of-09.csv` | 851 Little Poppin pins, 100 a file or fewer (Pinterest's scheduled-pin cap), in Pinterest's own column layout |
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

Publish dates run from 9 Nov 2026, 16 pins a day for eight weeks, between 13:00 and 01:00 UTC (US daytime, where
most of Pinterest is). The Tadavite pins go one a day from 15 Nov.

## Naomi's steps

Pinterest's rules that shape these steps (help.pinterest.com, read 8 Nov 2026, plus what the account did that day): the bulk
tool takes 200 rows a file but the account holds at most 100 scheduled pins; a scheduled pin can be at most 30 days
ahead; a scheduled pin's date is read as UTC.

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

### 3. Rich Pins: nothing to click

Rich Pins read the page's Open Graph tags (title, description, `product:price:amount`, picture) so every pin shows the
current price and the brand name. Pinterest's old "validate and apply" tool at developers.pinterest.com has been
retired (the address now opens the Rich Pins documentation, checked 8 Nov 2026); for a claimed domain the tags are
enough. Every card, invitation, print and set page already carries them.

1. A day after the first pins publish, open one of them on https://www.pinterest.com/littlepoppin/ . You will see the
   price and "Little Poppin" under the picture, read from the page rather than typed into the pin.
2. If a pin shows no price after a week, tell Winston; the fallback is Pinterest's business help form at
   https://help.pinterest.com/en/business/contact .

### 4. Create the boards

Nothing to do: the spreadsheets name the boards and sections, and Pinterest creates them on the first upload.
If you would rather set a cover picture or description first, go to https://www.pinterest.com/ , click your
profile picture, then **+** → **Board**, and make the seven boards named above with exactly those names
(capital letters matter: `Nursery Art`, `Magical Academia Art`, `Christmas`, `E-cards`, `Kids' Party
Invitations`, `Baby Shower`, `Printables`).

### 5. Upload the spreadsheets, one a week

**Pinterest keeps at most 100 scheduled pins on an account.** We learned this on 8 Nov 2026: a 200-row file
created exactly 100 pins and a second upload created none. So the files are now cut at 100 rows or fewer, each
covering about six days, and a file goes up on the morning of its first date, when the previous file's pins have
all published and the queue is empty. Uploading early does nothing: the rows over the cap are silently dropped.

| File | Pins | First pin (UTC) | Last pin (UTC) | Upload on |
|------|------|-----------------|----------------|-----------|
| `pinterest/littlepoppin-pins-01-of-09.csv` | 100 | 9 Nov 2026 | 15 Nov 2026 | **already in Pinterest** (uploaded 8 Nov 2026), do not upload again |
| `pinterest/littlepoppin-pins-02-of-09.csv` | 91 | 15 Nov 2026 | 20 Nov 2026 | 15 Nov 2026 |
| `pinterest/littlepoppin-pins-03-of-09.csv` | 96 | 21 Nov 2026 | 26 Nov 2026 | 21 Nov 2026 |
| `pinterest/littlepoppin-pins-04-of-09.csv` | 96 | 27 Nov 2026 | 2 Dec 2026 | 27 Nov 2026 |
| `pinterest/littlepoppin-pins-05-of-09.csv` | 96 | 3 Dec 2026 | 8 Dec 2026 | 3 Dec 2026 |
| `pinterest/littlepoppin-pins-06-of-09.csv` | 96 | 9 Dec 2026 | 14 Dec 2026 | 9 Dec 2026 |
| `pinterest/littlepoppin-pins-07-of-09.csv` | 96 | 15 Dec 2026 | 20 Dec 2026 | 15 Dec 2026 |
| `pinterest/littlepoppin-pins-08-of-09.csv` | 96 | 21 Dec 2026 | 26 Dec 2026 | 21 Dec 2026 |
| `pinterest/littlepoppin-pins-09-of-09.csv` | 84 | 27 Dec 2026 | 1 Jan 2027 | 27 Dec 2026 |
| `pinterest/tadavite-advent.csv` | 6 | 15 Nov 2026 | 20 Nov 2026 | with file 02, on 15 Nov 2026 |

Dates are UTC; on Pinterest's profile they show in your own time zone, so the 9 Nov pins read as "Tue 10/11, 12:00 am".
If a file's upload day has passed, ask Winston to re-run the build with a later `--start` (the whole schedule moves;
file 01 must then be regenerated too and will no longer match what is in Pinterest, which is fine once those 100 have
published). Winston can do the uploads from your signed-in Chrome; say "upload the next CSV".

1. Go to https://au.pinterest.com/settings/bulk-create-pins/ (Settings → **Bulk create Pins**).
2. Click the grey **Drop your .csv file here or click to upload a file** box and choose the file from
   `/Users/naomi/Sites/littlepoppin-pinterest/pinterest/` (or the repo's `pinterest/` folder).
3. You will see **Upload successful** straight away; the pins appear within an hour or two under your profile →
   **Created** → **Scheduled Pins** (https://au.pinterest.com/littlepoppin/scheduled-pins/), each with its date and board.
   Pinterest emails you if any row failed.
4. Check the count there is about 100. If it is still 100 the day before the next upload, the previous batch has not
   drained yet: wait a day.

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

- `scripts/build-pins.mjs` (`npm run build:pins -- --start 2026-11-09`, the date the live schedule starts from) reads the catalogues (`data/prints.json`, `keepsakes/designs.js`
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
