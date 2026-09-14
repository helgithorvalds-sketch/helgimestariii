# Asset bible — Elements for the Cinema Studio project
Build these *before* shooting a single clip (Academy pipeline: script → assets → shots). Everything on a neutral mid-grey backdrop, soft low diffused light, slightly underexposed, no harsh shadows, film-photo finish. Never white backdrops for people; dark charcoal for props.

## Already generated (14 Sep 2026, 5 images, Higgsfield)
Open them in Higgsfield → Generations, or by job id. Load each into the project as an Element (Cast / Location / Prop) and, for the two leads, run **Soul Cast** on the sheet so the face is locked across shots.

| # | Element | Model | Job id |
|---|---|---|---|
| A | **Sóley** — character sheet (front, back, close-up) | Cinema Studio Image 2.5, 2K, 16:9 | `746adc4d-69db-4e87-9109-a0c4c7091926` |
| B | **Bjarki** — character sheet (front, back, close-up) | Cinema Studio Image 2.5, 2K, 16:9 | `1db51cce-3f52-4eef-90ed-5ecc83f3ab9a` |
| C | **Strætó exterior** — yellow bus at a residential stop, Esja behind | Cinema Studio Image 2.5, 2K, 16:9 | `053e6083-4215-4451-8831-57e9dc39abcb` |
| D | **Strætó interior** — facing seats, yellow poles, rain on glass | Cinema Studio Image 2.5, 2K, 16:9 | `2e714711-a358-4bd5-9b27-47d106faed3c` |
| E | **SVIF book prop** — front + back on charcoal, built from the real cover files | GPT Image 2, 2K, medium | `230cd608-f291-4ec3-8940-23c8b0968cea` |

Checked by OCR: the prop reads SVIF / VELKOMIN / í nýja heimilið þitt / svif.is on the front and svif.is + grid + QR on the back, so the cover text survived. The sheets contain no stray text. I could not eyeball faces from this sandbox, so do the Academy "spot the slop" pass yourself before you lock them: look for six fingers, mismatched jacket between panels, a glossy skin look. If a panel is off, regenerate only that sheet with the same prompt and a new seed.

The real cover files are also in your Higgsfield media library (imported from the flip-book): front `df7aec16-ba2a-403d-a9a6-cad711884021`, back `54897113-95ba-4e6c-bb30-7babeb2bde5c`. Use them as image references whenever the book must be readable in a shot.

## Prompts used (reuse for re-rolls)

**A — Sóley.** Character reference sheet, 16:9 horizontal, three consistent views of the same original young Icelandic woman side by side: full-body front view standing relaxed, full-body back view, and on the right a tight chest-up frontal close-up portrait with eyes looking straight into the lens. Identical face, hair, outfit and proportions in every panel, only the angle changes. She is in her mid-twenties, natural Nordic beauty but clearly a real person: long pale blonde hair worn loose with a slightly windblown texture and a few flyaways, light blue-grey eyes with naturally muted catchlights, a few faint freckles across nose and cheeks, soft oval face with a defined jaw, subtle asymmetry, visible skin pores, no makeup beyond a little mascara, matte skin. Slim athletic build. Wearing a cream chunky wool knit sweater, an olive green waxed rain jacket open, straight dark blue jeans, white leather sneakers, small gold hoop earrings, a canvas tote bag over one shoulder. Neutral mid-grey seamless studio backdrop, very soft low diffused natural lighting, slightly underexposed, low-key, no harsh shadows, no hotspots, no blown highlights, cinematic film-photo finish like a 35mm still, not plastic CGI skin, no beauty filter. Single subject only, exactly one person repeated in the three panels, no props, no text, no watermark.

**B — Bjarki.** Same scaffold. He is about 27, ordinary and likeable rather than handsome, someone who does not take much care of himself: messy unwashed dark blond hair sticking up at the back, patchy uneven stubble, slightly tired grey-green eyes with naturally muted catchlights, a faint pillow crease on one cheek, a small chip in one front tooth visible when he half-smiles, visible pores and a bit of redness around the nose, matte skin. Average build, slightly soft around the middle. Faded dark grey hoodie with a stretched neckline under a black puffer jacket one size too big, worn black jeans with a frayed hem, scuffed grey trainers, cheap over-ear headphones around his neck, beaten-up black backpack.

