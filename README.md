# Les Fables de La Fontaine — Lecture & Entraînement à la récitation

Application web interactive permettant de **lire l'intégralité des fables** de Jean de La Fontaine et de s'entraîner à les réciter, par écrit ou par dictée vocale.

## Fonctionnalités

- **Catalogue de 32 fables** (861 vers répartis sur les Livres I, III, IV, V, VI, VII et XII) avec recherche insensible aux accents (titres et vers) et filtres par Livre.
- **Lecture intégrale (rubrique « Lire les fables » dans le menu de gauche)** :
  - lecture continue d'une fable dans son intégralité ou parcours du **recueil complet** groupé par Livre ;
  - confort de lecture personnalisable (numérotation des vers, taille de police) persisté en `localStorage` ;
  - navigation Précédent / Suivant selon l'ordre du recueil et bascule directe **« S'entraîner sur cette fable »** ;
  - URLs partageables compatibles GitHub Pages (`#/lire`, `#/lire/:slug`, `#/reciter/:slug`).
- **Récitation écrite** : saisie vers par vers avec validation tolérante (casse, accents, ponctuation, ligatures `œ`/`oe`), retour visuel en temps réel et 3 niveaux de difficulté réels (*Facile* : texte visible ; *Moyen* : initiales des mots ; *Difficile* : récitation de mémoire).
- **Récitation vocale (Bêta)** : dictée en français (`fr-FR`) via l'API Web Speech (`SpeechRecognition` / `webkitSpeechRecognition`).
- **Suivi de progression local** : sauvegarde sécurisée dans `localStorage` du nombre de vers récités, de l'historique par fable et des fables maîtrisées.

## Stack technique

| Outil | Version | Rôle |
| --- | --- | --- |
| React | `19.3` | Interface utilisateur |
| TypeScript | `5.9` | Typage statique strict |
| Vite | `8.3` | Serveur de développement et bundling |
| Tailwind CSS | `4.3` | Styling utilitaire (plugin `@tailwindcss/vite`) |
| Oxlint | `1.94` | Linting ultra-rapide (TypeScript, React, jsx-a11y, Unicorn) |
| Vitest | `5.1` | Tests unitaires et composants (`jsdom` + Testing Library) |
| Lucide React | `1.77` | Icônes SVG |

## Démarrage rapide

### Prérequis

- Node.js `26` (voir [`.nvmrc`](./.nvmrc))
- npm

### Installation et commandes

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement (http://localhost:3003/lafontaine-recitation-training/)
npm run dev

# Vérifier lint + typage + tests
npm run check

# Lancer les scripts individuellement
npm run lint
npm run typecheck
npm run test

# Compiler pour la production
npm run build

# Prévisualiser le build de production
npm run preview
```

## Structure du projet

```text
.
├── .github/workflows/
│   ├── ci.yml                     # Vérification automatique sur Pull Requests
│   └── deploy.yml                 # Checks + build + déploiement GitHub Pages
├── docs/                          # Documentation technique, audit et feuille de route
│   ├── ARCHITECTURE.md            # Architecture, flux de données et modèle métier
│   ├── AUDIT.md                   # Audit initial détaillé
│   ├── MODERNIZATION.md           # Journal & stratégie de modernisation de la stack
│   └── ROADMAP.md                 # Feuille de route & spec « Lecture intégrale »
├── public/                        # Ressources statiques (favicon book.svg)
├── src/
│   ├── components/
│   │   ├── reader/                # Mode Lecture intégrale (FableReader, FableAnthology, ReaderControls)
│   │   ├── recitation-area/       # Zone de récitation (RecitationShell, modes texte & vocal, toolbar)
│   │   ├── side-menu/             # Menu latéral (Récitez, Lire les fables, Vers récités)
│   │   ├── ui/                    # Composants UI réutilisables (Card, ConfirmDialog, Tooltip, Textarea)
│   │   ├── CountdownTimer.tsx     # Compte à rebours de première visite
│   │   ├── PoemDisplay.tsx        # Affichage des vers par section de 4 et niveaux de difficulté
│   │   ├── PoemList.tsx           # Recherche, tri et liste des fables à réciter
│   │   ├── Stats.tsx              # Compteur de vers récités
│   │   └── Title.tsx              # En-tête animé accessible
│   ├── constants/recitation.ts    # Constantes métier partagées (VERSES_PER_SECTION)
│   ├── data/
│   │   ├── fables.ts              # Dataset nettoyé des 32 fables (861 vers)
│   │   └── fablesQueries.ts       # Tri par recueil, groupement par Livre, recherche plein texte
│   ├── lib/utils.ts               # Utilitaire cn (clsx + tailwind-merge)
│   ├── types/                     # Types TypeScript (Poem, ReaderPreferences, Web Speech API)
│   ├── utils/
│   │   ├── localStorage.ts        # Persistance locale sécurisée (progression + préférences lecture)
│   │   └── validation.ts          # Normalisation et comparaison caractère par caractère
│   ├── App.tsx                    # Composant racine, orchestration et routage hash
│   ├── index.css                  # Tailwind v4 (@import "tailwindcss") et styles typographiques
│   └── main.tsx                   # Point d'entrée React
├── .oxlintrc.json                 # Configuration Oxlint
├── index.html                     # Document HTML (polices Google Fonts)
├── vite.config.ts                 # Configuration Vite + Tailwind v4
└── vitest.config.ts               # Configuration Vitest + jsdom
```

## Déploiement

Le projet est vérifié (`npm run check`) puis déployé automatiquement sur GitHub Pages à chaque push sur `main` via [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) avec la base `/lafontaine-recitation-training/`.

## Documentation

- [**Architecture du projet**](./docs/ARCHITECTURE.md)
- [**Audit technique initial**](./docs/AUDIT.md)
- [**Modernisation de la stack**](./docs/MODERNIZATION.md)
- [**Feuille de route & Lecture intégrale**](./docs/ROADMAP.md)
