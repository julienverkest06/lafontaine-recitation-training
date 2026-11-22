# Audit technique du projet

**Date de l'audit** : 22 novembre 2026  
**Périmètre** : Ensemble du dépôt (`src/`, `public/`, configuration build/TS/CSS, CI/CD GitHub Actions).

---

## 1. Synthèse exécutive

Le projet est fonctionnel, lisible et repose sur une base légère (React + Vite + Tailwind + TypeScript, sans surcharge de dépendances). En revanche, l'audit met en évidence plusieurs **bugs actifs impactant directement la récitation**, des **anomalies de données dans `fables.ts`**, un **outillage obsolète/non configuré** (ESLint v8 sans fichier de config, Vite 4, zéro tests) et un **nombre important de fichiers morts**.

| Axe | État | Constat principal |
| --- | --- | --- |
| **Logique métier & bugs** | Critique | `forwardRef` cassé, coloration rouge sur les lettres non tapées, 14 lignes vides dans les fables, bug de `SpeechRecognition` |
| **Intégrité des données** | À corriger | 14 vers vides bloquants, 562 espaces en fin de ligne, 29 liens `prev`/`next` cassés |
| **Architecture & maintenabilité** | Moyen | 6 fichiers de code mort, forte duplication texte/vocal, bus `window.CustomEvent`, types divergents |
| **Stack & outillage** | Obsolète | Vite 4, React 18.2, Tailwind 3.3, TS 5.0, ESLint 8 EOL et sans config, 0 test |
| **Accessibilité & Responsive** | Moyen | Double `<h1>`, modale non accessible, layout `lg:pl-[384px]` figé quand le menu est détaché |

---

## 2. Bugs identifiés (par ordre de criticité)

### B1. [Critique] `CustomTextarea` ne transmet pas la `ref`
- **Fichier** : `src/components/ui/Textarea.tsx` (lignes 7-14)
- **Constat** : `forwardRef` est utilisé sans récupérer le second argument `ref` et sans le passer à `<textarea>`.
- **Impact** : dans `src/components/recitation-area/modes/text/TextRecitation.tsx`, `textareaRef.current` vaut toujours `null`. Le repositionnement du curseur après validation d'un vers, le défilement automatique, la remise à zéro directe et le `blur()` en fin de fable ne fonctionnent pas.
- **Correction** : ajouter `(props, ref)` et `ref={ref}` sur `<textarea>` (ou en React 19, passer directement `ref` en prop).

