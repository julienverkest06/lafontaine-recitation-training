# Plan de modernisation de la stack

> **Statut : Appliqué** — La migration complète vers Vite 8, Oxlint, Tailwind CSS v4, React 19, TypeScript 5.9, Vitest 5 et CI GitHub Actions a été réalisée et validée (`npm run check && npm run build`).

Ce document détaille la stratégie de mise à jour technique du projet pour passer d'une stack de 2023 (Vite 4, ESLint 8 sans config, Tailwind 3, React 18, zéro tests) à un environnement moderne, rapide et maintenable.

---

## 1. Comparatif Avant / Cible

| Domaine | Actuel | Cible recommandée | Bénéfice principal |
| --- | --- | --- | --- |
| **Bundler / Dev server** | Vite `4.4.5` + `@vitejs/plugin-react` `4.0.3` | **Vite `6` ou `7`** (ou Vite 8 / Rolldown) + `@vitejs/plugin-react` récent | Démarrage et build plus rapides, support natif Node 22/24, écosystème à jour |
| **Linting** | ESLint `8.45.0` (EOL, non configuré) | **Oxlint** (`oxlint`) | 50 à 100× plus rapide qu'ESLint, zéro config complexe, règles TypeScript + React + jsx-a11y intégrées |
| **Formatage** | Aucun | **Oxfmt** (ou Prettier / Biome) | Style homogène automatique sur tout le dépôt (notamment `fables.ts`) |
| **CSS** | Tailwind CSS `3.3.3` + PostCSS + Autoprefixer | **Tailwind CSS `4`** via `@tailwindcss/vite` | Suppression de `postcss.config.js`, `tailwind.config.js` et `autoprefixer` ; builds CSS quasi instantanés |
| **Framework UI** | React `18.2.0` | **React `19`** + `@types/react` `19` | Simplification des `ref` (plus besoin de `forwardRef`), performances et typage améliorés |
| **Langage** | TypeScript `5.0.2` | **TypeScript `5.8+`** | Inférence améliorée, vérifications strictes modernes |
| **Tests** | Aucun | **Vitest** + `@testing-library/react` + `jsdom` | Intégration native avec Vite, couverture sur `validation.ts`, `localStorage.ts` et les composants clés |
| **Icônes** | `lucide-react` `0.279.0` | **`lucide-react` (dernière version)** | Nouvelles icônes (pour la section Lecture intégrale), meilleur tree-shaking |
| **Node / CI** | Node 20 (déploiement seul) | **Node 22/24 LTS** + CI (lint, typecheck, test, build) | Détection automatique des régressions avant mise en ligne |

---

## 2. Zoom sur Oxlint (remplacement d'ESLint v8)

ESLint v8 étant en fin de support et aucun fichier `.eslintrc` n'existant dans le projet, la migration vers **Oxlint** se fait sans coût de migration de règles existantes.

### Avantages pour ce projet
- **Un seul outil** au lieu de 5 paquets (`eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`).
- **Support natif** des plugins `typescript`, `react`, `react-perf`, `jsx-a11y` et `unicorn`.
- Exécution en quelques dizaines de millisecondes en local comme en CI.

### Exemple de configuration `.oxlintrc.json`

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["typescript", "react", "jsx-a11y", "unicorn"],
  "categories": {
    "correctness": "error",
    "suspicious": "warn",
    "pedantic": "off"
  },
  "rules": {
    "react/react-in-jsx-scope": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  },
  "ignorePatterns": ["dist", "node_modules"]
}
```

### Scripts `package.json` recommandés

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "oxlint --deny-warnings",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "check": "npm run lint && npm run typecheck && npm run test"
  }
}
```

---

## 3. Plan de migration incrémental

Pour limiter les risques, la modernisation est découpée en 4 étapes indépendantes et vérifiables chacune par `npm run build` :

### Étape 1 — Hygiène, Oxlint & Vitest (sans casser le runtime)
1. Supprimer les 5 paquets ESLint v8 obsolètes et installer `oxlint`.
2. Ajouter `.oxlintrc.json` et corriger les alertes remontées (code mort, hooks, a11y).
3. Installer `vitest` et écrire les tests unitaires sur `src/utils/validation.ts` et `src/utils/localStorage.ts` (en couvrant les bugs B2, B4, B7 de l'audit).
4. Compléter `.gitignore` et ajouter un fichier `.nvmrc` (`22` ou `24`).

### Étape 2 — Montée de version Vite, TypeScript & Lucide
1. Mettre à jour `vite`, `@vitejs/plugin-react`, `typescript` et `lucide-react`.
2. Adapter `tsconfig.json` / `tsconfig.node.json` (structure moderne `tsconfig.app.json` + `tsconfig.node.json` compatible `tsc -b`).
3. Corriger le chemin du favicon dans `index.html` (`./book.svg`).

### Étape 3 — Migration Tailwind CSS v4
1. Remplacer `tailwindcss` v3, `postcss` et `autoprefixer` par `tailwindcss` v4 + `@tailwindcss/vite`.
2. Ajouter `tailwindcss()` dans `vite.config.ts`.
3. Supprimer `postcss.config.js` et `tailwind.config.js`.
4. Remplacer les directives `@tailwind base/components/utilities;` dans `src/index.css` par `@import "tailwindcss";`.
5. Vérifier le rendu visuel de tous les composants (notamment `backdrop-blur`, bordures et transitions).

### Étape 4 — Montée de version React 19 & CI complète
1. Mettre à jour `react`, `react-dom`, `@types/react`, `@types/react-dom`.
2. Simplifier `CustomTextarea` (suppression de `forwardRef`) et typer proprement les `useRef` (valeur initiale obligatoire en `@types/react` 19, ex. `useRef<number | undefined>(undefined)` dans `Tooltip.tsx`).
3. Mettre à jour `.github/workflows/deploy.yml` (Node 22/24, `actions/upload-pages-artifact@v4`, étape `npm run check` avant le build) et ajouter un workflow `ci.yml` sur les Pull Requests.

---

## 4. Points d'attention spécifiques

- **Dépendance `@types/dom-speech-recognition`** : vérifier la compatibilité avec TypeScript 5.8+ et `src/types/global.d.ts` (l'API Web Speech n'est pas standardisée dans `lib.dom.d.ts`).
- **Base URL GitHub Pages** : conserver impérativement `base: "/lafontaine-recitation-training/"` dans `vite.config.ts` lors de la montée de version Vite.
- **Dépendances `clsx` et `tailwind-merge`** : soit exploiter réellement `cn()` (`src/lib/utils.ts`) dans les composants pour nettoyer les template strings conditionnelles, soit retirer ces deux dépendances si elles restent inutilisées.
