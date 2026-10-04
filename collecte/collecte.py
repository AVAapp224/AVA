"""Collecte des actualités et algorithme de tri.

Lancement : python3 collecte.py  →  écrit ../donnees/actus.json
1. Récupère les flux officiels de tous les médias (sources.py).
2. Devine le thème et le pays de chaque article.
3. Regroupe les articles qui parlent du même sujet : plus il y a de médias différents, plus le sujet est populaire.
4. Fige « l'essentiel du jour » (accueil, thèmes, pays) une fois par jour, à partir de 6 h.
5. Met à jour le fil à chaque passage.
"""
import concurrent.futures as cf
import datetime as dt
import email.utils
import gzip
import hashlib
import html
import json
import math
import os
import re
import ssl
import time
import unicodedata
import urllib.request
import xml.etree.ElementTree as ET
from zoneinfo import ZoneInfo

from sources import SOURCES, MARCHES, SOCIETES

ICI = os.path.dirname(os.path.abspath(__file__))
DONNEES = os.path.join(ICI, '..', 'donnees')
ETAT = os.path.join(ICI, 'etat')
FUSEAU = ZoneInfo('America/Toronto')
HEURE_DU_JOUR = 6          # l'essentiel du jour est figé à partir de cette heure
FENETRE_H = 48             # on garde les articles des 48 dernières heures
UA = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      'Accept-Encoding': 'gzip'}
CTX = ssl.create_default_context()

THEMES = {
    'bourse': 'Bourse', 'sport': 'Sport', 'culture': 'Culture', 'environnement': 'Environnement',
    'politique': 'Politique', 'pop': 'Pop', 'voyage': 'Voyage', 'tech': 'Tech et sciences',
    'sante': 'Santé et bien-être', 'mode': 'Mode et design', 'gastronomie': 'Gastronomie', 'societe': 'Société',
}

# ---------------------------------------------------------------- mots-clés
MOTS = {
    'bourse': "bourse marches financiers cac wall street nasdaq dow jones actionnaires action actions inflation taux d'interet banque centrale bce fed reserve federale economie economique croissance pib recession entreprise entreprises benefice resultats chiffre d'affaires petrole baril opep dollar euro crypto bitcoin investisseurs droits de douane tarifs dette budget emploi stocks shares market markets economy inflation interest rates earnings oil investors tariffs trade gdp profit revenue",
    'sport': "football foot ligue 1 match matchs tennis rugby cyclisme tour de france jeux olympiques olympique nba nhl lnh hockey basket basketball formule 1 f1 roland-garros coupe du monde athletisme natation ski mercato sport sports championnat league goal coach entraineur selectionneur psg canadiens marathon golf boxe voile regate surf escalade judo handball volley medaille champion championne",
    'culture': "exposition musee livre livres roman romanciere romancier ecrivain ecrivaine theatre opera peinture peintre patrimoine litterature goncourt danse ballet sculpture galerie bibliotheque poesie philosophie architecture photographe photographie museum novel author exhibition gallery painter poet",
    'pop': "film films cinema serie series netflix disney star stars chanteur chanteuse rappeur rappeuse album clip acteur actrice oscars cesar festival box-office streaming tiktok influenceur influenceuse people celebrity singer movie movies tv show rapper hollywood concert tournee taylor swift beyonce spotify grammy emmy musique",
    'environnement': "climat climatique rechauffement biodiversite pollution ecologie ecologique environnement co2 carbone emissions renouvelable eolien eoliennes solaire secheresse canicule inondation inondations ouragan glacier glaciers ocean oceans cop deforestation espece especes faune flore planete climate warming emissions wildfire wildfires species planet drought flood floods hurricane renewable",
    'politique': "gouvernement ministre ministres president presidente elysee assemblee senat depute deputes deputee election elections electoral vote parti macron parlement loi reforme opposition trump congres congress senate parliament minister campaign carney poilievre legault ottawa conservateurs liberaux democrates republicains diplomatie sommet sanctions referendum coalition",
    'voyage': "voyage voyages tourisme touriste touristes vacances destination destinations aeroport compagnie aerienne vols hotel hotels croisiere travel tourism tourist airline flights holiday resort",
    'tech': "intelligence artificielle ia openai chatgpt google apple microsoft meta smartphone iphone startup start-up technologie numerique cyberattaque robot robots espace nasa fusee satellite science scientifique scientifiques decouverte chercheurs chercheuse etude quantique semi-conducteurs puce artificial intelligence researchers study space rocket quantum chip software scientists",
    'sante': "sante hopital hopitaux medecin medecins maladie maladies virus epidemie pandemie vaccin vaccination cancer sommeil sante mentale covid ebola grippe patients soins medicament medicaments alzheimer diabete health hospital disease vaccine mental health doctors nurses outbreak drug",
    'mode': "mode defile defiles fashion week couturier couturiere haute couture chanel dior vuitton hermes design designer beaute createur creatrice runway fashion ",
    'gastronomie': "restaurant restaurants cuisinier cuisiniere cuisine recette recettes gastronomie gastronomique vin vins michelin boulangerie patisserie fromage food recipe recipes dining wine cooking chef's",
    'societe': "education ecole ecoles enseignant enseignants eleves universite universites etudiants logement loyer loyers travail emploi chomage salaire salaires greve justice proces tribunal police egalite femmes jeunes jeunesse retraite retraites immigration migrants famille familles pauvrete society school schools housing workers strike court trial police students rent poverty",
}
PAYS_MOTS = {
    'france': "france francais francaise francaises paris marseille lyon toulouse bordeaux lille nantes macron elysee matignon assemblee nationale bayrou",
    'quebec': "quebec quebecois quebecoise quebecoises montreal laval gatineau sherbrooke trois-rivieres saguenay legault canada canadien canadienne canadiens ottawa toronto vancouver carney",
}
VIDES = set("""le la les un une des de du d l au aux et ou en dans sur sous par pour pas plus moins que qui quoi dont ce cet cette ces son sa ses leur leurs nos notre vos votre il elle ils elles on nous vous je tu se s y a est sont ete etre avoir fait faire apres avant entre contre vers chez comme mais donc car si ne n qu c j m t tout tous toute toutes tres aussi encore deja ans an jour jours heure heures selon face fin depuis lors quand alors bien peu sans avec
the a an of to in on for and or is are was were be been by with at from as that this these those it its into over after before about new says said say will would could can may more most than up out not no his her their our your they we you he she them who what why how when where which one two three year years day days week""".split())

