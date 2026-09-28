/**
 * Terms of service (/skilmalar) and privacy policy (/personuvernd), Icelandic and English.
 * The Icelandic text governs. Written for the current product: a free meeting place,
 * no payments through Miðatorg, prices capped at face value, optional electronic ID.
 *
 * Before launch the operator block (OPERATOR) must be filled in: a marketplace has to
 * say who runs it (lög nr. 30/2002 um rafræn viðskipti, 7. gr.). Have a lawyer read both
 * texts once; they are a solid starting point, not legal advice.
 */
import type { Locale } from '../lib/i18n/locale';

export const LEGAL_VERSION = '1.0';
export const LEGAL_UPDATED = '2026-09-28';

/** Who runs Miðatorg. `null` fields render as clearly marked placeholders. */
export const OPERATOR: { name: string | null; kennitala: string | null; address: string | null; email: string | null } = {
  name: null,
  kennitala: null,
  address: null,
  email: null,
};

export type LegalBlock = { p: string } | { ul: string[] };
export type LegalSection = { id: string; heading: string; blocks: LegalBlock[] };
export type LegalDoc = { title: string; intro: string; sections: LegalSection[] };

function operatorLine(locale: Locale): string {
  const missing = locale === 'is' ? '[fyllist út]' : '[to be filled in]';
  const o = OPERATOR;
  return locale === 'is'
    ? `Rekstraraðili: ${o.name ?? missing}, kt. ${o.kennitala ?? missing}, ${o.address ?? missing}. Netfang: ${o.email ?? missing}.`
    : `Operator: ${o.name ?? missing}, reg. no. ${o.kennitala ?? missing}, ${o.address ?? missing}. E-mail: ${o.email ?? missing}.`;
}

