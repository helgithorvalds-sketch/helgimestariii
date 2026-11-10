<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Pace wheel input through the shared Lenis instance with bounded pending travel; the home story opts into extra resistance eased around step boundaries and slower copy swaps, while other sections retain their normal pace. Desktop scenes, copy and progress read the same smoothed scroll without additional scene damping to avoid desynchronisation. Keep touch and reduced-motion scrolling native.

- Shared SVIF page building blocks (SvifBits, StepScene + scenes, StepVideo, FaqSection, BookingForm, SiteFooter) live in src/components and are reused by /, /fyrirtaeki and /baeklingur; why: all pages must stay visually identical.
- Visual language comes from the printed flyer "Nýji kaflinn": beige palette tokens in src/styles.css (cream, peach, chalk, sand, rose, stage), Jost thin capitals for titles with an Instrument Serif italic accent line, Inter for body, hairline frames with corner labels (FrameLines). No pixel motifs, no lavender.
- The front page process steps are code animations (framer-motion) in src/components/motion/scenes.tsx, played once in view by StepScene; keep them short (4–5 s), reduced-motion safe, and end on a readable frame.
- The flyer is called "Nýji kaflinn"; never write "velkomstbæklingur". public/baeklingur/flettibok.html is the client's own export and is replaced verbatim, never edited.
