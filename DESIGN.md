---
name: Les Fables de La Fontaine
description: Rigueur éditoriale contemporaine et contrôles discrets au service de la lecture annotée et de la récitation active des Fables.
colors:
  encre-indigo: "#4f46e5"
  encre-indigo-profonde: "#4338ca"
  lavis-indigo: "#eef2ff"
  filet-indigo: "#e0e7ff"
  indigo-doux: "#818cf8"
  plume-dor: "#fbbf24"
  ambre-vocal: "#d97706"
  lavis-ambre: "#fffbeb"
  laurier-vif: "#16a34a"
  laurier-barre: "#22c55e"
  lavis-laurier: "#f0fdf4"
  carmin-erreur: "#dc2626"
  papier-blanc: "#ffffff"
  brume-lavande: "#f9fafb"
  papier-cendre: "#f3f4f6"
  filet-neutre: "#e5e7eb"
  filet-champ: "#d1d5db"
  encre-noire: "#111827"
  encre-vers: "#1f2937"
  encre-secondaire: "#374151"
  encre-corps: "#4b5563"
  encre-discrete: "#6b7280"
  encre-attente: "#9ca3af"
typography:
  display:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.05em"
  headline:
    fontFamily: "Lora, Georgia, Cambria, Times New Roman, Times, serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.25
  title:
    fontFamily: "Lora, Georgia, Cambria, Times New Roman, Times, serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.4
  verse:
    fontFamily: "Lora, Georgia, Cambria, Times New Roman, Times, serif"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1.625
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
    letterSpacing: "0.025em"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.encre-indigo}"
    textColor: "{colors.papier-blanc}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.encre-indigo-profonde}"
    textColor: "{colors.papier-blanc}"
  button-secondary:
    backgroundColor: "{colors.papier-blanc}"
    textColor: "{colors.encre-secondaire}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  tab-active:
    backgroundColor: "{colors.encre-indigo}"
    textColor: "{colors.papier-blanc}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  card-sheet:
    backgroundColor: "{colors.papier-blanc}"
    textColor: "{colors.encre-vers}"
    rounded: "{rounded.lg}"
    padding: "24px"
  input-field:
    backgroundColor: "{colors.papier-blanc}"
    textColor: "{colors.encre-noire}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "12px"
  chip-active:
    backgroundColor: "{colors.lavis-indigo}"
    textColor: "{colors.encre-indigo-profonde}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    padding: "6px 10px"
  badge-mastered:
    backgroundColor: "{colors.lavis-laurier}"
    textColor: "{colors.laurier-vif}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  verse-validated:
    backgroundColor: "{colors.lavis-laurier}"
    textColor: "{colors.encre-vers}"
    typography: "{typography.verse}"
    rounded: "{rounded.sm}"
    padding: "4px 16px"
---

# Design System: Les Fables de La Fontaine

## Overview

**Creative North Star: "La Bibliothèque Éclairée"**

L'interface de *Les Fables de La Fontaine* marie une rigueur éditoriale contemporaine à une grande clarté pédagogique. Les feuillets de lecture et de récitation en papier blanc reposent avec légèreté sur un fond lumineux à peine teinté, laissant aux vers classiques toute leur respiration. Le chrome applicatif — onglets, réglages de lecture, filtres et tiroir latéral — reste raffiné, précis et retenu afin de s'effacer devant le texte dès que la lecture ou la mémorisation commence.

Cette esthétique lumineuse et littéraire sans austérité tient à distance deux écueils opposés : ni « vieux grimoire poussiéreux » aux textures vieillies et ornements lourds, ni « tableau de bord SaaS froid » saturé de widgets et de cadres techniques. Les rares notes ludiques — plume dorée du logo, jeu 3D du Corbeau et du Renard, validation progressive en vert laurier — accompagnent l'effort d'apprentissage sans jamais rompre le calme de la page.

**Key Characteristics:**
- Clarté éditoriale lumineuse : feuillets blancs sur fond *Brume Lavande* et hiérarchie typographique centrée sur le vers.
- Contrôles raffinés et retenus : boutons, onglets et filtres compacts qui guident sans rivaliser avec le poème.
- Retour pédagogique immédiat : codage couleur sémantique net entre réussite (*Laurier*), hésitation vocale (*Ambre*) et erreur de frappe (*Carmin*).
- Adaptabilité intergénérationnelle : taille de police réglable, numérotation discrète et navigation claire sur bureau, tablette et mobile.