// ---------------------------------------------------------------------------
// Terms
// ---------------------------------------------------------------------------
const TERMS_IS: LegalDoc = {
  title: 'Skilmálar Miðatorgs',
  intro:
    'Þessir skilmálar gilda um notkun á Miðatorgi, á vefnum og í appinu. Með því að stofna aðgang samþykkir þú þá. Lestu þá vel – sérstaklega kaflana um sölu, greiðslur og svik.',
  sections: [
    {
      id: 'um',
      heading: '1. Hvað er Miðatorg?',
      blocks: [
        { p: 'Miðatorg er markaðstorg þar sem einstaklingar bjóða miða á viðburði til sölu og kaupa miða hver af öðrum, á eða undir upprunalegu verði. Miðatorg tengir kaupendur og seljendur saman en er ekki aðili að viðskiptunum.' },
        { p: 'Miðatorg tekur ekki við greiðslum og geymir aldrei peninga. Kaupandi greiðir seljanda beint (til dæmis með Aur eða millifærslu) og seljandi afhendir miðann beint til kaupanda.' },
        { p: 'Upplýsingar um viðburði eru sóttar af tix.is. Miðatorg er sjálfstæð þjónusta og er hvorki á vegum tix.is né viðburðahaldara.' },
      ],
    },
    {
      id: 'adgangur',
      heading: '2. Aðgangur',
      blocks: [
        {
          ul: [
            'Þú þarft að vera 18 ára eða eldri til að kaupa eða selja miða.',
            'Hver einstaklingur má aðeins hafa einn aðgang. Upplýsingar sem þú gefur upp þurfa að vera réttar.',
            'Þú berð ábyrgð á öllu sem gert er í þínum aðgangi. Deildu aldrei lykilorði eða innskráningarkóða.',
            'Hægt er að staðfesta aðgang með netfangi, símanúmeri og rafrænum skilríkjum. Staðfesting með rafrænum skilríkjum tengir aðganginn við kennitölu þína; kennitalan er aldrei sýnd öðrum notendum.',
          ],
        },
      ],
    },
    {
      id: 'sala',
      heading: '3. Að selja miða',
      blocks: [
        {
          ul: [
            'Þú mátt aðeins selja miða sem þú átt og hefur rétt til að selja áfram.',
            'Verð má aldrei vera hærra en upprunalegt miðaverð. Kerfið hafnar hærra verði.',
            'Lýstu miðunum rétt: fjöldi, svæði, röð og sæti, og hvort þeir seljist aðeins saman.',
            'Seldu aldrei sama miðann oftar en einu sinni, hvorki hér né annars staðar. Taktu miða úr sölu um leið og þeir seljast annars staðar.',
            'Afhentu miðann með miðaflutningi hjá tix.is þegar það er hægt, svo kaupandinn fái sinn eigin gilda miða.',
            'Bannað er að selja falsaða, afritaða, útrunna eða ógilda miða, eða miða sem keyptir voru í þeim tilgangi að endurselja þá með hagnaði.',
            'Sumir viðburðahaldarar leyfa ekki framsal miða. Þú berð ábyrgð á að kynna þér skilmála miðasalans.',
          ],
        },
      ],
    },
    {
      id: 'kaup',
      heading: '4. Að kaupa miða',
      blocks: [
        {
          ul: [
            'Þegar þú ýtir á „Kaupa“ eru miðarnir teknir frá fyrir þig í takmarkaðan tíma. Á þeim tíma gangið þið seljandinn frá greiðslu í spjallinu.',
            'Greiddu aðeins með leiðum sem hægt er að rekja (Aur, millifærsla á reikning á nafni seljanda). Sendu aldrei gjafakort, rafmynt eða greiðslu til þriðja aðila.',
            'Staðfestu móttöku í appinu þegar þú hefur fengið miðann og athugað að hann sé gildur.',
            'Kaupin eru á milli þín og seljandans. Réttur til að falla frá samningi samkvæmt lögum um neytendasamninga gildir almennt ekki um kaup milli einstaklinga.',
          ],
        },
      ],
    },
    {
      id: 'svik',
      heading: '5. Öryggi, svik og lokanir',
      blocks: [
        { p: 'Svik eru lögbrot. Miðatorg vinnur gegn þeim með staðfestingu notenda, einkunnum, tilkynningum og lokunum.' },
        {
          ul: [
            'Bannað er: að blekkja aðra notendur, biðja um greiðslu utan viðskiptaherbergisins án þess að miði sé afhentur, villa á sér heimildir, áreita aðra eða nota Miðatorg til annars en miðaviðskipta.',
            'Tilkynntu grunsamlega hegðun með „Tilkynna“-hnappnum. Stjórnendur skoða allar tilkynningar.',
            'Miðatorg má fjarlægja auglýsingar, stöðva viðskipti og loka aðgangi, tímabundið eða varanlega, ef grunur leikur á broti á skilmálum.',
            'Verðir þú fyrir svikum skaltu kæra málið til lögreglu. Miðatorg afhendir lögreglu upplýsingar um aðganga, skilaboð og viðskipti þegar lög heimila eða krefjast þess.',
          ],
        },
      ],
    },
    {
      id: 'agreiningur',
      heading: '6. Ágreiningur milli notenda',
      blocks: [
        { p: 'Kaupandi og seljandi leysa ágreining fyrst sín á milli. Opni annar hvor aðilinn ágreining í viðskiptaherberginu skoða stjórnendur Miðatorgs málið og geta lokið eða fellt viðskiptin niður í kerfinu, en Miðatorg endurgreiðir ekki og ber ekki ábyrgð á greiðslum milli notenda.' },
      ],
    },
    {
      id: 'abyrgd',
      heading: '7. Ábyrgð',
      blocks: [
        {
          ul: [
            'Miðatorg ber ekki ábyrgð á miðum, greiðslum eða afhendingu milli notenda, né á því ef viðburði er aflýst, frestað eða breytt.',
            'Upplýsingar um viðburði geta verið rangar eða úreltar. Upplýsingar miðasalans gilda.',
            'Þjónustan er veitt eins og hún er. Miðatorg ábyrgist ekki að hún sé alltaf aðgengileg eða villulaus.',
            'Ábyrgð Miðatorgs er takmörkuð eins og lög frekast leyfa. Þessi takmörkun gildir ekki um tjón sem Miðatorg veldur af ásetningi eða stórfelldu gáleysi.',
          ],
        },
      ],
    },
    {
      id: 'gjold',
      heading: '8. Gjöld',
      blocks: [{ p: 'Miðatorg er ókeypis. Verði gjöld tekin upp fyrir einhverja þjónustu verður það tilkynnt með minnst 30 daga fyrirvara og þau gilda aðeins um það sem gert er eftir það.' }],
    },
    {
      id: 'breytingar',
      heading: '9. Breytingar, lög og varnarþing',
      blocks: [
        { p: 'Miðatorg getur breytt skilmálunum. Verulegar breytingar eru tilkynntar í appinu eða með tölvupósti áður en þær taka gildi. Um skilmálana gilda íslensk lög. Mál vegna þeirra skal reka fyrir Héraðsdómi Reykjavíkur, nema lög mæli fyrir um annað.' },
      ],
    },
    {
      id: 'samband',
      heading: '10. Hver rekur Miðatorg?',
      blocks: [{ p: '__OPERATOR__' }],
    },
  ],
};