**C — Strætó exterior.** Bright yellow Reykjavik city bus (modern low-floor, plain yellow livery, no readable logos or route text) pulling up to a small bus shelter on a quiet residential street, low corrugated-iron houses in muted colours, a distant flat-topped ridge like Esja under heavy overcast sky, damp asphalt, wind in the grass, soft flat diffused Nordic daylight, cool desaturated palette, cinematic 35mm film still, wide establishing shot at eye level, no people, no text.

**D — Strætó interior.** Empty modern yellow city bus interior from the aisle at seated eye level, two pairs of blue-grey fabric seats facing each other, yellow grab poles, grey rubber floor, large windows with soft grey overcast daylight and blurred low houses, raindrops on the glass, soft flat light, cool desaturated palette, cinematic 35mm film still, no people, no readable text.

**E — SVIF book prop.** Product prop reference on a dark charcoal grey seamless background. Two views of the same square softcover booklet, roughly 21 x 21 cm, lying flat, shot from slightly above so paper thickness and a soft contact shadow show. LEFT front cover exactly as reference image 1 (pale lavender, centred graphic, SVIF, VELKOMIN, í nýja heimilið þitt, svif.is). RIGHT back cover exactly as reference image 2 (white, faint grid, svif.is, small QR). Soft large top-light, matte paper, nothing else in frame, no hands, no extra text. *(GPT Image 2 with both cover files as image references — it is the only model in your account that both takes references and renders type reliably.)*

## Still to build (prompts ready, ~9 images)

**F — Pósturinn (postman).** Same sheet scaffold, one figure, front + close-up only. Man in his fifties, weathered friendly face, grey beard trimmed short, red waterproof postal jacket with reflective strips, dark trousers, canvas mail bag across the chest, no readable logos.

**G — Café.** Location turnaround, 3 images: (1) wide from the door, (2) the corner table at 50mm, (3) detail of the tabletop. Small Reykjavik café, pale wood tables, one window with grey daylight, warm pendant bulbs, a plant, chalkboard with no readable text, soft mixed light, cinematic 35mm still.

**H — Klambratún.** One wide: green lawn in a Reykjavik city park, a few birch trees, low apartment blocks far behind, bright overcast sky, 16:9.

**I — Sæbraut / Sólfarið.** One wide, evening: the steel Sun Voyager sculpture on the seafront path, Esja across the bay, blue-grey dusk, wet path, no people.

**J — House exterior.** One wide: small two-storey Reykjavik house clad in faded green corrugated iron, white window frames, small front garden, overcast light, corrugated-iron neighbours either side.

**K — Living room (empty).** Location turnaround, 3 images: bare floorboards, peeling patterned wallpaper, one hanging bulb, one window with grey light, radiator under the window. (1) wide from the doorway, (2) toward the window, (3) low angle across the floor.

**L — Living room (done).** Same room, same window and radiator position, renovated: warm white walls, sanded oiled floor, linen curtains, a grey sofa facing a TV, floor lamp, night, warm tungsten light. Two images: wide from the same doorway as K1, and the sofa at 50mm. *(Shoot K and L from the same angles; shot 20 depends on it.)*

**M — Book pages (optional).** If shot 19 needs readable pages, import the flip-book pages 4, 5, 7, 8 (plumber, fire safety, curtains, cleaning) from the same Supabase folder as the cover and use them as references. Do not let the model invent ads.

## Loading into Cinema Studio
1. New project → Global settings (see 02-shot-list.md).
2. Elements → Cast: upload A and B, run Soul Cast on each, name them **Sóley** and **Bjarki**. Add F as **Pósturinn** without Soul Cast.
3. Elements → Locations: C, D, G, H, I, J, K, L.
4. Elements → Props: E as **SVIF book**.
5. For every shot: generate the still first, then video with `start_image`. Tag the elements in the prompt by name.
