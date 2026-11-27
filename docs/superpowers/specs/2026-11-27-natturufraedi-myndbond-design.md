# Náttúrufræði fyrir 7. bekk – animated iPhone shorts (design)

Date: 2026-11-27 · Status: ready for approval

Calls made by Claude (not decided by the user; check these while reading):
- Approach A, the repo's three.js + Remotion pipeline (§4).
- The 10 chapters and their order, and one core idea per chapter (§6).
- The recurring cast: Sóley, Kári and Amma, with one narrator voicing every line (§7.3).
- Key-term labels on screen, but no running captions (§7.4).
- Chapter 9's tone follows the school book (§6).
- The video project lives in `natturufraedi/` in this repo (§8).
- Pilot first; chapters 2–10 are produced after the pilot is approved (§5).

## 1. Intent and why

An Icelandic science guide for students around 7. bekkur, made as 10 short animated videos ("kaflar"), one for each
major part of what 7th graders study in náttúrugreinar. They are watched on an **iPhone** (vertical, 9:16).

The why, in the user's words: in order for us to remember something, we have to relate it to something else. So
every idea must be anchored in something a 12-year-old in Iceland has seen, touched or felt, told as a story with a
hook, a character to care about and real emotion. The explanation craft comes from Mark Rober; the look and the
story formula come from the `claude-animated-shorts` repo (2D cartoon characters in a colourful, inked 3D world).

Success looks like: a 12-year-old watches to the end without being made to, can afterwards explain the core idea of
the chapter in their own words using the correct Icelandic term, and still remembers the story a week later.

## 2. Goals, non-goals, anti-goals

