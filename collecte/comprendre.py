"""Classer les articles par thème selon leur SENS, et plus seulement selon la rubrique du journal.

Pourquoi : un article de The Economist ou du Financial Times n'est pas forcément économique.
Comment :
  1. L'outil `sens` (analyse de texte intégrée à macOS) transforme le titre et le résumé de chaque
     article en « empreinte de sens ». Le modèle est multilingue : français et anglais se comparent.
  2. AVA apprend chaque thème à partir d'exemples : les titres typiques de `sens/exemples.txt`
     et les articles des rubriques spécialisées des journaux (Sport, Culture…) dont le contenu
     ne contredit pas la rubrique.
  3. Pour chaque article, on regarde les 12 exemples les plus proches par le sens (vote), et on
     croise avec les mots-clés forts (élection, match, vaccin…).
  4. Si c'est net, l'article reçoit ce thème. Sinon il reste sans thème (il vit dans le fil général)
     plutôt que d'atterrir au mauvais endroit.
Si l'outil n'est pas disponible (hors macOS), le classement précédent est conservé.
"""
import array
import collections
import os
import subprocess
import tempfile

ICI = os.path.dirname(os.path.abspath(__file__))
OUTIL = os.path.join(ICI, 'sens', 'sens')
EXEMPLES = os.path.join(ICI, 'sens', 'exemples.txt')
DIM = 512
K = 12
POIDS_SENS, POIDS_MOTS = 0.6, 0.4
SEUIL, ECART = 0.33, 0.08        # en dessous : on préfère ne pas classer


def _texte(a):
    t = (a['titre'] + '. ' + (a.get('resume') or '')).replace('\t', ' ').replace('\n', ' ')
    return f"{a.get('langue') or 'en'}\t{t}"


def _vecteurs(lignes, chemin):
    r = subprocess.run([OUTIL, 'vecteurs', chemin], input=('\n'.join(lignes) + '\n').encode(),
                       capture_output=True, timeout=900)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.decode()[:200])


def affiner(articles, mots_cles):
    """Remplace a['theme'] par le thème compris par le sens. mots_cles(a) -> {thème: score}."""
    if not articles or not os.path.exists(OUTIL):
        return False
    exemples = [l.rstrip('\n').split('\t') for l in open(EXEMPLES, encoding='utf-8')
                if l.strip() and not l.startswith('#')]
    themes = sorted({t for t, _, _ in exemples})
    kw = [mots_cles(a) for a in articles]

    with tempfile.TemporaryDirectory() as tmp:
        f_art, f_ex, f_pool, f_vois = (os.path.join(tmp, n) for n in ('a.bin', 'e.bin', 'p.bin', 'v.txt'))
        _vecteurs([_texte(a) for a in articles], f_art)
        _vecteurs([f'{l}\t{t}' for _, l, t in exemples], f_ex)

        # 1er passage : ce que disent les seuls titres typiques, pour vérifier les rubriques des journaux
        f_vois0 = os.path.join(tmp, 'v0.txt')
        r = subprocess.run([OUTIL, 'voisins', f_art, f_ex, str(K), f_vois0], capture_output=True, timeout=900)
        if r.returncode != 0:
            raise RuntimeError(r.stderr.decode()[:200])
        avis = []
        for ligne in open(f_vois0, encoding='utf-8').read().splitlines():
            v = collections.Counter()
            for paire in ligne.split():
                j, sim = paire.split(':')
                v[exemples[int(j)][0]] += max(0.0, float(sim)) ** 2
            avis.append([t for t, _ in v.most_common(2)])

        # exemples étiquetés : titres typiques (poids 2) + articles de rubriques spécialisées dont le contenu
        # ressemble vraiment à la rubrique (un accident de train rangé en « Économie » ne sert pas d'exemple)
        etiquettes = [(t, 2.0, None) for t, _, _ in exemples]
        graines = []
        for i, (a, k) in enumerate(zip(articles, kw)):
            if not a['indices'] or a.get('indice_faible') or len(a['indices']) != 1:
                continue
            h = next(iter(a['indices']))
            top = max(k.items(), key=lambda x: x[1]) if k else None
            if top and top[0] != h and top[1] >= 6 and k.get(h, 0) < 3:
                continue                      # la rubrique est contredite par les mots
            if h not in avis[i] or (avis[i] and avis[i][0] == 'actu'):
                continue                      # la rubrique est contredite par le sens
            graines.append(i)
            etiquettes.append((h, 1.0, i))

        brut_art = open(f_art, 'rb').read()
        taille = DIM * 4
        with open(f_pool, 'wb') as p:
            p.write(open(f_ex, 'rb').read())
            for i in graines:
                p.write(brut_art[i * taille:(i + 1) * taille])
        r = subprocess.run([OUTIL, 'voisins', f_art, f_pool, str(K + 1), f_vois], capture_output=True, timeout=900)
        if r.returncode != 0:
            raise RuntimeError(r.stderr.decode()[:200])
        voisins = open(f_vois, encoding='utf-8').read().splitlines()

    for i, (a, ligne, k) in enumerate(zip(articles, voisins, kw)):
        votes = collections.Counter()
        pris = 0
        for paire in ligne.split():
            j, s = paire.split(':')
            theme, poids, origine = etiquettes[int(j)]
            if origine == i:                  # l'article lui-même (s'il sert d'exemple)
                continue
            votes[theme] += poids * max(0.0, float(s)) ** 2
            pris += 1
            if pris >= K:
                break
        total = sum(votes.values()) or 1
        sens = {t: v / total for t, v in votes.items()}
        ktot = sum(k.values())
        mots = {t: v / ktot for t, v in k.items()} if ktot >= 3 else {}
        note = sorted(((POIDS_SENS * sens.get(t, 0) + POIDS_MOTS * mots.get(t, 0), t) for t in themes), reverse=True)
        (s1, t1), (s2, _) = note[0], note[1]
        # « actu » = actualité générale : aucun thème, l'article vit dans le fil général
        a['theme'] = t1 if s1 >= SEUIL and s1 - s2 >= ECART and t1 != 'actu' else None
        a['theme_sur'] = a['theme'] is not None and s1 >= 0.5
        a['confiance_theme'] = round(s1, 2)
    return True
