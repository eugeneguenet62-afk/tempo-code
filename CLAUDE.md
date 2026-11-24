# Tempo : consignes pour Claude

- Le site publié est le dossier `site/` (Cloudflare Pages, sortie `site`, commande `sh scripts/build.sh`).
  Les fonctions serveur sont dans `functions/` (Pages Functions). Adresse officielle : https://tempo-training.com.
- Cloudflare Pages sert les pages sans `.html` (`/carnet` pour `/carnet.html`) : tout code qui lit
  `location.pathname` doit accepter les deux formes.
- Interface en français, vouvoiement, langage simple. Les carnets d'une visite sans compte ne sont pas gardés.
- La présentation de l'accueil reste visible pour tout le monde, même pour un compte connecté
  (« Votre espace » vient en dessous). Ne pas la masquer pour `html.ret`.
- `scripts/build.sh` réécrit `VERSION` dans `site/sw.js` à chaque mise en ligne ; la liste `CORE`
  est tenue à la main : y ajouter tout nouveau fichier du site.
- Dans ce dépôt, `labo-src/` est à la racine (hors du dossier publié) : `node labo-src/build.cjs <chemin de typescript>`
  écrit `site/labo.js`, et `node labo-src/serve.mjs 3140` sert `site/` en local.

# Direction artistique « Labo » de Tempo


## Principe

L'apparence de l'app vient d'une couche posée par-dessus le code : `labo.css` (chargée en dernier
sur chaque page) et `labo.js` (décor en pixels). Les sources de `labo.js` sont dans `labo-src/`.
Esprit : un instrument de mesure pour sportifs, entre outil technique et salle de muscu.
Fond noir bleuté, traits fins, étiquettes en mono, chiffres en Geist Pixel, petits athlètes en pixel art.

## Règles de travail

- Ne jamais modifier la logique pour une raison de style : scripts métier, identifiants, attributs
  `data-*` lus par le JS, appels Firebase, clés de stockage. Le style passe par `labo.css`.
- Les sélecteurs de `labo.css` commencent par `html` pour passer devant `style.css`.
  Éviter `!important`. Ranger chaque règle dans la partie commentée qui lui correspond
  (en-tête, onglets, panneaux, boutons, champs, feuilles, puis une partie par page).
- Les classes propres à la couche commencent par `lb-`.
- Après une modification de `labo-src/`, reconstruire : `node labo-src/build.cjs` (TypeScript en dépendance de dev).
- Quand `labo.css`, `labo.js` ou une police changent, changer `VERSION` dans `sw.js`.
- Ne jamais recopier une page depuis le site en ligne : Cloudflare y injecte la balise d'audience
  et le brouillage des e-mails.
- Une nouvelle page `.html` reçoit les mêmes lignes que les autres : `<link rel="stylesheet" href="labo.css">`
  juste avant `</head>`, `<script src="labo.js" defer></script>` juste avant `</body>`,
  `theme-color` à `#07080c`, préchargement de `fonts/geist-latin.woff2` et `fonts/geist-pixel-latin.woff2`.
  L'installateur du paquet « tempo-labo » le fait tout seul et peut être relancé sans risque.
- Vérifier chaque écran touché à 390 px de large et sur ordinateur : rien ne déborde
  (`scrollWidth` égal à `clientWidth`), aucune erreur ajoutée dans la console,
  et la page reste complète quand les animations sont réduites.

## Jetons (haut de `labo.css`)

| Jeton | Valeur | Usage |
|---|---|---|
| `--bg` | `#07080c` | fond de page |
| `--surface` | `#0e1017` | panneaux, cartes |
| `--field` | `#161924`, teinté à 5 % par l'accent | champs, sélecteurs |
| `--line` / `--line-strong` | `#1f2330` / `#2c3040` | traits de 1 px |
| `--ink` / `--muted` / `--dim` | `#eef0f6` / `#9095a8` / `#5d6274` | texte |
| `--accent` | teinte du sport de la page (déjà définie par l'app) | une seule couleur vive par page |
| `--radius` | `14px` | blocs ; 10 px boutons et champs ; 8 à 9 px pastilles |
| `--ease` | `cubic-bezier(.22, 1, .36, 1)` | toutes les transitions |

Ne pas inventer de nouvelle couleur : partir de ces jetons et de `color-mix()` avec `--accent`.

## Typographie

- Titres : Geist 600, interlettrage serré (`-.045em` pour h1 et h2, `-.03em` pour h3), interligne 1,02.
- Chiffres-clés (charges, temps, kcal, scores, records) : `var(--pixel)` (Geist Pixel), `tabular-nums`.
- Petites données, étiquettes, en-têtes de tableau, onglets : `var(--mono)`, 11 à 12,5 px,
  majuscules avec `letter-spacing: .06em` à `.08em`.
- Texte courant : Geist, poids 400 ; trois graisses au plus sur un écran.

## Composants

- **Panneau** : fond `--surface` avec un léger dégradé clair en haut, trait `--line`, ombre `--shadow`, rayon 14 px.
- **Bouton principal** : dégradé de l'accent (82 % mêlé de blanc en haut, accent en bas), texte `--accent-ink`,
  liseré clair intérieur, ombre colorée ; `scale(.95)` à l'appui.
- **Bouton secondaire** : fond presque transparent, liseré `--line-strong` qui prend l'accent au survol.
- **Champ** : fond `--field`, trait `--line`, focus avec bordure accent et halo de 3 px à 18 %.
  Les nombres en mono.
- **Étiquette de rubrique** : ligne mono en majuscules ; dans l'intro d'une page, pastille bordée dans l'accent.
- **Barre d'onglets du bas** : étiquettes mono, barre lumineuse de 2 px dans l'accent au-dessus de l'onglet actif.
- **Feuille du bas** : `#0d0f15`, rayon 18 px en haut, voile flouté derrière.
- **Badge en pixels** : `labo.js` place à côté du `h1` de chaque page un athlète animé, choisi par page
  dans `byPage` (sinon par sport dans `bySport`) de `labo-src/labo.ts`. Une nouvelle page s'y ajoute.

## Mouvement

- Interactions de 150 à 400 ms, avec `--ease`. Appui : `scale(.92)` à `scale(.95)`.
- Les animations en pixels tournent seulement quand elles sont visibles,
  et s'arrêtent en image fixe si `prefers-reduced-motion` est actif.
- Étincelles carrées au toucher sur les boutons et les onglets du bas (`labo.js`, liste `SPARK`).
  Hors des badges en pixels, rien de décoratif ne tourne en boucle.

## Interdits

- Pas de grille ni de quadrillage en fond de page : un seul halo discret dans la teinte de la page, en haut.
- Pas de nouvelle couleur vive en dehors de l'accent de la page.
- Pas de texte qui change selon la position du scroll.
- Pas d'ombre noire épaisse ni de rayon supérieur à 18 px.