def sans_accents(t):
    return ''.join(c for c in unicodedata.normalize('NFD', t) if unicodedata.category(c) != 'Mn')

def norm(t):
    return sans_accents(t.lower())

GARDER = {'ia', 'f1', 'ue'}

def compiler(table):
    out = {}
    for k, mots in table.items():
        motifs = sorted({m for m in mots.split() if (len(m) >= 3 and m not in VIDES) or m in GARDER}, key=len, reverse=True)
        out[k] = re.compile(r'\b(' + '|'.join(re.escape(m) for m in motifs) + r')\b')
    return out

RE_THEMES = compiler(MOTS)
RE_PAYS = compiler(PAYS_MOTS)

# ---------------------------------------------------------------- travail en parallèle, avec délai maximal
import queue
import threading

class Parallele:
    """Comme un groupe de travailleurs, mais qui rend la main après un délai : un site muet ne fige jamais la collecte.
    Les tâches non terminées à temps donnent None."""
    def __init__(self, n=24, delai=90):
        self.n, self.delai = n, delai

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def map(self, fn, elements):
        elements = list(elements)
        resultats = [None] * len(elements)
        if not elements:
            return resultats
        file = queue.Queue()
        for i, e in enumerate(elements):
            file.put((i, e))
        restants, verrou, fini = [len(elements)], threading.Lock(), threading.Event()
        def travailler():
            while True:
                try:
                    i, e = file.get_nowait()
                except queue.Empty:
                    return
                try:
                    resultats[i] = fn(e)
                except Exception:
                    resultats[i] = None
                with verrou:
                    restants[0] -= 1
                    if restants[0] == 0:
                        fini.set()
        for _ in range(min(self.n, len(elements))):
            threading.Thread(target=travailler, daemon=True).start()
        fini.wait(self.delai)
        return resultats

# ---------------------------------------------------------------- lecture des flux
def lire_borne(r, max_octets, limite):
    """Lit une réponse morceau par morceau, en s'arrêtant à une taille et à une heure limites."""
    morceaux, total = [], 0
    while total < max_octets:
        if time.time() > limite:
            raise TimeoutError('trop lent')
        m = r.read(min(65536, max_octets - total))
        if not m:
            break
        morceaux.append(m)
        total += len(m)
    return b''.join(morceaux)

def telecharger(url, delai=20, max_octets=8_000_000, entetes=None):
    req = urllib.request.Request(url, headers=entetes or UA)
    limite = time.time() + delai
    with urllib.request.urlopen(req, timeout=min(delai, 10), context=CTX) as r:
        data = lire_borne(r, max_octets, limite)
        if r.headers.get('Content-Encoding') == 'gzip' or data[:2] == b'\x1f\x8b':
            try:
                data = gzip.decompress(data)
            except Exception:
                pass   # compression incomplète : on garde les données telles quelles
        return data

def texte(el):
    return (el.text or '').strip() if el is not None else ''

def nettoyer(t, n=None):
    t = html.unescape(re.sub(r'<[^>]+>', ' ', t or ''))
    t = re.sub(r'\s+', ' ', t).strip()
    if n and len(t) > n:
        t = t[:n].rsplit(' ', 1)[0] + '…'
    return t

def lire_date(s):
    s = (s or '').strip()
    if not s:
        return None
    try:
        d = email.utils.parsedate_to_datetime(s)
    except Exception:
        try:
            d = dt.datetime.fromisoformat(s.replace('Z', '+00:00'))
        except Exception:
            return None
    if d.tzinfo is None:
        d = d.replace(tzinfo=dt.timezone.utc)
    return d.astimezone(dt.timezone.utc)

def image_de(item, brut):
    for el in item.iter():
        tag = el.tag.split('}')[-1]
        if tag in ('content', 'thumbnail') and el.get('url') and ('image' in (el.get('type') or 'image') or el.get('medium') == 'image'):
            return el.get('url')
        if tag == 'enclosure' and el.get('url') and (el.get('type') or '').startswith('image'):
            return el.get('url')
    m = re.search(r'<img[^>]+src=["\']([^"\']+)', brut)
    return m.group(1) if m else None