**Goals**
- 10 chapters that together cover the 2024 Aðalnámskrá (Kafli 22 Náttúrugreinar, "Við lok 7. bekkjar getur
  nemandi…"), each built around one core idea and a true Icelandic story.
- Each chapter is one vertical short: 1080×1920, 30 fps, **60–90 s**, Icelandic narration.
- Natural, native-sounding Icelandic with the correct íðorð from the Icelandic school books (Náttúrulega 1–3, Auðvitað).
- Hooks and explanations that follow the Mark Rober + shorts formula below.
- The look of `claude-animated-shorts`, with characters whose emotions are readable and land on the words.

**Non-goals (this round)**
- Not a full replacement for the textbook: one core idea per chapter, not every criterion.
- No English version, no teacher's guide or quiz, no publishing/uploading (the user does that).

**Anti-goals (failure even if it renders)**
- Icelandic that sounds translated, stiff or robotic, or a narrator who mispronounces the key terms.
- Any scientific error or invented fact. Every fact has a source.
- Jokes or details that don't carry the science (they measurably hurt learning).
- A lecture feel: talking down, "today we will learn about…".
- Copying the reference channel's scripts, characters or shots, or naming that channel.

## 3. Constraints

- **Rendering is CPU-only** in this environment (WebGL2 through SwiftShader works; no GPU). A finished chapter means hours
  of rendering, and each chapter needs its own 3D world.
- **Voice:** ElevenLabs is connected (Starter, ~67 k characters left this month). Icelandic works only on
  `eleven_v3` / `eleven_v4`. One 75 s chapter ≈ 1.5 k characters, so 10 chapters plus retakes fit.
- **Repo:** `helgimestariii` is a Lovable (Vite/React) app. The video project must live in its own folder with its own
  `package.json` and must not change how the app builds.
- **The container is temporary:** everything worth keeping is committed and pushed to `claude/amazing-gauss-pxcxzh`.
  Render temp files stay outside the repo. GitHub refuses files > 100 MB.
- The reference repo's study frames are for style study only and are **not** committed here. Its code is MIT and is
  reused with its licence notice.

## 4. Approaches

| | Approach | Trade-off |
|---|---|---|
| **A (chosen)** | The repo's pipeline: three.js inside Remotion, 2D bean-head character cards in an inked, painted 3D world, ElevenLabs Icelandic narrator, synthesized original score + SFX | Exactly the look the user picked; full control of every shot; science diagrams can be accurate with correct Icelandic labels. Costs: a new 3D world per chapter, slow CPU renders. |
| B | AI video generation (Higgsfield is connected) | Faster per chapter, but characters drift between shots, diagrams and Icelandic text come out garbled, and it spends credits. |
| C | Plain 2D motion graphics | Renders fast, but loses the 2D-in-3D look that makes the style stand out. |

The user pointed at the `claude-animated-shorts` repo for the look and handed over the how, so A was my call
(stated in chat, open to override).

## 5. Scope of this round

1. **This design** (series bible).
2. **Full Icelandic scripts for all 10 chapters**: facts with sources, narration, and a beat-by-beat shot list
   (what is on screen for each sentence, which character feels what).
3. **Chapter 1 fully produced as the pilot**: voice, animation, sound and a final mp4 the user watches on their iPhone.
4. **Chapters 2–10** are produced after the pilot is approved, in later rounds, on the same pipeline, reusing the
   cast, the Icelandic world kit and the sound.

Gates the user passes (Claude cannot hear audio here, so every judgement by ear is the user's):
- (a) this design;
- (b) the Chapter 1 script, plus 3–4 short voice samples to pick the narrator from;
- (c) the **full Chapter 1 narration, by ear**, before any animation is timed to it (a mispronunciation found later
  means new voice, re-timing, new sound and hours of re-rendering);
- (d) the finished pilot.

Schedule versus look: the user asked for high quality and expects it to take time, so **the look wins**. No effect is
cut to save render time; long renders are split into chunks that survive a container restart (my call).

## 6. The 10 chapters

Order follows the strongest hooks first; each is mapped to the 2024 criteria. Facts are from the curriculum research
(`docs/natturufraedi/rannsokn/`), re-checked during scripting.

| # | Kafli (working title) | Core idea (one per chapter) | True Icelandic hook | 2024 criterion |
|---|---|---|---|---|
| 1 | **Ísland verður til – eldgos** | Iceland sits where two plates pull apart; kvika rises and fills the gap; cooled kvika becomes rock (storknun) | Heimaey 1973: the town fought the lava with seawater hoses (~6 million tonnes) and saved the harbour | Alheimurinn: mótun lands, náttúruhamfarir |
| 2 | **Jöklar og ytri öfl** | Ice, water and wind wear land down and carry it away (veðrun, rof, set) | Skeiðarárhlaup 1996 took bridges on the Ring Road | Alheimurinn: mótun lands |
| 3 | **Veður, loftslag og hlýnun** | Greenhouse effect: a blanket of gases that keeps heat in | Okjökull's funeral 2019, plaque "415 ppm" | Umhverfið: gróðurhúsaáhrif |
| 4 | **Orka – jarðhiti og vatnsafl** | Energy changes form and is never lost (stöðuorka → hreyfiorka → raforka) | Why hot water from the tap smells of eggs; hitaveita since 1930 | Orkan: orkuform, varðveisla orku |
| 5 | **Rafmagn, segulmagn og norðurljós** | Moving electrons are electricity; Earth's magnet steers the solar wind into norðurljós | The static shock from a wool hat, scaled up to the sky | Orkan: rafrásir, segulmagn |
| 6 | **Efnin í kringum okkur** | Everything is made of atoms and molecules; hamskipti and efnabreytingar | Carbfix at Hellisheiði turns CO₂ into stone | Efnin |
| 7 | **Hafið og lífríki þess** | Food chain and ecosystem: frumframleiðendur → neytendur → rotverur | The kids of Vestmannaeyjar who rescue puffin chicks (pysjur) | Umhverfið: vistkerfi |
| 8 | **Ljóstillífun og líf á landi** | Plants make their own food from light, water and CO₂ | Birch once covered 25–40 % of Iceland, now ~1.5 %; the mink that escaped | Lífið: ljóstillífun; Umhverfið: nýjar tegundir |
| 9 | **Líkaminn, kynþroski og erfðir** | Genes come half from each parent; hormones start puberty | Everyday hook (no strong Icelandic event) | Lífið: kynþroski, erfðir |

Chapter 9 tone (my call): it follows Náttúrulega 3's "Kynþroski og erfðafræði": matter-of-fact, the book's own terms,
centred on hormones and genes; body changes named the way the book names them; characters always clothed, nothing
shown that a 12-year-old would be embarrassed to watch in class. The user reads this script like the others.
| 10 | **Sólkerfið, tunglið og árstíðir** | Seasons come from Earth's tilt, not its distance from the sun | The total solar eclipse of 12 Aug 2026; Apollo astronauts trained in Iceland | Alheimurinn |

## 7. Series bible

### 7.1 Story and explanation formula (every chapter)

A merge of the shorts formula (from the repo's style bible) and Mark Rober's craft (research notes in
`docs/natturufraedi/rannsokn/mark-rober.md`). Beats, in Icelandic terms:

1. **Krókur (0–4 s):** the absurd or high-stakes true fact in sentence one. No intro, no logo, no "í dag ætlum við
   að læra". The voice starts on frame 1–4.
2. **Sögusvið (1–2 sentences):** year, place, a named person, one concrete detail.
3. **Stigmögnun (2–4 beats)** joined by "en…" or "þannig að…" (but / therefore), never "og svo…". Stakes climb.
4. **Spurningin:** the question or myth the viewer already has ("Bíddu… af hverju er eldfjall undir bæ?").
   Where it fits, a **prediction beat**: "Hvað heldur þú að gerist?" plus a one-second beat before the reveal.
5. **Vendipunktur: "Málið er nefnilega að…"** (the "You see" pivot) leads into the one core idea:
   - name it with the íðorð;
   - give **one** everyday analogy from Icelandic kid life (sundlaugin, heiti potturinn, kakó, ullarhúfan,
     trampólínið, frystikistan, mjólkurfernan…);
   - **spell out what maps to what**;
   - show it literally on screen.
6. **Tala → samanburður:** every big number gets a familiar comparison.
7. **Afleiðing:** what it means for Iceland and for "þú" today.
8. **Bakhlaup:** a short callback twist that ends the video on its last word.

Rules:
- One core idea per chapter.
- At most 3 new terms per chapter, each explained in the same or the next sentence.
- Jokes are true facts that carry the science.
- Never describe what the viewer already sees.
- Write the hook last.

### 7.2 Icelandic language rules
- **Voice and grammar:**
  - Spoken, natural Icelandic, talking to "þú".
  - Short sentences (about 8–14 words).
  - Present tense in the stories (sögulegt nútíð).
  - No anglicisms; light humour.
- **Terms:** íðorð exactly as in Náttúrulega / Auðvitað (kvika, hraun, flekaskil, jarðskorpa, storknun, ljóstillífun…).
- **Written for the voice engine:**
  - Numbers, years, units and dates written as words ("nítján hundruð sjötíu og þrjú", "sex milljónir tonna").
  - No abbreviations.
  - Phonetic respellings in the voice copy only, where a test shows a mispronunciation.
- **Native-speaker gate:** the user (or someone they choose) reads every script before its voice is generated.
- Every script starts with its facts and their sources.

### 7.3 Cast (recurring, for emotion)
- **Sögumaður (narrator):**
  - One warm, curious, slightly cheeky Icelandic voice. One steady tone, fast but clear.
  - 3–4 ElevenLabs voices read the same sample paragraph full of hard words; the user picks by ear (gate b).
    A transcribe-back check (ElevenLabs speech-to-text) catches gross errors before the samples are sent.
  - Fallback if no voice sounds native enough (user's decision): **use the best ElevenLabs voice anyway**, fixing
    problem words with phonetic respellings in the voice copy. No human recording.
  - The narrator also says the characters' short lines as quoted speech, so the whole series has one voice.
- **Sóley (12):** curious and brave, asks the questions; the viewer's stand-in. Wears a lopapeysa.
- **Kári (12):** her friend, a sceptical joker who believes the myths. His wrong guesses are what gets busted.
- **Amma Sóleyjar:** links the kids to history. In Chapter 1 she *is* the story: she was 12 on Heimaey in 1973,
  the same age as the viewer.
- Historical stories get their own period characters, in the same drawing style.
- **Drawing:**
  - The repo's bean-head characters: about 3.5 heads tall, stick limbs, plum ink outline.
  - The 14-expression face library.
  - Icelandic touches: lopapeysa, húfa, pollagalli, gúmmístígvél.
- **Emotion:**
  - Each chapter gives one character a clear emotional arc (fear → relief, doubt → wonder, loss → hope).
  - Every reaction lands 0–3 frames before its word.

### 7.4 On-screen text
- No running captions, as in the reference style.
- **Key-term labels (my call, for learning):** when a key íðorð is first said, it appears as a bold label in the
  scene (e.g. **KVIKA** with an arrow). Three to five per chapter, on the word, gone after about 1.5 s.
- Spelled correctly with á, ð, þ, æ, ö, in a font that has them.
- Burned-in captions can be added later if the user wants them.

### 7.5 Look
- Follow the repo's final look values: lights day/golden, ink, lens blur, bloom, grade, camera grammar of creeping
  holds, smootherstep glides, flip-kicks and 4–5° rolls.
- **Icelandic world kit**, built once and reused:
  - bárujárnshús in red/blue/yellow/white with red or green roofs;
  - mossy lava, black sand, basalt columns, a glacier tongue;
  - harbour and fishing boats;
  - hitaveita pipes, a sundlaug/heitur pottur;
  - few trees (this is part of the joke in Chapter 8).
- **Moods:**
  - day;
  - golden;
  - night-blue for explanations;
  - eruption night: orange emissive kvika with bloom;
  - aurora green (Chapter 5).
- **Science diagrams live inside the world:**
  - a cake-slice cutaway of the Earth under the town;
  - plates as giant slabs sliding apart;
  - kvika as glowing goo.
  - All labelled per 7.4.

### 7.6 Sound
- **Narration:**
  - ElevenLabs `eleven_v3` or `eleven_v4`, whichever sounds more natural in Icelandic in the test.
  - Word timings come from the ElevenLabs with-timestamps output, saved as `words.json` and hand-fixed.
  - Every visual is timed to these words.
- **Score and effects:**
  - An original synthesized score in a fresh, playful mood per chapter, adapted from the repo's audio code.
  - Synthesized SFX.
- **Mix:**
  - Voice on top, music and SFX ducked under it.
  - −14 LUFS integrated.
  - 48 kHz, exact video length.

## 8. Where things live

```
natturufraedi/                  own package.json (Remotion + three + @remotion/three), separate from the app
  handrit/kafli-01.md … 10.md   facts + sources, narration, shot list (one file per chapter)
  src/                          Remotion entry, Root.tsx, one folder per chapter (kafli01/…), shared world kit + cast
  hljod/kafli01/                voice.mp3, words.json, audio scripts, mix.wav
  scripts/                      stills, side-by-side sheets, QA (from the template repo)
  out/                          renders (git-ignored)
  LICENSE-claude-animated-shorts.txt
docs/natturufraedi/rannsokn/    curriculum + Mark Rober research notes
```

- The app's ESLint gets `natturufraedi` added to its ignores. Nothing else in the app changes.
- **Delivery:**
  - The final pilot mp4 is sent to the user directly.
  - It is also committed if it is under ~50 MB (H.264, CRF ~20); otherwise only the source is committed and the mp4
    is re-rendered on demand.

## 9. Quality checks
- **Script:**
  - Every fact traced to a source.
  - The formula beats are present.
  - 60–90 s at the measured Icelandic speaking rate (~2.6–3.0 words/s, so about 170–240 words).
  - Native-speaker read.
- **Voice:** listen for mispronounced terms and fix them with respellings.
- **Look:**
  - Stills compared side by side with the reference frames.
  - A fresh reviewer agent scores colour, light, ink, characters, depth and composition and lists fixes.
- **Final render:** the QA script checks for black, white, frozen and popping frames and for loudness. Then the user
  watches the pilot on their iPhone.

## 10. Chapter 1 pilot – sketch (the real script comes next, for approval)
- **Hook idea:** "Árið nítján hundruð sjötíu og þrjú fór heill bær í slag við eldfjall – vopnaður brunaslöngum."
- **Story:**
  - Amma, aged 12, wakes at night as the ground on Heimaey splits open.
  - Nearly the whole town leaves by fishing boat that night.
  - Lava creeps toward the harbour, the town's lifeline.
- **Question:** why is there a volcano under a town at all?
- **Pivot to the science:**
  - Iceland is being torn in two (flekaskil, about 2 cm a year: compared with how fast your fingernails grow).
  - Kvika rises into the crack the way the hot blob rises in a hraunlampi.
- **Therefore:** how do you fight 1000 °C rock? You cool it. Kvika that cools becomes stone (storknun), so seawater
  built a wall out of the lava itself.
- **Callback twist (to verify):**
  - The harbour was saved, and the new lava made it better sheltered.
  - The island grew.
  - The heat left in the lava heated houses in the town for years afterwards.

## 11. Left to the builder
- Exact shot list, camera moves and timings (from the approved script and the voice timings).
- How much of the template code is copied versus rewritten.
- Which ElevenLabs voice and model, within 7.6.
- The music style per chapter.
- Render resolution for look-checks (final is 1080×1920).
- How the world kit is split into reusable modules.
