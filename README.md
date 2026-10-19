# SAUTI — Brand Narrative Studio

Site vitrine statique (HTML, CSS, JS sans dépendance), prêt pour GitHub Pages.

## Lancer en local

```bash
cd ~/Downloads && unzip -o SAUTI_Final.zip && cd SAUTI && code . && python3 -m http.server 8080
```

Puis ouvrir http://localhost:8080

## Structure

Tous les fichiers sont à la racine du dossier :

```
SAUTI/
├── index.html
├── partenariats.html
├── style.css
├── script.js
├── favicon.svg
├── motion-sauti.mp4
├── motion-poster.jpg
├── logo-dark.png, logo-cream.png
├── logo-mark-dark.png, logo-mark-cream.png
└── polices .woff2 (Manrope, DM Sans, Instrument Serif)
```

## Logos

| Fichier | Usage |
|---|---|
| `logo-mark-dark.png` | logo compact, texte foncé, pour fond clair (navigation, studio) |
| `logo-mark-cream.png` | logo compact, texte crème, pour fond sombre (footer) |
| `logo-dark.png` | logo complet avec signature, pour fond clair |
| `logo-cream.png` | logo complet avec signature, pour fond sombre |

## Publication GitHub Pages

```bash
git init && git add . && git commit -m "SAUTI site final" && git branch -M main
git remote add origin https://github.com/<compte>/<depot>.git && git push -u origin main
```

Settings › Pages › Deploy from a branch › `main` › `/ (root)`.

Le contact utilise `contact@agencysauti.com` : remplacer les liens `mailto:` par une URL Calendly / Cal.com pour la prise de rendez-vous directe.
