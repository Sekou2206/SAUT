# SAUTI — Site animé prêt pour GitHub Pages

Ce dossier contient la dernière version : personnage arrondi articulé, marche animée, grue fluide, palette bordeaux/noir/bronze et nouvelle scène « On vient te chercher ».

## Installation sur GitHub Pages

1. Décompresse `SAUTI_GitHub_Sans_Dossier.zip` sur ton ordinateur.
2. Ouvre ton dépôt GitHub `Sekou2206/Sauti`.
3. Sauvegarde l'ancienne version si tu veux la garder, puis remplace les fichiers du site avec le contenu de ce dossier. Sur GitHub : **Add file → Upload files**. Glisse `index.html`, `style.css`, `motion.js`, `README.md` et tous les autres fichiers extraits du ZIP. Le ZIP ne doit pas être téléversé à la place des fichiers.
4. `index.html` doit se trouver directement à la racine du dépôt, pas dans un sous-dossier.
5. Valide avec **Commit changes** sur la branche `main`.
6. Dans **Settings → Pages**, sélectionne **Deploy from a branch**, puis **main** et **/ (root)**. Clique sur **Save**. Si ces réglages sont déjà actifs, conserve-les.
7. Attends la fin du déploiement. L'adresse de ce dépôt sera : https://sekou2206.github.io/Sauti/

Si le dépôt contient un ancien workflow GitHub Actions qui publie un autre dossier, adapte ou désactive ce workflow pour éviter qu'il ne remplace cette version.

Les chemins des ressources sont relatifs : le site fonctionne dans le sous-dossier `/Sauti/`. Aucun serveur applicatif, clé API, installation npm ni compilation n'est nécessaire pour GitHub Pages. Three.js et la police sont inclus localement.

Tous les fichiers sont au même niveau : aucun dossier `vendor` à créer.

## Fichiers

- `index.html` : contenu de toutes les scènes et présentation textuelle.
- `style.css` : mise en page responsive et couleurs.
- `motion.js` : personnage 3D, marche, grue, caméra, défilement et lecture automatique.
- `three.module.js` : Three.js 0.170.0.
- `anton.woff2` : police Anton.
- `THREE-LICENSE.txt` et `ANTON-LICENSE.txt` : licences à conserver.
- `.nojekyll` : désactive le traitement Jekyll ; utile pour une publication statique.

## Brancher la réservation Zcal

Dans `motion.js`, trouve :

```js
const BOOKING_URL='';
```

Puis remplace la chaîne vide par ton vrai lien Zcal :

```js
const BOOKING_URL='https://zcal.co/TON-COMPTE/TON-RENDEZ-VOUS';
```

Remplace cet exemple par ton lien réel avant de publier cette modification. Tant que cette valeur est vide, le bouton affiche que la réservation sera bientôt disponible.

## Tester sur ton ordinateur

Le site utilise des modules JavaScript : ouvre-le avec un serveur local, pas par un double-clic sur le fichier HTML.

Avec l'extension **Live Server** de VS Code, ouvre `index.html` puis **Open with Live Server**.

Ou, si Python 3 est installé, ouvre un terminal dans ce dossier :

```sh
python3 -m http.server 8000
```

Puis ouvre http://localhost:8000/ dans ton navigateur. Fais défiler ou utilise « Lecture auto ».

## Sources techniques

GitHub Pages : https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
