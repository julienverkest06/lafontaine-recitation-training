# Feuille de route & Spécification « Lecture intégrale »

Ce document recense les chantiers prioritaires issus de l'[audit technique](./AUDIT.md) ainsi que la spécification fonctionnelle et technique de la future rubrique **« Lire les fables »** dans le menu latéral.

---

## 1. Feuille de route priorisée

### Phase 1 — Stabilisation & qualité des données (Terminée)
- [x] Nettoyer `src/data/fables.ts` : supprimer les 14 lignes vides, trimer les 562 vers et corriger les titres à doubles espaces (861 vers propres).
- [x] Corriger `CustomTextarea` (`ref`), `compareCharacters` (état `pending` + normalisation des accents/ligatures) et `useVoiceRecognition` (stabilité du callback).
- [x] Sécuriser `src/utils/localStorage.ts` (`try/catch` + typage unifié `RecitedVersesMap`).
- [x] Supprimer le code mort (`src/components/SideMenu.tsx`, `Counter.tsx`, `VoiceRecognitionButton.tsx`, `VoiceWave.tsx`, `VoiceWaveform.tsx`, `public/girl-reading.jpg`).
- [x] Factoriser le socle commun entre `TextRecitation` et `VoiceRecitation` (`RecitationShell`).

### Phase 2 — Modernisation de la stack (Terminée)
- [x] Migrer vers Vite 8, Oxlint, Vitest + Testing Library, Tailwind CSS v4 (`@tailwindcss/vite`), React 19, TypeScript 5.9, Node 24 et CI GitHub Actions (`ci.yml` + `deploy.yml`).
- [x] Supprimer les `CustomEvent` sur `window` et rendre le décalage responsive (`lg:pl-[400px]`) dynamique selon `isPinned`.
- [x] Donner un vrai comportement métier aux niveaux de difficulté (*Facile*, *Moyen*, *Difficile*).

### Phase 3 — Nouvelle rubrique « Lire les fables » (Terminée)
- [x] Implémenter le mode **Lecture intégrale** accessible depuis le menu de gauche (`ReaderMenuSection`, `FableReader`, `FableAnthology`, `ReaderControls`) avec routage hash (`#/lire`, `#/lire/:slug`, `#/reciter/:slug`).
- [x] Améliorer l'accessibilité (hiérarchie `h1`/`h2`, `<dialog>` natif, `<fieldset>` sémantiques, labels ARIA).

### Prochaines pistes d'évolution (Backlog)
- [ ] Enrichir le corpus au-delà des 32 fables actuelles (Livres II, VIII, IX, X, XI) et ajouter la séparation explicite en strophes.
- [ ] Ajouter un mode « Quiz / Vers à trous » ou révision espacée (SRS) sur les fables en cours d'apprentissage.
- [ ] Exporter / importer la progression utilisateur en JSON.

---

## 2. Spécification : Rubrique « Lire les fables » dans le menu de gauche

### Objectif utilisateur
Permettre à l'utilisateur de **lire confortablement l'intégralité des fables disponibles** avant ou entre ses séances de récitation, directement depuis le menu latéral gauche, sans la contrainte de la pagination par blocs de 4 vers ni de la zone de saisie.

### Expérience utilisateur (UX)

#### A. Intégration dans le menu latéral (`SideMenu`)
Ajouter une nouvelle rubrique dans `SideMenu`, au même niveau que *Récitez des fables* et *Vers récités* :

1. **📚 Récitez des fables** — Mode entraînement (existant).
2. **📖 Lire les fables** — **Nouvelle rubrique** dédiée à la lecture intégrale :
   - Accès rapide soit à une **fable précise** (liste filtrable/recherchable), soit à une vue **« Recueil complet »** permettant de parcourir toutes les fables classées par Livre.
   - Indicateur visuel discret du statut d'apprentissage sur chaque fable (non commencée / en cours / maîtrisée).
3. **✨ Vers récités** — Statistiques et historique (existant).