def analyser(data):
    """Renvoie une liste de dicts (titre, lien, resume, date, image). Tolère les flux un peu cassés."""
    try:
        racine = ET.fromstring(data)
        items = racine.findall('.//item') or racine.findall('.//{http://www.w3.org/2005/Atom}entry') or racine.findall('.//{http://purl.org/rss/1.0/}item')
        res = []
        for it in items:
            def f(*noms):
                for n in noms:
                    for el in it:
                        if el.tag.split('}')[-1] == n:
                            return el
                return None
            lien_el = f('link')
            lien = texte(lien_el) or (lien_el.get('href') if lien_el is not None else '')
            desc_el = f('description', 'summary', 'encoded', 'content')
            brut = ET.tostring(it, encoding='unicode')
            res.append(dict(titre=nettoyer(texte(f('title'))), lien=lien.strip(),
                            resume=nettoyer(texte(desc_el), 240),
                            date=lire_date(texte(f('pubDate', 'published', 'updated', 'date'))),
                            image=image_de(it, html.unescape(texte(desc_el)) + brut)))
        return res
    except ET.ParseError:
        # flux mal formé : lecture tolérante par expressions régulières
        t = data.decode('utf-8', 'ignore')
        res = []
        for bloc in re.findall(r'<item[\s>].*?</item>', t, flags=re.S):
            g = lambda tag: (re.search(rf'<{tag}[^>]*>(.*?)</{tag}>', bloc, flags=re.S) or [None, ''])[1]
            cd = lambda s: re.sub(r'<!\[CDATA\[(.*?)\]\]>', r'\1', s, flags=re.S)
            img = re.search(r'(?:media:content|media:thumbnail|enclosure)[^>]+url=["\']([^"\']+)', bloc) or re.search(r'<img[^>]+src=["\']([^"\']+)', html.unescape(bloc))
            res.append(dict(titre=nettoyer(cd(g('title'))), lien=cd(g('link')).strip(), resume=nettoyer(cd(g('description')), 240),
                            date=lire_date(cd(g('pubDate'))), image=img.group(1) if img else None))
        return res

def date_dans_lien(lien):
    """Certains médias (Le Parisien) ne datent pas leurs flux, mais la date est dans l'adresse de l'article."""
    m = re.search(r'(\d{2})-(\d{2})-(20\d{2})', lien) or re.search(r'(20\d{2})[/-](\d{2})[/-](\d{2})', lien)
    if not m:
        return None
    a, b, c = m.groups()
    j, mo, an = (a, b, c) if len(c) == 4 else (c, b, a)
    try:
        d = dt.datetime(int(an), int(mo), int(j), 12, tzinfo=FUSEAU).astimezone(dt.timezone.utc)
        return min(d, dt.datetime.now(dt.timezone.utc))
    except ValueError:
        return None

def recuperer_tout():
    taches = [(sid, nom, pays, langue, url, theme) for sid, nom, pays, langue, flux in SOURCES for url, theme in flux]
    articles, etats = {}, {}
    def un(t):
        sid, nom, pays, langue, url, theme = t
        try:
            return t, analyser(telecharger(url)), None
        except Exception as e:
            return t, [], str(e)[:80]
    maintenant = dt.datetime.now(dt.timezone.utc)
    with Parallele(24) as ex:
        for res in ex.map(un, taches):
            if res is None:
                continue
            (sid, nom, pays, langue, url, theme), items, err = res
            etats.setdefault(nom, {'ok': 0, 'erreurs': 0})
            etats[nom]['erreurs' if err else 'ok'] += 1
            for it in items:
                if not it['titre'] or not it['lien'].startswith('http'):
                    continue
                d = it['date'] or date_dans_lien(it['lien'])
                if d is None:   # sans date fiable, on ne peut pas savoir si c'est récent : on ignore
                    continue
                if d > maintenant + dt.timedelta(hours=1) or (maintenant - d).total_seconds() > FENETRE_H * 3600:
                    continue
                cle = re.sub(r'[?#].*$', '', it['lien']).rstrip('/')
                a = articles.get(cle)
                if a is None:
                    articles[cle] = a = dict(id=hashlib.md5(cle.encode()).hexdigest()[:10], titre=it['titre'], lien=it['lien'], resume=it['resume'],
                                             date=d, image=it['image'], source=nom, source_id=sid, pays_source=pays,
                                             langue=langue, indices=set())
                if theme:
                    a['indices'].add(theme)
                if not a['image'] and it['image']:
                    a['image'] = it['image']
    return list(articles.values()), etats

# ---------------------------------------------------------------- classement
def classer(a):
    t, r = norm(a['titre']), norm(a['resume'])
    scores = {}
    for th, rx in RE_THEMES.items():
        s = 2 * len(rx.findall(t)) + len(rx.findall(r))
        if th in a['indices']:
            s += 6
        if s:
            scores[th] = s
    a['theme'] = max(scores, key=scores.get) if scores and max(scores.values()) >= 3 else None
    a['themes'] = sorted(k for k, v in scores.items() if v >= 3 or k in a['indices'])
    pays = set()
    for p, rx in RE_PAYS.items():
        if rx.search(t) or len(rx.findall(r)) >= 2:
            pays.add(p)
    a['pays'] = sorted(pays)

