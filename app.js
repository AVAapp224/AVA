/* L'app d'actu : affiche les vraies actualités préparées par la collecte (donnees/actus.json). */
'use strict';

/* ------------------------------------------------------------------ réglages */
const DONNEES = 'donnees/actus.json';
const RAFRAICHIR_MIN = 2;        // le fil se met à jour toutes les 2 minutes
const PAR_PAGE = 24;             // articles affichés dans le fil avant « Voir plus »

const THEMES = {
  bourse:        { nom: 'Bourse', ess: 'defile', chapo: "Les marchés, tes entreprises et l'argent du quotidien." },
  sport:         { nom: 'Sport', ess: 'bandes', chapo: "L'essentiel du sport, et ceux que tu pratiques ou aimes suivre." },
  culture:       { nom: 'Culture', ess: 'pile', chapo: 'Livres, expositions, scène et patrimoine.', perso: ['Mes envies', ['Livres', 'Expositions', 'Musique', 'Théâtre', 'Danse', 'Patrimoine', 'Photographie', 'Architecture', 'Opéra']] },
  environnement: { nom: 'Environnement', ess: 'defile', chapo: 'Le climat, la nature et les solutions qui avancent.', perso: ['Mes causes', ['Climat', 'Océans', 'Biodiversité', 'Énergie', 'Alimentation', 'Villes']] },
  politique:     { nom: 'Politique', ess: 'bandes', chapo: 'Qui décide quoi, et ce que ça change pour toi.', perso: ['Ce que je suis', ['France', 'Canada', 'Québec', 'Europe', 'États-Unis', 'Élections']] },
  pop:           { nom: 'Pop', ess: 'affiches', chapo: 'Les artistes, les films, les séries et ce dont tout le monde parle.', perso: ['Mes envies pop', ['Séries', 'Musique', 'Cinéma', 'Stars', 'Festivals', 'Jeux vidéo']] },
  voyage:        { nom: 'Voyage', ess: 'defile', chapo: 'Des idées pour partir, et ce qui change pour les voyageurs.', perso: ['Mes destinations', ['Japon', 'Portugal', 'Québec', 'Grèce', 'Mexique', 'Islande', 'Italie', 'Espagne']] },
  tech:          { nom: 'Tech et sciences', ess: 'bandes', chapo: 'Les découvertes et les innovations, expliquées simplement.', perso: ['Mes sujets', ['IA', 'Espace', 'Smartphones', 'Énergie', 'Santé', 'Jeux vidéo']] },
  sante:         { nom: 'Santé et bien-être', ess: 'defile', chapo: "Prendre soin de soi, et comprendre l'actu santé.", perso: ['Mes sujets', ['Sommeil', 'Santé mentale', 'Alimentation', 'Sport', 'Médecine', 'Prévention']] },
  mode:          { nom: 'Mode et design', ess: 'affiches', chapo: 'Les créateurs, les tendances et les objets qui comptent.', perso: ['Mes univers', ['Mode durable', 'Design', 'Défilés', 'Créateurs', 'Décoration', 'Beauté']] },
  gastronomie:   { nom: 'Gastronomie', ess: 'bandes', chapo: "Les chefs, les tables et ce qu'on met dans nos assiettes.", perso: ['Mes envies', ['Recettes', 'Saison', 'Restaurants', 'Vins', 'Chefs', 'Pâtisserie']] },
  societe:       { nom: 'Société', ess: 'defile', chapo: 'Éducation, logement, travail : ce qui change dans nos vies.', perso: ['Mes sujets', ['Logement', 'Jeunesse', 'Éducation', 'Travail', 'Égalité', 'Justice']] },
};
// Thèmes sans « Près de chez toi »
const SANS_PRES = new Set(['bourse', 'voyage', 'mode']);
// Thèmes où l'on montre, sous les choix, une sélection d'articles qui leur correspondent
const SELECTION = {
  voyage: {
    titre: 'Sur tes destinations',
    mots: {
      'Japon': 'japon japan tokyo kyoto osaka', 'Portugal': 'portugal lisbonne lisbon porto madere',
      'Québec': 'quebec montreal gaspesie charlevoix', 'Grèce': 'grece greece greek athenes athens crete santorin',
      'Mexique': 'mexique mexico cancun oaxaca', 'Islande': 'islande iceland reykjavik',
      'Italie': 'italie italy rome venise venice florence sicile', 'Espagne': 'espagne spain madrid barcelone barcelona seville',
    },
  },
  mode: {
    titre: 'Sur tes univers',
    mots: {
      'Mode durable': 'durable sustainable seconde vintage upcycling recycle', 'Design': 'design designer mobilier furniture objet',
      'Défilés': 'defile defiles fashion week runway collection', 'Créateurs': 'createur createurs creatrice couturier maison',
      'Décoration': 'decoration deco interieur home', 'Beauté': 'beaute beauty maquillage parfum skincare',
    },
  },
};

const PAYS = {
  france: { nom: 'France', photo: 'img/france.jpg', chapo: 'Tout ce qui concerne la France.' },
  quebec: { nom: 'Québec', photo: 'img/quebec.jpg', chapo: 'Le Québec et le Canada.' },
};
const SPORTS = {
  tennis:      ['Tennis', 'Tournois, joueuses et joueurs', 'tennis roland-garros roland wimbledon atp wta'],
  nautiques:   ['Sports nautiques', 'Voile, surf, aviron, natation', 'voile regate vendee surf aviron natation nageur nageuse kayak sailing rowing swimming'],
  athletisme:  ['Athlétisme', 'Course, sauts, lancers', 'athletisme marathon sprint athletics'],
  cyclisme:    ['Cyclisme', 'Route, piste, VTT', 'cyclisme cycliste velo peloton cycling'],
  ski:         ['Ski', 'Alpin, fond, biathlon', 'ski skieur skieuse biathlon slalom skiing'],
  escalade:    ['Escalade', 'Bloc, voie, montagne', 'escalade grimpeur grimpeuse climbing alpinisme'],
  football:    ['Football', 'Clubs et sélections', 'football foot ligue psg soccer mls bleus'],
  basket:      ['Basket', 'NBA et championnats', 'basket basketball nba raptors'],
  hockey:      ['Hockey', 'LNH et championnats', 'hockey lnh nhl canadien canadiens'],
  rugby:       ['Rugby', 'Top 14 et sélections', 'rugby top'],
  judo:        ['Judo', 'Compétitions', 'judo judoka'],
  golf:        ['Golf', 'Tournois', 'golf'],
};

/* ------------------------------------------------------------------ préférences (gardées sur ce téléphone) */
const PREFS_DEFAUT = {
  couleur: 'encre', teinteCulture: 'bordeaux',
  pays: ['france', 'quebec'], themes: Object.keys(THEMES),
  sports: ['tennis', 'nautiques'], societes: ['MC.PA', 'SHOP.TO', 'AI.PA'],
  envies: {}, cloches: {}, lectures: {}, medias: [], habitudes: null,
};
let prefs = chargerPrefs();
function chargerPrefs() {
  try { return Object.assign({}, PREFS_DEFAUT, JSON.parse(localStorage.getItem('app-actu-prefs') || '{}')); }
  catch (e) { return Object.assign({}, PREFS_DEFAUT); }
}
function sauver() { try { localStorage.setItem('app-actu-prefs', JSON.stringify(prefs)); } catch (e) {} }
function envies(t) { return prefs.envies[t] || (THEMES[t].perso ? THEMES[t].perso[1].slice(0, 2) : []); }

/* ------------------------------------------------------------------ outils */
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const FLECHE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const RETOUR = '<a href="#accueil" class="retour"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>Accueil</a>';
const CLOCHE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>';
const PLUS = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';

function dateDuJour() {
  return new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' }).replace('.', '');
}
function ilYa(iso) {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000));
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `il y a ${h} h` : 'hier';
}
let minuteurToast;
function montrer(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(minuteurToast);
  minuteurToast = setTimeout(() => t.classList.remove('on'), 2400);
}

/* le pays dont parle l'article, à côté de la rubrique */
const avecLieu = (rubrique, x) => esc(rubrique) + (x.lieu && x.lieu !== rubrique ? ' · ' + esc(x.lieu) : '');
const lieu = x => x.lieu ? `<span class="lieu">${esc(x.lieu)}</span>` : '';

/* le titre avec ses mots-clés en gras */
function titre(x) {
  let t = esc(x.titre);
  (x.gras || []).forEach(g => { t = t.replace(esc(g), '<strong>' + esc(g) + '</strong>'); });
  return t;
}

/* chaque élément affiché est rangé ici pour pouvoir ouvrir sa fiche */
const registre = new Map();
function inscrire(x) { registre.set(x.id, x); return x.id; }

