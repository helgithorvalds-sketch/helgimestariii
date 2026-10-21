// Mux the rendered video with the mix, two-pass loudness normalised to -14 LUFS / -1 dBTP.
//   node scripts/finalize.mjs [--crf=18] [--out=out/gledipeningar.mp4]
import { execFileSync, spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const crf = arg('crf', '18');
const out = path.resolve(ROOT, arg('out', 'out/gledipeningar.mp4'));
const video = path.join(ROOT, 'out', 'video.mp4');
const audio = path.join(ROOT, 'audio', 'out', 'mix.wav');

const m = spawnSync('ffmpeg', ['-hide_banner', '-i', audio, '-af', 'loudnorm=I=-14:TP=-1.0:LRA=11:print_format=json', '-f', 'null', '-'], { encoding: 'utf8' });
const js = JSON.parse(m.stderr.slice(m.stderr.lastIndexOf('{'), m.stderr.lastIndexOf('}') + 1));
console.log('measured', js.input_i, 'LUFS', js.input_tp, 'dBTP');
const ln = `loudnorm=I=-14:TP=-1.0:LRA=11:measured_I=${js.input_i}:measured_TP=${js.input_tp}:measured_LRA=${js.input_lra}:measured_thresh=${js.input_thresh}:offset=${js.target_offset}:linear=true`;
execFileSync('ffmpeg', [
  '-y', '-loglevel', 'error', '-i', video, '-i', audio, '-map', '0:v:0', '-map', '1:a:0',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-profile:v', 'high', '-pix_fmt', 'yuv420p',
  '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart',
  '-af', ln, '-ar', '48000', '-c:a', 'aac', '-b:a', '256k', '-shortest', out,
], { stdio: 'inherit' });
const st = fs.statSync(out);
console.log(`wrote ${out} (${(st.size / 1e6).toFixed(1)} MB)`);
