# Partyland Veislusmiður (demo)

A concept demo of a "build your party" wizard for [partyland.is](https://partyland.is), built on Partyland's real Shopify catalog. It works like the Veislusmiður on partybudin.is.

Open `index.html` in a browser. It's a single file with the catalog embedded. Product images load from Shopify's CDN, so you need to be online.

## What it does

1. The customer picks an occasion, a theme or colour, an age, a guest count, a decoration level (1–5) and whether they want helium.
   They can also type a description instead, e.g. *"Frozen afmæli fyrir 6 ára, 20 krakkar"*.
2. Every occasion has a list of slots (plates, cups, napkins, number balloons, banners, candles…). The decoration level decides which slots are used.
3. Each slot is filled from Partyland's catalog using their Shopify tags:
   theme → theme colours → occasion → generic. Only in-stock products are used and best-sellers go first.
   Each line shows a badge for why it was chosen (Þema / Aldur / Litur / Tilefni / Almennt).
4. Pack counts are worked out from the guest count and the pack size in the product title (15 guests, 8-packs → 2 packs).
5. **"Setja allt í körfuna"** opens a real Partyland cart (`/cart/variant:qty,…`), which goes straight to their checkout.

## Updating the product data

```bash
python3 build.py                 # fetch partyland.is/products.json + best-seller order, rewrite the catalog in index.html
python3 build.py --cache /tmp/pl # keep/reuse raw downloads
```

## Limits of the demo

- The public feed only says whether a product is in stock, not how many. Shopify reduces quantities in the cart when stock is short.
  A production version would read `quantityAvailable` from the Storefront API.
- The free-text box uses keyword rules. In production an LLM would read the description and fill in the wizard.
- Not affiliated with or endorsed by Partyland.
