# Gísla saga, 1. þáttur (Mysan) - Version A sound: cue sheet

All music and effects are original, synthesized with numpy/scipy (`nordic.py`, plus the MIT `dsp.py` / `sfx_gen.py` / `instruments.py` kit from claude-animated-shorts), placed by `music.py` / `sfx.py`, mixed by `mix.py`. Narration = `public/gisla/voice_master.wav`, gain only (no EQ, no compression, no time-stretch).

## Files
| file | content |
|---|---|
| `mix.wav` | final mix, 48 kHz, stereo, 24-bit, 3,840,000 samples = 80.000 s |
| `voice.wav` / `music.wav` / `sfx.wav` | stems at mix gain, pre-limiter (they sum to the mix before the master limiter) |

## Master loudness
- Own BS.1770-4 meter: integrated **-13.97 LUFS**, true peak **-1.30 dBTP**, LRA 3.6 LU
- ffmpeg loudnorm (measurement pass): input_i **-14.03 LUFS**, input_tp **-1.30 dBTP**, input_lra 3.60 LU
- Stems at mix gain: voice -13.7 LUFS, music -24.8 LUFS, sfx -25.3 LUFS; master gain +2.47 dB (same on every stem); limiter ceiling -1.3 dBTP, max GR 2.29 dB, active (>0.1 dB) on 4.60 % of samples (mostly single voice peaks: the narration's own true peak is -2.2 dBTP, so -14 LUFS needs ~1.5-2 dB off its loudest plosives)
- SFX bus: own peak limiter at -7.0 dBFS (pre master gain) so effect transients never push the master limiter.

ffmpeg ebur128 (peak=true):
```
Summary:
  Integrated loudness:
    I:         -14.0 LUFS
    Threshold: -24.1 LUFS
  Loudness range:
    LRA:         3.6 LU
    Threshold: -34.1 LUFS
    LRA low:   -16.0 LUFS
    LRA high:  -12.4 LUFS
  True peak:
    Peak:       -1.3 dBFS
```

## Ducking (sidechain from voice_master.wav)
- Key = the voice audio: 10 ms RMS, soft gate 24 dB under the loud-speech level, 40 ms look-ahead, 120 ms hold, 20 ms attack, 350 ms release. Music duck -7 dB, SFX duck -3 dB.
- Music level per section is then set so the music sits the target LU under the voice over the speech windows; in the gaps between blocks it blooms back up by the duck depth.
- Rides: music dips on the three steam hisses (56.46-56.91 s -6 dB, 57.92-58.32 s -6 dB, 58.44-59.14 s -7 dB).

| section | time s | voice (speech) LUFS | music LUFS | music vs voice | sfx LUFS | sfx vs voice |
|---|---|---|---|---|---|---|
| hook | 0.00-8.66 | -13.8 | -27.4 | -13.6 LU | -33.6 | -19.8 LU |
| play | 8.66-40.59 | -13.9 | -25.9 | -12.0 LU | -28.4 | -14.5 LU |
| night | 40.59-50.52 | -14.4 | -26.4 | -12.0 LU | -27.4 | -13.0 LU |
| fire | 50.52-62.41 | -13.9 | -25.7 | -11.7 LU | -24.9 | -10.9 LU |
| lift | 62.41-70.36 | -14.9 | -25.9 | -11.0 LU | -27.1 | -12.2 LU |
| sea | 70.36-77.74 | -13.3 | -24.8 | -11.5 LU | -26.1 | -12.7 LU |

## Music map (original score: Nordic folk - bowed drone, fiddle, lyre/kantele, frame drum, lur; 96 bpm, bar 1 = 'Noregi')
Section gains applied (dB): hook -0.4, play -5.1, night -1.1, fire -2.8, lift -6.0, sea -4.6.

| time s | frame | music |
|---|---|---|
| 0.200 | 6 | hook: low bowed drone D2+A2 fades in (flash-forward to the whey vat), soft heartbeat frame drum |
| 2.900 | 87 | lyre 'whey' motif D-F-A-C under 'súrri mysu'; lyre pickup A-D-E into bar 1 |
| 8.665 | 260 | bar 1 on 'Noregi': playful D-dorian dance - fiddle theme A, lyre arpeggios, lyre bass, frame drum (dance pattern) |
| 18.665 | 560 | theme B (block 3: Þorkell leaves, Skeggi, the statues) |
| 28.665 | 860 | duel (block 4): theme A with two fiddles + octave below, driving drum |
| 38.665 | 1160 | turnaround: falling lyre run + fading drum, fiddle holds D into the night |
| 40.592 | 1218 | night (block 5): drone D + Eb rub, heartbeat drum lub-dub, low lyre D/Eb |
| 46.362 | 1391 | 'kveikja': tremolo fiddles A3/Bb3 (minor-second rub) enter with the fire |
| 51.165 | 1535 | fire (block 6): lyre ostinato D-F-A-Bb, ticking drum, tremolo fiddles climbing D-Eb-F-F#-A |
| 62.415 | 1872 | 'sleppa': LIFT - rising lyre glide, D major drone, theme A in D major (two fiddles), driving drum |
| 68.665 | 2060 | 'Súrsson' (bar 25 = 68.665): triumphant D-major tutti - lur chord, fiddle double stops, lyre strum, big drum |
| 70.364 | 2111 | sea (block 8): open-fifth drone D-A-E, broad two-fiddle line, lyre 'wave' arpeggios, distant lur |
| 75.864 | 2276 | 'fóstbræðralag': tremolo D5/Eb5 rub swells under the slow ritual drum (SFX) |
| 77.744 | 2332 | HARD CUT on 'kippir' (77.744, frame 2332) - music silent to the end; only the hard hit and one low boom (SFX) |

## SFX events (each starts ON its anchor word; Whisper start time from timeline.json)
Level = LU relative to the voice stem's integrated loudness (-13.7 LUFS at mix gain), measured after the SFX duck: events as max momentary loudness, beds as integrated loudness over the bed.

| # | time s | frame | cue | what | kind | target LU | measured LU |
|---|---|---|---|---|---|---|---|
| 1 | 3.745 | 112.4 | fire_hook | low fire crackle under the flash-forward vat shot ('mysu') | bed | -16 | -16.0 |
| 2 | 5.325 | 159.8 | card_pop | name-card pop: Gísli | event | -15 | -15.0 |
| 3 | 5.325 | 159.8 | whoosh_gisli | soft whoosh as Gísli turns to camera ('Gísli') | event | -11 | -11.0 |
| 4 | 8.665 | 259.9 | amb_day | valley day air: wind, blackbird + sparrows, distant fjord ('Noregi' -> crossfades into night on 'nótt') | bed | -25 | -25.0 |
| 5 | 11.744 | 352.3 | card_pop | name-card pop: pabbi | event | -15 | -15.0 |
| 6 | 13.264 | 397.9 | card_pop | name-card pop: Þórdís | event | -15 | -15.0 |
| 7 | 14.664 | 439.9 | card_pop | name-card pop: Þorkell | event | -15 | -15.0 |
| 8 | 15.944 | 478.3 | jawharp_sting | comic sting: jaw-harp 'boi-oing' as Bárður winks ('Bárður') | event | -8 | -8.0 |
| 9 | 17.564 | 526.9 | thud | heavy thud: Bárður drops behind the stone wall ('drepur') | event | -6 | -6.0 |
| 10 | 22.744 | 682.3 | gate_slam | farm gate slammed by Þorkell ('fússi') | event | -6 | -6.1 |
| 11 | 23.324 | 699.7 | brass_laugh | Skeggi's laugh as a low brass stab figure HO-ho-ho-HOO, no voice ('Hólmgöngu-Skeggja') | event | -7 | -7.0 |
| 12 | 26.584 | 797.5 | chop | wood chop 1/3: carver chipping the silly statues ('tréstyttur') | event | -10 | -10.7 |
| 13 | 26.844 | 805.3 | chop | wood chop 2/3: carver chipping the silly statues ('tréstyttur') | event | -10 | -12.8 |
| 14 | 27.104 | 813.1 | chop | wood chop 3/3: carver chipping the silly statues ('tréstyttur') | event | -10 | -10.4 |
| 15 | 31.306 | 939.2 | sword_shing | sword Gunnlogi raised: steel scrape + long ring ('montar') | event | -8 | -8.0 |
| 16 | 34.726 | 1041.8 | whoosh_impact | spear swing whoosh + impact flash, cut away ('heggur') | event | -5 | -5.9 |
| 17 | 37.786 | 1133.6 | peg_tok | peg-leg tok 1/3 ('tréfæti') | event | -12 | -12.0 |
| 18 | 38.026 | 1140.8 | peg_tok | peg-leg tok 2/3 ('tréfæti') | event | -12 | -12.5 |
| 19 | 38.266 | 1148.0 | peg_tok | peg-leg tok 3/3 ('tréfæti') | event | -12 | -12.1 |
| 20 | 43.602 | 1308.1 | amb_night | night falls: low night wind, faint insects ('nótt') | bed | -24 | -24.0 |
| 21 | 43.852 | 1315.6 | owl | owl 'hoo ... hoo-hoo' in the dark valley | event | -14 | -14.0 |
| 22 | 44.382 | 1331.5 | crowd_steps | sixty men walking down the valley: crunching steps ('sextíu') | bed | -16 | -16.0 |
| 23 | 44.432 | 1333.0 | torch_whoosh | torch whoosh 1/3 | event | -13 | -13.0 |
| 24 | 45.232 | 1357.0 | torch_whoosh | torch whoosh 2/3 | event | -13 | -13.0 |
| 25 | 45.982 | 1379.5 | torch_whoosh | torch whoosh 3/3 | event | -13 | -13.0 |
| 26 | 46.362 | 1390.9 | fire_bed | fire bed: rises through block 5-6, knocked down by each hiss, flares twice, embers (kveikja -> sleppa) | bed | -16 | -16.0 |
| 27 | 46.362 | 1390.9 | ignite | fire catches the turf wall: whoomp + roar onset ('kveikja') | event | -7 | -7.0 |
| 28 | 48.442 | 1453.3 | crackle_inside | muffled crackle heard from inside the storehouse ('sefur') | event | -14 | -14.0 |
| 29 | 55.344 | 1660.3 | splash | goat skin dunked into the whey vat ('kerin') | event | -7 | -7.0 |
| 30 | 56.464 | 1693.9 | steam_hiss | steam hiss 1/3: whey-soaked skin beats the flames down ('eldinn') | event | -6 | -6.0 |
| 31 | 57.924 | 1737.7 | steam_hiss | steam hiss 2/3: whey-soaked skin beats the flames down ('sinni') | event | -6 | -6.0 |
| 32 | 58.444 | 1753.3 | steam_hiss | steam hiss 3/3: whey-soaked skin beats the flames down ('thrisvar') | event | -5 | -5.0 |
| 33 | 60.635 | 1819.0 | wall_crash | Gísli kicks through the back wall: crack, splinters, falling boards ('brjóta') | event | -5 | -5.0 |
| 34 | 62.355 | 1870.6 | wind_gust | wind gust as the family runs up the mountainside ('sleppa') | event | -10 | -10.0 |
| 35 | 62.955 | 1888.6 | amb_mountain | mountainside wind after the escape (block 7 bed) | bed | -27 | -27.0 |
| 36 | 65.735 | 1972.0 | comic_sting | comic sting: pucker squeak + falling plucks ('súr') | event | -8 | -8.0 |
| 37 | 68.655 | 2059.7 | triumph_hit | triumphant hit: big drum + low boom on 'Súrsson' (score tutti on the same beat) | event | -6 | -6.0 |
| 38 | 71.704 | 2151.1 | sail_flap | square sail flapping | bed | -22 | -22.0 |
| 39 | 71.704 | 2151.1 | waves | grey sea from the ship: swells, bow splash, hull slap ('sigla' -> cut on 'kippir') | bed | -18 | -18.0 |
| 40 | 72.404 | 2172.1 | gull | gull call 1/3 ('Íslands') | event | -12 | -12.0 |
| 41 | 72.954 | 2188.6 | gull | gull call 2/3 ('Íslands') | event | -14 | -14.0 |
| 42 | 73.704 | 2211.1 | gull | gull call 3/3 ('Íslands') | event | -16 | -16.0 |
| 43 | 75.864 | 2275.9 | slow_drum | slow ritual drum 1/3 under the turf arch ('fóstbræðralag') | event | -9 | -9.0 |
| 44 | 76.524 | 2295.7 | slow_drum | slow ritual drum 2/3 under the turf arch ('fóstbræðralag') | event | -8 | -8.0 |
| 45 | 77.174 | 2315.2 | slow_drum | slow ritual drum 3/3 under the turf arch ('fóstbræðralag') | event | -7 | -7.0 |
| 46 | 77.744 | 2332.3 | hard_hit | HARD HIT: the dark-red hand yanks back, freeze + shake ('kippir'); music cuts here | event | -3 | -3.0 |
| 47 | 78.500 | 2355.0 | low_boom | single low boom on the frozen end card (78.5 s, frame 2355), decays to silence by 80.0 | event | -9 | -9.0 |