## Colors

Une palette ancrée dans un registre encre et papier : un accent *Encre Indigo* structurant, des neutres froids et propres pour la lecture longue, et trois teintes fonctionnelles strictement dédiées au jeu, à la voix et à la validation des vers.

### Primary
- **Encre Indigo** (`encre-indigo`): Accent principal de l'application — boutons d'action primaires (*S'entraîner sur cette fable*, *Confirmer*), onglet de mode actif, icônes clés, soulignement pointillé des termes XVIIe (`[data-terme]`) et anneaux de focus clavier.
- **Encre Indigo Profonde** (`encre-indigo-profonde`): État de survol des boutons primaires, libellés actifs dans les contrôles segmentés et titres de définitions dans les infobulles de lexique.
- **Lavis Indigo** (`lavis-indigo`) & **Filet Indigo** (`filet-indigo`): Fonds très doux et bordures subtiles pour l'élément sélectionné dans la liste des fables, les boutons secondaires d'appel à la lecture et le contour des cartes de lecture et de la barre d'onglets.
- **Indigo Doux** (`indigo-doux`): Ornements typographiques secondaires (tildes des sous-titres) et accents discrets.

### Secondary
- **Plume d'Or** (`plume-dor`) & **Lavis Ambre** (`lavis-ambre`): Accent chaleureux réservé à l'emblème plume du logo latéral et à l'état sélectionné des cartes dans la rubrique *Jeux des Fables*.
- **Ambre Vocal** (`ambre-vocal`): Signalement bienveillant des mots manqués lors de la récitation vocale (accompagné d'un soulignement en pointillés).

### Tertiary
- **Laurier Vif** (`laurier-vif`), **Laurier Barre** (`laurier-barre`) & **Lavis Laurier** (`lavis-laurier`): Retour positif de mémorisation — caractères et mots validés en temps réel, barre de progression, badge *Récitée*, icône de fable maîtrisée et bande latérale gauche sur un vers validé.
- **Carmin Erreur** (`carmin-erreur`): Signalement immédiat d'un caractère erroné en mode récitation écrite.

### Neutral
- **Papier Blanc** (`papier-blanc`): Surface normative des cartes de lecture, des cartes de récitation, du tiroir latéral, des champs de saisie, des modales et des infobulles de définitions (parfois translucide à 80 % sur les barres flottantes).
- **Brume Lavande** (`brume-lavande`): Base claire du document, habillée par le voile fixe `background-overlay` en léger dégradé lavande-indigo (`rgba(238, 242, 255, 0.85)` vers `rgba(250, 245, 255, 0.65)`).
- **Papier Cendré** (`papier-cendre`): Surface de repos des éléments de liste dans le menu latéral et des fonds de contrôles segmentés.
- **Filet Neutre** (`filet-neutre`) & **Filet Champ** (`filet-champ`): Séparateurs internes légers, bordures de cartes secondaires et contours des champs de saisie/zones de texte.
- **Hiérarchie d'encre** (`encre-noire`, `encre-vers`, `encre-secondaire`, `encre-corps`, `encre-discrete`, `encre-attente`): De l'encre profonde pour les titres de fables jusqu'au gris léger pour les numéros de vers et les caractères encore en attente de saisie.

### Named Rules
**The Quiet Ink Rule.** L'Encre Indigo signale l'action active, le focus et les annotations du lexique ; elle n'envahit jamais les grandes surfaces de fond de carte, qui restent en Papier Blanc pour préserver le confort de lecture.

**The Semantic Feedback Rule.** Le Laurier, l'Ambre Vocal et le Carmin Erreur portent exclusivement l'état pédagogique (validé, manqué à l'oral, erreur de frappe) et les insignes de progression ou de jeu — jamais de décoration arbitraire.

## Typography

**Display Font:** Cormorant Garamond (fallback `Georgia, serif`)
**Body / Literary Font:** Lora (fallback `Georgia, Cambria, "Times New Roman", Times, serif`)
**UI / Label Font:** Inter (fallback `ui-sans-serif, system-ui, sans-serif`)

**Character:** Un dialogue assumé entre l'élégance classique des sérifs littéraires (Cormorant Garamond pour l'en-tête patrimonial, Lora pour la cadence des vers et des définitions) et la neutralité chirurgicale d'Inter pour tout ce qui relève du pilotage, des compteurs et des métadonnées.

### Hierarchy
- **Display** (600, `1.25rem` mobile / `2.25rem` desktop, interligne `1.2`, interlettrage `0.05em`): Titre principal de l'application (*Les Fables de La Fontaine*) centré en haut de scène.
- **Headline** (600, `1.875rem` / `30px`, interligne `1.25`, Lora): Titre de la fable active en mode Lecture intégrale ou Récitation.
- **Title** (600, `1.125rem` / `18px`, interligne `1.4`, Lora): Titres de sections éditoriales (*Jeux des Fables*, en-têtes de dialogues de confirmation, titres de cartes).
- **Verse** (400, réglable `1.125rem` / `1.25rem` / `1.5rem`, interligne `1.625` à `2.0`, Lora): Corps poétique des fables ; interligne généreux et alignement stable avec les numéros de vers.
- **Body** (400–500, `0.875rem` / `14px`, interligne `1.5`, Inter): Libellés de boutons, onglets, champs de recherche, descriptions courtes et messages de modale.
- **Label** (500, `0.75rem` / `12px`, Inter, `tabular-nums` sur les numéros de vers): Métadonnées de Livre/nombre de vers, badges d'état, compteurs et micro-libellés d'aide.

### Named Rules
**The Two-Voice Type Rule.** Tout ce qui appartient à l'œuvre (titres de fables, vers, citations, définitions du XVIIe siècle) se compose en sérif (*Lora* ou *Cormorant Garamond*) ; tout ce qui appartient à l'outil (onglets, boutons, filtres, numéros de vers, scores) se compose en *Inter*.

**The Tabular Verse-Number Rule.** Les numéros de vers et compteurs utilisent `tabular-nums` en gris discret afin que la colonne gauche des strophes reste parfaitement alignée sans attirer l'œil.

## Layout

L'espace s'organise autour d'un **pupitre centré à une colonne** (`max-width: 896px` / `max-w-4xl`, marges horizontales `16px`, espacement vertical `40px` en haut/bas et `32px` entre blocs majeurs) accompagné d'un **tiroir latéral gauche** (`384px` / `sm:w-96`, pleine largeur bornée à `384px` sur mobile).

- **Comportement responsive** : sous `1024px` (`lg`), le menu latéral se replie en tiroir coulissant déclenché par un bouton flottant en haut à gauche (`left: 16px, top: 16px`) au-dessus d'un voile sombre (`rgba(0, 0, 0, 0.2)`). À partir de `1024px`, le menu s'épingle automatiquement et décale la scène principale (`padding-left: 400px`) pour éviter tout chevauchement.
- **Mode concentration** : lorsque la zone de récitation est active (`isFocused`), la barre latérale s'estompe (`opacity: 0.5`) pour recentrer toute l'attention sur les 4 vers en cours.
- **Rythme interne** : les cartes emploient un padding interne uniforme de `24px` (`lg`), des en-têtes séparés par un filet léger (`1px solid #f3f4f6`) et un espacement régulier de `16px` (`md`) à `24px` (`lg`) entre les groupes de contrôles.

## Elevation & Depth

Le système repose sur une philosophie de **feuillets superposés (layered) avec ombres ambiantes douces**. Les cartes blanches reposent légèrement au-dessus de la *Brume Lavande*, et chaque palier d'ombre correspond strictement à une couche fonctionnelle — du contrôle posé sur la page jusqu'au tiroir de navigation ou à la fenêtre de confirmation.

### Shadow Vocabulary
- **Control Subtle** (`box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05)`): Onglet actif, barre d'onglets translucide, bouton primaire et cartes de sélection de jeu.
- **Sheet Resting** (`box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)`): Cartes principales de lecture (`FableReader`) et de récitation (`PoemDisplay`, `Card`).
- **Floating Trigger** (`box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)`): Bouton flottant d'ouverture du menu, info-bulles sombres (`Tooltip`) et état vide principal.
- **Overlay Surface** (`box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)`): Infobulles de lexique XVIIe (`terme-popover`) et fenêtres de confirmation (`ConfirmDialog`).
- **Drawer Surface** (`box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25)`): Panneau latéral fixe (`SideMenu`) détaché au-dessus de la scène.

### Named Rules
**The Functional Depth Rule.** Une ombre plus marquée signale toujours un changement de couche fonctionnelle (page → feuille → déclencheur flottant → infobulle/modale → tiroir) ; on n'empile jamais de fortes ombres à l'intérieur d'une carte déjà élevée.

## Shapes

Une géométrie douce, sobre et homogène centrée sur le rayon de **`8px`** (`rounded-lg`), assez adouci pour accueillir un jeune public sans tomber dans le style « bulle » enfantin.

- **Rayon standard (`8px`)** : cartes (`Card`), boutons d'action, champs de recherche et zones de texte, modales, infobulles de lexique et éléments de liste de fables.
- **Conteneurs enveloppants (`12px`)** : barre d'onglets principale (`tablist`) et cartes de sélection du hub de jeux, pour encadrer proprement leurs éléments internes à `8px`.
- **Contrôles imbriqués (`6px`)** : segments internes de `ReaderControls` (*Fable* / *Recueil complet*) à l'intérieur de leur piste `8px`.
- **Pilules intégrales (`9999px`)** : barre de progression de récitation, badge de maîtrise (*Récitée*), étiquettes techniques et pastille plume du logo.
- **Repère éditorial droit (`4px` à droite, filet gauche `4px`)** : bandeau de vers validé dans `PoemDisplay`, qui ancre la ligne validée sur une marge gauche franche en *Laurier*.

## Components

Des composants raffinés et retenus : chaque contrôle limite son empreinte visuelle à l'essentiel (bordure fine, transition rapide de couleur en `150ms`, focus clavier net en *Encre Indigo*) afin que le poème reste le point focal.

### Buttons
- **Shape:** Coins doucement arrondis (`8px`).
- **Primary:** Fond *Encre Indigo* (`#4f46e5`), texte *Papier Blanc*, padding `8px 16px`, ombre subtile (`shadow-xs`), icône Lucide `16px` alignée à gauche avec `8px` d'écart.
- **Hover / Focus:** Transition couleur douce vers *Encre Indigo Profonde* (`#4338ca`) ; focus clavier entouré d'un anneau `2px` en *Encre Indigo*.
- **Secondary / Ghost:** Fond *Papier Blanc* avec bordure fine *Filet Neutre* (`1px solid #e5e7eb`) et texte *Encre Secondaire* (`#374151`), passant au survol à une bordure indigo douce et un lavis très léger (`#eef2ff` à 50 %). Variante texte pur (*Annuler*) sur fond transparent avec survol *Papier Cendré* (`#f3f4f6`).

### Chips
- **Style:** Compacts (`6px 10px` ou `2px 10px` pour les badges), typographie `12px` medium en *Inter*.
- **State:** Les filtres/bascules (*Vers*) passent d'un fond blanc bordé de gris à un fond *Lavis Indigo* bordé d'indigo pâle avec texte *Encre Indigo Profonde*. Les badges d'état utilisent une pilule pleine (*Récitée* en vert doux, badge technique en ambre clair).

### Cards / Containers
- **Corner Style:** `8px` pour les feuillets standards (`Card`), `12px` pour le sélecteur de hub de jeux.
- **Background:** *Papier Blanc* (`#ffffff`), parfois bordé d'un fin *Filet Indigo* (`1px solid rgba(224, 231, 255, 0.8)`).
- **Shadow Strategy:** Ombre ambiante `Sheet Resting` (`shadow-md`) au repos ; aucune élévation supplémentaire sur les blocs enfants.
- **Internal Padding:** `24px` uniforme (`p-6`), avec séparateurs horizontaux internes `1px solid #f3f4f6`.

### Inputs / Fields
- **Style:** Fond *Papier Blanc*, bordure `1px solid #d1d5db` (ou `#e5e7eb` dans le tiroir latéral), coins `8px`, padding `12px` (ou `8px 16px` avec `40px` à gauche pour l'icône loupe de recherche).
- **Focus:** Suppression du contour natif remplacé par un anneau net `2px` en *Encre Indigo* (ou halo *Lavis Indigo* + bordure *Encre Indigo* dans la barre de recherche).
- **Error / Disabled:** Les contrôles désactivés (*A-* / *A+* en butée) s'atténuent à `opacity: 0.35` avec curseur `not-allowed`.

### Navigation
- **Barre de modes principale** : piste translucide (`rgba(255, 255, 255, 0.8)` + léger `backdrop-blur`), bordure *Filet Indigo*, coins `12px`, padding `4px`. Trois onglets (*Récitation*, *Lecture intégrale*, *Jeux*) : actif en plein *Encre Indigo* + texte blanc, inactif en gris neutre virant à l'indigo au survol.
- **Menu latéral (`SideMenu`)** : panneau blanc pleine hauteur (`384px`), ombre `Drawer Surface`, divisé en sections accordéons (*Récitez des fables*, *Lire les fables*, *Jeux*, *Vers récités*). Éléments sélectionnés soulignés par un fond *Lavis Indigo* et une bordure *Encre Indigo* (`1px`).

### Signature Component: Verse Display & 17th-Century Glossary Annotation
- **Vers validé** (`PoemDisplay`) : transition douce (`300ms`), fond *Lavis Laurier*, marge interne gauche `16px`, filet vertical gauche de `4px` en *Laurier Barre* et léger accent d'échelle (`scale(1.01)`). En saisie active (*Facile*), chaque caractère passe en temps réel du gris d'attente (`#9ca3af`) au *Laurier Vif* (`#16a34a`) ou au *Carmin Erreur* (`#dc2626`).
- **Terme annoté XVIIe** (`EnrichedVerses`) : soulignement pointillé *Encre Indigo* (`1.5px`, décalage `4px`, curseur `help`) ouvrant au survol ou au clic une carte flottante `terme-popover` (largeur max `300px`, *Papier Blanc*, bordure indigo douce, ombre `Overlay Surface`, apparition en fondu `150ms`) affichant le terme en *Lora* italique gras indigo suivi de sa définition.

## Do's and Don'ts

### Do:
- **Do** composer tous les titres de fables, vers et définitions en *Lora* (et le titre principal en *Cormorant Garamond*) tout en réservant *Inter* aux contrôles, boutons et métadonnées (**The Two-Voice Type Rule**).
- **Do** garder les feuillets de lecture et de récitation en *Papier Blanc* (`#ffffff`) avec un interligne généreux (`1.625` à `2.0`) et une largeur maximale de `896px` pour préserver le confort de lecture.
- **Do** utiliser *Laurier*, *Ambre Vocal* et *Carmin Erreur* uniquement pour le retour pédagogique en temps réel et la progression (**The Semantic Feedback Rule**).
- **Do** respecter le rayon de `8px` sur les cartes, boutons et champs, et `12px` sur les conteneurs d'onglets enveloppants.
- **Do** préserver l'estompage du menu latéral (`opacity: 0.5`) pendant la saisie active et la navigation clavier complète (Échap sur les modales et infobulles, rôles `tablist`/`tab` et `<dialog>`).

### Don't:
- **Don't** introduire de textures parchemin, d'ornements baroques chargés ou de couleurs sombres façon tableau de bord SaaS qui contrediraient la luminosité de *La Bibliothèque Éclairée*.
- **Don't** appliquer de texte en dégradé (`bg-clip-text`) ou de nouveaux dégradés violet/indigo décoratifs sur les titres et compteurs ; privilégier une encre unie et lisible (dette existante repérée dans `MenuLogo.tsx` à corriger lors d'une future passe `/impeccable polish`).
- **Don't** empiler des ombres fortes (`shadow-lg` / `shadow-xl`) sur des sous-blocs à l'intérieur d'une carte déjà élevée (**The Functional Depth Rule**).
- **Don't** utiliser l'*Encre Indigo* en grand aplat de fond derrière des vers ; réserver son intensité aux actions primaires, états actifs et repères lexicaux (**The Quiet Ink Rule**).