# Mêmes mots en anglais et en français, pour reconnaître un même sujet dans les deux langues
ALIAS = dict(p.split('=') for p in """spain=espagne germany=allemagne britain=royaume-uni british=royaume-uni china=chine chinese=chine russia=russie russian=russie
ukrainian=ukraine israeli=israel brazil=bresil brazilian=bresil mexico=mexique japan=japon japanese=japon india=inde indian=inde korea=coree korean=coree
lebanon=liban syria=syrie turkey=turquie greece=grece greek=grece italy=italie italian=italie poland=pologne netherlands=pays-bas belgium=belgique
switzerland=suisse london=londres moscow=moscou beijing=pekin brussels=bruxelles geneva=geneve nato=otan european=europe europe=europe
quebec=quebec iranian=iran american=etats-unis americans=etats-unis housing=logement protest=manifestation protests=manifestation protesters=manifestation
manifestent=manifestation manifestants=manifestation manifestations=manifestation election=election elections=election vote=vote votes=vote
earthquake=seisme hurricane=ouragan wildfire=incendie wildfires=incendie fire=incendie flood=inondation floods=inondation flooding=inondation
inondations=inondation strike=greve strikes=greve attack=attaque attacks=attaque attaques=attaque execution=execution resigns=demission resigning=demission
resign=demission demissionne=demission prison=prison prisons=prison killed=morts dead=morts deaths=morts died=morts tues=morts missile=missile missiles=missile
drone=drone drones=drone ceasefire=cessez-le-feu talks=negociations negotiations=negociations tariffs=droits-douane tariff=droits-douane
terrorist=terroriste terrorism=terroriste pilot=pilote copilot=copilote co-pilot=copilote flight=vol""".split())

MAJ = re.compile(r"\b([A-ZÀ-Ý][\w'’\-]{2,})")
def jetons(a):
    titre = a['titre']
    noms = set()
    for i, m in enumerate(MAJ.finditer(titre)):
        mot = norm(m.group(1)).strip("'’-")
        if m.start() == 0 or mot in VIDES:
            continue
        noms.add(ALIAS.get(mot, mot))
    mots = {ALIAS.get(w, w) for w in re.findall(r"[a-z0-9\-]{4,}", norm(titre + ' ' + a['resume'][:120])) if w not in VIDES}
    return mots | noms, noms

def empreinte(titre):
    """Les mots importants d'un titre, pour repérer deux titres qui disent la même chose."""
    return {ALIAS.get(w, w) for w in re.findall(r"[a-z0-9\-]{4,}", norm(titre)) if w not in VIDES}

def meme_sujet(e1, e2):
    if not e1 or not e2:
        return False
    commun = len(e1 & e2)
    return commun >= 3 and commun / min(len(e1), len(e2)) >= 0.5

# ------------------------------------------------------------------ mots en gras dans les titres
NOMS_PROPRES = set()   # mots vus avec une majuscule au milieu d'un titre : de vrais noms propres
MINUSCULES = set()     # mots vus en minuscules : des mots courants, même s'ils commencent parfois une phrase

def style_titre(titre):
    """Vrai si le titre met une majuscule à presque chaque mot (habitude anglaise) : les majuscules n'y disent rien."""
    mots = [m for m in re.findall(r"[A-Za-zÀ-ÿ][\w'’\-]*", titre) if len(m) > 3]
    return len(mots) >= 4 and sum(m[0].isupper() for m in mots) / len(mots) > 0.6

def apprendre_noms(articles):
    for a in articles:
        if style_titre(a['titre']):
            continue
        for m in MAJ.finditer(a['titre']):
            avant = a['titre'][:m.start()].rstrip()
            # une majuscule après « : », un guillemet ou un point n'est qu'un début de phrase
            if m.start() > 0 and avant[-1:] not in (':', '.', '«', '"', '“', '!', '?', '|', '-', '–', '—'):
                NOMS_PROPRES.add(norm(m.group(1)).strip("'’-"))
        MINUSCULES.update(norm(w) for w in re.findall(r"\b[a-zà-ÿ][\w\-]{2,}", a['titre']))
    NOMS_PROPRES.difference_update(VIDES)

COURANTS = set("""january february march april may june july august september october november december monday tuesday wednesday thursday friday saturday sunday
janvier fevrier mars avril mai juin juillet aout septembre octobre novembre decembre lundi mardi mercredi jeudi vendredi samedi dimanche inside exclusive le la les un une des l d en au aux du de pour par avec sans sur dans ce cette ces son sa ses leur apres avant quand comment pourquoi qui que quoi
the a an how why what who when after before in on at for with""".split())
def gras(titre):
    """Choisit 1 ou 2 groupes de mots à mettre en gras : noms propres et chiffres marquants."""
    # on ignore les étiquettes de rubrique en tête de titre : « EN IMAGES. », « EN DIRECT - », « Décoration. »
    debut = re.match(r"^\s*(?:[A-ZÀ-Ý0-9' ]{3,}|[A-ZÀ-Ý][\w\-]+)\s*[.:\-–|]\s+", titre)
    decalage = debut.end() if debut and (debut.group(0).strip()[:-1].isupper() or debut.group(0).rstrip()[-1] == '.') else 0
    original, titre = titre, titre[decalage:]
    majuscules_partout = style_titre(titre)
    candidats = []
    for m in re.finditer(r"(?:[A-ZÀ-Ý][\w’'\-]+)(?:\s+(?:(?:de|du|des|la|le|van|von|bin|al|di|da)\s+)?[A-ZÀ-Ý][\w’'\-]+)*", titre):
        mots = m.group(0).split()
        if len(mots) > 1 and m.group(0).isupper():   # mots tout en majuscules : une étiquette, pas un nom
            continue
        if majuscules_partout:   # titre à l'anglaise : on ne garde que les noms propres connus
            mots = [w for w in mots if norm(w.strip("'’")) in NOMS_PROPRES and norm(w.strip("'’")) not in MINUSCULES]
            if not mots:
                continue
        while len(mots) > 1 and norm(mots[0]) in COURANTS | VIDES:   # « Au Brésil » → « Brésil »
            mots = mots[1:]
        g = ' '.join(mots)
        premier = norm(mots[0].strip("'’"))
        if len(mots) == 1:
            suite = titre[m.end():m.end() + 2].strip()
            # un mot seul en début de titre suivi d'une minuscule n'est qu'une majuscule de début de phrase
            if m.start() == 0 and suite[:1].islower() and (premier not in NOMS_PROPRES or premier in MINUSCULES):
                continue
            if premier in COURANTS or premier in VIDES or len(g) < 3:
                continue
        candidats.append(g)
    for m in re.finditer(r"[«“\"]\s?([^»”\"]{3,40}?)\s?[»”\"]", titre):   # une courte citation entre guillemets
        if len(m.group(1).split()) <= 4:
            candidats.append(m.group(1))
    for m in re.finditer(r"\d[\d\s.,]*\s?(?:%|morts|victimes|millions?|milliards?|ans|€|\$|dead|million|billion|years)", titre):
        candidats.append(m.group(0).strip())
    uniques = []
    for c in sorted(candidats, key=lambda c: (-len(c.split()), -len(c))):
        if c != titre and c != original and not any(c in u for u in uniques):
            uniques.append(c)
    return uniques[:2]

