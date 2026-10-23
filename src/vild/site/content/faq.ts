/**
 * The questions people actually ask. One list, grouped; the home page shows
 * the six marked `home`, the FAQ page shows everything under group headings.
 */
export type FaqItem = { id: string; q: string; a: string; home?: boolean };
export type FaqGroup = { id: string; title: string; items: FaqItem[] };

export const FAQ_GROUPS: FaqGroup[] = [
  {
    id: 'appid',
    title: 'Appið',
    items: [
      {
        id: 'hvad-er-vild',
        q: 'Hvað er VILD?',
        a: 'VILD er app sem safnar inneign fyrir þig þegar þú borðar hjá samstarfsstöðum. Þú borgar fullt verð, hluti af upphæðinni kemur til baka sem inneign hjá sömu keðju og bíður þín næst. Ein VILD-króna er ein króna.',
        home: true,
      },
      {
        id: 'kostar-appid',
        q: 'Kostar appið eitthvað?',
        a: 'Nei. Appið er ókeypis og það er ekkert áskriftargjald. Veitingastaðirnir borga fyrir að vera með.',
        home: true,
      },
      {
        id: 'hvernig-saekja',
        q: 'Hvernig sæki ég appið?',
        a: 'Það kemur í App Store og Google Play. Þangað til er hægt að nota vefútgáfuna á vild.is/app í símanum.',
      },
      {
        id: 'synda-kortid',
        q: 'Hvernig sýni ég VILD-kortið við kassann?',
        a: 'Opnaðu Kort í appinu. Þar er QR-kóði sem starfsmaðurinn skannar, eða þú slærð inn símanúmerið þitt ef staðurinn er tengdur þannig. Inneignin skráist um leið og kaupin eru kláruð.',
      },
    ],
  },
  {
    id: 'inneignin',
    title: 'Inneignin',
    items: [
      {
        id: 'hvar-nota',
        q: 'Hvar get ég notað inneignina?',
        a: 'Hjá keðjunni sem gaf hana, á öllum hennar stöðum. Inneign frá Lúnu gildir hjá Lúnu á Laugavegi, Akureyri og hvar sem er annars staðar í keðjunni – en ekki hjá öðrum. Það er einmitt þess vegna sem staðirnir geta gefið svona mikið til baka.',
        home: true,
      },
      {
        id: 'gildir-lengi',
        q: 'Hvað gildir inneignin lengi?',
        a: 'Í 24 mánuði frá því hún var veitt. Appið lætur þig vita 30 dögum áður en inneign rennur út.',
        home: true,
      },
      {
        id: 'borga-med-inneign',
        q: 'Hvað gerist ef ég borga með inneign?',
        a: 'Inneignin dregst frá reikningnum og þú borgar afganginn eins og venjulega. Þú safnar hins vegar ekki nýrri inneign af þeim hluta sem var greiddur með inneign – bara af því sem þú borgar sjálft.',
        home: true,
      },
      {
        id: 'hvad-mikid',
        q: 'Hvað fæ ég mikið til baka?',
        a: 'Það fer eftir staðnum og vörunni. Hver staður velur sína prósentu og getur hækkað hana á einstökum réttum eða á ákveðnum tímum, til dæmis í hádeginu. Upphæðin stendur alltaf á vörunni í appinu, í krónum.',
      },
      {
        id: 'faera-inneign',
        q: 'Get ég fært inneign á annan eða fengið hana greidda út?',
        a: 'Nei. Inneignin er bundin við þig og keðjuna sem gaf hana. Hún er ekki peningar og er ekki greidd út í reiðufé.',
      },
      {
        id: 'hvenaer-kemur',
        q: 'Hvenær kemur inneignin inn?',
        a: 'Oftast um leið og kaupin eru kláruð á kassanum. Ef kassakerfið sendir færslur í bunkum getur það tekið nokkrar mínútur.',
      },
    ],
  },
  {
    id: 'rafraen-skilriki',
    title: 'Rafræn skilríki og gögn',
    items: [
      {
        id: 'tharf-skilriki',
        q: 'Þarf ég rafræn skilríki?',
        a: 'Já, til að stofna aðgang. Rafræn skilríki tryggja að hver manneskja á einn aðgang og að inneignin lendi hjá réttum eiganda. Eftir það skráirðu þig inn með símanúmeri og staðfestingarkóða.',
        home: true,
      },
      {
        id: 'kennitala',
        q: 'Hvað gerið þið við kennitöluna mína?',
        a: 'Við notum hana einu sinni, til að staðfesta hver þú ert og tengja aðganginn við þig. Hún fer aldrei á kassann, á kvittanir eða til veitingastaðanna. Þeir sjá bara innra númer og fornafn.',
      },
      {
        id: 'hvada-gogn',
        q: 'Hvaða gögn sjá veitingastaðirnir?',
        a: 'Hvað var keypt hjá þeim og hversu mikil inneign var veitt og nýtt. Ekki hvað þú keyptir annars staðar, ekki kennitölu, ekki netfang.',
      },
      {
        id: 'eyda-adgangi',
        q: 'Get ég eytt aðganginum?',
        a: 'Já, undir Ég í appinu. Þá fellur ónotuð inneign niður og persónuupplýsingum er eytt innan 30 daga.',
      },
    ],
  },
  {
    id: 'fyrir-veitingastadi',
    title: 'Fyrir veitingastaði',
    items: [
      {
        id: 'hver-borgar',
        q: 'Hver borgar inneignina?',
        a: 'Keðjan sem veitir hana. Inneignin er krafa gestsins á keðjuna um mat og drykk, ekki peningar. Hún kostar staðinn því bara hráefnið þegar hún er nýtt – ekki krónuna sem afsláttur kostar strax við kassann.',
      },
      {
        id: 'kassinn',
        q: 'Hvernig kemst inneignin á kassann?',
        a: 'Með tengingu við kassakerfið (Noona, Upsell, Resto, dk, LS Central, Straumur) eða með skönnun á VILD-kortinu við kassann. Flestir staðir eru komnir í gang innan viku.',
      },
      {
        id: 'gestur-borgar-med-inneign',
        q: 'Hvað ef gestur borgar með inneign?',
        a: 'Inneignin dregst frá reikningnum, gesturinn borgar afganginn. Ný inneign safnast aðeins af því sem gesturinn borgar sjálfur. Þú sérð hvort tveggja í uppgjörinu.',
      },
      {
        id: 'hvad-kostar-vild',
        q: 'Hvað kostar VILD?',
        a: 'Fast mánaðargjald á keðju og hlutfall af nýttri inneign. Ekkert stofngjald. Við sendum verðskrá þegar þú hefur samband.',
      },
    ],
  },
];

export const HOME_FAQ: FaqItem[] = FAQ_GROUPS.flatMap((g) => g.items).filter((i) => i.home);
export const MERCHANT_FAQ: FaqItem[] = FAQ_GROUPS.find((g) => g.id === 'fyrir-veitingastadi')!.items;
