# Shot list + Cinema Studio prompts
Paste-ready. Prompt rule for this project: describe only what is in the frame. Never write "no X", "without X" or "he does not X"; leave it out instead. Every prompt tags the project's Elements by their @handle (table below).

## Global project settings (set once)
| Setting | Value | Why |
|---|---|---|
| Genre | Drama (Cinema Studio 3.0 `drama`; on 2.x use `intimate`) | keeps performances small, no action-camera whip |
| Style / look | Cinematic realism, 35mm film still, light grain | matches the reference sheets |
| Lighting preset | Soft natural / overcast | Iceland is a giant softbox; no harsh key |
| Colour palette | Cool desaturated exteriors, warm tungsten interiors in Act 3 | the house warming up *is* the story |
| Camera MoveSet | Slow, restrained (Deakins-style) | one deliberate move per shot |
| Aspect / resolution | 16:9, 720p for takes, 1080p only for selects | credits |
| Audio | Off (you're doing sound yourself) | credits + control |

## Element handles (Cinema Studio project `svif`)
Every prompt tags Elements by handle. The first five exist; create the rest with exactly these handles so the prompts below work unchanged.

| Handle | Element | Status |
|---|---|---|
| `@s-leey_1` | Sóley | done: option 2 look (honey-blonde waves, black turtleneck, beige overcoat) |
| `@bjarki_1` | Bjarki | done: option 2 look (chestnut curls, freckles, green knit under black rain shell) |
| `@loc_bus-stop_2` | bus stop | done |
| `@inside-bus` | inside bus | done |
| `@prop_b-klingur` | bæklingur (SVIF book) | done |
| `@posturinn` | Pósturinn | create · Character · sheet F |
| `@loc_cafe` | café | create · Location · sheet G |
| `@loc_klambratun` | Klambratún | create · Location · sheet H |
| `@loc_saebraut` | Sæbraut / Sólfarið | create · Location · sheet I |
| `@loc_hus` | house exterior + front door | create · Location · sheet J |
| `@loc_stofa_tom` | living room, empty | create · Location · sheet K |
| `@loc_stofa_klar` | living room, finished | create · Location · sheet L |

## Per-shot camera + prompt
Format: **Shot · duration · camera · Element** then the prompt. Generate the still first (Cinema Studio Image, same prompt) and feed it as the start image for the video.

**1 · 6 s · 24mm · f/8 · static → slow push · Landscape (no Element).** Wide Icelandic landscape, moss-covered black lava field, a flat-topped mountain ridge under low grey cloud, a single yellow city bus crossing the frame on a two-lane road, tiny in the landscape, wind moving the grass, soft flat overcast daylight, muted cool palette, cinematic 35mm film still, slow subtle push-in.
*(Title card after this shot: SVIF on black, done in your editor.)*

**2 · 4 s · 35mm · f/4 · static · @loc_bus-stop_2.** @loc_bus-stop_2. The yellow bus pulls in at the shelter, doors fold open, @s-leey_1 steps up into the bus with her tote bag, soft overcast daylight.

**3 · 5 s · 85mm · f/2 · static, eye level · @inside-bus.** @inside-bus. Close-up on the face of @bjarki_1 by the window in the facing seats, reading @prop_b-klingur, the booklet held up in frame, eyes moving over the page, soft grey window light on his face, bus vibration, shallow depth of field, then he looks up from the booklet.

**4 · 5 s · 35mm · f/4 · slow track · @inside-bus.** @inside-bus. @s-leey_1 walks up the aisle and sits down directly opposite @bjarki_1 in the facing seats, their knees almost touching, she turns to look out the window, soft daylight, handheld micro-movement.

**5 · 6 s · 85mm · f/2 · slow push-in · @inside-bus.** @inside-bus. Close-up of @bjarki_1 looking at @s-leey_1 over @prop_b-klingur, frozen. Slow continuous push-in from his face to an extreme close-up of his eyes, his pupils dilate slowly and visibly, soft window light, shallow focus, the background falls away.
*(If the model blinks the moment away, split it: a push on the face, then a macro of one eye with "pupil widens slowly".)*

**6 · 4 s · 85mm · f/2 · static · @inside-bus.** @inside-bus. Close-up of @s-leey_1, she has noticed him staring, a small kind giggle behind her hand, then she looks back out of the window, soft grey daylight on her face, natural skin.

**7 · 3 s · 50mm · f/2.8 · static · @inside-bus.** @inside-bus. @bjarki_1 drops his eyes back to @prop_b-klingur too fast, a shy blush under the freckles, ears going red, pretends to read, tiny embarrassed shift in his seat.

**8 · 5 s · 35mm · f/4 · static · @inside-bus.** @inside-bus. The bus brakes. @bjarki_1 stands up, @s-leey_1 stands a half second after him, he glances back at her over his shoulder and immediately faces forward again, shy, both holding the yellow grab pole, soft daylight.

**9 · 4 s · 50mm · f/2.8 · static, at the doors · @inside-bus.** @inside-bus. At the open bus doors @bjarki_1 makes a small polite "after you" hand gesture, @s-leey_1 shakes her head with a smaller "you go" gesture, a beat of polite stalemate, soft daylight from the open door.

**10a · 4 s · 35mm · f/4 · low angle from pavement · @loc_bus-stop_2.** @loc_bus-stop_2. @bjarki_1 steps down from the bus, misses the kerb and falls flat on the wet pavement, @prop_b-klingur skids out of his hand across the ground toward camera, overcast daylight.
*(Physics shot: 3–4 takes, keep the one where the fall reads clean.)*

**10b · 5 s · 24mm · f/5.6 · top-down crane · @loc_bus-stop_2.** @loc_bus-stop_2. Top-down shot straight above @bjarki_1 lying face down on the wet pavement next to the bus, @prop_b-klingur a metre from his hand, @s-leey_1 steps into frame laughing properly and reaches a hand down to him, he takes it, overcast daylight, wet asphalt texture.

**11 · 6 s + 3 s · 85mm · f/2 · static → push-in · @loc_cafe.** @loc_cafe. @s-leey_1 and @bjarki_1 at a small wooden café table, two coffees, @prop_b-klingur lying flat on the table between them, she laughs at something he said, slow push-in into her eyes, pupils widen, warm café light with soft daylight from a window.
*(Then a 3 s mirror clip: same push into the eyes of @bjarki_1.)*

**12 · 4 s · 35mm · f/4 · static, low · @loc_klambratun.** @loc_klambratun. Picnic blanket on the grass, bread and skyr, @s-leey_1 and @bjarki_1 lying on their elbows talking, @prop_b-klingur open on the blanket corner with its pages lifting in the wind, bright overcast light.

**13 · 5 s · 50mm · f/4 · slow lateral track · @loc_saebraut.** @loc_saebraut. @s-leey_1 and @bjarki_1 walk along the seafront path past the steel sculpture, the mountain across the bay, evening blue-grey light, the lavender corner of @prop_b-klingur sticking out of her tote bag, he has combed his curls for once, they bump shoulders.

**14 · 4 s · 35mm · f/5.6 · static · @loc_hus.** @loc_hus. @s-leey_1 and @bjarki_1 stand in front of the house holding one set of keys between them, nervous smiles, overcast daylight.

**15 · 5 s · 24mm · f/4 · slow pan · @loc_stofa_tom.** @loc_stofa_tom. The empty living room, bare floorboards, one hanging bulb, peeling wallpaper, @s-leey_1 and @bjarki_1 step in and turn slowly taking it in, their footsteps echo, grey daylight from the single window.

**16 · 6 s · 24mm · f/4 · locked-off · @loc_stofa_tom.** @loc_stofa_tom. Locked-off time-lapse of the empty living room, daylight sweeps across the floor into night, rain streaks the window, then snow outside, two mattresses and one moving box appear on the floor, the room otherwise stays exactly as empty.
*(Multi-shot, 3 sub-prompts: day / rainy night / snow morning. Same start image for all three.)*

**17 · 5 s · 35mm · f/2.8 · static · @loc_stofa_tom.** @loc_stofa_tom. @s-leey_1 and @bjarki_1 sit on the bare floor with paint swatches, a laptop and a tape measure, arguing silently, she points at one wall, he points at the opposite wall, both drop their hands, stuck, flat grey daylight.

**18 · 5 s · 50mm · f/2.8 · static, from the hallway · @loc_hus.** @loc_hus, front door from inside the hallway. @bjarki_1 opens the door, @posturinn hands him @prop_b-klingur, nods and leaves, @bjarki_1 looks down at the cover then back over his shoulder toward the living room, grey daylight through the door.

**19 · 5 s · 50mm · f/2.8 · slow push · @loc_stofa_tom.** @loc_stofa_tom. @s-leey_1 and @bjarki_1 sit shoulder to shoulder on the floor flipping through @prop_b-klingur, pages showing a plumber ad, a fire-safety ad, curtains, a cleaning company, she points at a page, he nods, they smile at each other, soft daylight.

**20 · 12 s · 24mm · f/5.6 · one continuous drift · @loc_stofa_tom → @loc_stofa_klar.** @loc_stofa_tom becoming @loc_stofa_klar. One continuous slow camera drift through the house in a single unbroken take, and the house transforms around the camera as it moves: painters rolling a wall warm white, a plumber under the kitchen sink, new curtains going up, floorboards being sanded, a sofa carried in, a floor lamp switched on, ending on the finished warm living room, time-lapse energy, warm tungsten light growing as the room finishes.
*(Multi-shot mode, custom, 4 sub-prompts in order: bare → trades working → furniture in → finished. Spend takes here.)*

**21 · 7 s · 35mm · f/2.8 · slow crane up and back · @loc_stofa_klar.** @loc_stofa_klar. Night, the finished living room lit by the TV glow and one warm floor lamp, @s-leey_1 and @bjarki_1 on the sofa, she rests her head on his shoulder, he looks down at her the way he looked at her on the bus, the camera cranes slowly up and back through the window out into the blue evening over the corrugated-iron roofs.

**22 · 4 s · end card · editor, not model · —.** Dark blue-grey ground. SVIF wordmark, then "Velkomin í nýja heimilið þitt.", then svif.is. Text is cheaper and sharper in your editor than in any model.


## Continuity checklist (Academy "spot the slop" pass, per clip)
- Same face, same hair parting, same jacket colour as the Element sheet: Sóley honey-blonde waves, black turtleneck, beige overcoat; Bjarki chestnut curls, green knit, black rain shell.
- Book: lavender, square, the real cover.
- Bus: yellow outside, blue-grey seats inside, yellow poles, plain sides.
- Sóley's tote on the same shoulder within a scene.
- Act 3 interior gets warmer shot by shot; nothing in Act 1–2 is warm.
- Inspect the exact crop you'll use at 100%, name the defect, then decide.
