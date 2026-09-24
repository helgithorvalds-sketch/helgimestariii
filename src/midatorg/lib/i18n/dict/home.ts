/**
 * Strings owned by the "home" feature agent (spec §7). Keys are flat and dotted,
 * e.g. 'home.title'. Every key must exist in both `is` and `en`
 * (src/midatorg/test/i18n.test.ts enforces parity).
 *
 * Reused from dict/common: common.showMore, common.showAll, common.retry,
 * nav.sell, sort.label, sort.date, sort.demand, sort.price, category.*, eventStatus.*.
 */
export default {
  is: {
    'home.title': 'Viðburðir',
    'home.intro': 'Kauptu og seldu miða á viðburði á tix.is — beint á milli fólks, aldrei yfir miðaverði.',
    'home.introClose': 'Loka kynningu',

    // filters
    'home.filters.label': 'Flokkar',
    'home.query.showing': 'Leitarniðurstöður fyrir „{q}“',
    'home.query.clear': 'Hreinsa leit',

    // card
    'home.card.from': 'Frá {price}',
    'home.card.noListings': 'Engir miðar til sölu',
    'home.card.forSale': '{tickets} til sölu',
    'home.card.wanted': 'vantar {count} miða',
    'home.card.soldHereOne': '{count} miði seldur hér',
    'home.card.soldHereMany': '{count} miðar seldir hér',
    'home.card.lastSold': 'Seldist síðast á {price}',
    'home.card.past': 'Viðburðurinn er liðinn',
    'home.card.cancelled': 'Viðburðinum var aflýst',

    // empty states
    'home.empty.title': 'Engir viðburðir fundust',
    'home.empty.searchBody': 'Ekkert fannst fyrir „{q}“. Athugaðu stafsetninguna eða biddu okkur um að bæta viðburðinum við.',
    'home.empty.categoryBody': 'Prófaðu annan flokk eða skoðaðu alla viðburði.',
    'home.empty.requestEvent': 'Biðja um viðburð',
    'home.empty.all': 'Engir viðburðir enn',
    'home.empty.allBody': 'Viðburðir birtast hér um leið og þeir eru skráðir. Áttu miða? Settu þá í sölu.',

    // pagination
    'home.loadingMore': 'Sæki fleiri…',
    'home.loadMoreError': 'Náði ekki að sækja fleiri viðburði.',
  },
  en: {
    'home.title': 'Events',
    'home.intro': 'Buy and sell tickets for tix.is events — directly between people, never above face value.',
    'home.introClose': 'Close intro',

    'home.filters.label': 'Categories',
    'home.query.showing': 'Search results for “{q}”',
    'home.query.clear': 'Clear search',

    'home.card.from': 'From {price}',
    'home.card.noListings': 'No tickets for sale',
    'home.card.forSale': '{tickets} for sale',
    'home.card.wanted': '{count} wanted',
    'home.card.soldHereOne': '{count} ticket sold here',
    'home.card.soldHereMany': '{count} tickets sold here',
    'home.card.lastSold': 'Last sold at {price}',
    'home.card.past': 'This event has passed',
    'home.card.cancelled': 'This event was cancelled',

    'home.empty.title': 'No events found',
    'home.empty.searchBody': 'Nothing found for “{q}”. Check the spelling or ask us to add the event.',
    'home.empty.categoryBody': 'Try another category or browse all events.',
    'home.empty.requestEvent': 'Request an event',
    'home.empty.all': 'No events yet',
    'home.empty.allBody': 'Events show up here as soon as they are added. Got tickets? Put them up for sale.',

    'home.loadingMore': 'Loading more…',
    'home.loadMoreError': "Couldn't load more events.",
  },
} as { is: Record<string, string>; en: Record<string, string> };