const TERMS_EN: LegalDoc = {
  title: 'Miðatorg terms of service',
  intro:
    'These terms apply to Miðatorg on the web and in the app. By creating an account you accept them. The Icelandic version governs; this is a translation.',
  sections: [
    {
      id: 'um',
      heading: '1. What is Miðatorg?',
      blocks: [
        { p: 'Miðatorg is a marketplace where individuals offer event tickets for sale and buy tickets from each other, at or below face value. Miðatorg connects buyers and sellers but is not a party to their deals.' },
        { p: 'Miðatorg does not take payments and never holds money. The buyer pays the seller directly (for example with Aur or a bank transfer) and the seller hands the ticket to the buyer directly.' },
        { p: 'Event information comes from tix.is. Miðatorg is an independent service and is not run by tix.is or by event organisers.' },
      ],
    },
    {
      id: 'adgangur',
      heading: '2. Accounts',
      blocks: [
        {
          ul: [
            'You must be 18 or older to buy or sell tickets.',
            'One account per person. The information you give must be true.',
            'You are responsible for everything done with your account. Never share your password or sign-in code.',
            'Accounts can be verified with e-mail, phone number and Icelandic electronic ID. Electronic ID links the account to your national ID number (kennitala), which is never shown to other users.',
          ],
        },
      ],
    },
    {
      id: 'sala',
      heading: '3. Selling tickets',
      blocks: [
        {
          ul: [
            'Only sell tickets you own and are allowed to resell.',
            'The price may never exceed the original face value. The system rejects higher prices.',
            'Describe the tickets correctly: quantity, section, row and seat, and whether they are sold only together.',
            'Never sell the same ticket more than once, here or elsewhere. Take tickets off sale as soon as they sell elsewhere.',
            'Transfer the ticket through tix.is when possible so the buyer gets their own valid ticket.',
            'Selling fake, copied, expired or invalid tickets, or tickets bought in order to resell them at a profit, is forbidden.',
            'Some organisers do not allow tickets to be transferred. You are responsible for checking the ticket seller’s terms.',
          ],
        },
      ],
    },
    {
      id: 'kaup',
      heading: '4. Buying tickets',
      blocks: [
        {
          ul: [
            'When you tap “Buy”, the tickets are reserved for you for a limited time, during which you and the seller settle payment in the chat.',
            'Only pay in traceable ways (Aur, bank transfer to an account in the seller’s name). Never send gift cards, crypto or payment to a third party.',
            'Confirm receipt in the app once you have the ticket and have checked that it is valid.',
            'The purchase is between you and the seller. Statutory withdrawal rights for consumer contracts generally do not apply to deals between private individuals.',
          ],
        },
      ],
    },
    {
      id: 'svik',
      heading: '5. Safety, fraud and bans',
      blocks: [
        { p: 'Fraud is a crime. Miðatorg works against it with user verification, ratings, reports and bans.' },
        {
          ul: [
            'Forbidden: deceiving other users, asking for payment outside the deal room without handing over a ticket, impersonation, harassment, or using Miðatorg for anything other than ticket deals.',
            'Report suspicious behaviour with the “Report” button. Administrators review every report.',
            'Miðatorg may remove listings, stop deals and suspend or close accounts if a breach of these terms is suspected.',
            'If you are defrauded, report it to the police. Miðatorg gives the police account, message and deal information when the law allows or requires it.',
          ],
        },
      ],
    },
    {
      id: 'agreiningur',
      heading: '6. Disputes between users',
      blocks: [
        { p: 'Buyer and seller first try to resolve a dispute between themselves. If either opens a dispute in the deal room, Miðatorg’s administrators review it and may complete or cancel the deal in the system, but Miðatorg does not refund and is not responsible for payments between users.' },
      ],
    },
    {
      id: 'abyrgd',
      heading: '7. Liability',
      blocks: [
        {
          ul: [
            'Miðatorg is not responsible for tickets, payments or delivery between users, nor for events that are cancelled, postponed or changed.',
            'Event information may be wrong or out of date. The ticket seller’s information prevails.',
            'The service is provided as is. Miðatorg does not guarantee it is always available or error-free.',
            'Miðatorg’s liability is limited as far as the law allows. This does not apply to damage caused by Miðatorg intentionally or by gross negligence.',
          ],
        },
      ],
    },
    {
      id: 'gjold',
      heading: '8. Fees',
      blocks: [{ p: 'Miðatorg is free. If fees are introduced for any service, this will be announced at least 30 days in advance and they will only apply from then on.' }],
    },
    {
      id: 'breytingar',
      heading: '9. Changes, law and venue',
      blocks: [
        { p: 'Miðatorg may change these terms. Material changes are announced in the app or by e-mail before they take effect. Icelandic law applies. Disputes go to the District Court of Reykjavík unless the law provides otherwise.' },
      ],
    },
    {
      id: 'samband',
      heading: '10. Who runs Miðatorg?',
      blocks: [{ p: '__OPERATOR__' }],
    },
  ],
};

