"""Les textes d'AVA écrits par Claude : titres en français, résumés impartiaux de tous les médias d'un sujet.

Tourne après collecte.py sur le serveur (GitHub), seulement si la clé ANTHROPIC_API_KEY est enregistrée
dans les secrets du dépôt. Lit pour-ia.json (les sujets affichés, du plus visible au moins visible)
et écrit ../donnees/ia.json, que l'application affiche à la place des titres des journaux.

  - un sujet couvert par plusieurs médias : un titre clair en français, un court résumé de ce qu'ils
    racontent tous, et les vraies différences entre eux s'il y en a ;
  - un article seul en langue étrangère : son titre et son résumé traduits.

Les textes sont gardés d'une fois sur l'autre (etat/ia.json) : seuls les nouveaux sujets coûtent quelque chose.
Les 5 infos du jour et « À ne pas manquer » passent par Claude Sonnet ; tout le reste par Claude Haiku, bien moins cher.
"""
import concurrent.futures as cf
import json
import os
import sys
import time
from typing import List

import anthropic
from pydantic import BaseModel

ICI = os.path.dirname(os.path.abspath(__file__))
POUR_IA = os.path.join(ICI, 'pour-ia.json')
CACHE = os.path.join(ICI, 'etat', 'ia.json')
SORTIE = os.path.join(ICI, '..', 'donnees', 'ia.json')

SOIGNE, RAPIDE = 'claude-sonnet-5-5', 'claude-haiku-5-5'
GARDER_JOURS = 4
MAX_SUJETS = 120          # sujets résumés par passage (toutes les 30 min) : de quoi suivre sans dépenser trop
MAX_TRADUCTIONS = 300
PAR_LOT = 15              # articles traduits par appel
DUREE_MAX_S = 8 * 60

CONSIGNES_SUJET = """Tu écris pour AVA, une application d'actualité pour de jeunes adultes francophones pressés.
On te donne les articles de plusieurs médias (de pays et de langues différents) sur un même sujet.

Écris en français, de façon neutre et impartiale, en t'appuyant UNIQUEMENT sur ces textes :
- titre : 8 à 14 mots, qui dit clairement ce qui s'est passé (qui, quoi, où). Vivant mais jamais sensationnel,
  sans point d'exclamation ni guillemets inutiles, sans reprendre le titre d'un journal en particulier.
- resume : 2 ou 3 phrases simples qui expliquent le fait et son contexte, compréhensibles sans rien connaître du sujet.
  Ne rien inventer : pas de chiffre, de nom ou de citation absents des textes.
- divergence : seulement si des médias se contredisent sur les faits ou les chiffres, ou présentent le sujet de façon
  nettement opposée. Une ou deux phrases qui nomment les médias concernés. Sinon, une chaîne vide.
  Un détail en plus chez un média, un angle différent ou une mise à jour du bilan ne sont PAS des divergences."""

CONSIGNES_TRAD = """Tu traduis des articles d'actualité en français pour AVA, une application d'information.
Pour chaque article : traduis fidèlement le titre en français naturel (garde les noms propres), et si un résumé est donné,
traduis-le en une ou deux phrases. Ne rien ajouter qui ne soit pas dans le texte. Si le résumé est vide, renvoie une chaîne vide.
Renvoie les articles dans le même ordre, avec le même numéro."""


class Sujet(BaseModel):
    titre: str
    resume: str
    divergence: str


class Traduit(BaseModel):
    numero: int
    titre: str
    resume: str


class Traductions(BaseModel):
    articles: List[Traduit]


def lire(chemin, defaut):
    try:
        with open(chemin, encoding='utf-8') as f:
            return json.load(f)
    except (OSError, ValueError):
        return defaut


def ecrire(chemin, obj):
    tmp = chemin + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))
    os.replace(tmp, chemin)


def propre(texte, n):
    texte = (texte or '').strip().strip('"«» ').strip()
    return texte if len(texte) <= n else ''


def resumer(client, sujet):
    modele = SOIGNE if sujet['priorite'] <= 1 else RAPIDE
    textes = '\n\n'.join(f"[{a['media']}] {a['titre']}\n{a['resume']}".strip() for a in sujet['articles'])
    r = client.messages.parse(
        model=modele,
        max_tokens=4000,
        output_config={'effort': 'medium' if modele == SOIGNE else 'low'},
        system=CONSIGNES_SUJET,
        messages=[{'role': 'user', 'content': textes}],
        output_format=Sujet,
    )
    if r.stop_reason != 'end_turn' or r.parsed_output is None:
        return None
    s = r.parsed_output
    titre = propre(s.titre, 160)
    if not titre:
        return None
    return dict(titre=titre, resume=propre(s.resume, 700), divergence=propre(s.divergence, 450),
                nb=len(sujet['articles']), modele=modele, quand=time.time())


