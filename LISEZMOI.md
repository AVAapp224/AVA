# Le site de test

## Le lancer sur ton Mac
Dans le Terminal :

    python3 /Users/inesdavid/claude/app-actu/site/serveur.py

Puis ouvre http://localhost:8080 dans ton navigateur.
Sur ton iPhone, connecté au **même Wi-Fi** : utilise l'adresse « sur ton iPhone » affichée au démarrage (par exemple http://192.168.0.13:8080).

Le site reste disponible tant que cette fenêtre du Terminal est ouverte et que le Mac est allumé.

## Comment ça marche
- `collecte/sources.py` : la liste des médias et de leurs flux officiels, les marchés et les entreprises.
- `collecte/collecte.py` : récupère les articles, devine leur thème et leur pays, regroupe ceux qui parlent du même sujet. Plus il y a de médias sur un sujet, plus il est populaire. Le programme fige l'essentiel du jour à 6 h (heure de Montréal).
- `serveur.py` : affiche le site et relance la collecte toutes les 5 minutes.
- `index.html`, `style.css`, `app.js` : le site. Le fil se met à jour toutes les 2 minutes. Les préférences (pays, thèmes, sports, entreprises, couleurs, ce que tu lis le plus) restent sur le téléphone.

## Limites connues (version de test)
- Cours de Bourse : Yahoo Finance, en différé, sans licence. À remplacer par un fournisseur sous licence avant le lancement public.
- YouTube (HugoDécrypte, Brut) : il faut une clé gratuite YouTube Data API (compte Google).
- Médias sans flux libre pour l'instant : voir `INDISPONIBLES` dans `collecte/sources.py`.
- Les notifications et le guide de démarrage viendront avec la version app.
