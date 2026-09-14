# Shot list + Cinema Studio prompts
Paste-ready. Prompt rule for this project: describe only what is in the frame. Never write "no X", "without X" or "he does not X"; leave it out instead. Every prompt assumes the Elements below already exist in the Cinema Studio project (see 03-assets.md): cast **Sóley**, **Bjarki**, **Pósturinn**; locations **Strætó exterior**, **Strætó interior**, **Café**, **Klambratún**, **Sæbraut**, **House exterior**, **Living room (empty)**, **Living room (done)**; prop **SVIF book**.

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

## Per-shot camera + prompt
Format: **Shot · duration · camera** then the prompt. "Start image" = generate a still first (Cinema Studio Image 2.5, same prompt, 16:9) and feed it as `start_image` so composition is locked before you spend on video.

**1 · 6s · 24mm, f/8, static → slow push.** *(Title card after this shot: SVIF, on black.)* Wide Icelandic landscape, moss-covered black lava field, a flat-topped mountain ridge under low grey cloud, a single yellow Strætó city bus crossing the frame on a two-lane road, tiny in the landscape, wind moving the grass, soft flat overcast daylight, muted cool palette, cinematic 35mm film still, slow subtle push-in.

**2 · 4s · 35mm, f/4, static.** Location: Strætó exterior. The yellow bus pulls in at a small bus shelter on a quiet residential street in Reykjavik, doors fold open, Sóley steps up into the bus with her tote bag, soft overcast daylight.

**3 · 5s · 85mm, f/2, static, eye level.** Location: Strætó interior. Close-up on Bjarki's face by the window in the facing-seats section, reading the SVIF book, a square pale lavender booklet held up in frame, eyes moving over the page, soft grey window light on his face, bus vibration, shallow depth of field, then he looks up from the book.

**4 · 5s · 35mm, f/4, slow track following.** Location: Strætó interior. Sóley walks up the bus aisle and sits down directly opposite Bjarki in the facing seats, their knees almost touching, she turns to look out the window, soft daylight, handheld micro-movement.

**5 · 6s · 85mm, f/2, slow push-in.** Location: Strætó interior. Close-up of Bjarki looking at her over the book, frozen. Slow continuous push-in from his face to an extreme close-up of his eyes, his pupils dilate slowly and visibly, soft window light, shallow focus, the background falls away. *(Take note: ask for "pupils widen slowly"; if the model blinks the moment away, cut the push into two clips: face push, then a macro of the eye.)*

**6 · 4s · 85mm, f/2, static.** Location: Strætó interior. Close-up of Sóley, she has noticed him staring, a small kind giggle behind her hand, then she looks back out of the window, soft grey daylight on her face, natural skin.

**7 · 3s · 50mm, f/2.8, static.** Location: Strætó interior. Bjarki drops his eyes back to the SVIF book too fast, a shy blush under the freckles, ears going red, pretends to read, tiny embarrassed shift in his seat.

**8 · 5s · 35mm, f/4, static.** Location: Strætó interior. The bus brakes. Bjarki stands up, Sóley stands a half second after him, he glances back at her over his shoulder and immediately faces forward again, shy, both holding the yellow grab pole, soft daylight.

**9 · 4s · 50mm, f/2.8, static, at the doors.** Location: Strætó interior. At the open bus doors Bjarki makes a small polite "after you" hand gesture, Sóley shakes her head with a smaller "no, you go" gesture, a beat of polite stalemate, soft daylight from the open door.

**10a · 4s · 35mm, f/4, low angle from the pavement.** Location: Strætó exterior. Bjarki steps down from the bus, misses the kerb and falls flat on the wet pavement, the SVIF book skids out of his hand across the ground toward camera, overcast daylight. *(Physics shot: generate 3–4 takes, pick the one where the fall reads clean.)*

**10b · 5s · 24mm, f/5.6, top-down crane.** Location: Strætó exterior. Top-down shot straight above Bjarki lying face down on the wet pavement next to the bus, the lavender SVIF book a metre from his hand, Sóley steps into frame laughing properly and reaches a hand down to him, he takes it, overcast daylight, wet asphalt texture.

