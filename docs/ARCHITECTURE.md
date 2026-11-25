# Architecture du projet

Ce document décrit l'architecture de l'application **Les Fables de La Fontaine**, ses flux de données, ses règles métier et ses choix techniques.

## Vue d'ensemble

L'application est une **Single Page Application (SPA)** 100 % statique construite avec React 19, TypeScript, Vite 8 et Tailwind CSS v4. Les 32 fables (861 vers) sont embarquées dans `src/data/fables.ts`, et la progression comme les préférences de lecture sont sauvegardées localement dans `localStorage`.

```mermaid
flowchart TD
    App["App.tsx (état racine + routage hash)"]
    SideMenu["side-menu/SideMenu"]
    PoemList["PoemList (Réciter)"]
    ReaderMenu["ReaderMenuSection (Lire)"]
    RecitedList["RecitedVersesList"]
    RecitationArea["recitation-area/RecitationArea"]
    RecitationShell["RecitationShell"]
    TextMode["TextRecitation"]
    VoiceMode["VoiceRecitation"]
    UseRecitation["useRecitation (hook)"]
    PoemDisplay["PoemDisplay"]
    FableReader["reader/FableReader"]
    FableAnthology["reader/FableAnthology"]
    Validation["utils/validation.ts"]
    Queries["data/fablesQueries.ts"]
    Storage["utils/localStorage.ts"]
    Data["data/fables.ts"]

    Data --> Queries
    Queries --> App
    Storage <--> App
    App --> SideMenu
    App --> RecitationArea
    App --> PoemDisplay
    App --> FableReader
    App --> FableAnthology

    SideMenu --> PoemList
    SideMenu --> ReaderMenu
    SideMenu --> RecitedList

    RecitationArea --> TextMode
    RecitationArea --> VoiceMode
    TextMode --> RecitationShell
    VoiceMode --> RecitationShell
    TextMode --> UseRecitation
    VoiceMode --> UseRecitation
    UseRecitation --> Validation
    UseRecitation --> Storage
    PoemDisplay --> Validation
```

## Organisation des modules

### 1. Orchestration et routage (`src/App.tsx`)

`App.tsx` coordonne les trois modes de l'application (`'recite'`, `'read'` et `'games'`) et synchronise l'état avec le hash d'URL (compatible GitHub Pages) :

- `#/reciter/:slug` : mode entraînement sur la fable indiquée.
- `#/lire` : mode lecture intégrale en vue *Recueil complet*.
- `#/lire/:slug` : mode lecture intégrale sur une fable précise.
- `#/jeux` et `#/jeux/:gameId` : rubrique Jeux des Fables (premier jeu : *Le Corbeau et le Renard* en 3D).

L'état est initialisé paresseusement sans `setState` synchrone dans un effet, et aucun événement global `window.CustomEvent` n'est utilisé entre composants.

### 2. Menu latéral (`src/components/side-menu/`)

- **`index.tsx` (`SideMenu`)** : panneau latéral responsive (`w-full max-w-sm sm:w-96`), épinglé par défaut sur grand écran (`>= 1024px`). L'état `isPinned` est remonté à `App.tsx` pour ajuster dynamiquement la marge du contenu principal (`lg:pl-[400px]`).
- Quatre rubriques dépliables (`CollapsibleSection`) :
  1. **📚 Récitez des fables** (`PoemList`) : recherche, tri (Recueil / Titre / Longueur) et indicateur de maîtrise.
  2. **📖 Lire les fables** (`ReaderMenuSection`) : accès direct au recueil complet, filtres par Livre, recherche dans les titres et les vers, ouverture en lecture intégrale.
  3. **🎮 Jeux** (`GamesMenuSection`) : accès aux mini-jeux inspirés des fables et affichage du meilleur score.
  4. **✨ Vers récités** (`RecitedVersesList` + `Stats`) : historique détaillé par fable.

### 3. Lecture intégrale (`src/components/reader/`)

- **`FableReader.tsx`** : affiche la totalité des vers d'une fable en continu, avec bouton direct *« S'entraîner sur cette fable »* et navigation Précédent / Suivant calculée par `getAdjacentFables`.
- **`FableAnthology.tsx`** : affiche l'intégralité du recueil groupé par Livre (`groupFablesByBook`), avec filtrage par Livre et recherche plein texte dans les vers.
- **`ReaderControls.tsx`** : bascule *Fable* / *Recueil complet*, affichage des numéros de vers et réglage de la taille de police (`sm` / `md` / `lg`).

### 4. Zone de récitation (`src/components/recitation-area/`)