/* Règle d'or : tout article est une photo. Si une photo ne s'affiche pas, l'article disparaît plutôt que d'apparaître sans image. */
/* les photos passent par un service gratuit qui les réduit à la taille de l'écran : chargement bien plus rapide */
const reduite = (u, l = 720) => `https://wsrv.nl/?url=${encodeURIComponent(u)}&w=${l}&q=72&output=webp`;
function photo(x, alt, l) {
  if (!x.image) return '';
  return `<img src="${esc(reduite(x.image, l))}" data-original="${esc(x.image)}" alt="${esc(alt || '')}" decoding="async" referrerpolicy="no-referrer" onerror="sansPhoto(this)">`;
}
// si la version réduite échoue, on essaie la photo d'origine ; si elle échoue aussi, l'article disparaît
window.sansPhoto = img => {
  if (img.dataset.original && img.src !== img.dataset.original) { const o = img.dataset.original; img.removeAttribute('data-original'); img.src = o; return; }
  const c = img.closest('[data-ouvrir]'); if (c) c.remove(); else img.remove();
};
const VIDES = new Set('le la les un une des de du et en au aux pour par avec sans sur dans que qui est sont the and for with from into after over says'.split(' '));
const empreinte = t => new Set(norm(t).split(/[^a-z0-9-]+/).filter(w => w.length >= 4 && !VIDES.has(w)));
function memeSujet(a, b) {
  let c = 0; a.forEach(w => { if (b.has(w)) c++; });
  return c >= 3 && c / Math.min(a.size, b.size) >= 0.5;
}
let vusPage = [];   // ce qui est déjà affiché sur la page en cours
function nouveau(x) {
  const e = empreinte(x.titre);
  const liens = [x.lien, ...(x.sources || []).map(s => s.lien)];
  if (vusPage.some(v => liens.includes(v.lien) || memeSujet(e, v.e))) return false;
  vusPage.push({ lien: x.lien, e });
  (x.sources || []).forEach(s => vusPage.push({ lien: s.lien, e: empreinte(s.titre || '') }));
  return true;
}
const avecPhoto = l => (l || []).filter(x => x && x.image);
function ligneArticle(a) {
  inscrire(a);
  return `<a href="${esc(a.lien)}" class="ligne-article" data-ouvrir="${esc(a.id)}"><span class="vignette">${photo(a, '', 160)}</span><span><span>${esc(a.source)}${a.lieu ? ' · ' + esc(a.lieu) : ''} · ${ilYa(a.date)}</span><b>${esc(a.titre)}</b></span></a>`;
}

/* ------------------------------------------------------------------ cartes */
function lireChez(x) {
  const sources = x.sources || [{ nom: x.source, lien: x.lien }];
  return `<div class="lire"><span>Lire chez</span>${sources.slice(0, 3).map(s => `<a href="${esc(s.lien)}" target="_blank" rel="noopener" data-lu="${esc(x.id)}">${esc(s.nom)}</a>`).join('')}${sources.length > 3 ? `<a href="#" data-ouvrir="${esc(x.id)}">+${sources.length - 3}</a>` : ''}</div>`;
}
function carteUne(x) {
  inscrire(x);
  return `<article class="une" data-ouvrir="${esc(x.id)}">${photo(x, x.titre)}
    <div class="voile"><span class="rubrique">${avecLieu(x.rubrique, x)}</span><h3>${titre(x)}</h3>${lireChez(x)}</div></article>`;
}
function bande(x) {
  inscrire(x);
  return `<a href="${esc(x.lien)}" class="bande" data-ouvrir="${esc(x.id)}">${photo(x, x.titre)}
    <span class="source">${esc(x.source)}</span>${nbAutres(x)}
    <div class="voile"><span class="rubrique">${avecLieu(x.rubrique, x)}</span><h3>${titre(x)}</h3></div></a>`;
}
function affiche(x) {
  inscrire(x);
  return `<a href="${esc(x.lien)}" class="affiche" data-ouvrir="${esc(x.id)}">${photo(x, x.titre)}
    <span class="source">${esc(x.source)}</span>
    <div class="voile"><span class="rubrique">${avecLieu(x.rubrique, x)}</span><h3>${titre(x)}</h3></div></a>`;
}
function nbAutres(x) {
  const n = (x.sources ? x.sources.length - 1 : (x.autres || []).length);
  return n > 0 ? `<span class="autres-badge">+${n} média${n > 1 ? 's' : ''}</span>` : '';
}
function carte(x, taille, etiquette) {
  inscrire(x);
  return `<a href="${esc(x.lien)}" class="carte ${taille}" data-ouvrir="${esc(x.id)}">${photo(x, x.titre)}
    <span class="source">${esc(x.source)}</span>${etiquette ? `<span class="pays-tag">${esc(etiquette)}</span>` : nbAutres(x)}
    <div class="voile">${lieu(x)}<h3>${titre(x)}</h3></div></a>`;
}

/* la mosaïque du fil, d'après le croquis : une grande en largeur, puis une verticale et deux petites (en miroir une fois sur deux) */
function mosaique(items) {
  items = avecPhoto(items);
  let html = '';
  for (let i = 0, bloc = 0; i < items.length; i += 4, bloc++) {
    const [g, v, p1, p2] = items.slice(i, i + 4);
    if (g) html += carte(g, 'g');
    if (v && p1 && p2) {
      const col = `<div class="colonne">${carte(p1, 'p')}${carte(p2, 'p')}</div>`;
      html += `<div class="rang">${bloc % 2 ? col + carte(v, 'v') : carte(v, 'v') + col}</div>`;
    } else {
      [v, p1, p2].filter(Boolean).forEach(x => { html += carte(x, 'g'); });
    }
  }
  return html;
}

/* ------------------------------------------------------------------ l'algorithme personnel (tout reste sur ce téléphone)
   AVA compare, pour chaque pays, média et thème, ce que tu OUVRES à ce que tu VOIS passer.
   Ce que tu ouvres souvent remonte ; ce que tu fais défiler sans jamais l'ouvrir descend peu à peu. */
function habitudes() {
  if (!prefs.habitudes) prefs.habitudes = { vues: { lieu: {}, source: {}, theme: {} }, ouverts: { lieu: {}, source: {}, theme: {} } };
  // reprise des anciennes lectures par thème
  if (prefs.lectures && Object.keys(prefs.lectures).length && !prefs.habitudesMigrees) {
    Object.entries(prefs.lectures).forEach(([t, n]) => { prefs.habitudes.ouverts.theme[t] = (prefs.habitudes.ouverts.theme[t] || 0) + n; });
    prefs.habitudesMigrees = true;
  }
  return prefs.habitudes;
}
function noter(x, quoi) {
  if (!x) return;
  const h = habitudes()[quoi];
  [['lieu', x.lieu], ['source', x.source], ['theme', x.theme]].forEach(([type, cle]) => {
    if (cle) h[type][cle] = (h[type][cle] || 0) + 1;
  });
  sauver();
}
// affinité : au-dessus de 0, tu ouvres plus que la moyenne ; en dessous, moins. Bornée pour ne jamais tout cacher.
function affinite(type, cle) {
  if (!cle) return 0;
  const h = habitudes();
  const o = h.ouverts[type][cle] || 0, v = h.vues[type][cle] || 0;
  const O = Object.values(h.ouverts[type]).reduce((a, b) => a + b, 0);
  const V = Object.values(h.vues[type]).reduce((a, b) => a + b, 0);
  if (V < 30) return 0;                       // pas encore assez d'observations pour juger
  const taux = (o + 1) / (v + 8), moyen = (O + 1) / (V + 8);
  return Math.max(-1.5, Math.min(1.5, Math.log2(taux / moyen)));
}
const favori = x => (prefs.medias || []).includes(x.source);

