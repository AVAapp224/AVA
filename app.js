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
  envies: {}, cloches: {}, lectures: {},
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
  return `<a href="${esc(a.lien)}" class="ligne-article" data-ouvrir="${esc(a.id)}"><span class="vignette">${photo(a, '', 160)}</span><span><span>${esc(a.source)} · ${ilYa(a.date)}</span><b>${esc(a.titre)}</b></span></a>`;
}

/* ------------------------------------------------------------------ cartes */
function lireChez(x) {
  const sources = x.sources || [{ nom: x.source, lien: x.lien }];
  return `<div class="lire"><span>Lire chez</span>${sources.slice(0, 3).map(s => `<a href="${esc(s.lien)}" target="_blank" rel="noopener" data-lu="${esc(x.theme || '')}">${esc(s.nom)}</a>`).join('')}${sources.length > 3 ? `<a href="#" data-ouvrir="${esc(x.id)}">+${sources.length - 3}</a>` : ''}</div>`;
}
function carteUne(x) {
  inscrire(x);
  return `<article class="une" data-ouvrir="${esc(x.id)}">${photo(x, x.titre)}
    <div class="voile"><span class="rubrique">${esc(x.rubrique)}</span><h3>${titre(x)}</h3>${lireChez(x)}</div></article>`;
}
function bande(x) {
  inscrire(x);
  return `<a href="${esc(x.lien)}" class="bande" data-ouvrir="${esc(x.id)}">${photo(x, x.titre)}
    <span class="source">${esc(x.source)}</span>${nbAutres(x)}
    <div class="voile"><span class="rubrique">${esc(x.rubrique)}</span><h3>${titre(x)}</h3></div></a>`;
}
function affiche(x) {
  inscrire(x);
  return `<a href="${esc(x.lien)}" class="affiche" data-ouvrir="${esc(x.id)}">${photo(x, x.titre)}
    <span class="source">${esc(x.source)}</span>
    <div class="voile"><span class="rubrique">${esc(x.rubrique)}</span><h3>${titre(x)}</h3></div></a>`;
}
function nbAutres(x) {
  const n = (x.sources ? x.sources.length - 1 : (x.autres || []).length);
  return n > 0 ? `<span class="autres-badge">+${n} média${n > 1 ? 's' : ''}</span>` : '';
}
function carte(x, taille, etiquette) {
  inscrire(x);
  return `<a href="${esc(x.lien)}" class="carte ${taille}" data-ouvrir="${esc(x.id)}">${photo(x, x.titre)}
    <span class="source">${esc(x.source)}</span>${etiquette ? `<span class="pays-tag">${esc(etiquette)}</span>` : nbAutres(x)}
    <div class="voile"><h3>${titre(x)}</h3></div></a>`;
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

/* ------------------------------------------------------------------ algorithme côté téléphone : ce que tu lis le plus */
function ordonner(items, motsBonus) {
  const lect = prefs.lectures || {};
  const total = Object.values(lect).reduce((a, b) => a + b, 0) || 1;
  const bonus = motsBonus && motsBonus.length ? new RegExp('\\b(' + motsBonus.map(m => norm(m).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'i') : null;
  return items.map(x => {
    let s = new Date(x.date).getTime();
    s += Math.min(6, (lect[x.theme] || 0) / total * 12) * 3600e3;        // jusqu'à 6 h d'avance pour tes thèmes préférés
    if (bonus && bonus.test(norm(x.titre + ' ' + x.resume))) s += 4 * 3600e3;
    if (x.image) s += 0.5 * 3600e3;
    if (x.gros_plan) s -= 8 * 3600e3;                                     // les gros plans de visages descendent dans le fil
    if (x.langue === 'fr') s += 1.5 * 3600e3;                            // le français passe un peu devant
    return [s, x];
  }).sort((a, b) => b[0] - a[0]).map(p => p[1]);
}
function lu(theme) {
  if (!theme) return;
  prefs.lectures[theme] = (prefs.lectures[theme] || 0) + 1;
  sauver();
}

/* ------------------------------------------------------------------ blocs de page */
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
function blocPile(titre, items) {
  return `<section style="display:flex;flex-direction:column;gap:16px"><div class="marge">${libelle(titre, `<span id="compte-pile">${items.length} infos</span>`)}</div>
    <div class="marge"><div class="pile-culture" id="pile">
      <div class="fin-pile"><p>Tu as vu l'essentiel de la culture aujourd'hui.</p><button type="button" class="bouton-clair" id="revoir">Revoir les ${items.length} infos</button></div>
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
function blocPres(items) {
  const deja = vusPage.slice();
  const miens = avecPhoto(items).filter(x => !deja.some(v => v.lien === x.lien || memeSujet(empreinte(x.titre), v.e))).filter(x => (x.pays || []).some(p => prefs.pays.includes(p)));
  const choix = [];
  prefs.pays.forEach(p => { const x = miens.find(y => y.pays.includes(p) && !choix.includes(y)); if (x) choix.push(x); });
  miens.forEach(x => { if (choix.length < 2 && !choix.includes(x)) choix.push(x); });
  if (!choix.length) return '';
  choix.slice(0, 2).forEach(nouveau);
  return `<section class="marge" style="display:flex;flex-direction:column;gap:14px">${libelle('Près de chez toi')}
    <p class="precision">Selon les pays que tu as choisis.</p>
    <div class="duo">${choix.slice(0, 2).map(x => carte(x, '', PAYS[x.pays.find(p => prefs.pays.includes(p))].nom)).join('')}</div></section>`;
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
  const fil = ordonner(D.fils.accueil);
  enregistrerFil('accueil', fil);
  const c = D.compte;
  return { classe: 'ecran accueil', theme: prefs.couleur, html: `
    <header class="entete marge">
      <div class="ligne-haut"><span>${dateDuJour()}</span>
        <button class="icone" type="button" aria-label="Réglages" data-bientot="Les réglages arrivent bientôt.">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M4 8h10M18 8h2M4 16h2M10 16h10"/><circle cx="16" cy="8" r="2"/><circle cx="8" cy="16" r="2"/></svg></button></div>
      <h1 class="titre-app nom-app">AVA</h1>
      <span class="devise">All Views Available</span>
      <span class="maj" id="maj">Mis à jour ${ilYa(D.maj)} · ${D.nb_sources} médias</span>
      <div class="filet"></div></header>
    <section class="marge" style="display:flex;flex-direction:column;gap:14px">${libelle('Mes pays')}
      <nav class="pays" aria-label="Mes pays">${prefs.pays.map(p => `<a href="#pays-${p}" class="tuile"><img src="${PAYS[p].photo}" alt=""><div><strong>${PAYS[p].nom}</strong><small>${(c.pays || {})[p] || ''}</small></div></a>`).join('')}</nav></section>
    ${blocEssentiel("L'actualité du jour", e.une, 'defile')}
    ${blocFil('accueil', fil, "Au fil de l'actu")}
    <section class="marge" style="display:flex;flex-direction:column;gap:16px">${libelle('Mes thèmes')}
      <nav class="themes" aria-label="Mes thèmes">${prefs.themes.map(t => `<a href="#${t}" class="theme"><strong>${THEMES[t].nom}</strong><span>${(c.themes || {})[t] || 0} infos${FLECHE}</span></a>`).join('')}</nav></section>
    <p class="pied marge">Tu es à jour. À demain matin.</p>` };
};

function pageTheme(t) {
  const cfg = THEMES[t];
  const fil = ordonner(D.fils.themes[t] || [], envies(t));
  enregistrerFil(t, fil);
  const ess = (D.essentiel.themes || {})[t] || [];
  const titreEss = { culture: "L'essentiel de la culture", pop: "L'essentiel pop", environnement: "L'essentiel de l'environnement" }[t] || `L'essentiel ${t === 'sante' ? 'santé' : 'du jour'}`;
  return { classe: `ecran page-theme theme-${t}`, html: entete(cfg.nom, cfg.chapo, t) + blocEssentiel(titreEss, ess, cfg.ess) + blocPerso(t) + blocPres(D.fils.themes[t] || []) + blocFil(t, fil, 'Au fil du thème') + `<p class="pied marge">Tu as fait le tour du thème ${esc(cfg.nom)} aujourd'hui.</p>` };
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
pages.bourse = () => {
  const fil = ordonner(D.fils.themes.bourse || []);
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
      </div></section>
    ${blocEssentiel("L'essentiel de la Bourse", (D.essentiel.themes || {}).bourse, 'defile')}
    ${blocPres(D.fils.themes.bourse || [])}
    ${blocFil('bourse', fil, 'Au fil de la Bourse')}
    <p class="pied marge">Tu as fait le tour de la Bourse aujourd'hui.</p>` };
};

/* --- Sport */
function rxSport(id) { return new RegExp('\\b(' + SPORTS[id][2].split(' ').join('|') + ')', 'i'); }
pages.sport = () => {
  const brut = D.fils.themes.sport || [];
  const fil = ordonner(brut, prefs.sports.flatMap(s => SPORTS[s][2].split(' ')));
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
function pagePays(p) {
  const cfg = PAYS[p];
  const fil = ordonner(D.fils.pays[p] || []);
  enregistrerFil('pays-' + p, fil);
  return { classe: 'ecran page-pays', html: `
    <header class="bassin"><img src="${cfg.photo}" alt="">
      <div class="barre">${RETOUR}<button type="button" class="alerte" data-cloche="pays-${p}" aria-pressed="${!!prefs.cloches['pays-' + p]}" aria-label="Recevoir une notification pour ${cfg.nom}">${CLOCHE}</button></div>
      <div class="bassin-bas"><div class="surtitre"><span>Mon pays</span><span>${dateDuJour()}</span></div><h1 class="titre-sport">${cfg.nom}</h1></div></header>
    <p class="chapo marge">${cfg.chapo}</p>
    ${blocEssentiel(`L'essentiel ${p === 'france' ? 'en France' : 'au Québec'}`, (D.essentiel.pays || {})[p], 'defile')}
    ${blocFil('pays-' + p, fil, "Au fil de l'actu")}
    <p class="pied marge">Tu as fait le tour de l'actu ${p === 'france' ? 'en France' : 'au Québec'} aujourd'hui.</p>` };
}
pages['pays-france'] = () => pagePays('france');
pages['pays-quebec'] = () => pagePays('quebec');

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
  const autres = x.sources ? x.sources.slice(1) : (x.autres || []);
  const principal = x.sources ? x.sources[0] : { nom: x.source, lien: x.lien };
  const fond = document.createElement('div');
  fond.className = 'fiche-fond';
  fond.innerHTML = `<div class="fiche" role="dialog" aria-modal="true" aria-label="${esc(x.titre)}">
    <span class="poignee" aria-hidden="true"></span>
    <div class="photo"><img src="${esc(reduite(x.image, 900))}" alt="" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${esc(x.image)}'"></div>
    <span class="meta">${esc(principal.nom)} · ${esc(x.rubrique || '')} · ${ilYa(x.date)}</span>
    <h2>${titre(x)}</h2>
    ${x.resume ? `<p>${esc(x.resume)}</p>` : ''}
    <a class="principal" href="${esc(principal.lien)}" target="_blank" rel="noopener" data-lu="${esc(x.theme || '')}">Lire chez ${esc(principal.nom)} ${FLECHE}</a>
    ${autres.length ? `<h3>Ils en parlent aussi</h3>${autres.map(s => `<a class="autre" href="${esc(s.lien)}" target="_blank" rel="noopener" data-lu="${esc(x.theme || '')}"><span>${esc(s.nom)}</span><b>${esc(s.titre || x.titre)}</b></a>`).join('')}` : ''}
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
  if (lien) { lu(lien.dataset.lu); return; }
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
    afficher(location.hash.slice(1) || 'accueil');
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
        filsAffiches[cle] = ordonner(src).filter(x => !deja.some(v => v.lien === x.lien || memeSujet(empreinte(x.titre), v.e)));
        zone.innerHTML = mosaique(filsAffiches[cle].slice(0, +zone.dataset.n));
      });
      const m = $('#maj'); if (m) m.textContent = `Mis à jour ${ilYa(D.maj)} · ${D.nb_sources} médias`;
    } catch (e) { /* on réessaiera au prochain tour */ }
  }, RAFRAICHIR_MIN * 60000);
}
demarrer();