**11 · 6s · 85mm, f/2, static → push-in.** Location: Café. Sóley and Bjarki at a small wooden café table, two coffees, the SVIF book lying flat on the table between them, she laughs at something he said, slow push-in into her eyes, pupils widen, warm café light with soft daylight from a window. *Then a 3s mirror clip: same push into Bjarki's eyes.*

**12 · 4s · 35mm, f/4, static, low.** Location: Klambratún. Picnic blanket on green grass in a Reykjavik park, bread and skyr, Sóley and Bjarki lying on their elbows talking, the SVIF book open on the blanket corner with its pages lifting in the wind, bright overcast light, wide trees behind.

**13 · 5s · 50mm, f/4, slow lateral track.** Location: Sæbraut. Sóley and Bjarki walk along the seafront path past the steel Sun Voyager sculpture, Esja mountain across the bay, evening blue-grey light, the lavender corner of the SVIF book sticking out of her tote bag, he has finally combed his curls, they bump shoulders.

**14 · 4s · 35mm, f/5.6, static.** Location: House exterior. Sóley and Bjarki stand in front of a small faded green corrugated-iron house in Reykjavik holding one set of keys between them, nervous smiles, overcast daylight.

**15 · 5s · 24mm, f/4, slow pan.** Location: Living room (empty). A completely empty living room, bare floorboards, one hanging bulb, peeling wallpaper, Sóley and Bjarki step in and turn slowly taking it in, their footsteps echo, grey daylight from a single window.

**16 · 6s · 24mm, f/4, locked-off.** Location: Living room (empty). Locked-off time-lapse of the same empty living room, daylight sweeps across the floor into night, rain streaks the window, then snow outside, two mattresses and one moving box appear on the floor, the room otherwise stays exactly as empty. *(Cinema Studio multi-shot with 3 sub-prompts: day / rainy night / snow morning. Same start image.)*

**17 · 5s · 35mm, f/2.8, static.** Location: Living room (empty). Sóley and Bjarki sit on the bare floor with paint swatches, a laptop and a tape measure, arguing silently, she points at one wall, he points at the opposite wall, both drop their hands, stuck, flat grey daylight.

**18 · 5s · 50mm, f/2.8, static, from inside the hallway.** Location: House front door. Bjarki opens the front door, the Postman in a red rain jacket hands him a square pale lavender booklet, the SVIF book, nods and leaves, Bjarki looks down at the cover then back over his shoulder toward the living room, grey daylight through the door.

**19 · 5s · 50mm, f/2.8, slow push.** Location: Living room (empty). Sóley and Bjarki sit shoulder to shoulder on the floor flipping through the SVIF book, pages showing a plumber ad, a fire-safety ad, curtains, a cleaning company, she points at a page, he nods, they smile at each other, soft daylight.

**20 · 12s · 24mm, f/5.6, one continuous drift.** Location: Living room (empty) → Living room (done). One continuous slow camera drift through the house in a single unbroken take, and the house transforms around the camera as it moves: painters rolling a wall warm white, a plumber under the kitchen sink, new curtains going up, floorboards being sanded, a sofa carried in, a floor lamp switched on, ending on the finished warm living room, time-lapse energy, warm tungsten light growing as the room finishes. *(Multi-shot mode, custom, 4 sub-prompts in order: bare → trades working → furniture in → finished. Highest-value clip in the film; spend takes here.)*

**21 · 7s · 35mm, f/2.8, slow crane up and back.** Location: Living room (done). Night. The finished living room lit by the TV glow and one warm floor lamp, Sóley and Bjarki on the sofa, she rests her head on his shoulder, he looks down at her the way he looked at her on the bus, the camera cranes slowly up and back through the window out into the blue evening over the corrugated-iron roofs of Reykjavik.

**22 · 4s · end card.** Dark blue-grey ground. SVIF wordmark, then "Velkomin í nýja heimilið þitt.", then svif.is. *(Do this in your editor, not in the model — text is cheaper and sharper there.)*

## Continuity checklist (Academy "spot the slop" pass, per clip)
- Same face, same hair parting, same jacket colour as the reference sheet.
- Book: lavender, square, the real cover.
- Bus: yellow outside, blue-grey seats inside, yellow poles, plain sides.
- Sóley's tote on the same shoulder within a scene.
- Act 3 interior gets warmer shot by shot; nothing in Act 1–2 is warm.
- Inspect the exact crop you'll use at 100%, name the defect, then decide.