/* classe une liste pour toi : importance de l'info + tes habitudes + tes médias préférés, puis équilibre les pays et les médias */
function classerPerso(items, options = {}) {
  const bonus = options.mots && options.mots.length ? new RegExp('\\b(' + options.mots.map(m => norm(m).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'i') : null;
  const notes = items.map((x, i) => {
    let s = Math.log((x.imp || 0.5) + 0.2);
    s += 0.7 * affinite('lieu', x.lieu) + 0.6 * affinite('source', x.source) + 0.35 * affinite('theme', x.theme);
    if (favori(x)) s += 1;
    if (bonus && bonus.test(norm(x.titre + ' ' + x.resume))) s += 0.8;
    if (x.gros_plan) s -= 1.2;                          // les gros plans de visages descendent
    if (options.recence) s -= (Date.now() - new Date(x.date)) / 3600e3 / 24;
    else s -= i * 0.01;                                 // l'ordre mondial calculé par AVA départage
    return { x, s };
  }).sort((a, b) => b.s - a.s);
  // équilibre : pas deux fois le même pays sur 3 articles d'affilée, ni le même média sur 2
  const out = [], reste = notes.slice();
  while (reste.length) {
    const recents = out.slice(-3);
    let k = reste.findIndex(({ x }) => !(x.lieu && recents.filter(y => y.lieu === x.lieu).length >= 1) && !(recents.slice(-2).some(y => y.source === x.source)));
    if (k < 0) k = 0;
    out.push(reste.splice(k, 1)[0].x);
  }
  return out;
}

/* ce que tu regardes vraiment : un article compte comme « vu » s'il reste au moins 1 seconde à l'écran */
let observateur;
const dejaVus = new Set();
function observerVues() {
  if (!('IntersectionObserver' in window)) return;
  if (observateur) observateur.disconnect();
  const minuteurs = new Map();
  observateur = new IntersectionObserver(entrees => {
    entrees.forEach(e => {
      const id = e.target.dataset.ouvrir;
      if (e.isIntersecting && e.intersectionRatio >= 0.6) {
        if (!dejaVus.has(id) && !minuteurs.has(id)) minuteurs.set(id, setTimeout(() => { dejaVus.add(id); noter(registre.get(id), 'vues'); }, 1000));
      } else if (minuteurs.has(id)) { clearTimeout(minuteurs.get(id)); minuteurs.delete(id); }
    });
  }, { threshold: [0, 0.6] });
  document.querySelectorAll('#vue [data-ouvrir]').forEach(el => observateur.observe(el));
}

/* ------------------------------------------------------------------ blocs de page */
const AJOUTER = page => `<a href="#${page}">+ Ajouter</a>`;
function libelle(gauche, droite) {
  return `<div class="libelle"><span>${gauche}</span>${droite ? `<span>${droite}</span>` : ''}</div>`;
}
function blocFil(cle, items, titre) {
  items = items.filter(nouveau);
  filsAffiches[cle] = items;
  if (!items.length) return '';
  return `<section class="marge" style="display:flex;flex-direction:column;gap:16px">${libelle(titre)}
    <div class="fil" data-fil="${cle}" data-n="${PAR_PAGE}">${mosaique(items.slice(0, PAR_PAGE))}</div>
    ${items.length > PAR_PAGE ? `<button type="button" class="voir-plus" data-plus="${cle}">Voir plus d'articles</button>` : ''}</section>`;
}
const filsAffiches = {};
function enregistrerFil(cle, items) { filsAffiches[cle] = items; }

function blocEssentiel(titre, items, mode) {
  items = avecPhoto(items).filter(nouveau);
  if (!items || !items.length) return `<section class="marge">${libelle(titre)}<p class="vide">L'essentiel sera prêt demain matin à 6 h.</p></section>`;
  const n = `${items.length} info${items.length > 1 ? 's' : ''}`;
  if (mode === 'bandes') return `<section class="marge" style="display:flex;flex-direction:column;gap:14px">${libelle(titre, n)}<div class="bandes">${items.map(bande).join('')}</div></section>`;
  if (mode === 'affiches') return `<section style="display:flex;flex-direction:column;gap:16px"><div class="marge">${libelle(titre, n)}</div><div class="affiches">${items.map(affiche).join('')}</div></section>`;
  if (mode === 'pile') return blocPile(titre, items);
  return `<section style="display:flex;flex-direction:column;gap:16px"><div class="marge">${libelle(titre, n)}</div>
    <div class="defile" data-progression>${items.map(carteUne).join('')}</div>
    <div class="progression" aria-hidden="true">${items.map((_, i) => `<span class="${i ? '' : 'on'}"></span>`).join('')}</div></section>`;
}
/* les thèmes choisis, en haut de l'accueil : un ruban qui défile doucement, en boucle (le doigt le met en pause) */
function rubriques() {
  const liste = prefs.themes.map(t => `<a href="#${t}">${THEMES[t].nom}</a>`).join('');
  if (!prefs.themes.length) return `<nav class="rubriques"><a href="#reglages-themes" class="plus">+ Choisir mes thèmes</a></nav>`;
  const fois = Math.max(1, Math.ceil(5 / prefs.themes.length));   // assez de thèmes pour remplir la largeur
  const moitie = liste.repeat(fois);
  return `<nav class="rubriques" aria-label="Mes thèmes"><div class="ruban"><div class="ruban-piste" style="--duree:${prefs.themes.length * fois * 3.2}s">${moitie}<span aria-hidden="true" class="copie">${moitie}</span></div></div>
    <a href="#reglages-themes" class="plus" aria-label="Ajouter un thème">+</a></nav>`;
}
function blocPile(titre, items, fin = "Tu as vu l'essentiel de la culture aujourd'hui.") {
  return `<section style="display:flex;flex-direction:column;gap:16px"><div class="marge">${libelle(titre, `<span id="compte-pile">${items.length} infos</span>`)}</div>
    <div class="marge"><div class="pile-culture" id="pile">
      <div class="fin-pile"><p>${fin}</p><button type="button" class="bouton-clair" id="revoir">Revoir les ${items.length} infos</button></div>
      ${items.map(x => carteUne(x).replace('class="une"', 'class="une glisse"')).join('')}
    </div></div>
    <div class="actions-pile marge">
      <button type="button" class="rond" data-swipe="-1" aria-label="Passer cette info"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      <p>Glisse à droite pour garder,<br>à gauche pour passer.</p>
      <button type="button" class="rond plein" data-swipe="1" aria-label="Garder cette info"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h10v16l-5-4-5 4z"/></svg></button>
    </div></section>`;
}
function blocPerso(t) {
  const cfg = THEMES[t].perso;
  if (!cfg) return '';
  const choisis = envies(t);
  return `<section class="marge" style="display:flex;flex-direction:column;gap:14px">${libelle(cfg[0])}
    <div class="envies" role="group" aria-label="${esc(cfg[0])}">${cfg[1].map(c => `<button type="button" data-envie="${esc(t)}" aria-pressed="${choisis.includes(c)}">${esc(c)}</button>`).join('')}</div></section>`;
}
function blocSelection(t) {
  const cfg = SELECTION[t];
  const choisis = envies(t);
  const mots = choisis.flatMap(c => (cfg.mots[c] || norm(c)).split(' '));
  if (!mots.length) return '';
  const rx = new RegExp('\\b(' + mots.join('|') + ')', 'i');
  const deja = vusPage.slice();
  const liste = avecPhoto(D.fils.themes[t]).filter(x => rx.test(norm(x.titre + ' ' + x.resume)))
    .filter(x => !deja.some(v => v.lien === x.lien || memeSujet(empreinte(x.titre), v.e))).slice(0, 4);
  if (!liste.length) return `<section class="marge"><p class="vide">Pas d'article ces deux derniers jours sur ${esc(choisis.join(', '))}. Le fil juste en dessous montre tout le reste.</p></section>`;
  liste.forEach(nouveau);
  return `<section class="marge" style="display:flex;flex-direction:column;gap:14px">${libelle(cfg.titre, esc(choisis.join(' · ')))}
    <div class="duo">${liste.map(x => carte(x, '')).join('')}</div></section>`;
}

function blocPres(items) {
  const deja = vusPage.slice();
  const chezMoi = (x, p) => (x.pays || []).includes(p) || x.lieu === nomPays(p);
  const miens = avecPhoto(items).filter(x => !deja.some(v => v.lien === x.lien || memeSujet(empreinte(x.titre), v.e))).filter(x => prefs.pays.some(p => chezMoi(x, p)));
  const choix = [];
  prefs.pays.forEach(p => { const x = miens.find(y => chezMoi(y, p) && !choix.includes(y)); if (x) choix.push(x); });
  miens.forEach(x => { if (choix.length < 2 && !choix.includes(x)) choix.push(x); });
  if (!choix.length) return '';
  choix.slice(0, 2).forEach(nouveau);
  return `<section class="marge" style="display:flex;flex-direction:column;gap:14px">${libelle('Près de chez toi')}
    <p class="precision">Selon les pays que tu as choisis.</p>
    <div class="duo">${choix.slice(0, 2).map(x => carte(x, '', nomPays(prefs.pays.find(p => chezMoi(x, p))))).join('')}</div></section>`;
}
function entete(nom, chapo, cle) {
  return `<header class="entete marge">
    <div class="barre">${RETOUR}<button type="button" class="alerte" data-cloche="${cle}" aria-pressed="${!!prefs.cloches[cle]}" aria-label="Recevoir une notification pour ${esc(nom)}">${CLOCHE}</button></div>
    <div class="ligne-haut"><span>Thème</span><span>${dateDuJour()}</span></div>
    <h1 class="titre-app">${esc(nom)}</h1>${chapo ? `<p class="chapo-theme">${esc(chapo)}</p>` : ''}<div class="filet"></div></header>`;
}

/* ------------------------------------------------------------------ pages */
let D = null;   // les données
const pages = {};

pages.accueil = () => {
  const e = D.essentiel;
  const fil = classerPerso(D.fils.accueil);
  enregistrerFil('accueil', fil);
  const c = D.compte;
  return { classe: 'ecran accueil', theme: prefs.couleur, html: `
    <header class="entete marge">
      <div class="ligne-haut"><span>${dateDuJour()}</span>
        <a class="icone" href="#reglages" aria-label="Réglages">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M4 8h10M18 8h2M4 16h2M10 16h10"/><circle cx="16" cy="8" r="2"/><circle cx="8" cy="16" r="2"/></svg></a></div>
      <h1 class="titre-app nom-app">AVA</h1>
      <span class="devise">All Views Available</span>
      <span class="maj" id="maj">Mis à jour ${ilYa(D.maj)} · ${D.nb_sources} médias</span>
      ${rubriques()}
      <div class="filet"></div></header>
    <section class="marge" style="display:flex;flex-direction:column;gap:14px">${libelle('Mes pays', AJOUTER('reglages-pays'))}
      <nav class="pays" aria-label="Mes pays">${prefs.pays.map(p => `<a href="#pays-${p}" class="tuile"><img src="${esc(photoPays(p))}" alt=""><div><strong>${esc(nomPays(p))}</strong><small>${(c.pays || {})[p] || ''}</small></div></a>`).join('')}</nav></section>
    ${blocPile("L'actualité du jour", avecPhoto(e.une).filter(nouveau), "Tu as vu l'essentiel du jour. À demain matin.")}
    ${blocFil('accueil', fil, "Au fil de l'actu")}
    <p class="pied marge">Tu es à jour. À demain matin.</p>` };
};

function pageTheme(t) {
  const cfg = THEMES[t];
  const fil = classerPerso(D.fils.themes[t] || [], { recence: true, mots: envies(t) });
  enregistrerFil(t, fil);
  const ess = (D.essentiel.themes || {})[t] || [];
  const titreEss = { culture: "L'essentiel de la culture", pop: "L'essentiel pop", environnement: "L'essentiel de l'environnement" }[t] || `L'essentiel ${t === 'sante' ? 'santé' : 'du jour'}`;
  return { classe: `ecran page-theme theme-${t}`, html: entete(cfg.nom, cfg.chapo, t) + blocEssentiel(titreEss, ess, cfg.ess) + blocPerso(t) + (SELECTION[t] ? blocSelection(t) : '') + (SANS_PRES.has(t) ? '' : blocPres(D.fils.themes[t] || [])) + blocFil(t, fil, 'Au fil du thème') + `<p class="pied marge">Tu as fait le tour du thème ${esc(cfg.nom)} aujourd'hui.</p>` };
}
['environnement', 'politique', 'pop', 'voyage', 'tech', 'sante', 'mode', 'gastronomie', 'societe'].forEach(t => { pages[t] = () => pageTheme(t); });

pages.culture = () => {
  const r = pageTheme('culture');
  return { classe: 'ecran culture', teinte: prefs.teinteCulture, html: r.html };
};

/* --- Bourse */
function courbe(points, couleur, l = 120, h = 26) {
  if (!points || points.length < 2) return '';
  const min = Math.min(...points), max = Math.max(...points), d = (max - min) || 1;
  const pts = points.map((v, i) => `${(i / (points.length - 1) * l).toFixed(1)},${(h - 2 - (v - min) / d * (h - 4)).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${l} ${h}" preserveAspectRatio="none" aria-hidden="true"><polyline fill="none" stroke="${couleur}" stroke-width="1.5" points="${pts}"/></svg>`;
}
const nf = (v, d = 2) => Number(v).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
const devise = c => ({ EUR: ' €', USD: ' $', CAD: ' $' }[c] || '');
function variation(v) {
  const haut = v >= 0;
  return `<em class="${haut ? 'hausse' : 'baisse'}">${haut ? '▲ +' : '▼ −'}${nf(Math.abs(v))} %</em>`;
}
/* Transparence : d'où viennent les cours, avec quel décalage, et quand ils ont été relevés */
function provenanceCours() {
  const heure = d => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', ' h ');
  const marches = D.marches || [];
  const dernier = Math.max(0, ...marches.map(m => m.heure || 0)) * 1000;
  let ferme = '';
  if (dernier && Date.now() - dernier > 12 * 3600e3) {
    ferme = ` · Bourses fermées : cours de clôture du ${new Date(dernier).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`;
  }
  return `<p class="provenance">Source : <strong>${esc(D.cours_source || 'Yahoo Finance')}</strong> · cours en différé d'environ 15 à 20 minutes · relevés à ${heure(D.cours_releve || D.maj)}${ferme}</p>`;
}

pages.bourse = () => {
  const fil = classerPerso(D.fils.themes.bourse || [], { recence: true });
  enregistrerFil('bourse', fil);
  const marches = D.marches || [];
  const mes = (D.societes || []).filter(s => prefs.societes.includes(s.symbole));
  const autres = (D.societes || []).filter(s => !prefs.societes.includes(s.symbole));
  return { classe: 'ecran bourse', html: `
    <header class="tete">
      <div class="barre">${RETOUR}<button type="button" class="alerte" data-cloche="bourse" aria-pressed="${!!prefs.cloches.bourse}" aria-label="Recevoir une notification pour la Bourse">${CLOCHE}</button></div>
      <div class="surtitre"><span>Thème</span><span>${dateDuJour()}</span></div>
      <h1 class="titre-theme">Bourse</h1><p class="chapo">${THEMES.bourse.chapo}</p></header>
    <section style="display:flex;flex-direction:column;gap:14px"><div class="marge">${libelle('Les marchés', marches.length ? 'Cours en différé' : '')}</div>
      ${marches.length ? `<div class="marches">${marches.map(m => `<div class="indice"><span>${esc(m.nom)}</span><b>${nf(m.prix)}${m.nom.includes('/') ? '' : devise(m.devise)}</b>${variation(m.variation)}${courbe(m.courbe, m.variation >= 0 ? 'var(--hausse)' : 'var(--baisse)')}</div>`).join('')}</div>`
        : `<p class="vide marge" style="margin:0 20px">Les cours sont momentanément indisponibles. Ils reviennent au prochain passage.</p>`}
      ${marches.length ? `<div class="marge">${provenanceCours()}</div>` : ''}
    </section>
    <section class="marge" style="display:flex;flex-direction:column;gap:14px">${libelle('Mes entreprises', 'Cours en différé')}
      <div><div class="portefeuille">${mes.map((s, i) => `
        <div class="societe">
          <button type="button" class="ligne-societe" aria-expanded="${i === 0}">
            <span><strong>${esc(s.nom)}</strong><small>${esc(s.symbole)} · ${esc(s.place)}</small></span>
            ${courbe(s.courbe, s.variation >= 0 ? 'var(--hausse)' : 'var(--baisse)', 64, 24)}
            <span class="cours"><b>${nf(s.prix)}${devise(s.devise)}</b>${variation(s.variation)}</span></button>
          <div class="detail" ${i === 0 ? '' : 'hidden'}>
            <div class="grande-courbe">${courbe(s.courbe, s.variation >= 0 ? 'var(--hausse)' : 'var(--baisse)', 300, 90)}<div class="periodes" aria-hidden="true"><span class="on">1M</span></div></div>
            <div class="actu-societe">${avecPhoto(s.articles).length ? avecPhoto(s.articles).map(ligneArticle).join('') : '<p class="precision" style="margin:8px 0 0">Pas d\'article sur cette entreprise ces deux derniers jours.</p>'}</div>
            <button type="button" class="voir-plus" data-retirer-societe="${esc(s.symbole)}" style="min-height:40px;font-size:13px">Ne plus suivre ${esc(s.nom)}</button>
          </div></div>`).join('') || '<p class="vide">Ajoute les entreprises dans lesquelles tu as investi.</p>'}</div>
        ${autres.length ? `<button type="button" class="ajouter" data-ouvre="recherche-societes" aria-expanded="false">${PLUS}Ajouter une entreprise que je suis</button>
        <div class="recherche" id="recherche-societes" hidden><label for="champ-societe">Choisis une entreprise</label>
          <input id="champ-societe" type="search" placeholder="Ex. Apple, Airbus…" autocomplete="off">
          <div class="suggestions">${autres.map(s => `<button type="button" data-ajout-societe="${esc(s.symbole)}">${esc(s.nom)}</button>`).join('')}</div></div>` : ''}
      ${mes.length ? provenanceCours() : ''}
      </div></section>
    ${blocEssentiel("L'essentiel de la Bourse", (D.essentiel.themes || {}).bourse, 'defile')}
    ${blocFil('bourse', fil, 'Au fil de la Bourse')}
    <p class="pied marge">Tu as fait le tour de la Bourse aujourd'hui.</p>` };
};

/* --- Sport */
function rxSport(id) { return new RegExp('\\b(' + SPORTS[id][2].split(' ').join('|') + ')', 'i'); }
pages.sport = () => {
  const brut = D.fils.themes.sport || [];
  const fil = classerPerso(brut, { recence: true, mots: prefs.sports.flatMap(s => SPORTS[s][2].split(' ')) });
  enregistrerFil('sport', fil);
  const principal = prefs.sports[0];
  const tete = principal ? `
    <header class="bassin"><img src="img/sport-${principal}.jpg" alt="">
      <div class="barre">${RETOUR}<button type="button" class="alerte" data-cloche="sport" aria-pressed="${!!prefs.cloches.sport}" aria-label="Recevoir une notification pour le Sport">${CLOCHE}</button></div>
      <div class="bassin-bas"><div class="surtitre"><span>Ton sport : ${esc(SPORTS[principal][0])}</span><span>${dateDuJour()}</span></div><h1 class="titre-sport">Sport</h1></div></header>
    <p class="chapo marge">${THEMES.sport.chapo}</p>` : entete('Sport', THEMES.sport.chapo, 'sport');
  const lignes = prefs.sports.map((s, i) => {
    const arts = avecPhoto(brut).filter(a => rxSport(s).test(norm(a.titre + ' ' + a.resume))).slice(0, 5);
    return `<div class="societe"><button type="button" class="ligne-sport" aria-expanded="${i === 0}">
      <span class="vignette"><img src="img/sport-${s}.jpg" alt=""></span>
      <span><strong>${esc(SPORTS[s][0])}</strong><small>${i === 0 ? 'Ton sport principal · ' : ''}${esc(SPORTS[s][1])}</small></span>
      <span>${arts.length} info${arts.length > 1 ? 's' : ''}</span></button>
      <div class="detail" ${i === 0 ? '' : 'hidden'}><div class="actu-societe">${arts.map(ligneArticle).join('') || '<p class="precision" style="margin:8px 0 0">Rien de neuf ces deux derniers jours.</p>'}</div>
      <button type="button" class="voir-plus" data-retirer-sport="${s}" style="min-height:40px;font-size:13px">Retirer ${esc(SPORTS[s][0])}</button></div></div>`;
  }).join('');
  const dispo = Object.keys(SPORTS).filter(s => !prefs.sports.includes(s));
  return { classe: 'ecran sport', html: tete +
    blocEssentiel("L'essentiel du sport", (D.essentiel.themes || {}).sport, 'bandes') + `
    <section class="marge" style="display:flex;flex-direction:column;gap:14px">${libelle('Mes sports')}
      <div><div class="portefeuille">${lignes || '<p class="vide">Choisis les sports que tu pratiques ou aimes suivre.</p>'}</div>
      <button type="button" class="ajouter" data-ouvre="recherche-sports" aria-expanded="false">${PLUS}Choisir un sport</button>
      <div class="recherche" id="recherche-sports" hidden><label for="champ-sport">Cherche un sport</label>
        <input id="champ-sport" type="search" placeholder="Ex. Escalade, Judo…" autocomplete="off">
        <div class="suggestions">${dispo.map(s => `<button type="button" data-ajout-sport="${s}">${esc(SPORTS[s][0])}</button>`).join('')}</div></div></div></section>` +
    blocPres(brut) + blocFil('sport', fil, 'Au fil du sport') + `<p class="pied marge">Tu as fait le tour du sport aujourd'hui.</p>` };
};

/* --- Pays */
const MOTS_SPORT = /\b(open|tennis|atp|wta|semis?|quarts?|demi-finale|finale|match|matchs|football|soccer|rugby|basket|nba|nfl|nhl|f1|grand prix|ligue|championnat|olympi\w*|tournoi|mondial|coupe du monde|world cup|eliminee?|defait|bat|beats)\b/i;
function photoPays(p) {
  if (PAYS[p] && PAYS[p].photo) return PAYS[p].photo;
  // la photo d'un article du pays, jamais un gros plan de visage
  const liste = [...((D.essentiel.pays || {})[p] || []), ...((D.fils.pays || {})[p] || [])].filter(x => x.image);
  // d'abord une photo d'actu du pays lui-même (pas un sportif venu y jouer)
  const sportif = y => y.theme === 'sport' || MOTS_SPORT.test(norm(y.titre));
  const x = liste.find(y => !y.gros_plan && !sportif(y)) || liste.find(y => !y.gros_plan) || liste[0];
  return x ? reduite(x.image, 600) : 'img/france.jpg';
}
// « la Chine », « l'Inde », « le Brésil »… pour des phrases naturelles
const ARTICLES = { france: 'la France', quebec: 'le Québec', canada: 'le Canada', 'etats-unis': 'les États-Unis', 'royaume-uni': 'le Royaume-Uni',
  belgique: 'la Belgique', suisse: 'la Suisse', allemagne: "l'Allemagne", espagne: "l'Espagne", italie: "l'Italie", portugal: 'le Portugal',
  maroc: 'le Maroc', algerie: "l'Algérie", tunisie: 'la Tunisie', senegal: 'le Sénégal', 'cote-ivoire': "la Côte d'Ivoire", liban: 'le Liban',
  israel: 'Israël', ukraine: "l'Ukraine", chine: 'la Chine', japon: 'le Japon', inde: "l'Inde", bresil: 'le Brésil', mexique: 'le Mexique',
  australie: "l'Australie" };
function pagePays(p) {
  const cfg = { nom: nomPays(p), photo: photoPays(p), chapo: `Toute l'actualité qui concerne ${ARTICLES[p] || nomPays(p)}.` };
  const fil = classerPerso(D.fils.pays[p] || [], { recence: true });
  enregistrerFil('pays-' + p, fil);
  return { classe: 'ecran page-pays', html: `
    <header class="bassin"><img src="${cfg.photo}" alt="">
      <div class="barre">${RETOUR}<button type="button" class="alerte" data-cloche="pays-${p}" aria-pressed="${!!prefs.cloches['pays-' + p]}" aria-label="Recevoir une notification pour ${cfg.nom}">${CLOCHE}</button></div>
      <div class="bassin-bas"><div class="surtitre"><span>Pays suivi</span><span>${dateDuJour()}</span></div><h1 class="titre-sport">${cfg.nom}</h1></div></header>
    <p class="chapo marge">${cfg.chapo}</p>
    ${blocEssentiel(`L'essentiel · ${cfg.nom}`, (D.essentiel.pays || {})[p], 'defile')}
    ${blocFil('pays-' + p, fil, "Au fil de l'actu")}
    <p class="pied marge">Tu as fait le tour de l'actu · ${esc(cfg.nom)} aujourd'hui.</p>` };
}
pages['pays-france'] = () => pagePays('france');
pages['pays-quebec'] = () => pagePays('quebec');

/* ------------------------------------------------------------------ Réglages */
const NOMS_PAYS_MEDIAS = { fr: 'France', ca: 'Canada', uk: 'Royaume-Uni', us: 'États-Unis', intl: 'International', be: 'Belgique', ch: 'Suisse',
  de: 'Allemagne', es: 'Espagne', it: 'Italie', ua: 'Ukraine', in: 'Inde', sg: 'Singapour', th: 'Thaïlande', jp: 'Japon', hk: 'Hong Kong',
  au: 'Australie', il: 'Israël', za: 'Afrique du Sud', ng: 'Nigeria', afr: 'Afrique', ar: 'Argentine', br: 'Brésil' };

function appris() {
  // ce qu'AVA a compris de tes habitudes, pour que tu le voies (transparence)
  const h = habitudes();
  const liste = type => Object.keys(Object.assign({}, h.vues[type], h.ouverts[type]))
    .map(cle => [cle, affinite(type, cle), h.ouverts[type][cle] || 0]).filter(([, a]) => a !== 0);
  const plus = [], moins = [];
  [['lieu', 'pays'], ['source', 'média'], ['theme', 'thème']].forEach(([type, mot]) => {
    liste(type).forEach(([cle, a, n]) => {
      const nom = type === 'theme' ? (THEMES[cle] || {}).nom || cle : cle;
      if (a >= 0.4) plus.push([a, `${nom} <small>(${mot})</small>`]);
      if (a <= -0.4) moins.push([a, `${nom} <small>(${mot})</small>`]);
    });
  });
  plus.sort((a, b) => b[0] - a[0]); moins.sort((a, b) => a[0] - b[0]);
  const total = Object.values(h.vues.source).reduce((a, b) => a + b, 0);
  return { plus: plus.slice(0, 8).map(p => p[1]), moins: moins.slice(0, 8).map(p => p[1]), total };
}

/* Réglages : une page sobre, une ligne par réglage ; chaque ligne ouvre sa propre page */
const RETOUR_REGLAGES = RETOUR.replace('#accueil', '#reglages').replace('Accueil</a>', 'Réglages</a>');
const COULEURS = [['encre', 'Bleu encre'], ['papier', 'Papier'], ['sapin', 'Vert sapin']];
const pastille = (attr, val, actif, texte) => `<button type="button" ${attr}="${esc(val)}" aria-pressed="${actif}">${esc(texte)}</button>`;
const resumeListe = (l, vide) => !l.length ? vide : l.length <= 2 ? l.join(', ') : `${l.slice(0, 2).join(', ')} +${l.length - 2}`;
function pageReglage(titre, chapo, contenu) {
  return { classe: 'ecran accueil reglages', theme: prefs.couleur, html: `
    <header class="entete marge">
      <div class="barre">${RETOUR_REGLAGES}</div>
      <h1 class="titre-app">${titre}</h1>
      ${chapo ? `<p class="chapo-theme">${chapo}</p>` : ''}
      <div class="filet"></div></header>
    ${contenu}` };
}

pages.reglages = () => {
  const n = (prefs.medias || []).length;
  const ligne = (lien, nom, resume) => `<a href="#${lien}" class="theme"><strong>${nom}</strong><span><em class="resume-reglage">${esc(resume)}</em>${FLECHE}</span></a>`;
  return { classe: 'ecran accueil reglages', theme: prefs.couleur, html: `
    <header class="entete marge">
      <div class="barre">${RETOUR}</div>
      <h1 class="titre-app">Réglages</h1>
      <p class="chapo-theme">Tout ce que tu choisis ici reste sur ton téléphone.</p></header>
    <nav class="themes marge" aria-label="Réglages">
      ${ligne('reglages-pays', 'Mes pays', resumeListe(prefs.pays.map(nomPays), 'Aucun'))}
      ${ligne('reglages-themes', 'Mes thèmes', resumeListe(prefs.themes.map(t => THEMES[t].nom), 'Aucun'))}
      ${ligne('reglages-medias', 'Médias préférés', n ? `${n} choisi${n > 1 ? 's' : ''}` : 'Aucun')}
      ${ligne('reglages-couleur', 'Couleur', (COULEURS.find(c => c[0] === prefs.couleur) || COULEURS[0])[1])}
      ${ligne('reglages-appris', 'Ce qu\'AVA a appris', '')}
    </nav>
    <div class="marge"><button type="button" class="voir-plus" id="revoir-guide">Revoir le guide de démarrage</button></div>
    <p class="pied marge">AVA lit ${D.nb_sources} médias. Ton fil reste mondial : tes habitudes changent seulement l'ordre et le dosage.</p>` };
};

pages['reglages-pays'] = () => pageReglage('Mes pays', 'Chaque pays choisi a sa propre page, à part de l\'accueil.',
  `<section class="marge bloc-reglage"><div class="envies">${paysProposes().map(k => pastille('data-pays', k, prefs.pays.includes(k), nomPays(k))).join('')}</div></section>`);

pages['reglages-themes'] = () => pageReglage('Mes thèmes', 'Ils défilent en haut de l\'accueil. Chacun a sa propre page.',
  `<section class="marge bloc-reglage"><div class="envies">${Object.entries(THEMES).map(([k, t]) => pastille('data-mon-theme', k, prefs.themes.includes(k), t.nom)).join('')}</div></section>`);

pages['reglages-couleur'] = () => pageReglage('Couleur', 'La couleur de ton accueil.',
  `<section class="marge bloc-reglage"><div class="envies">${COULEURS.map(([v, t]) => pastille('data-couleur', v, prefs.couleur === v, t)).join('')}</div></section>`);

pages['reglages-medias'] = () => {
  const groupes = {};
  (D.medias || []).forEach(m => { (groupes[m.pays] = groupes[m.pays] || []).push(m.nom); });
  const ordre = ['fr', 'ca', 'uk', 'us', 'intl', 'be', 'ch', 'de', 'es', 'it', 'ua', 'in', 'jp', 'hk', 'sg', 'th', 'au', 'il', 'za', 'ng', 'afr', 'ar', 'br'];
  const pays = Object.keys(groupes).sort((a, b) => (ordre.indexOf(a) + 99) % 99 - (ordre.indexOf(b) + 99) % 99);
  return pageReglage('Médias préférés', 'Ils passent devant dans ton fil. Les autres restent là, juste un peu plus bas.', `
    <section class="marge bloc-reglage">${libelle('Tes choix', `<span id="nb-medias">${(prefs.medias || []).length} choisi${(prefs.medias || []).length > 1 ? 's' : ''}</span>`)}
      <label class="recherche-medias"><span class="sr">Chercher un média</span><input id="cherche-media" type="search" placeholder="Chercher un média…" autocomplete="off"></label>
      ${pays.map(p => `<div class="groupe-medias" data-groupe><h3>${esc(NOMS_PAYS_MEDIAS[p] || p)}</h3>
        <div class="envies">${groupes[p].map(n => pastille('data-media', n, (prefs.medias || []).includes(n), n)).join('')}</div></div>`).join('')}
    </section>`);
};

pages['reglages-appris'] = () => {
  const a = appris();
  return pageReglage('Ce qu\'AVA a appris', 'AVA compare ce que tu ouvres à ce que tu fais défiler. Tout reste sur ton téléphone.', `
    <section class="marge bloc-reglage">
      ${a.total < 30 ? `<p class="precision">Encore quelques visites et tu verras ici ce que tu préfères.</p>` : `
      <div class="appris"><div><h3>Tu lis plus</h3><p>${a.plus.join(' · ') || '—'}</p></div>
      <div><h3>Tu lis moins</h3><p>${a.moins.join(' · ') || '—'}</p></div></div>`}
      <button type="button" class="voir-plus" id="effacer-habitudes">Effacer mes habitudes de lecture</button>
    </section>`);
};

function activerReglages() {
  const champ = $('#cherche-media');
  if (champ) champ.addEventListener('input', () => {
    const q = norm(champ.value.trim());
    document.querySelectorAll('[data-groupe]').forEach(g => {
      let visibles = 0;
      g.querySelectorAll('[data-media]').forEach(b => { const ok = !q || norm(b.textContent).includes(q); b.hidden = !ok; if (ok) visibles++; });
      g.hidden = !visibles;
    });
  });
  const rg = $('#revoir-guide');
  if (rg) rg.addEventListener('click', ouvrirGuide);
  const eff = $('#effacer-habitudes');
  if (eff) eff.addEventListener('click', () => { prefs.habitudes = null; prefs.lectures = {}; habitudes(); sauver(); afficher(vueCourante, true); montrer('Habitudes effacées. AVA recommence à apprendre.'); });
}

/* ------------------------------------------------------------------ le guide de démarrage (4 pages, au premier lancement) */
const MIN_ARTICLES_PAYS = 8;   // un pays n'est proposé que s'il a assez d'actu pour remplir sa page
function paysProposes() {
  const compte = (D.compte || {}).pays || {};
  return Object.keys(D.pays_suivis || PAYS).filter(p => (compte[p] || 0) >= MIN_ARTICLES_PAYS || prefs.pays.includes(p));
}
function nomPays(p) { return (D.pays_suivis || {})[p] || (PAYS[p] || {}).nom || p; }

function ouvrirGuide() {
  const choixPays = new Set(prefs.guideVu ? prefs.pays : []);
  const choixThemes = new Set(prefs.guideVu ? prefs.themes : []);
  const fond = document.createElement('div');
  fond.className = 'guide accueil';
  fond.dataset.theme = prefs.couleur;
  fond.setAttribute('role', 'dialog');
  fond.setAttribute('aria-modal', 'true');
  fond.setAttribute('aria-label', 'Bienvenue sur AVA');
  const pastilles = (liste, choix, attr) => liste.map(([k, t]) => `<button type="button" ${attr}="${esc(k)}" aria-pressed="${choix.has(k)}">${esc(t)}</button>`).join('');
  fond.innerHTML = `
    <button type="button" class="guide-passer">Passer</button>
    <div class="guide-pages" id="guide-pages">
      <section class="guide-page">
        <span class="guide-sur">Bienvenue</span>
        <h1 class="guide-nom">AVA</h1>
        <span class="devise">All Views Available</span>
        <p>L'actualité du monde entier, choisie parmi plus de ${Math.floor((D.nb_sources || 80) / 10) * 10} médias reconnus.</p>
        <p>L'essentiel en quelques minutes, pour suivre tout ce dont on parle.</p>
      </section>
      <section class="guide-page">
        <span class="guide-sur">Chaque matin</span>
        <h2>Les 5 infos du jour</h2>
        <p>Chaque matin, AVA réunit les 5 informations à connaître, venues des quatre coins du monde.</p>
        <p>Une notification, cinq titres, et ta journée commence en étant à jour.</p>
        <button type="button" class="guide-action" id="guide-notif">${prefs.notifMatin ? 'Notification du matin activée' : 'Recevoir les 5 infos chaque matin'}</button>
        <p class="guide-note" id="guide-note"></p>
      </section>
      <section class="guide-page">
        <span class="guide-sur">Tes pays</span>
        <h2>Quels pays veux-tu suivre&nbsp;?</h2>
        <p>Chaque pays choisi a sa propre page, à part de l'accueil. Tu y retrouves toute son actualité.</p>
        <p class="guide-note">Tu pourras en ajouter ou en retirer à tout moment dans les réglages.</p>
        <div class="envies">${pastilles(paysProposes().map(p => [p, nomPays(p)]), choixPays, 'data-guide-pays')}</div>
      </section>
      <section class="guide-page">
        <span class="guide-sur">Tes thèmes</span>
        <h2>Qu'est-ce qui t'intéresse&nbsp;?</h2>
        <p>Chaque thème a lui aussi sa propre page, accessible depuis l'accueil. L'accueil, lui, reste une vue du monde entier.</p>
        <p class="guide-note">Choisis-en autant que tu veux.</p>
        <div class="envies">${pastilles(Object.entries(THEMES).map(([k, t]) => [k, t.nom]), choixThemes, 'data-guide-theme')}</div>
      </section>
    </div>
    <div class="guide-bas">
      <div class="guide-points" aria-hidden="true">${[0, 1, 2, 3].map(i => `<span class="${i ? '' : 'on'}"></span>`).join('')}</div>
      <button type="button" class="guide-suivant" id="guide-suivant">Suivant</button>
    </div>`;
  document.body.appendChild(fond);
  document.body.style.overflow = 'hidden';
  const pagesG = fond.querySelector('#guide-pages');
  const points = fond.querySelectorAll('.guide-points span');
  const suivant = fond.querySelector('#guide-suivant');
  const page = () => Math.round(pagesG.scrollLeft / pagesG.clientWidth);
  const majBas = () => {
    const i = page();
    points.forEach((p, k) => p.classList.toggle('on', k === i));
    suivant.textContent = i === 3 ? 'Commencer' : 'Suivant';
  };
  pagesG.addEventListener('scroll', majBas, { passive: true });
  const terminer = () => {
    prefs.guideVu = true;
    if (choixPays.size) prefs.pays = [...choixPays];
    if (choixThemes.size) prefs.themes = Object.keys(THEMES).filter(t => choixThemes.has(t));
    sauver();
    fond.remove();
    document.body.style.overflow = '';
    afficher('accueil');
  };
  suivant.addEventListener('click', () => {
    const i = page();
    if (i >= 3) return terminer();
    pagesG.scrollTo({ left: (i + 1) * pagesG.clientWidth, behavior: 'smooth' });
  });
  fond.querySelector('.guide-passer').addEventListener('click', terminer);
  fond.addEventListener('click', e => {
    const bp = e.target.closest('[data-guide-pays]'), bt = e.target.closest('[data-guide-theme]');
    const b = bp || bt;
    if (!b) return;
    const ens = bp ? choixPays : choixThemes, k = bp ? bp.dataset.guidePays : bt.dataset.guideTheme;
    ens.has(k) ? ens.delete(k) : ens.add(k);
    b.setAttribute('aria-pressed', ens.has(k));
  });
  fond.querySelector('#guide-notif').addEventListener('click', async e => {
    const note = fond.querySelector('#guide-note');
    prefs.notifMatin = true; sauver();
    e.target.textContent = 'Notification du matin activée';
    if ('Notification' in window && Notification.permission !== 'denied') {
      try { await Notification.requestPermission(); } catch (err) { /* certains navigateurs refusent la demande */ }
    }
    note.textContent = "C'est noté. L'envoi chaque matin arrivera avec l'application ; ton choix est déjà enregistré.";
  });
  suivant.focus();
}

/* ------------------------------------------------------------------ affichage */
let vueCourante = 'accueil';
function afficher(nom, garderPosition) {
  if (!pages[nom]) nom = 'accueil';
  vueCourante = nom;
  vusPage = [];
  const r = pages[nom]();
  const vue = $('#vue');
  vue.className = r.classe;
  if (r.theme) vue.dataset.theme = r.theme; else delete vue.dataset.theme;
  if (r.teinte) vue.dataset.teinte = r.teinte; else delete vue.dataset.teinte;
  vue.innerHTML = r.html;
  document.querySelector('meta[name="theme-color"]').content = getComputedStyle(vue).getPropertyValue('--fond').trim() || '#14213A';
  if (!garderPosition) window.scrollTo(0, 0);
  activer();
  observerVues();
  if (nom.startsWith('reglages')) activerReglages();
}
window.addEventListener('hashchange', () => afficher(location.hash.slice(1) || 'accueil'));

function activer() {
  // carrousels : la barre de progression suit le défilement
  document.querySelectorAll('[data-progression]').forEach(d => {
    const barres = d.parentElement.querySelectorAll('.progression span');
    d.addEventListener('scroll', () => {
      const i = Math.round(d.scrollLeft / (d.firstElementChild.offsetWidth + 12));
      barres.forEach((b, k) => b.classList.toggle('on', k === i));
    }, { passive: true });
  });
  // recherche dans les suggestions
  document.querySelectorAll('.recherche input').forEach(champ => champ.addEventListener('input', () => {
    const q = norm(champ.value.trim());
    champ.closest('.recherche').querySelectorAll('.suggestions button').forEach(b => { b.hidden = q && !norm(b.textContent).includes(q); });
  }));
  if ($('#pile')) activerPile();
}

/* ------------------------------------------------------------------ fiche d'un article */
function ouvrirFiche(id) {
  const x = registre.get(id);
  if (!x) return;
  noter(x, 'ouverts');
  const autres = x.sources ? x.sources.slice(1) : (x.autres || []);
  const principal = x.sources ? x.sources[0] : { nom: x.source, lien: x.lien };
  const fond = document.createElement('div');
  fond.className = 'fiche-fond';
  fond.innerHTML = `<div class="fiche" role="dialog" aria-modal="true" aria-label="${esc(x.titre)}">
    <span class="poignee" aria-hidden="true"></span>
    <div class="photo"><img src="${esc(reduite(x.image, 900))}" alt="" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${esc(x.image)}'"></div>
    <span class="meta">${esc(principal.nom)} · ${esc(x.rubrique || '')}${x.lieu ? ' · ' + esc(x.lieu) : ''} · ${ilYa(x.date)}</span>
    <h2>${titre(x)}</h2>
    ${x.resume ? `<p>${esc(x.resume)}</p>` : ''}
    <a class="principal" href="${esc(principal.lien)}" target="_blank" rel="noopener" data-lu="${esc(x.id)}">Lire chez ${esc(principal.nom)} ${FLECHE}</a>
    ${autres.length ? `<h3>Ils en parlent aussi</h3>${autres.map(s => `<a class="autre" href="${esc(s.lien)}" target="_blank" rel="noopener" data-lu="${esc(x.id)}"><span>${esc(s.nom)}</span><b>${esc(s.titre || x.titre)}</b></a>`).join('')}` : ''}
    <button type="button" class="fermer">Fermer</button></div>`;
  document.body.appendChild(fond);
  document.body.style.overflow = 'hidden';
  const fermer = () => { fond.remove(); document.body.style.overflow = ''; };
  fond.addEventListener('click', e => { if (e.target === fond || e.target.closest('.fermer')) fermer(); });
  document.addEventListener('keydown', function esc_(e) { if (e.key === 'Escape') { fermer(); document.removeEventListener('keydown', esc_); } });
  fond.querySelector('.principal').focus();
}

/* ------------------------------------------------------------------ clics */
document.addEventListener('click', e => {
  const lien = e.target.closest('a[data-lu]');
  if (lien) { noter(registre.get(lien.dataset.lu), 'ouverts'); return; }
  const ouvrir = e.target.closest('[data-ouvrir]');
  if (ouvrir && !e.target.closest('.lire a:not([data-ouvrir])')) {
    if (ouvrir.closest('.pile-culture') && glisseRecente) return;
    e.preventDefault(); ouvrirFiche(ouvrir.dataset.ouvrir); return;
  }
  const plus = e.target.closest('[data-plus]');
  if (plus) {
    const cle = plus.dataset.plus, zone = document.querySelector(`[data-fil="${cle}"]`);
    const n = +zone.dataset.n + PAR_PAGE;
    zone.dataset.n = n;
    zone.innerHTML = mosaique(filsAffiches[cle].slice(0, n));
    if (n >= filsAffiches[cle].length) plus.remove();
    observerVues();
    return;
  }
  const bientot = e.target.closest('[data-bientot]');
  if (bientot) { e.preventDefault(); montrer(bientot.dataset.bientot); return; }
  const ligne = e.target.closest('.ligne-societe, .ligne-sport');
  if (ligne) {
    const ouvert = ligne.getAttribute('aria-expanded') === 'true';
    ligne.setAttribute('aria-expanded', !ouvert);
    ligne.nextElementSibling.hidden = ouvert;
    return;
  }
  const cloche = e.target.closest('[data-cloche]');
  if (cloche) {
    const k = cloche.dataset.cloche, actif = !prefs.cloches[k];
    prefs.cloches[k] = actif; sauver();
    cloche.setAttribute('aria-pressed', actif);
    montrer(actif ? 'Notification activée. Elle fonctionnera dans la version app.' : 'Notification désactivée.');
    return;
  }
  const ouvre = e.target.closest('[data-ouvre]');
  if (ouvre) {
    const zone = document.getElementById(ouvre.dataset.ouvre);
    zone.hidden = !zone.hidden;
    ouvre.setAttribute('aria-expanded', !zone.hidden);
    if (!zone.hidden) zone.querySelector('input').focus();
    return;
  }
  const envie = e.target.closest('[data-envie]');
  if (envie) {
    const t = envie.dataset.envie, c = envie.textContent, l = envies(t).slice();
    const i = l.indexOf(c);
    if (i >= 0) l.splice(i, 1); else l.push(c);
    prefs.envies[t] = l; sauver();
    envie.setAttribute('aria-pressed', i < 0);
    if (SELECTION[t]) afficher(t, true);
    return;
  }
  const couleur = e.target.closest('[data-couleur]');
  if (couleur) { prefs.couleur = couleur.dataset.couleur; sauver(); afficher(vueCourante, true); return; }
  const paysB = e.target.closest('[data-pays]');
  if (paysB) {
    const k = paysB.dataset.pays;
    prefs.pays = prefs.pays.includes(k) ? prefs.pays.filter(p => p !== k) : prefs.pays.concat(k);
    sauver(); paysB.setAttribute('aria-pressed', prefs.pays.includes(k)); return;
  }
  const monTheme = e.target.closest('[data-mon-theme]');
  if (monTheme) {
    const k = monTheme.dataset.monTheme;
    prefs.themes = Object.keys(THEMES).filter(t => t === k ? !prefs.themes.includes(k) : prefs.themes.includes(t));
    sauver(); monTheme.setAttribute('aria-pressed', prefs.themes.includes(k)); return;
  }
  const media = e.target.closest('[data-media]');
  if (media) {
    const n = media.dataset.media;
    prefs.medias = (prefs.medias || []).includes(n) ? prefs.medias.filter(m => m !== n) : (prefs.medias || []).concat(n);
    sauver(); media.setAttribute('aria-pressed', prefs.medias.includes(n));
    const c = $('#nb-medias'); if (c) c.textContent = `${prefs.medias.length} choisi${prefs.medias.length > 1 ? 's' : ''}`;
    return;
  }
  const ajS = e.target.closest('[data-ajout-societe]');
  if (ajS) { prefs.societes.push(ajS.dataset.ajoutSociete); sauver(); afficher('bourse', true); montrer(`${ajS.textContent} ajoutée à tes entreprises.`); return; }
  const reS = e.target.closest('[data-retirer-societe]');
  if (reS) { prefs.societes = prefs.societes.filter(s => s !== reS.dataset.retirerSociete); sauver(); afficher('bourse', true); return; }
  const ajSp = e.target.closest('[data-ajout-sport]');
  if (ajSp) { prefs.sports.push(ajSp.dataset.ajoutSport); sauver(); afficher('sport', true); montrer(`${ajSp.textContent} ajouté à tes sports.`); return; }
  const reSp = e.target.closest('[data-retirer-sport]');
  if (reSp) { prefs.sports = prefs.sports.filter(s => s !== reSp.dataset.retirerSport); sauver(); afficher('sport', true); return; }
});

/* ------------------------------------------------------------------ Culture : les cartes à faire glisser */
let glisseRecente = false;
function activerPile() {
  const pile = $('#pile');
  const restantes = () => [...pile.querySelectorAll('.une.glisse:not(.partie)')];
  pile.querySelectorAll('.une.glisse').forEach(c => c.insertAdjacentHTML('afterbegin', '<span class="tampon-choix garder" aria-hidden="true">Gardée</span><span class="tampon-choix passer" aria-hidden="true">Passée</span>'));
  const ranger = () => {
    const l = restantes();
    l.forEach((c, k) => {
      c.style.zIndex = 10 - k;
      c.style.transform = `translateY(${Math.min(k, 2) * 12}px) scale(${1 - Math.min(k, 2) * 0.045})`;
      c.style.opacity = k < 3 ? 1 : 0;
      c.style.pointerEvents = k === 0 ? 'auto' : 'none';
      c.querySelectorAll('.tampon-choix').forEach(t => { t.style.opacity = 0; });
    });
    const compte = $('#compte-pile');
    if (compte) compte.textContent = l.length ? `${l.length} info${l.length > 1 ? 's' : ''}` : 'Terminé';
    document.querySelectorAll('[data-swipe]').forEach(b => { b.disabled = !l.length; });
  };
  const envoyer = (c, sens) => {
    c.classList.remove('prise'); c.classList.add('partie');
    c.style.transform = `translateX(${sens * 520}px) rotate(${sens * 18}deg)`;
    c.style.opacity = 0; c.style.pointerEvents = 'none';
    if (sens > 0) montrer('Info gardée pour plus tard.');
    ranger();
  };
  let g = null;
  pile.addEventListener('pointerdown', e => {
    const c = e.target.closest('.une.glisse');
    if (!c || c !== restantes()[0] || e.target.closest('a, button')) return;
    g = { c, x: e.clientX, y: e.clientY, dx: 0 };
    c.classList.add('prise'); c.setPointerCapture(e.pointerId);
  });
  pile.addEventListener('pointermove', e => {
    if (!g) return;
    g.dx = e.clientX - g.x;
    g.c.style.transform = `translate(${g.dx}px,${(e.clientY - g.y) * 0.2}px) rotate(${g.dx / 18}deg)`;
    g.c.querySelector('.garder').style.opacity = Math.max(0, Math.min(1, g.dx / 90));
    g.c.querySelector('.passer').style.opacity = Math.max(0, Math.min(1, -g.dx / 90));
  });
  const lacher = () => {
    if (!g) return;
    const { c, dx } = g; g = null;
    c.classList.remove('prise');
    glisseRecente = Math.abs(dx) > 8;
    setTimeout(() => { glisseRecente = false; }, 50);
    if (Math.abs(dx) > 100) envoyer(c, dx > 0 ? 1 : -1); else ranger();
  };
  pile.addEventListener('pointerup', lacher);
  pile.addEventListener('pointercancel', lacher);
  document.querySelectorAll('[data-swipe]').forEach(b => b.addEventListener('click', () => { const c = restantes()[0]; if (c) envoyer(c, +b.dataset.swipe); }));
  $('#revoir').addEventListener('click', () => { pile.querySelectorAll('.une.glisse').forEach(c => c.classList.remove('partie')); ranger(); });
  ranger();
}

/* ------------------------------------------------------------------ chargement et mise à jour */
async function charger() {
  const r = await fetch(DONNEES + '?t=' + Date.now(), { cache: 'no-store' });
  if (!r.ok) throw new Error('données indisponibles');
  return r.json();
}
async function demarrer() {
  try {
    D = await charger();
    Object.keys(D.pays_suivis || {}).forEach(p => { pages['pays-' + p] = () => pagePays(p); });
    // on ouvre toujours AVA sur l'accueil (le téléphone peut garder l'adresse des réglages en mémoire)
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    afficher('accueil');
    if (!prefs.guideVu) ouvrirGuide();
  } catch (e) {
    $('#vue').innerHTML = `<p class="pied marge" style="padding-top:40vh">L'actualité n'a pas pu être chargée. Vérifie ta connexion, puis recharge la page.</p>`;
    return;
  }
  setInterval(async () => {
    try {
      const n = await charger();
      if (n.maj === D.maj) { const m = $('#maj'); if (m) m.textContent = `Mis à jour ${ilYa(D.maj)} · ${D.nb_sources} médias`; return; }
      D = n;
      // on ne remplace que les fils, pour ne pas faire sauter la page pendant la lecture
      document.querySelectorAll('[data-fil]').forEach(zone => {
        const cle = zone.dataset.fil;
        const src = cle === 'accueil' ? D.fils.accueil : cle.startsWith('pays-') ? D.fils.pays[cle.slice(5)] : D.fils.themes[cle];
        if (!src) return;
        const deja = vusPage.filter(v => !filsAffiches[cle].some(x => x.lien === v.lien));
        filsAffiches[cle] = classerPerso(src, cle === 'accueil' ? {} : { recence: true }).filter(x => !deja.some(v => v.lien === x.lien || memeSujet(empreinte(x.titre), v.e)));
        zone.innerHTML = mosaique(filsAffiches[cle].slice(0, +zone.dataset.n));
      });
      const m = $('#maj'); if (m) m.textContent = `Mis à jour ${ilYa(D.maj)} · ${D.nb_sources} médias`;
      observerVues();
    } catch (e) { /* on réessaiera au prochain tour */ }
  }, RAFRAICHIR_MIN * 60000);
}
demarrer();
