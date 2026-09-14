# Higgsfield Academy — what actually matters for this film
higgsfield.ai is blocked from this sandbox, so this is assembled from the course pages' indexed content plus the Higgsfield workflow docs available through the MCP. Watch the lessons named below yourself; they are short.

## Courses to take, in order
1. **Getting Started with Cinema Studio** — 12 lessons, 26 min, 8 free generations. The tour: per-shot camera settings (camera, lens, focal length, aperture) vs global project settings (genre, style, lighting preset, colour palette, camera MoveSet), Elements, AI Director. https://higgsfield.ai/academy/courses/cinema-studio-complete-tour
2. **The AI Filmmaking Pipeline** — 22 lessons, 58 min, 50+ free generations. Lessons 11–17 are the ones you need: *Generating locations, Editing locations, Generating characters, Editing characters, Test in Seedance, Spot the slop*, then the capstone: *set up your production → cast your characters → build the location → dress the scene → shoot the scene.* That capstone order is this project's order. https://higgsfield.ai/academy/courses/cinema-studio-pro
3. **Make a Cinematic Ad End-to-End** — 10 lessons. Stage 1 *Building the Assets*, Stage 2 *The Prompting Framework*, then 12 scenes shot one pair at a time, recap *Iteration Is the Skill*. Closest to what you're making: a story ad with a pack shot at the end. https://higgsfield.ai/academy/courses/cinematic-ad-e2e
4. **Blockbuster 4K** — 10 lessons, 40 min. Stage 1 *Writing the Script with Claude*, Stage 2 *Building Character, Location and Prop Assets*, Stage 3 *Scene Generation with the Prompt-Builder Skill*. Skim for the asset rules. https://higgsfield.ai/academy/courses/blockbuster-4k

## The rules the courses keep repeating
- **Assets first, shots second.** Script → character/location/prop sheets → then shoot. Never prompt a scene from scratch with a character described in words; tag the Element.
- **Character sheet spec** (Stage 2): 16:9 sheet, multiple views, the *same* single character with identical face, hair, costume and proportions in every panel, only angle and crop change. Right panel: frontal chest-up close-up, face square to camera, eyes into the lens. Lighting: very soft, low, diffused natural light, slightly underexposed, low-key, no harsh shadows, no hotspots, no blown highlights. Backdrop: neutral mid-grey, *never* white. Finish: cinematic film-photo, never plastic CGI skin. (Our sheets A and B follow this.)
- **Locations get a turnaround too**: wide, angled, and detail close-ups of the same space so every shot in it matches.
- **Props on grey**, referenced from real product images when you have them (we have the real cover).
- **Soul ID locks who is in the shot; Cinema Studio locks how the shot moves.** Run Soul Cast on the leads.
- **One shot = characters + environment + camera movement + lighting + action + continuity.** Write every prompt with those six things in that order; leave nothing implied.
- **Reference photos must share lighting** so the model's lighting inference is consistent, which is why every sheet uses the same soft grey setup.
- **Spot the slop:** slop hides in stills and multiplies in motion. Inspect the exact crop you plan to use, name the visible defect, then decide whether that crop is safe to pass. Do this on the still *before* paying for the video.
- **Iteration is the skill.** Expect 2–4 takes on physical beats (the fall, the pupils, the transformation) and 1–2 on the quiet ones.

## Credit plan (you have ~3,050 credits on Ultra)
| Stage | What | Rough budget |
|---|---|---|
| Assets | 5 done + ~9 more stills at 2K | ~150 |
| Stills for start frames | 22 shots × 1–2 | ~200 |
| Video takes | 22 shots, 720p, 4–7 s, avg 2 takes (4 on shots 5, 10a, 16, 20) | the bulk; check the per-clip price in the UI before you commit to 1080p |
| Selects re-render | ~8 hero clips at 1080p | reserve ~25% |
Rules: takes at 720p with audio off; 1080p only for selects; never re-roll a whole set, re-roll the one index that failed; generate the still, judge it, then spend on motion.

## Other things worth knowing
- The **AI Director** chat inside Cinema Studio can break a script into shots with camera settings pre-filled. Paste 01-script.md into it and compare with 02-shot-list.md.
- **Cinema Studio 3.0** (`cinematic_studio_3_0` in the API) has genre hints `drama`, `comedy` etc. and 4–15 s clips. 2.x has `intimate` and multi-shot mode; multi-shot is how shots 16 and 20 get their in-clip transformation.
- Strætó buses are yellow; the Academy's "no readable text" rule applies to route numbers and logos, which the models garble. Keep the bus plain yellow.
