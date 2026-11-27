# Gísla saga Súrssonar — Shorts series bible

An animated history series for Icelandic teenagers (8.–10. bekkur) with reading
difficulties who learn better by seeing. Each episode is one vertical (9:16) Short of
~60–80 s, narrated in Icelandic, that covers one turn of the saga and ends on a cliffhanger.

**Why this book:** Gísla saga Súrssonar is the saga most often on the 10th-grade reading
plan (Foldaskóli, Ingunnarskóli, Háaleitisskóli/Reykjanesbær, Ölfus, Fjallabyggð). The school
editions follow the *shorter* version (38 chapters); all names and chapter numbers here
follow that text (Netútgáfan / Mál og menning 1999).

## Method (where each rule comes from)

| Source | What we took |
|---|---|
| Higgsfield video "I Made VIRAL Faceless Shorts Using Claude Code" | ≥61 s Shorts; history as an evergreen niche; three winning looks (3D, 8-bit, **2D characters in a 3D world**); look rules: flat characters always face camera, everything else real 3D, scene light/shadow/blur also hit the characters, camera never stops; script = stakes hook → flipped expectation → underdog → funny image → open loop; a re-hook about every 10 s; voice first, then pictures timed to it. |
| claude-animated-shorts (the video's free skill) | Script formula (paradox hook ≤ 16 words, setting, 3–6 escalation beats, "You see" pivot, ironic callback ending); the three.js + Remotion engine for Version A; ink outlines, lens blur, gliding cameras, synthesized SFX + music. |
| drama-skills (short-drama pipeline) | Episode card with 12 keys (goal, hook, conflict, turn, climax, ending_hook, handoff_state…); hook inside 5 s; pay off, *then* hook; keep setups with their payoffs; compress by payoff density, not chapter by chapter; name strip at a character's first appearance; tell characters apart by silhouette + fixed colour blocks. |
| Higgsfield faceless-video workflow | Version B pipeline: style key → character/location sheets → 10 s blocks of 5 hard cuts → one narrator line per block (7.8–9.5 s of speech) → captions. |

## Accessibility rules (our own, for dyslexic viewers)

1. **One colour per person, forever.** The colour is on their clothes, their name card and
   their caption highlight, in every episode.
2. **Name card on first mention in each episode**: face + name + one-word role
   ("Gísli — hetjan", "Þorkell — bróðir"). Similar Þ-names never share a colour.
3. **Captions 1–3 words at a time**, large bold sans, the speaker-colour word highlighted.
   Captions *support* reading; the story never depends on reading them.
4. **Narration ~2.3–2.5 words/s** (slower than the 3.7 w/s viral norm) with a pause
   between beats. One idea per 10-second block.
5. **Every sentence is shown literally** on screen (the claude-animated-shorts rule), so a
   viewer who misses a word still sees what happened.
6. **Recap by picture, not by words:** each episode opens on an action already in progress
   and the episode before it is shown in its final frame (drama-skills rule).

## Cast — fixed colours

| Character | Colour | Look | Role card |
|---|---|---|---|
| **Gísli Súrsson** | blue `#2E6FD8` | lean young man ~20, sandy-blond hair, short beard, blue tunic, spear | hetjan |
| **Þorkell Súrsson** | orange-gold `#E8962E` | eldest son ~24, vain, neat combed hair, embroidered orange tunic | bróðir Gísla |
| **Þórdís Súrsdóttir** | purple `#8E4FC2` | eldest child ~25, long dark braid, purple dress, sharp eyes | systir Gísla |
| **Þorbjörn súr** | grey `#8A8F98` | father ~55, long white beard, grey wool tunic | pabbi |
| **Bárður** | yellow `#E8C930` | smug young neighbour, curly hair, yellow tunic | nágranni |
| **Hólmgöngu-Skeggi** | brown `#7A4A2A` | huge black beard, brown leather, sword Gunnlogi; wooden leg after ep 1 | einvígismaður |
| **Vésteinn** | green `#3FA34D` | friendly trader, green tunic | mágur Gísla |
| **Auður** | red `#D23C3C` | Gísli's wife, red dress, calm and fierce | kona Gísla |
| **Þorgrímur goði** | dark red `#7A1F2B` | stern chieftain, dark-red cloak, Freyr amulet | mágur, goði |
| **Börkur digri** | black `#2B2B2B` | heavy-set, black cloak | bróðir Þorgríms |
| **Eyjólfur grái** | slate `#5D6B7A` | grey-cloaked bounty hunter | eltir Gísla |

Name collisions to design around (shorter version): Þórdís ×3, Þorkell ×5, Þorgrímur ×4,
Helgi ×4. Only the people above get cards; others are shown without names.

## Places

| Place | What happens | Look |
|---|---|---|
| Stokkar í Súrnadal (Noregur) | the family farm; the night fire | turf-roofed longhouse, steep green valley, pines, fjord |
| Skemman á Stokkum | the family sleeps there; two vats of *sýra* (soured whey) | log storehouse, two iron-banded wooden vats |
| Saxa | Skeggi's island; the duel | small rocky island, hazel poles marking the duel square |
| Haukadalur í Dýrafirði | Sæból and Hóll, the two farms | flat-topped Westfjords mountains, green valley |
| Eyrarhvolsoddi | the failed blood-brotherhood under the *jarðarmen* | green point at the assembly, turf arch held up by a tall spear |
| Geirþjófsfjörður / Einhamar | Gísli's hiding place and last stand | narrow empty fjord, a lone rock |

## Episode map (13 episodes)

| # | Title | Ch. | Hook (first 5 s) | Ending hook |
|---|---|---|---|---|
| 1 | **Mysan** | 2–4 | "One of Iceland's most famous outlaws is named after sour whey." | four men try to become sworn brothers… and one pulls his hand back |
| 2 | **Torfan** | 5–6 | four men bleed into the earth under a turf arch | Gestur: "they won't all agree by the third summer" — and Gísli says fate will decide |
| 3 | **Peningurinn** | 7–10 | a coin that breaks into two halves = a life-or-death signal | Þorkell overhears the wives — "hear a man's death" — and moves out |
| 4 | **Spjótið** | 11–12 | the broken sword Grásíða is reforged into a spear behind locked doors | "Nú falla öll vötn til Dýrafjarðar" — Vésteinn rides on |
| 5 | **Hneit þar** | 13–14 | a storm tears the roof off; someone slips in before dawn | who did it? Gísli hides the bloody spear and says nothing |
| 6 | **Köld hönd** | 15–17 | Gísli ties the cows' tails together in the dark | Þorkell kicks Gísli's frozen shoes out of sight |
| 7 | **Vísan** | 18–19 | Gísli says one verse he never should have said | Þórdís repeats it to Börkur at the grave |
| 8 | **Útlaginn** | 20–22 | a man in Gísli's blue cloak is speared — it isn't Gísli | seven fires in a dream = seven years left |
| 9 | **Fíflið** | 23–27 | Gísli fakes his own drowning | hidden in a bed under Álfdís while Börkur searches |
| 10 | **Sverð bróðurins** | 28–30 | two ragged boys ask to see Þorkell's sword | Gísli must avenge his brother — on his wife's nephews |
| 11 | **Silfrið** | 31–32 | 300 silver for Auður to betray her husband | she smashes the purse into Eyjólfur's nose |
| 12 | **Einhamar** | 33–36 | a trail in the dew leads 15 men to Gísli | the last verse |
| 13 | **Systirin** | 37–38 | Þórdís recognises the sword | the survivors scatter across the world |

## Facts we keep careful about

- Who killed Vésteinn: the shorter (school) version never says. Keep it a mystery.
- The voyage: "aukið hundrað dægra" ≈ 60 days, not 120.
- Why they left Norway: the saga gives no reason beyond the feud; never claim King
  Haraldur drove them out.
- Þorgrímur and Þorkell are *mágar* (in-laws), **not** sworn brothers — the oath failed.
- Grásíða returns as a **spear**, not a sword.