def regrouper(articles):
    """Regroupe les articles qui parlent du même sujet (algorithme glouton, sans effet de chaîne)."""
    groupes, index = [], {}
    for a in sorted(articles, key=lambda x: x['date'], reverse=True):
        mots, noms = jetons(a)
        a['_mots'], a['_noms'] = mots, noms
        candidats = {}
        for w in mots:
            for g in index.get(w, ()):
                candidats[g] = candidats.get(g, 0) + 1
        meilleur, score_meilleur = None, 0
        for gi, communs in candidats.items():
            if communs < 2:
                continue
            g = groupes[gi]
            if abs((g['date'] - a['date']).total_seconds()) > 36 * 3600:
                continue
            inter = mots & g['mots']
            chevauchement = len(inter) / max(1, min(len(mots), len(g['mots'])))
            noms_communs = len(noms & g['noms'])
            ok = (len(inter) >= 3 and chevauchement >= 0.45) or (noms_communs >= 2 and chevauchement >= 0.3)
            if ok and chevauchement > score_meilleur:
                meilleur, score_meilleur = gi, chevauchement
        if meilleur is None:
            groupes.append(dict(articles=[a], mots=set(mots), noms=set(noms), date=a['date']))
            gi = len(groupes) - 1
        else:
            gi = meilleur
            groupes[gi]['articles'].append(a)
        for w in mots:
            index.setdefault(w, set()).add(gi)
    maintenant = dt.datetime.now(dt.timezone.utc)
    for g in groupes:
        arts = g['articles']
        sources = {x['source'] for x in arts}
        pays = {x['pays_source'] for x in arts}
        recent = max(x['date'] for x in arts)
        age = (maintenant - recent).total_seconds() / 3600
        g['nb_sources'] = len(sources)
        g['score'] = (len(sources) + 0.5 * (len(pays) - 1)) * math.exp(-age / 20)
        # thème du sujet : d'abord les rubriques des journaux, puis les mots-clés s'ils sont nets
        rubriques, mots_cles = {}, {}
        for x in arts:
            for h in x['indices']:
                rubriques[h] = rubriques.get(h, 0) + 1
            if x['theme']:
                mots_cles[x['theme']] = mots_cles.get(x['theme'], 0) + 1
        g['rubriques'] = set(rubriques)
        poids = {t: 2 * rubriques.get(t, 0) + mots_cles.get(t, 0) for t in set(rubriques) | set(mots_cles)}
        gagnant = max(poids, key=poids.get) if poids else None
        g['theme'] = gagnant if gagnant and (poids[gagnant] >= 0.5 * len(arts) or len(arts) <= 2) else None
        g['pays'] = sorted({p for x in arts for p in x['pays']})
        for x in arts:
            x['_groupe'] = g
    return groupes