### B2. [Critique] 14 lignes vides dans `src/data/fables.ts`
- **Fichier** : `src/data/fables.ts`
- **Constat** : 14 fables contiennent des chaînes vides `""` dans `content[]` (ex. *Les Deux Mulets* ligne 19, *La Belette entrée dans un grenier* lignes 2 et 22, *Le petit Poisson et le Pêcheur* lignes 23 et 26, *Le Lièvre et la Tortue* ligne 35).
- **Impact** :
  - bloque ou perturbe la progression de récitation (l'utilisateur doit valider un vers vide) ;
  - fausse le total des vers (875 entrées au lieu de 861 vers réels) et la détection de complétion (`verses.lines.length === poem.content.length`).
- **Correction** : nettoyer `fables.ts` (retirer les lignes vides et trimer les 562 vers avec espaces superflus) ou gérer explicitement les strophes via une structure `stanzas: string[][]`.

### B3. [Critique] `SpeechRecognition` recréé et arrêté à chaque mot dicté
- **Fichiers** : `src/components/recitation-area/useVoiceRecognition.ts` (ligne 45), `src/components/recitation-area/modes/voice/VoiceRecitation.tsx` (lignes 105-123)
- **Constat** :
  1. `handleTranscriptUpdate` n'est pas stabilisé (`useCallback` / `useRef`), donc `[onTranscriptUpdate]` re-déclenche le `useEffect` à chaque re-rendu, arrêtant et recréant l'instance `SpeechRecognition`.
  2. Dans `VoiceRecitation.tsx`, le `useEffect` des lignes 105-113 référence `isListening` et `toggleMicrophone` déclarés plus bas (ligne 123) et les omet de son tableau de dépendances.
- **Correction** : stocker le callback dans une `ref` dans `useVoiceRecognition` afin de n'initialiser `SpeechRecognition` qu'une seule fois, et réordonner les hooks dans `VoiceRecitation.tsx`.

### B4. [Majeur] Bug d'affichage et incohérence de `compareCharacters`
- **Fichiers** : `src/utils/validation.ts` (lignes 59-111), `src/components/PoemDisplay.tsx` (lignes 39-59)
- **Constat** :
  1. `compareCharacters` retourne un tableau de la longueur exacte du vers original, en mettant `false` pour tous les caractères non encore tapés. Or `PoemDisplay.tsx:43` calcule `const isPending = i >= charResults.length;` — condition **toujours fausse** ! Tous les caractères restants à taper s'affichent donc en **rouge** (`text-red-600`) au lieu de gris (`text-gray-400`).
  2. Contrairement à `normalizeText`, `compareCharacters` ne supprime pas les accents et ne convertit pas `œ` → `oe` (présent dans *Les Frelons et les Mouches à miel*). Un vers peut donc être affiché en rouge pendant la frappe, puis validé en vert.
- **Correction** : renvoyer un état ternaire `'correct' | 'incorrect' | 'pending'` depuis `compareCharacters`, et partager la même normalisation (accents, ligatures, ponctuation) que `normalizeText`.

### B5. [Majeur] Difficulté sans effet métier et confirmation trompeuse
- **Fichiers** : `src/components/recitation-area/modes/text/TextRecitation.tsx` (lignes 176-181, 227-228), `VoiceRecitation.tsx` (lignes 173-178, 240-241)
- **Constat** :
  - La boîte de confirmation annonce « *Votre progression actuelle sera perdue* », mais en confirmant un changement de difficulté, `restart()` n'est pas appelé.
  - La difficulté (`easy` / `medium` / `hard`) ne modifie actuellement que l'intensité du flou d'arrière-plan (`backdrop-blur-[2px/3px/4px]`) et n'impacte ni l'affichage du modèle (`PoemDisplay`), ni la rigueur de validation.
- **Correction** : soit donner un vrai comportement aux niveaux (ex. *Facile* : texte visible avec aide lettre à lettre ; *Moyen* : initiales ou premiers mots ; *Difficile* : texte masqué), soit renommer le contrôle.

### B6. [Majeur] Désynchronisation d'état lors du changement de fable ou de mode
- **Fichiers** : `src/App.tsx`, `src/components/PoemDisplay.tsx` (lignes 13-25), `src/components/recitation-area/index.tsx`
- **Constat** :
  - Basculer entre mode texte et mode vocal réinitialise `useRecitation`, mais ne réinitialise pas `validatedLines` ni `currentTypedText` dans `App.tsx`.
  - Changer de fable déclenche un `CustomEvent('sectionChange')` parasite depuis `PoemDisplay` au lieu de simplement remettre `currentSection` à `0` sur changement de `poem.id`.
  - `VoiceRecitation` n'émet jamais `recitationFocusChange` (contrairement à `TextRecitation`).

### B7. [Majeur] Fragilité de `localStorage.ts` et incohérence de typage
- **Fichiers** : `src/utils/localStorage.ts`, `src/types/poetry.ts` (lignes 43-46), `src/components/side-menu/index.tsx` (lignes 23, 113)
- **Constat** :
  - `JSON.parse(verses)` sans `try/catch` peut faire planter toute l'application si le `localStorage` est corrompu ou bloqué.
  - `getRecitedVerses()` est exécuté de façon synchrone dans le corps du rendu de `SideMenu` à chaque re-rendu.
  - `RecitedVerses` dans `src/types/poetry.ts` comporte une faute de frappe (`poemeTitle`) et ne correspond pas à la structure réelle (`Record<string, { poemTitle: string; lines: string[] }>`), forçant un cast `as unknown as RecitedVerses`.

### B8. [Mineur] Chemin absolu du favicon avec `base` GitHub Pages
- **Fichiers** : `index.html` (ligne 5), `vite.config.ts` (ligne 5)
- **Constat** : `<link rel="icon" type="image/svg+xml" href="/book.svg" />` pointe vers la racine du domaine au lieu de `/lafontaine-recitation-training/book.svg` sur GitHub Pages.
- **Correction** : utiliser `href="./book.svg"` (ou `href="book.svg"`).

---

## 3. Intégrité des données (`src/data/fables.ts`)

L'analyse automatisée des **32 fables** (875 lignes) révèle :

- **14 lignes vides** dans 12 fables (dont 2 dans *La Belette entrée dans un grenier* et 2 dans *Le petit Poisson et le Pêcheur*).
- **562 lignes** comportant des espaces superflus en début ou fin de vers.
- **Titres avec doubles espaces finaux** : `"La Mort et le Bûcheron  "`, `"Le Chameau et les Bâtons flottants  "`, `"La Poule aux oeufs d'or  "`.
- **29 références `prev` / `next` cassées** pointant vers des IDs absents du jeu de données (héritage d'un export partiel de base Directus).
- **Champs inutilisés** : `status` (toujours `"published"`), `learnt` (toujours `true`), `cover` (UUID non exploité), `Slug` (PascalCase incohérent avec les autres propriétés camelCase).
- **Incohérence typographique `œ` vs `oe`** : `"bœuf"` dans le titre mais `"Boeuf"` / `"oeuf"` dans le texte, et `"œ"` présent dans *Les Frelons et les Mouches à miel*.

---

## 4. Code mort & duplications

### Fichiers jamais importés (à supprimer ou intégrer)
1. `src/components/SideMenu.tsx` (249 lignes) — ancienne version monolithique remplacée par `src/components/side-menu/index.tsx`.
2. `src/components/Counter.tsx` — remplacé par `Stats.tsx`.
3. `src/components/recitation-area/VoiceRecognitionButton.tsx` — dupliqué en interne dans `VoiceRecitation.tsx`.
4. `src/components/recitation-area/VoiceWave.tsx` — canvas d'onde audio non branché.
5. `src/components/recitation-area/modes/voice/VoiceWaveform.tsx` — doublon de `VoiceWave.tsx`, également inutilisé.
6. `src/lib/utils.ts` — helper `cn()` jamais importé (rendant `clsx` et `tailwind-merge` inutilisés à ce jour).
7. `public/girl-reading.jpg` (186 Ko) — uniquement référencé dans un bloc CSS commenté de `src/index.css`.

### Duplications notables
- **`TextRecitation.tsx` vs `VoiceRecitation.tsx`** : ~100 lignes dupliquées (en-tête, `Toolbar`, gestion de `pendingAction`/`ConfirmDialog`, `blurAmount`, écran de fin `CompletionMessage`). Un composant wrapper commun (`RecitationShell`) éliminerait cette duplication.
- **Constante `VERSES_PER_SECTION = 4`** dupliquée dans `PoemDisplay.tsx` et `useRecitation.ts`.

---

## 5. Qualité, outillage, tests & CI/CD

1. **ESLint cassé et obsolète** : `package.json` déclare `"lint": "eslint . --ext ts,tsx ..."`, mais aucun fichier de configuration `.eslintrc.*` n'existe dans le dépôt. De plus, ESLint v8 est en fin de vie (EOL).
2. **Absence totale de tests** : aucun test unitaire ni de composant, malgré une logique algorithmique sensible (`validation.ts`, `useRecitation.ts`, `localStorage.ts`).
3. **Dépendances datées (mi-2023)** :
   - `vite`: `4.4.5`
   - `react` / `react-dom`: `18.2.0`
   - `typescript`: `5.0.2`
   - `tailwindcss`: `3.3.3`
   - `lucide-react`: `0.279.0`
4. **CI/CD minimale** (`.github/workflows/deploy.yml`) :
   - Tourne sur Node 20 (alors que Node 22/24 est désormais standard).
   - N'exécute ni lint, ni tests avant le déploiement.
   - Aucun workflow de vérification sur Pull Request.
5. **`.gitignore` incomplet** : ne contient que `node_modules` et `dist` (manquent `.env*`, `*.local`, `coverage`, `.DS_Store`, etc.).

---

## 6. Accessibilité (a11y) & Responsive

- **Hiérarchie des titres** : deux balises `<h1>` coexistent sur la page (`Title.tsx` et `PoemDisplay.tsx`). Le titre de la fable devrait être un `<h2>`.
- **Lecteurs d'écran sur `Title.tsx`** : le découpage caractère par caractère en `<span>` sans `aria-label={text}` et `aria-hidden="true"` sur les lettres perturbe la vocalisation.
- **Accessibilité des contrôles** :
  - `DifficultySelector` : `<select>` sans `aria-label` ni `<label>`.
  - `ConfirmDialog` : pas de `role="dialog"`, `aria-modal="true"`, fermeture par `Escape` ni gestion du focus.
  - Boutons sans attribut explicite `type="button"`.
- **Responsive** :
  - `App.tsx:83` applique en dur `lg:pl-[384px]` même lorsque l'utilisateur détache le menu (`!isPinned`), laissant une large marge vide à gauche.
  - `SideMenu` a une largeur fixe `w-96` (384px), qui déborde sur les écrans mobiles étroits (`< 384px`). Utiliser `w-full max-w-sm sm:w-96`.
