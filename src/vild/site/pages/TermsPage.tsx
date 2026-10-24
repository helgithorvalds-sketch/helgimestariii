import { LegalPage, type LegalSection } from '../components/LegalPage';
import { usePageTitle } from '../components/usePageTitle';

const SECTIONS: LegalSection[] = [
  {
    id: 'um-skilmalana',
    title: 'Um skilmálana',
    body: [
      'Þessir skilmálar gilda um notkun á VILD-appinu og VILD-vefnum (saman „þjónustan“), sem Norðurvefur rekur („VILD“, „við“). Með því að stofna aðgang samþykkir þú skilmálana. Ef þú samþykkir þá ekki skaltu ekki nota þjónustuna.',
      'Inneign er veitt af hverri samstarfskeðju fyrir sig. Keðjan er skuldari inneignarinnar; VILD rekur kerfið sem heldur utan um hana. Sérskilmálar keðju, ef einhverjir eru, birtast á síðu hennar í appinu.',
    ],
  },
  {
    id: 'adgangur',
    title: 'Aðgangur og skilyrði',
    body: [
      'Til að stofna aðgang þarftu að vera 16 ára eða eldri og auðkenna þig með rafrænum skilríkjum. Hver einstaklingur má eiga einn aðgang. Aðgangurinn er persónulegur og má ekki lána, selja eða framselja.',
      'Þú berð ábyrgð á að síminn og aðgangurinn séu í þinni vörslu. Láttu okkur vita strax á hallo@vild.is ef þú heldur að einhver annar hafi aðgang að honum.',
      'Við getum lokað aðgangi sem er notaður í andstöðu við skilmálana, til dæmis til að safna inneign fyrir aðra eða með fölskum færslum. Ónotuð inneign fellur þá niður.',
    ],
  },
  {
    id: 'hvad-er-inneign',
    title: 'Hvað inneign er',
    body: [
      'Inneign er krafa þín á þá samstarfskeðju sem veitti hana, um mat, drykk eða aðra vöru keðjunnar að jafnvirði einnar krónu fyrir hverja VILD-krónu. Inneign er ekki peningar, ekki rafeyrir og ekki innstæða. Hún er ekki greidd út í reiðufé, ekki lögð inn á reikning og ekki endurgreidd.',
      'Inneign er bundin við þig og keðjuna sem veitti hana. Hún gildir á öllum stöðum keðjunnar en ekki hjá öðrum keðjum. Hún er óframseljanleg: hana má ekki færa á annan aðgang, gefa, selja eða skipta.',
      'Keðjan veitir inneign af kaupum sem þú borgar sjálf eða sjálfur. Ný inneign safnast ekki af þeim hluta reiknings sem er greiddur með inneign. Dæmi: reikningur er 4.000 kr., þú nýtir 1.000 kr. inneign og borgar 3.000 kr. Inneign reiknast af 3.000 kr.',
      'Hver keðja ákveður sjálf hversu mikil inneign er veitt, af hvaða vörum og hvenær, og má breyta því án fyrirvara. Upphæðin sem gildir þegar kaupin eiga sér stað birtist á vörunni í appinu.',
    ],
  },
  {
    id: 'gildistimi',
    title: 'Gildistími og niðurfelling',
    body: [
      'Inneign gildir í 24 mánuði frá þeim degi sem hún var veitt. Að þeim tíma liðnum fellur hún niður án frekari tilkynningar. Appið sýnir hvenær inneign rennur út og lætur þig vita 30 dögum áður.',
      'Þegar inneign er nýtt er elsta inneignin notuð fyrst.',
      'Ef vöru er skilað eða kaup bakfærð er inneign sem var veitt vegna kaupanna dregin til baka. Ef inneign sem þú nýttir við kaupin er endurgreidd kemur hún aftur inn á aðganginn, ekki í peningum.',
      'Hætti keðja samstarfi við VILD færðu tilkynningu í appinu og minnst 90 daga til að nýta inneignina hjá keðjunni. Eftir það fellur hún niður. Ef keðja verður ógjaldfær er inneign krafa á keðjuna og VILD ábyrgist hana ekki.',
    ],
  },
  {
    id: 'notkun',
    title: 'Notkun inneignar',
    body: [
      'Þú nýtir inneign með því að sýna VILD-kortið í appinu við kassann og biðja um að inneign sé notuð, eða með því að velja það sjálf eða sjálfur þar sem kassinn býður upp á það. Inneign er dregin frá reikningnum og afgangurinn greiddur með venjulegum hætti.',
      'Inneign er ekki hægt að nýta til að greiða þjórfé, gjafabréf eða vörur sem keðjan hefur undanskilið og merkt sem slíkar í appinu.',
      'Það getur tekið nokkrar mínútur fyrir inneign að birtast eftir kaup, eftir því hvernig kassakerfi keðjunnar sendir færslur. Vanti inneign sem þú átt rétt á, hafðu samband innan 30 daga frá kaupum með kvittun.',
    ],
  },
  {
    id: 'appid-og-thjonustan',
    title: 'Appið og þjónustan',
    body: [
      'Appið er ókeypis. Við gerum okkar besta til að hafa þjónustuna aðgengilega en ábyrgjumst ekki að hún sé alltaf í lagi. Við getum breytt, takmarkað eða hætt þjónustunni með þriggja mánaða fyrirvara; ónotuð inneign heldur gildistíma sínum hjá keðjunni í þann tíma.',
      'Við getum breytt skilmálunum. Breytingar sem skerða rétt þinn tilkynnum við í appinu með minnst 30 daga fyrirvara. Haldir þú áfram að nota þjónustuna eftir að breytingar taka gildi telst það samþykki.',
    ],
  },
  {
    id: 'abyrgd',
    title: 'Ábyrgð',
    body: [
      'VILD er milliliður um inneign. Kaupin sjálf, maturinn og þjónustan eru á ábyrgð keðjunnar og lúta hennar skilmálum og almennum neytendarétti. Kvartanir vegna vöru eða þjónustu beinast að keðjunni.',
      'VILD ber ekki ábyrgð á óbeinu tjóni eða tapi sem rekja má til þess að inneign var ekki aðgengileg tímabundið. Ábyrgð VILD gagnvart þér takmarkast við þá inneign sem sannanlega átti að vera á aðganginum.',
    ],
  },
  {
    id: 'uppsogn',
    title: 'Uppsögn',
    body: [
      'Þú getur eytt aðganginum hvenær sem er undir Ég í appinu. Ónotuð inneign fellur niður við eyðingu og verður ekki endurvakin. Persónuupplýsingum er eytt í samræmi við persónuverndarstefnu VILD.',
    ],
  },
  {
    id: 'log-og-samband',
    title: 'Lög og samband',
    body: [
      'Um skilmálana gilda íslensk lög. Ágreining má bera undir Neytendastofu eða Héraðsdóm Reykjavíkur.',
      'Spurningar um skilmálana: hallo@vild.is. Norðurvefur, Reykjavík.',
    ],
  },
];

export default function TermsPage() {
  usePageTitle('Skilmálar – VILD');
  return (
    <LegalPage
      eyebrow="Skilmálar"
      title="Skilmálar VILD"
      updated="23. október 2026"
      intro="Hvað inneign er, hvað hún er ekki, hversu lengi hún gildir og hvað þú og keðjurnar skuldbindið ykkur til. Skrifað á mannamáli. Fyrir útgáfu fer fram lögfræðileg yfirferð, og kennitala og heimilisfang Norðurvefs bætast við."
      sections={SECTIONS}
    />
  );
}
