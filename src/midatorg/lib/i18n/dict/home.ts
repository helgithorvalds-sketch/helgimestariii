/**
 * Strings owned by the "home" feature agent (spec §7). Keys are flat and dotted,
 * e.g. 'home.title'. Every key must exist in both `is` and `en`
 * (src/midatorg/test/i18n.test.ts enforces parity).
 *
 * Reused from dict/common: common.tagline, common.lowestPrice, common.showMore,
 * common.showAll, common.retry, nav.sell, sort.label, sort.date, sort.demand,
 * sort.price, category.*, eventStatus.*.
 */
export default {
  is: {
    'home.title': 'Markaðurinn',

    // section subtitle (numbers agree with the count)
    'home.summary.eventsOne': '{count} viðburður',
    'home.summary.eventsMany': '{count} viðburðir',
    'home.summary.showingOne': 'Sýni {count} viðburð',
    'home.summary.showingMany': 'Sýni {count} viðburði',
    'home.summary.forSaleOne': '{count} miði til sölu',
    'home.summary.forSaleMany': '{count} miðar til sölu',
    'home.summary.wanted': '{count} vilja kaupa',

    // trending strip
    'home.trending.title': 'Vinsælt núna',
    'home.trending.waitlist': 'á biðlista',

    // filters
    'home.filters.label': 'Flokkar',
    'home.search.label': 'Leita á markaðnum',
    'home.search.placeholder': 'Leita að viðburði eða stað…',
    'home.search.clear': 'Hreinsa leit',

    // market card
    'home.card.waitlist': 'Á biðlista',
    'home.card.noWaitlist': 'Enginn á biðlista',
    'home.card.wantUnit': 'vilja kaupa',
    'home.card.forSaleWord': 'til sölu',
    'home.card.soldWord': 'seldir',
    'home.card.noListings': 'Engir miðar til sölu',
    'home.card.faceValueWord': 'miðaverð',
    'home.card.lastSold': 'seldist síðast {price}',
    'home.card.noSales': 'engin sala skráð',
    'home.card.buy': 'Kaupa',
    'home.card.notify': 'Láta vita',
    'home.card.haveTickets': 'Ég á miða',

    // empty states
    'home.empty.category': 'Engir viðburðir í þessum flokki',
    'home.empty.categoryBody': 'Prófaðu annan flokk eða skoðaðu allt sem er í boði.',
    'home.empty.search': 'Ekkert fannst fyrir „{q}“',
    'home.empty.searchBody': 'Athugaðu stafsetninguna eða biddu okkur um að bæta viðburðinum við.',
    'home.empty.requestEvent': 'Biðja um viðburð',
    'home.empty.all': 'Engir viðburðir enn',
    'home.empty.allBody': 'Viðburðir birtast hér um leið og þeir eru skráðir. Áttu miða? Skráðu þá til sölu.',

    // pagination
    'home.loadingMore': 'Sæki fleiri…',
    'home.loadMoreError': 'Náði ekki að sækja fleiri viðburði.',
  },
  en: {
    'home.title': 'The market',

    'home.summary.eventsOne': '{count} event',
    'home.summary.eventsMany': '{count} events',
    'home.summary.showingOne': 'Showing {count} event',
    'home.summary.showingMany': 'Showing {count} events',
    'home.summary.forSaleOne': '{count} ticket for sale',
    'home.summary.forSaleMany': '{count} tickets for sale',
    'home.summary.wanted': '{count} want to buy',

    'home.trending.title': 'Trending now',
    'home.trending.waitlist': 'on the waitlist',

    'home.filters.label': 'Categories',
    'home.search.label': 'Search the market',
    'home.search.placeholder': 'Search events or venues…',
    'home.search.clear': 'Clear search',

    'home.card.waitlist': 'Waitlist',
    'home.card.noWaitlist': 'Nobody on the waitlist',
    'home.card.wantUnit': 'want to buy',
    'home.card.forSaleWord': 'for sale',
    'home.card.soldWord': 'sold',
    'home.card.noListings': 'No tickets for sale',
    'home.card.faceValueWord': 'face value',
    'home.card.lastSold': 'last sold at {price}',
    'home.card.noSales': 'no sales recorded',
    'home.card.buy': 'Buy',
    'home.card.notify': 'Notify me',
    'home.card.haveTickets': 'I have tickets',

    'home.empty.category': 'No events in this category',
    'home.empty.categoryBody': 'Try another category or browse everything.',
    'home.empty.search': 'Nothing found for “{q}”',
    'home.empty.searchBody': 'Check the spelling or ask us to add the event.',
    'home.empty.requestEvent': 'Request an event',
    'home.empty.all': 'No events yet',
    'home.empty.allBody': 'Events show up here as soon as they are added. Got tickets? List them for sale.',

    'home.loadingMore': 'Loading more…',
    'home.loadMoreError': "Couldn't load more events.",
  },
} as { is: Record<string, string>; en: Record<string, string> };