> **Alternative ergonomique recommandée** : placer en haut du menu latéral un sélecteur de mode à deux onglets (**S'entraîner** | **Lire**) ou garder les sections dépliables avec une indication claire du mode actif dans la zone principale, afin d'éviter de dupliquer inutilement la barre de recherche deux fois dans la sidebar.

#### B. Vue principale en mode « Lecture intégrale » (`FableReader`)
Lorsque l'utilisateur sélectionne une fable dans la rubrique *Lire les fables* (ou ouvre le recueil complet), la zone principale affiche :

- **En-tête éditorial** :
  - Titre de la fable (`<h2>`), métadonnées (*Livre X, Fable Y — 1668*), nombre total de vers.
  - Bouton d'action principal : **« S'entraîner sur cette fable »** (bascule immédiatement en mode Récitation sur cette même fable).
- **Corps du texte intégral** :
  - Affichage de **tous les vers en continu** (sans découpage artificiel en sections de 4 vers).
  - Typographie de lecture soignée (`Cormorant Garamond` / `Playfair Display`, interligne généreux `leading-relaxed`).
  - Options de confort de lecture (barre légère en haut de la carte) :
    - Afficher / masquer les numéros de vers (`1, 2, 3...`).
    - Ajuster la taille de police (`A-` / `A+`).
    - Mode « Recueil continu » (toutes les fables groupées par Livre avec sommaire d'ancres) ou « Une fable à la fois ».
- **Navigation entre fables** :
  - Boutons **← Fable précédente** et **Fable suivante →** basés sur l'ordre réel du catalogue (trié par `livre` puis `number`), sans dépendre des champs `prev`/`next` cassés.

#### C. Filtrage & organisation du catalogue
Dans la rubrique lecture (et mutualisable avec le mode récitation) :
- Filtre par **Livre** (Tous, Livre I, Livre III, Livre IV, Livre V, Livre VI, Livre VII, Livre XII).
- Recherche sur le titre **et** dans le texte des vers (ex. chercher « fromage » ou « bise »).
- Tri par **Ordre du recueil** (`livre`, `number`), **Titre (A–Z)** ou **Longueur (nombre de vers)**.

---

### Conception technique recommandée

#### 1. Navigation & URLs compatibles GitHub Pages
GitHub Pages ne réécrit pas nativement les routes HTML5 vers `index.html`. Deux approches propres :
- **Option légère (recommandée au démarrage)** : synchronisation avec le hash d'URL (`window.location.hash`) :
  - `#/reciter/:slug` → mode récitation sur la fable correspondante
  - `#/lire` → vue recueil / sommaire intégral
  - `#/lire/:slug` → lecture intégrale d'une fable
  Cela exploite directement la propriété `Slug` déjà présente sur chaque fable et permet le partage de liens directs ainsi que les boutons Précédent/Suivant du navigateur, sans dépendance lourde.
- **Option évolutive** : `react-router` (en `HashRouter`) si l'application gagne d'autres vues (statistiques détaillées, quiz, gestion de corpus).

#### 2. Découpage des composants envisagé

```text
src/
├── context/
│   └── AppStateContext.tsx        # Mode actif ('recite' | 'read'), fable sélectionnée, progression, menu épinglé
├── data/
│   ├── fables.ts                  # Dataset nettoyé (sans lignes vides ni espaces superflus)
│   └── fablesQueries.ts           # Tri par recueil, groupement par livre, fable préc./suiv., recherche plein texte
└── components/
    ├── reader/
    │   ├── FableReader.tsx        # Affichage intégral d'une fable + toolbar lecture + CTA « S'entraîner »
    │   ├── FableAnthology.tsx     # Vue recueil complet groupé par Livre
    │   └── ReaderControls.tsx     # Taille du texte, numérotation des vers, navigation préc./suiv.
    └── side-menu/
        └── ...                    # Ajout de la rubrique « Lire les fables »
```

#### 3. Contrat d'état minimal

```ts
export type AppMode = 'recite' | 'read';

export interface ReaderPreferences {
  showLineNumbers: boolean;
  fontSize: 'sm' | 'md' | 'lg';
  view: 'single' | 'anthology';
}
```

Les préférences de lecture (`ReaderPreferences`) peuvent être persistées dans `localStorage` au même titre que la progression.