- **`common/RecitationShell.tsx`** : socle UI partagé entre les modes texte et vocal (en-tête, `Toolbar`, sélecteur de difficulté, barre de progression, liste de progression de la section et `ConfirmDialog` natif `<dialog>`).
- **`common/useRecitation.ts`** : hook métier gérant le vers courant, la section (par blocs de `VERSES_PER_SECTION = 4`), la validation et l'enregistrement en `localStorage`. Le changement de fable réinitialise proprement l'état via `key={poem.id}`.
- **`modes/text/TextRecitation.tsx`** & **`modes/voice/VoiceRecitation.tsx`** : implémentations spécialisées (saisie clavier et dictée Web Speech via `useVoiceRecognition.ts` à callback stabilisé).

### 5. Affichage et niveaux de difficulté (`src/components/PoemDisplay.tsx`)

Affiche les vers par tranches de 4 selon le niveau choisi :
- **Facile** (`easy`) : texte complet avec coloration caractère par caractère (`correct` vert, `pending` gris, `incorrect` rouge).
- **Moyen** (`medium`) : masque les mots en conservant leur initiale comme repère mnémotechnique.
- **Difficile** (`hard`) : récitation pure de mémoire (les vers se révèlent au fur et à mesure de leur validation).

### 6. Validation, traitement vocal & requêtes métier

- **`src/utils/validation.ts`** : `normalizeText`, `validateLine`, `validateRecitation` et `compareCharacters` (retourne `CharMatchStatus[]` avec normalisation unifiée des accents, ponctuations et ligatures `œ`/`oe`, `æ`/`ae`).
- **`src/utils/speechCleaner.ts`** : filtrage déterministe des disfluences orales (`euh`, `hum`, `ben`, etc. protégées contre les mots du vers cible), détection des auto-corrections / reprises (*« oh non je recommence, je me suis trompé »*), déduplication des faux départs et détection de la commande *« recommencer la fable »*.
- **`src/utils/phoneticAligner.ts` & `src/data/lafontaineLexicon.ts`** : clé phonétique française (`toFrenchPhonetic`), table d'équivalences archaïques La Fontaine (*l'Oût*, *nenni*, *vermisseau*, *Ésope*, *gabelle*…), alignement glissant multi-vers, évaluation multi-hypothèses (`maxAlternatives = 3`) et générateur de glossaire (`extractFableGlossary` / `buildWhisperInitialPrompt`).
- **`src/services/speech/`** : contrat `SpeechEngine` découplé de l'UI (implémentation `WebSpeechEngine` avec auto-reprise sur silence ; prêt pour `WhisperWebGPUEngine` sur la branche dédiée).
- **`src/data/fablesQueries.ts`** : fonctions pures de tri (`sortFablesByBookOrder`), groupement par Livre (`groupFablesByBook`), navigation (`getAdjacentFables`), recherche plein texte (`searchFables`) et résolution de slug (`findFableBySlug`).

### 7. Persistance locale (`src/utils/localStorage.ts`)

Toutes les lectures/écritures `localStorage` et appels `JSON.parse` sont protégés contre les données corrompues et la navigation privée :

| Clé | Rôle |
| --- | --- |
| `recitedVerses` | Compteur cumulé de vers validés |
| `recitedVersesDetails` | Vers uniques validés par ID de fable (`RecitedVersesMap`) |
| `lastSelectedPoem` | ID de la dernière fable consultée |
| `hasVisited` | Statut de première visite |
| `readerPreferences` | Préférences du mode Lecture (`showLineNumbers`, `fontSize`, `view`) |
| `gameHighScores` | Meilleurs scores par mini-jeu (`GameHighScoreMap`) |

### 8. Rubrique Jeux & 3D HTML-in-Canvas (`src/components/games/`, `src/games/corbeau-renard/`)

- **`GamesHub.tsx` & `CorbeauRenardGame.tsx`** : rubrique Jeux extensible présentant le premier jeu *Le Corbeau et le Renard* en 3D.
- **`src/games/corbeau-renard/engine.ts`** : simulation physique pure (déplacement fluide de Maître Renard aux flèches `←`/`→`, mécanique de *Vanité du Corbeau* qui accélère progressivement la cadence et la vitesse de chute, flatterie active sur `↑`, bonus Fromage d'Or).
- **`src/games/corbeau-renard/renderer.ts` & `htmlInCanvasBridge.ts`** : moteur 3D WebGL2 cel-shading à contours encrés inspiré des gravures de fables, couplé à l'API WICG **HTML-in-Canvas** (`<canvas layoutsubtree content="drawable">`, `texElementSubImage2D`/`texElementImage2D`, `onpaint`/`requestPaint`) avec pont de compatibilité WebGL2 transparent pour les navigateurs sans drapeau expérimental.