// ---------------------------------------------------------------------------
// Privacy
// ---------------------------------------------------------------------------
const PRIVACY_IS: LegalDoc = {
  title: 'Persónuverndarstefna',
  intro:
    'Hér kemur fram hvaða persónuupplýsingar Miðatorg vinnur, af hverju, hverjir sjá þær og hver réttindi þín eru, samkvæmt lögum nr. 90/2018 og almennu persónuverndarreglugerðinni (GDPR).',
  sections: [
    { id: 'abyrgdaradili', heading: '1. Ábyrgðaraðili', blocks: [{ p: '__OPERATOR__' }] },
    {
      id: 'upplysingar',
      heading: '2. Hvaða upplýsingar',
      blocks: [
        {
          ul: [
            'Aðgangur: netfang, lykilorð (geymt sem óafturkræft tætigildi), birtingarnafn, mynd og lýsing ef þú bætir þeim við.',
            'Staðfesting: símanúmer ef þú staðfestir það. Ef þú staðfestir með rafrænum skilríkjum: kennitala, fullt nafn og tími staðfestingar.',
            'Viðskipti: miðar sem þú býður, frátektir, viðskipti, skilaboð í viðskiptaherbergjum, myndir sem sanna miðakaup, einkunnir, tilkynningar og vaktanir.',
            'Tæknilegt: IP-tala og tími beiðna í netþjónaskrám, og smá geymsla í vafranum (innskráning, tungumál, kort eða listi).',
          ],
        },
      ],
    },
    {
      id: 'tilgangur',
      heading: '3. Tilgangur og heimild',
      blocks: [
        {
          ul: [
            'Að veita þjónustuna: aðgangur, auglýsingar, frátektir, spjall og tilkynningar (framkvæmd samnings, 6. gr. b-liður GDPR).',
            'Að verjast svikum og gæta öryggis: staðfesting notenda, einkunnir, rannsókn tilkynninga og lokanir (lögmætir hagsmunir, f-liður).',
            'Kennitala er aðeins unnin til að tryggja örugga persónugreiningu og koma í veg fyrir svik, sbr. 13. gr. laga nr. 90/2018. Hún er aldrei sýnd öðrum notendum.',
            'Að fara að lögum, til dæmis þegar lögregla óskar upplýsinga með lögmætum hætti (lagaskylda, c-liður).',
          ],
        },
      ],
    },
    {
      id: 'hverjir',
      heading: '4. Hverjir sjá upplýsingarnar',
      blocks: [
        {
          ul: [
            'Aðrir notendur sjá birtingarnafn, mynd, lýsingu, staðfestingarstig, einkunnir og miða sem þú býður til sölu.',
            'Mótaðili í viðskiptum sér skilaboðin ykkar og sönnun á miðakaupum.',
            'Stjórnendur Miðatorgs sjá það sem þarf til að rannsaka tilkynningar og ágreining.',
            'Vinnsluaðilar sem hýsa þjónustuna fyrir Miðatorg: Supabase (gagnagrunnur, innskráning og skrár, hýst á Írlandi innan EES), Lovable (hýsing vefsins), þjónusta rafrænna skilríkja (aðeins við staðfestingu), tölvupóstþjónusta (innskráningarpóstar), OpenStreetMap (kortaflísar) og Google Fonts (letur). Þeir fá aðeins það sem þarf til að veita sína þjónustu.',
            'Upplýsingar eru ekki seldar og ekki notaðar til auglýsinga.',
          ],
        },
      ],
    },
    {
      id: 'vardveisla',
      heading: '5. Varðveisla',
      blocks: [
        { p: 'Upplýsingar eru geymdar meðan aðgangur er virkur. Þegar aðgangi er eytt er persónuupplýsingum eytt eða þær gerðar ópersónugreinanlegar, en upplýsingar um viðskipti, skilaboð og tilkynningar má geyma í allt að tvö ár eftir síðustu viðskipti ef þær kunna að nýtast við rannsókn svika eða ágreinings.' },
      ],
    },
    {
      id: 'rettindi',
      heading: '6. Réttindi þín',
      blocks: [
        { p: 'Þú átt rétt á aðgangi að upplýsingunum um þig, leiðréttingu, eyðingu, takmörkun vinnslu, flutningi gagna og að andmæla vinnslu sem byggir á lögmætum hagsmunum. Sendu beiðni á netfangið hér að ofan. Þú getur einnig kvartað til Persónuverndar (personuvernd.is).' },
      ],
    },
    {
      id: 'vafrakokur',
      heading: '7. Vafrakökur og geymsla',
      blocks: [
        { p: 'Miðatorg notar engar auglýsinga- eða rakningarkökur. Vafrinn geymir aðeins það sem þarf: innskráninguna þína og stillingar eins og tungumál og hvort þú vilt kort eða lista.' },
      ],
    },
    {
      id: 'breytingar',
      heading: '8. Breytingar',
      blocks: [{ p: 'Stefnan getur breyst. Verulegar breytingar eru tilkynntar í appinu eða með tölvupósti.' }],
    },
  ],
};

