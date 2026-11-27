# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Public mixte autour de l'apprentissage ludique des Fables** : élèves (primaire, collège), parents qui accompagnent les révisions à la maison, enseignants en classe ou en préparation de séance, et curieux/amateurs de littérature qui souhaitent relire ou mémoriser Jean de La Fontaine.
- **Situations d'usage** : séances courtes de mémorisation vers par vers (à l'écrit ou à voix haute), consultation libre d'une fable ou du recueil complet avec aide sur le vocabulaire du XVIIe siècle, et prolongement ludique par mini-jeux.

## Product Purpose

Permettre d'apprendre, de réviser et de réciter activement les Fables de Jean de La Fontaine de façon autonome, progressive et ludique, directement dans le navigateur.

Le succès du produit se mesure à la capacité de l'utilisateur à passer facilement de la découverte d'une fable (lecture intégrale annotée) à sa mémorisation active (récitation écrite ou vocale par niveaux de difficulté croissants), puis à sa maîtrise complète, sans friction d'inscription ni perte de progression locale.

## Positioning

Un outil d'entraînement actif à la récitation conçu spécifiquement pour le français versifié du XVIIe siècle :

- **Récitation progressive au cœur du produit** : saisie écrite tolérante (casse, accents, ponctuation, ligatures `œ`/`oe`) et dictée vocale locale (`Web Speech API` et `Whisper WebGPU/WASM` 100 % navigateur hors-ligne) couplées au nettoyage d'hésitations/reprises et à un alignement phonétique dédié au lexique de La Fontaine.
- **Lecture intégrale et mini-jeux en soutien** : lecture continue annotée (`[data-terme]`) et mini-jeux inspirés des fables (ex. *Le Corbeau et le Renard* en 3D) servent de portes d'entrée et de renforcement vers la récitation, plutôt que d'en faire un simple recueil statique.
- **Zéro serveur, zéro compte, zéro envoi audio** : tout s'exécute localement dans le navigateur sur un hébergement 100 % statique.

## Operating Context

- **Accès & partage** : application web statique (SPA) hébergée sur GitHub Pages sous le chemin `/lafontaine-recitation-training/`, avec routage par hash partageable (`#/reciter/:slug`, `#/lire`, `#/lire/:slug`, `#/jeux/:gameId`).
- **Persistance locale** : progression (vers récités, historique par fable, fables maîtrisées), préférences de lecture (numéros de vers, taille du texte, vue fable/recueil) et meilleurs scores de jeux stockés exclusivement dans `localStorage`.
- **Environnement vocal** : usage au micro sur poste ou mobile/tablette ; mise en cache locale des modèles Whisper ONNX via la Cache API du navigateur pour un fonctionnement hors-ligne après premier chargement.

## Capabilities and Constraints

- **Fonctionnalités confirmées** :
  - Catalogue de 32 fables (861 vers, Livres I, III, IV, V, VI, VII et XII) avec recherche plein texte insensible aux accents et filtrage par Livre.
  - Mode **Récitation** (cœur) : découpage en sections de 4 vers, 3 niveaux de difficulté réels (*Facile* : texte visible ; *Moyen* : initiales des mots ; *Difficile* : de mémoire), saisie écrite caractère par caractère et dictée vocale (`Web Speech` + `Whisper WebGPU/WASM` local).
  - Mode **Lecture intégrale** (soutien) : vue fable unique ou recueil complet groupé par Livre, annotations de termes archaïques du XVIIe siècle, options de confort de lecture et bascule directe vers la récitation.
  - Mode **Jeux** (soutien) : hub extensible avec un premier mini-jeu 3D *Le Corbeau et le Renard* (WebGL2 + pont HTML-in-Canvas) relié à la lecture et à la récitation de la fable.
- **Contraintes durables impératives** :
  - **100 % statique, gratuit, sans compte ni serveur** (compatible GitHub Pages, aucune dépendance backend ni clé API requise).
  - **Confidentialité totale** : aucune donnée utilisateur ni aucun flux audio n'est envoyé à un serveur tiers ; tout reste local dans le navigateur.
  - **Langue** : interface et corpus en français (`fr`).
- **Décisions produit explicitement ouvertes** :
  - Priorisation future du backlog (`docs/ROADMAP.md`) : extension du corpus au-delà des 32 fables, séparation explicite en strophes, mode quiz / révision espacée (SRS), export/import JSON de la progression, ajout d'autres mini-jeux.
  - Cible formelle de conformité accessibilité (ex. WCAG AA/AAA) non encore figée.

## Brand Commitments

- **Nom** : *Les Fables de La Fontaine* (lecture, récitation et jeux).
- **Voix et registre** : français clair, accueillant, pédagogique et ludique, respectueux du patrimoine littéraire de Jean de La Fontaine sans lourdeur académique.

## Evidence on Hand

- **Corpus réel** : 32 fables nettoyées (861 vers) dans `src/data/fables.ts`.
- **Lexique XVIIe et alignement phonétique** : table d'équivalences et glossaire dans `src/data/lafontaineLexicon.ts` et `src/utils/phoneticAligner.ts`.
- **Moteurs vocaux fonctionnels** : `src/services/speech/webSpeechEngine.ts`, `src/services/speech/whisperWebGPUEngine.ts` et `src/workers/whisper.worker.ts` (documentés dans `docs/WHISPER_WEBGPU.md`).
- **Mini-jeu 3D fonctionnel** : `src/games/corbeau-renard/` et `src/components/games/CorbeauRenardGame.tsx`.
- **Documentation technique et feuille de route** : `README.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/AUDIT.md`, `docs/MODERNIZATION.md`.
- **Absences à ne jamais inventer** : aucun témoignage utilisateur, aucune statistique d'adoption, aucun partenariat scolaire ou label institutionnel, aucune tarification.

## Product Principles

1. **La récitation d'abord, la lecture et le jeu en soutien** — chaque mode secondaire doit faciliter l'envie ou le passage vers la mémorisation active d'une fable.
2. **Local, privé et sans friction par construction** — aucun compte, aucun serveur, aucun audio transmis à distance ; l'application doit rester immédiatement utilisable sur un hébergement statique.
3. **Bienveillant dans l'évaluation, fidèle au texte** — tolérer les hésitations orales, les accents et la prononciation humaine tout en préservant l'exactitude des vers et du lexique du XVIIe siècle.
4. **Accessible à tous les publics** — rester lisible, clair et motivant aussi bien pour un élève qui révise sa poésie que pour un parent, un enseignant ou un adulte curieux.

## Accessibility & Inclusion

- Public intergénérationnel (élèves, parents, enseignants, adultes) nécessitant une navigation claire au clavier, des libellés accessibles et un confort de lecture réglable (taille de police, numérotation des vers).
- Standards formels (ex. WCAG AA/AAA, RGAA) non encore contractualisés ; les bonnes pratiques sémantiques déjà présentes (`<dialog>`, rôles ARIA, hiérarchie de titres) doivent être préservées.
