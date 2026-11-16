# Partyland Veislusmiður (demo)

A concept demo of a "build your party" wizard for [partyland.is](https://partyland.is), built on Partyland's real Shopify catalog.

Open `index.html` in a browser. It's a single file with the catalog embedded. Product images load from Shopify's CDN, so you need to be online.

## What it does

1. **Wizard:** occasion → theme and colours → age → guests → decoration level (1–5) → helium.
   You can also type a description instead, e.g. *"Frozen afmæli fyrir 6 ára, 20 krakkar"*.
2. **Colours:** mix up to 4 colours, or pick a combination with one click.
   "⭐ Mælt með" is the recommended combination for the chosen occasion or theme, and replaces "skip".
3. **Live picture:** a drawing beside the steps that changes as you choose.
   It shows balloons in your colours, the age as a number balloon, a cake with candles, bunting, a curtain and an arch depending on the decoration level, and floating vs. floor balloons for helium vs. air.
   It also shows the estimated price and the main products.
4. **Matching:** each slot (plates, cups, number balloons, banners, candles…) is filled from Partyland's Shopify tags:
   theme → chosen colours → occasion → generic. Best-sellers go first.
   A badge on each line shows why it was chosen.
5. **Sold out:** if the best match is sold out, the most similar in-stock product is picked (same theme, colours and type of item).
   The line says which product it replaced.
6. **Skipta:** opens every similar option for that line, closest matches first, and you click one to swap.
7. **Packages:** Grunnpakki / Veislupakki / Stóri pakkinn are built side by side.
   The 10% package discount is an example for display only (`PACKAGE_DISCOUNT` in the script).
8. **Setja allt í körfuna:** opens a real Partyland cart (`/cart/variant:qty,…`).

## Files

| File | Purpose |
|---|---|
| `index.html` | The demo with Partyland branding. Engine, styles and the embedded catalog. |
| `build.py` | Fetches `partyland.is/products.json` and the best-seller order, then rewrites the catalog in `index.html`. Sold-out products are kept and flagged. |
| `build_link.py` | Makes `dist/veislusmidur.html` + `dist/img/` for the shareable link. It uses the neutral look in `link-brand.html` and bundles product thumbnails as sprite sheets, because a hosted page can't load images from Shopify. |

```bash
python3 build.py --cache /tmp/pl   # refresh products and prices
python3 build_link.py              # rebuild the link version (needs Pillow)
```

## Limits of the demo

- The public feed only says whether a product is in stock, not how many. Shopify reduces quantities in the cart when stock is short.
  A production version would read `quantityAvailable` from the Storefront API.
- The free-text box uses keyword rules. In production an LLM would read the description.
- Package discounts would be set up as Shopify discount codes. They are not active in the demo.
- Not affiliated with or endorsed by Partyland.