# ---------------------------------------------------------------- mise en forme pour le site
def iso(d):
    return d.astimezone(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

def representant(g):
    arts = g['articles']
    return sorted(arts, key=lambda x: (x['langue'] == 'fr', bool(x['image']), len(x['resume']), x['date']), reverse=True)[0]

def sujet(g):
    r = representant(g)
    vus, sources = set(), []
    for x in sorted(g['articles'], key=lambda x: (x is not r, x['langue'] != 'fr')):
        if x['source'] not in vus:
            vus.add(x['source'])
            sources.append({'nom': x['source'], 'lien': x['lien'], 'titre': x['titre']})
    images = list(dict.fromkeys([r['image']] + [x['image'] for x in g['articles'] if x['image']]))
    images = [i for i in images if i][:6]
    return dict(id=r['id'], titre=r['titre'], resume=r['resume'], image=images[0] if images else None, images=images, gras=gras(r['titre']),
                lien=r['lien'], source=r['source'], date=iso(max(x['date'] for x in g['articles'])),
                theme=g['theme'], rubrique=THEMES.get(g['theme'], 'Monde' if len({x['pays_source'] for x in g['articles']}) > 2 else 'Actualité'), pays=g['pays'], sources=sources[:8])

def carte(a):
    g = a.get('_groupe')
    autres = []
    if g:
        vus = {a['source']}
        for x in g['articles']:
            if x['source'] not in vus:
                vus.add(x['source'])
                autres.append({'nom': x['source'], 'lien': x['lien'], 'titre': x['titre']})
    images = list(dict.fromkeys([a['image']] + ([x['image'] for x in g['articles'] if x['image']] if g else [])))
    images = [i for i in images if i][:4]
    return dict(id=a['id'], titre=a['titre'], resume=a['resume'], image=images[0] if images else None, images=images, gras=gras(a['titre']),
                lien=a['lien'], source=a['source'], date=iso(a['date']), theme=a['theme'], rubrique=THEMES.get(a['theme'], 'Actualité'), pays=a['pays'],
                langue=a['langue'], autres=autres[:6])

def sans_doublon(groupes):
    out, empreintes = [], []
    for g in groupes:
        e = set().union(*(empreinte(x['titre']) for x in g['articles'][:3]))
        if any(meme_sujet(empreinte(representant(g)['titre']), f) or len(e & f) >= 4 for f in empreintes):
            continue
        empreintes.append(e)
        out.append(g)
    return out

def top_sujets(groupes, filtre, n=8):
    choisis = [g for g in groupes if filtre(g)]
    choisis.sort(key=lambda g: g['score'], reverse=True)
    choisis = sans_doublon(choisis[:60])
    out = [g for g in choisis if g['nb_sources'] >= 2][:n]
    if len(out) < n:  # complète avec des sujets récents d'un seul média, avec photo
        reste = [g for g in choisis if g not in out and representant(g)['image']]
        out += reste[: n - len(out)]
    return [sujet(g) for g in out]

def fil(articles, filtre, n, deja=()):
    """Le fil : un seul article par sujet, et rien de ce qui est déjà dans l'essentiel de la page."""
    deja = list(deja)
    liens_deja = {l for x in deja for l in [x.get('lien')] + [s['lien'] for s in x.get('sources', [])]}
    empreintes = [empreinte(x['titre']) for x in deja] + [empreinte(s.get('titre', '')) for x in deja for s in x.get('sources', [])]
    vus, out = set(), []
    for a in sorted(articles, key=lambda x: x['date'], reverse=True):
        if not filtre(a) or a['lien'] in liens_deja:
            continue
        g = id(a.get('_groupe'))
        if g in vus:
            continue
        e = empreinte(a['titre'])
        if any(meme_sujet(e, f) for f in empreintes):
            continue
        vus.add(g)
        empreintes.append(e)
        out.append(a)
    # les articles avec photo d'abord dans chaque tranche d'une heure, pour un fil plus visuel
    out.sort(key=lambda x: (x['date'].replace(minute=0, second=0, microsecond=0), bool(x['image'])), reverse=True)
    return [carte(a) for a in out[:n]]

# ---------------------------------------------------------------- images manquantes
def og_image(url):
    try:
        t = telecharger(url, 8, 400_000, {'User-Agent': UA['User-Agent']}).decode('utf-8', 'ignore')
        m = re.search(r'<meta[^>]+(?:property|name)=["\'](?:og:image|twitter:image)["\'][^>]+content=["\']([^"\']+)', t) or \
            re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\'](?:og:image|twitter:image)', t)
        return html.unescape(m.group(1)) if m else None
    except Exception:
        return None

def image_affichable(url):
    """Vérifie qu'une photo existe et qu'un autre site a le droit de l'afficher."""
    try:
        req = urllib.request.Request(url, headers={'User-Agent': UA['User-Agent'], 'Range': 'bytes=0-2047'})
        with urllib.request.urlopen(req, timeout=6, context=CTX) as r:
            type_ = r.headers.get('Content-Type', '')
            corp = (r.headers.get('Cross-Origin-Resource-Policy') or '').lower()
            return type_.startswith('image') and corp not in ('same-origin', 'same-site')
    except Exception:
        return False

NOTER = os.path.join(ICI, 'photos', 'noter')   # outil macOS : visages et note esthétique

def attrait(n):
    """Plus c'est haut, plus la photo donne envie. Un gros plan sur un visage est fortement pénalisé."""
    if not n:
        return 0.0
    s = n.get('beaute', 0)
    s -= 12 * max(0.0, n.get('visage', 0) - 0.02)         # au-delà de 2 % de l'image, un visage pèse de plus en plus
    if n.get('utilitaire'):
        s -= 0.15
    if n.get('largeur', 1000) < 400:
        s -= 0.3
    return s

def gros_plan(n):
    return bool(n) and n.get('visage', 0) >= 0.035      # Ines ne veut pas de visages en gros plan

