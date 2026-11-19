# Skýringarmyndband: Brot – hvor bitinn er stærri?

Fyrsti þáttur gerður eftir formúlunni í `../reports/Dyslexia friendly explainer video formula.md`.

| Skrá | Hvað |
|---|---|
| `brot-hvor-bitinn-er-staerri.mp4` | Myndbandið |
| `skjatexti.is.srt` | Íslenskur skjátexti sem valkostur (formúlan: ekki brenndur inn) |
| `script.json` | Handritið, setning fyrir setningu, með hléum fyrir spurningar |
| `samanburdur/samanburdur.png` | Gamla leiðin og nýja leiðin hlið við hlið |
| `qa/greynircorrect.txt` | Yfirlestur GreynirCorrect á hverri setningu |
| `qa/asr-*.txt` | Íslensk talgreining borin saman við handritið |
| `tolvupostur.md` | Drög að tölvupósti |

## Hvernig þetta er búið til

1. `check_text.py` keyrir hverja setningu í gegnum GreynirCorrect (skref 4 í formúlunni).
2. `build_audio.py` býr til talið setningu fyrir setningu og raðar því á tímalínu með hléum (skref 7).
   Sjálfgefið: Piper með íslenskri rödd (ókeypis, keyrir á vélinni).
   Með ElevenLabs: `python build_audio.py --backend elevenlabs --voice <voice_id>` (`eleven_v4`, `language_code: is`).
3. `qa_asr.py <rödd>` lætur íslenska Whisper-líkanið frá Háskólanum í Reykjavík skrifa talið upp og ber saman við handritið (skref 8).
   Þetta finnur röng orð en heyrir ekki ranga áherslu. Íslendingur þarf alltaf að hlusta líka.
4. `render/render.mjs` teiknar hvern ramma út frá tímalínunni (rough.js, Atkinson Hyperlegible) og ffmpeg setur saman (skref 9–10).

```bash
python build_audio.py --voice steinn
node render/render.mjs
```
