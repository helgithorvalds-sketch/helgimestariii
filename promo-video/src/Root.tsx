import { Composition } from 'remotion';
import { Main, TOTAL } from './Main';
import { BrandOpen, BRAND_OPEN_DURATION } from './shots/BrandOpen';
import { SpotlightHero, SPOTLIGHT_HERO_DURATION } from './shots/SpotlightHero';
import { TitleCard, TITLE_CARD_DURATION } from './shots/TitleCard';
import { DeckDeal, DECK_DEAL_DURATION } from './shots/DeckDeal';
import { CallStack, CALL_STACK_DURATION } from './shots/CallStack';
import { Outro, OUTRO_DURATION } from './shots/Outro';

const V = { fps: 30, width: 1920, height: 1080 } as const;

export const Root: React.FC = () => (
  <>
    <Composition id="Promo" component={Main} durationInFrames={TOTAL} {...V} defaultProps={{ bgm: true }} />
    <Composition id="S1-BrandOpen" component={BrandOpen} durationInFrames={BRAND_OPEN_DURATION} {...V} />
    <Composition id="S2-SpotlightHero" component={SpotlightHero} durationInFrames={SPOTLIGHT_HERO_DURATION} {...V} />
    <Composition id="S3-TitleCard" component={TitleCard} durationInFrames={TITLE_CARD_DURATION} {...V} />
    <Composition id="S4-DeckDeal" component={DeckDeal} durationInFrames={DECK_DEAL_DURATION} {...V} />
    <Composition id="S5-CallStack" component={CallStack} durationInFrames={CALL_STACK_DURATION} {...V} />
    <Composition id="S6-Outro" component={Outro} durationInFrames={OUTRO_DURATION} {...V} />
  </>
);