class Photos:
    """Règle d'or de l'app : tout article affiché a une photo. Les résultats sont gardés en mémoire d'un passage à l'autre."""
    def __init__(self):
        self.og = lire_json(os.path.join(ETAT, 'images.json'), {})        # lien de l'article → photo trouvée sur la page
        self.ok = lire_json(os.path.join(ETAT, 'photos-ok.json'), {})     # adresse de la photo → affichable ou non
        self.notes = lire_json(os.path.join(ETAT, 'photos-notes.json'), {})  # adresse de la photo → visages et beauté

    def noter(self, urls):
        """Télécharge les nouvelles photos et les fait noter par l'outil macOS (ignoré ailleurs)."""
        urls = [u for u in dict.fromkeys(urls) if u and u not in self.notes and self.ok.get(u)]
        if not urls or not os.path.exists(NOTER):
            return
        import tempfile
        with tempfile.TemporaryDirectory() as dossier:
            def charger(iu):
                i, u = iu
                try:
                    data = telecharger(u, 10, 4_000_000, {'User-Agent': UA['User-Agent']})
                    chemin = os.path.join(dossier, f'{i}.img')
                    open(chemin, 'wb').write(data)
                    return u, chemin
                except Exception:
                    return u, None
            with Parallele(24) as ex:
                fichiers = [r for r in ex.map(charger, enumerate(urls)) if r and r[1]]
            import subprocess
            def analyser_lot(lot):
                try:
                    sortie = subprocess.run([NOTER] + [c for _, c in lot], capture_output=True, text=True, timeout=300).stdout
                except Exception:
                    return lot, {}
                par_fichier = {}
                for ligne in sortie.splitlines():
                    try:
                        j = json.loads(ligne)
                        par_fichier[j['fichier']] = j
                    except Exception:
                        pass
                return lot, par_fichier
            lots = [fichiers[i:i + 25] for i in range(0, len(fichiers), 25)]
            with Parallele(6) as ex:
                for res in ex.map(analyser_lot, lots):
                    if not res:
                        continue
                    lot, par_fichier = res
                    for u, c in lot:
                        j = par_fichier.get(c)
                        if j and not j.get('erreur'):
                            self.notes[u] = {k: j[k] for k in ('visage', 'visages', 'beaute', 'utilitaire', 'largeur', 'hauteur')}
            ecrire_json(os.path.join(ETAT, 'photos-notes.json'), self.notes)

    def choisir(self, elements):
        """Pour chaque article, garde la plus belle des photos disponibles (celles de tous les médias qui en parlent)."""
        candidates = [i for x in elements for i in x.get('images', []) if i]
        a_tester = [u for u in dict.fromkeys(candidates) if u not in self.ok]
        with Parallele(32) as ex:
            for url, ok in zip(a_tester, ex.map(image_affichable, a_tester)):
                self.ok[url] = ok
        self.noter(candidates)
        for x in elements:
            options = [i for i in x.get('images', []) if self.ok.get(i)]
            if x.get('image') and self.ok.get(x['image']) and x['image'] not in options:
                options.append(x['image'])
            if options:
                meilleure = max(options, key=lambda i: attrait(self.notes.get(i)))
                x['image'] = meilleure
            x['gros_plan'] = gros_plan(self.notes.get(x.get('image')))
            x.pop('images', None)

    def illustrer(self, elements):
        elements = [x for x in elements if x]
        # 1. chercher la photo sur la page de l'article quand le flux n'en donne pas
        a_chercher = list({x['lien']: x for x in elements if not x.get('image') and x['lien'] not in self.og}.values())
        with Parallele(24) as ex:
            for x, img in zip(a_chercher, ex.map(lambda x: og_image(x['lien']), a_chercher)):
                self.og[x['lien']] = img
        for x in elements:
            if not x.get('image'):
                x['image'] = self.og.get(x['lien'])
        # 2. vérifier que chaque photo s'affiche vraiment
        a_tester = list({x['image'] for x in elements if x.get('image') and x['image'] not in self.ok})
        with Parallele(32) as ex:
            for url, ok in zip(a_tester, ex.map(image_affichable, a_tester)):
                self.ok[url] = ok
        # 3. une photo refusée : on essaie celle de la page de l'article
        refusees = list({x['lien']: x for x in elements if x.get('image') and not self.ok.get(x['image']) and x['lien'] not in self.og}.values())
        with Parallele(24) as ex:
            for x, img in zip(refusees, ex.map(lambda x: og_image(x['lien']), refusees)):
                self.og[x['lien']] = img
                if img and img not in self.ok:
                    self.ok[img] = image_affichable(img)
        for x in elements:
            if x.get('image') and not self.ok.get(x['image']):
                autre = self.og.get(x['lien'])
                x['image'] = autre if autre and self.ok.get(autre) else None

    def garder(self, liste, n=None, preferer_sans_gros_plan=False, analyser=None):
        self.illustrer(liste)
        self.choisir(liste[:analyser] if analyser else liste)
        for x in liste:
            x.pop('images', None)
        out = [x for x in liste if x.get('image')]
        if preferer_sans_gros_plan:   # pour l'essentiel : un sujet en gros plan passe après les autres
            out = sorted(out, key=lambda x: x.get('gros_plan', False))
        return out[:n] if n else out

    def sauver(self):
        ecrire_json(os.path.join(ETAT, 'images.json'), self.og)
        ecrire_json(os.path.join(ETAT, 'photos-ok.json'), self.ok)
        ecrire_json(os.path.join(ETAT, 'photos-notes.json'), self.notes)

# ---------------------------------------------------------------- bourse
def cours(sym):
    try:
        req = urllib.request.Request(f'https://query1.finance.yahoo.com/v8/finance/chart/{urllib.request.quote(sym)}?range=1mo&interval=1d',
                                     headers={'User-Agent': 'Mozilla/5.0'})   # ce service refuse les identités de navigateur complètes
        with urllib.request.urlopen(req, timeout=15, context=CTX) as r:
            d = json.loads(r.read())
        r = d['chart']['result'][0]
        fermes = [x for x in r['indicators']['quote'][0]['close'] if x is not None]
        prix = r['meta'].get('regularMarketPrice') or fermes[-1]
        avant = fermes[-2] if len(fermes) >= 2 else prix
        return dict(prix=prix, variation=(prix - avant) / avant * 100 if avant else 0, devise=r['meta'].get('currency'),
                    courbe=[round(x, 4) for x in fermes[-22:]], heure=r['meta'].get('regularMarketTime'))
    except Exception:
        return None