def traduire(client, lot):
    textes = '\n\n'.join(f"{i + 1}. {s['articles'][0]['titre']}\nRésumé : {s['articles'][0]['resume']}" for i, s in enumerate(lot))
    r = client.messages.parse(
        model=RAPIDE,
        max_tokens=8000,
        output_config={'effort': 'low'},
        system=CONSIGNES_TRAD,
        messages=[{'role': 'user', 'content': textes}],
        output_format=Traductions,
    )
    if r.stop_reason != 'end_turn' or r.parsed_output is None:
        return {}
    out = {}
    for t in r.parsed_output.articles:
        if 1 <= t.numero <= len(lot):
            titre = propre(t.titre, 200)
            if titre:
                out[lot[t.numero - 1]['cle']] = dict(titre=titre, resume=propre(t.resume, 700), nb=1, modele=RAPIDE, quand=time.time())
    return out


def lancer():
    if not os.environ.get('ANTHROPIC_API_KEY'):
        print("Pas de clé ANTHROPIC_API_KEY : AVA garde les titres des journaux.")
        return
    sujets = lire(POUR_IA, [])
    maintenant = time.time()
    cache = {k: v for k, v in lire(CACHE, {}).items() if maintenant - v.get('quand', 0) < GARDER_JOURS * 86400}

    a_resumer, a_traduire = [], []
    for s in sorted(sujets, key=lambda s: s['priorite']):
        deja = cache.get(s['cle'])
        n = len(s['articles'])
        if n > 1:
            # un sujet qui a pris de l'ampleur depuis son résumé est réécrit (seulement pour ce qui est le plus vu)
            if not deja or (s['priorite'] <= 1 and deja.get('nb', 0) + 3 <= n) or (deja.get('nb', 0) == 1):
                a_resumer.append(s)
        elif not deja and (s['articles'][0].get('langue') or 'fr') != 'fr':
            a_traduire.append(s)
    a_resumer, a_traduire = a_resumer[:MAX_SUJETS], a_traduire[:MAX_TRADUCTIONS]
    print(f"{len(a_resumer)} sujets à résumer, {len(a_traduire)} articles à traduire")

    client = anthropic.Anthropic(max_retries=3)
    fin = time.time() + DUREE_MAX_S
    faits, erreurs = 0, 0
    with cf.ThreadPoolExecutor(max_workers=6) as pool:
        travaux = {pool.submit(resumer, client, s): s for s in a_resumer}
        lots = [a_traduire[i:i + PAR_LOT] for i in range(0, len(a_traduire), PAR_LOT)]
        travaux.update({pool.submit(traduire, client, lot): None for lot in lots})
        for t in cf.as_completed(travaux):
            s = travaux[t]
            try:
                r = t.result()
            except anthropic.AuthenticationError:
                print("Clé ANTHROPIC_API_KEY refusée : vérifier le secret du dépôt.")
                pool.shutdown(wait=False, cancel_futures=True)
                break
            except anthropic.APIStatusError as e:
                erreurs += 1
                print(f"Claude a répondu {e.status_code} : {e.message}"[:300])
                continue
            except Exception as e:     # un sujet raté ne doit jamais bloquer la publication
                erreurs += 1
                print('Erreur :', repr(e)[:300])
                continue
            if s is not None:
                if r:
                    cache[s['cle']] = r
                    faits += 1
            else:
                cache.update(r)
                faits += len(r)
            if time.time() > fin:
                print("Temps écoulé : la suite au prochain passage.")
                pool.shutdown(wait=False, cancel_futures=True)
                break

    ecrire(CACHE, cache)
    visibles = {s['cle'] for s in sujets}
    textes = {k: {c: v[c] for c in ('titre', 'resume', 'divergence', 'nb') if v.get(c)} for k, v in cache.items() if k in visibles}
    ecrire(SORTIE, {'maj': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'textes': textes})
    print(f"{faits} textes écrits par Claude, {erreurs} erreurs, {len(textes)} textes affichés")


if __name__ == '__main__':
    try:
        lancer()
    except Exception as e:             # jamais d'échec du site à cause de l'IA
        print('IA indisponible :', repr(e)[:300])
    sys.exit(0)
