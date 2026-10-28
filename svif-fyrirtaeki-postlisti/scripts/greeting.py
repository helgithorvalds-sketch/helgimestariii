"""Icelandic greeting for a contact: 'Sæll Jón,' / 'Sæl Anna,' / 'Góðan daginn,' when there is no person.
Gender comes from the patronymic (-son / -dóttir) when the full name has one, otherwise from a list of
common first names. Unknown stays polite and neutral."""
import re

MALE = set("""Aðalsteinn Agnar Albert Alexander Andri Andrés Ari Arnar Arnaldur Arngrímur Arnór Atli Axel Ágúst Árni Ársæll Ásgeir Ásmundur Baldur Baldvin Bárður Benedikt Bergur Bergþór Birgir Birkir Bjarki Bjarni Björgvin Björn Bragi Brynjar Brynjólfur Daníel Davíð Egill Einar Eiríkur Elías Elvar Emil Erlendur Erlingur Eyjólfur Eyþór Finnbogi Finnur Fjalar Friðrik Garðar Gauti Gestur Gísli Grétar Grímur Guðbjartur Guðjón Guðlaugur Guðmundur Guðni Gunnar Gunnlaugur Gylfi Hafsteinn Hafþór Halldór Hallgrímur Hannes Haraldur Haukur Hákon Heiðar Heimir Helgi Hermann Hilmar Hinrik Hjalti Hjálmar Hjörleifur Hjörtur Hlynur Hrafn Hrafnkell Hreinn Hróbjartur Hörður Höskuldur Ingi Ingimar Ingólfur Ingvar Ívar Jakob Jens Jóhann Jóhannes Jón Jónas Júlíus Karl Kári Ketill Kjartan Knútur Konráð Kristinn Kristján Kristófer Lárus Leifur Logi Loftur Lúðvík Magnús Markús Matthías Már Mikael Narfi Njáll Oddur Ólafur Óli Ómar Óskar Óttar Pálmi Páll Pétur Ragnar Reynir Richard Róbert Rúnar Rögnvaldur Sigfús Siggeir Sigmar Sigmundur Sigurbjörn Sigurður Sigurjón Sigurvin Sindri Skarphéðinn Skúli Snorri Snævar Stefán Steinar Steingrímur Steinn Steinþór Sturla Styrmir Svavar Sveinbjörn Sveinn Sverrir Sæmundur Sævar Teitur Theodór Tómas Tryggvi Unnar Valdimar Valgeir Valtýr Valur Vignir Viktor Vilhjálmur Vilhelm Vífill Þorbjörn Þorgeir Þorgrímur Þorkell Þorlákur Þorsteinn Þorvaldur Þórarinn Þórður Þórhallur Þórir Þórólfur Þráinn Þröstur Örn Örvar Össur Aron Daði Dagur Elmar Fannar Gabríel Hjörvar Kristinn Oddgeir Orri Patrekur Rafn Róbert Sigþór Smári Styrmir Svanur Tumi Viðar Ýmir Þengill Þorri""".split())

FEMALE = set("""Aðalheiður Agla Agnes Alda Alma Andrea Anna Arna Arndís Arnfríður Auður Ágústa Álfheiður Ása Ásdís Ásgerður Áslaug Ásta Ásthildur Berglind Bergljót Bergþóra Birna Birta Bjarney Björg Björk Bryndís Brynhildur Brynja Dagbjört Dagný Dagrún Díana Dóra Dröfn Edda Eir Elín Elínborg Elísabet Ella Elsa Elva Emilía Erla Erna Eva Eygló Eyrún Fanney Fjóla Freyja Friðrika Fríða Gerður Gréta Guðbjörg Guðfinna Guðlaug Guðný Guðrún Gunnhildur Halla Halldóra Hanna Harpa Heiða Heiðrún Helena Helga Herdís Hildur Hjördís Hólmfríður Hrafnhildur Hrefna Hrund Hugrún Hulda Inga Ingibjörg Ingunn Iðunn Íris Ísabella Jóhanna Jóna Jónína Karen Karítas Katla Katrín Klara Kolbrún Kristbjörg Kristín Kristjana Kristrún Lára Laufey Lilja Lind Linda Lovísa Lóa Magnea Margrét María Marta Matthildur Nanna Nína Oddný Ólöf Ragna Ragnheiður Ragnhildur Rakel Rannveig Rebekka Rósa Rut Rún Sara Selma Sesselja Sif Sigríður Sigrún Signý Sigurbjörg Sigurlaug Sigurveig Silja Sjöfn Snædís Sólrún Sólveig Steinunn Stella Sunna Svala Svandís Svanhildur Svava Sylvía Sæunn Tinna Telma Thelma Unnur Valdís Valgerður Vala Vigdís Vilborg Þorbjörg Þorgerður Þóra Þórdís Þórhildur Þórunn Þuríður Ýr Elísa Embla Erika Guðríður Hafdís Hekla Hera Hjálmfríður Kara Katrin Lena Lilý Mist Olga Salka Sandra Soffía Sóley Stefanía Sunneva Tara Unnur Védís""".split())

NEUTRAL_SUFFIX = ('bur',)

def gender(full_name):
    toks = [t for t in re.split(r'[\s\-]+', full_name.strip()) if t]
    if not toks: return ''
    for t in toks[1:]:
        tl = t.lower()
        if tl.endswith('son'): return 'm'
        if tl.endswith('dóttir') or tl.endswith('dottir'): return 'f'
        if tl.endswith(NEUTRAL_SUFFIX): return 'n'
    first = toks[0]
    if first in MALE: return 'm'
    if first in FEMALE: return 'f'
    return ''

def first_name(full_name):
    toks = [t for t in re.split(r'\s+', full_name.strip()) if t]
    return toks[0] if toks else ''

def greeting(full_name):
    fn = first_name(full_name)
    if not fn: return 'Góðan daginn,'
    g = gender(full_name)
    if g == 'm': return f'Sæll {fn},'
    if g == 'f': return f'Sæl {fn},'
    return f'Góðan daginn {fn},'

if __name__ == '__main__':
    import sys
    for n in sys.argv[1:]: print(repr(n), '->', greeting(n))