def bourse(articles):
    chemin = os.path.join(ETAT, 'cours.json')
    cache = lire_json(chemin, {})
    if time.time() - cache.get('_t', 0) > 15 * 60:
        frais = {}
        for sym in [s for s, _ in MARCHES] + [x[0] for x in SOCIETES]:
            c = cours(sym)
            if c:
                frais[sym] = c
            time.sleep(0.4)
        if frais:
            cache = dict(frais, _t=time.time())
            ecrire_json(chemin, cache)
    m = [cache.get(s) for s, _ in MARCHES]
    s = [cache.get(x[0]) for x in SOCIETES]
    marches = [dict(symbole=sym, nom=nom, **c) for (sym, nom), c in zip(MARCHES, m) if c]
    societes = []
    for (sym, nom, place, mots), c in zip(SOCIETES, s):
        if not c:
            continue
        rx = re.compile(r'\b(' + '|'.join(re.escape(norm(w)) for w in mots) + r')\b')
        liees = [carte(a) for a in sorted(articles, key=lambda x: x['date'], reverse=True) if rx.search(norm(a['titre'] + ' ' + a['resume']))][:8]
        societes.append(dict(symbole=sym, nom=nom, place=place, articles=liees, **c))
    return marches, societes

# ---------------------------------------------------------------- programme principal
def lire_json(chemin, defaut):
    try:
        with open(chemin, encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return defaut

def ecrire_json(chemin, obj):
    tmp = chemin + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))
    os.replace(tmp, chemin)

def lancer():
    os.makedirs(DONNEES, exist_ok=True)
    os.makedirs(ETAT, exist_ok=True)
    debut = time.time()
    articles, etats = recuperer_tout()
    if sum(1 for v in etats.values() if v['ok']) < 10:
        # pas de connexion (ou presque) : on garde l'actualité précédente plutôt que d'afficher une page vide
        print('Connexion insuffisante : actualité précédente conservée.')
        return None
    for a in articles:
        classer(a)
    apprendre_noms(articles)
    groupes = regrouper(articles)

    # --- l'essentiel du jour : figé une fois par jour
    local = dt.datetime.now(FUSEAU)
    jour = local.date().isoformat() if local.hour >= HEURE_DU_JOUR else (local.date() - dt.timedelta(days=1)).isoformat()
    chemin_jour = os.path.join(ETAT, f'essentiel-{jour}.json')
    photos = Photos()
    essentiel = lire_json(chemin_jour, None)
    if essentiel is None:
        essentiel = dict(jour=jour, fige_a=iso(dt.datetime.now(dt.timezone.utc)),
                         une=top_sujets(groupes, lambda g: True),
                         themes={t: top_sujets(groupes, lambda g, t=t: g['theme'] == t and (t in g['rubriques'] or g['nb_sources'] >= 2)) for t in THEMES},
                         pays={p: top_sujets(groupes, lambda g, p=p: p in g['pays']) for p in PAYS_MOTS})
        essentiel['une'] = photos.garder(essentiel['une'], 5, True)
        essentiel['themes'] = {t: photos.garder(l, 5, True) for t, l in essentiel['themes'].items()}
        essentiel['pays'] = {p: photos.garder(l, 5, True) for p, l in essentiel['pays'].items()}
        ecrire_json(chemin_jour, essentiel)

    # --- les fils : mis à jour à chaque passage
    fils = dict(accueil=fil(articles, lambda a: True, 130, essentiel['une']),
                themes={t: fil(articles, lambda a, t=t: t in a['indices'] or (not a['indices'] and a['theme'] == t), 80, essentiel['themes'].get(t, [])) for t in THEMES},
                pays={p: fil(articles, lambda a, p=p: p in a['pays'], 80, essentiel['pays'].get(p, [])) for p in PAYS_MOTS})
    fils = dict(accueil=photos.garder(fils['accueil'], 90, analyser=48),
                themes={t: photos.garder(l, 60, analyser=24) for t, l in fils['themes'].items()},
                pays={p: photos.garder(l, 60, analyser=24) for p, l in fils['pays'].items()})

    marches, societes = bourse(articles)
    for s_ in societes:
        s_['articles'] = photos.garder(s_['articles'], 4, analyser=8)
    photos.sauver()
    sortie = dict(
        maj=iso(dt.datetime.now(dt.timezone.utc)), nb_articles=len(articles), nb_sources=sum(1 for v in etats.values() if v['ok']),
        essentiel=essentiel, fils=fils, marches=marches, societes=societes,
        compte={'themes': {t: len(fils['themes'][t]) for t in THEMES}, 'pays': {p: len(fils['pays'][p]) for p in PAYS_MOTS}},
        sources=sorted(n for n, v in etats.items() if v['ok']),
    )
    ecrire_json(os.path.join(DONNEES, 'actus.json'), sortie)
    # ménage : on ne garde que les 7 derniers jours d'essentiels
    for f in sorted(x for x in os.listdir(ETAT) if x.startswith('essentiel-'))[:-7]:
        os.remove(os.path.join(ETAT, f))
    print(f"{len(articles)} articles, {len(groupes)} sujets, {sortie['nb_sources']} médias, en {time.time() - debut:.0f} s")
    return sortie

if __name__ == '__main__':
    lancer()