const PRIVACY_EN: LegalDoc = {
  title: 'Privacy policy',
  intro:
    'What personal data Miðatorg processes, why, who sees it and what your rights are, under Icelandic Act no. 90/2018 and the GDPR. The Icelandic version governs.',
  sections: [
    { id: 'abyrgdaradili', heading: '1. Controller', blocks: [{ p: '__OPERATOR__' }] },
    {
      id: 'upplysingar',
      heading: '2. What data',
      blocks: [
        {
          ul: [
            'Account: e-mail, password (stored as a one-way hash), display name, and a picture and bio if you add them.',
            'Verification: phone number if you verify it. With electronic ID: national ID number (kennitala), full name and time of verification.',
            'Deals: tickets you offer, reservations, deals, deal-room messages, proof-of-purchase images, ratings, reports and alerts.',
            'Technical: IP address and request times in server logs, and a little browser storage (sign-in, language, map or list).',
          ],
        },
      ],
    },
    {
      id: 'tilgangur',
      heading: '3. Purpose and legal basis',
      blocks: [
        {
          ul: [
            'Providing the service: account, listings, reservations, chat and notifications (contract, GDPR art. 6(1)(b)).',
            'Preventing fraud and keeping users safe: verification, ratings, investigating reports and bans (legitimate interests, art. 6(1)(f)).',
            'The kennitala is processed only to ensure reliable identification and prevent fraud (art. 13 of Act 90/2018) and is never shown to other users.',
            'Complying with the law, e.g. lawful requests from the police (legal obligation, art. 6(1)(c)).',
          ],
        },
      ],
    },
    {
      id: 'hverjir',
      heading: '4. Who sees the data',
      blocks: [
        {
          ul: [
            'Other users see your display name, picture, bio, verification level, ratings and the tickets you offer.',
            'The other party to a deal sees your messages and proof of purchase.',
            'Miðatorg’s administrators see what they need to investigate reports and disputes.',
            'Processors hosting the service for Miðatorg: Supabase (database, sign-in and files, hosted in Ireland in the EEA), Lovable (web hosting), the electronic ID service (only when you verify), an e-mail service (sign-in e-mails), OpenStreetMap (map tiles) and Google Fonts (fonts). They only get what they need to provide their service.',
            'Data is never sold and never used for advertising.',
          ],
        },
      ],
    },
    {
      id: 'vardveisla',
      heading: '5. Retention',
      blocks: [
        { p: 'Data is kept while your account is active. When an account is deleted, personal data is deleted or anonymised, but deal, message and report records may be kept for up to two years after the last deal where they may be needed to investigate fraud or disputes.' },
      ],
    },
    {
      id: 'rettindi',
      heading: '6. Your rights',
      blocks: [
        { p: 'You may access, correct and delete your data, restrict processing, receive a copy, and object to processing based on legitimate interests. Send requests to the e-mail above. You can also complain to the Icelandic Data Protection Authority (personuvernd.is).' },
      ],
    },
    {
      id: 'vafrakokur',
      heading: '7. Cookies and storage',
      blocks: [
        { p: 'Miðatorg uses no advertising or tracking cookies. The browser only stores what is needed: your sign-in and settings such as language and map or list.' },
      ],
    },
    {
      id: 'breytingar',
      heading: '8. Changes',
      blocks: [{ p: 'This policy may change. Material changes are announced in the app or by e-mail.' }],
    },
  ],
};

function withOperator(doc: LegalDoc, locale: Locale): LegalDoc {
  return {
    ...doc,
    sections: doc.sections.map((s) => ({
      ...s,
      blocks: s.blocks.map((b) => ('p' in b && b.p === '__OPERATOR__' ? { p: operatorLine(locale) } : b)),
    })),
  };
}

export function termsDoc(locale: Locale): LegalDoc {
  return withOperator(locale === 'en' ? TERMS_EN : TERMS_IS, locale);
}

export function privacyDoc(locale: Locale): LegalDoc {
  return withOperator(locale === 'en' ? PRIVACY_EN : PRIVACY_IS, locale);
}
