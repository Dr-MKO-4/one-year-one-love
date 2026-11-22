# Audit design — One Year, One Love

**22 novembre 2026 · Navigation en tant que Miguel · Production Railway**

L’interface a une identité romantique cohérente. Les problèmes les plus visibles sont la lettre d’accueil encore marquée comme brouillon, les formulaires qui s’ouvrent hors de la zone visible sur mobile et les commandes du lecteur qui recouvrent parfois le contenu. L’impression de design généré vient surtout de la répétition des mêmes effets et structures, jusque dans les écrans techniques.

## Périmètre et méthode

- Captures Chromium sur ordinateur (1440 × 1000) et mobile émulé (390 × 844), avec contrôles complémentaires à 320 et 680 px. La police et les transitions d’entrée ont eu le temps de se charger. Les captures de pages longues peuvent replacer visuellement les éléments fixes à la hauteur du premier écran ou au niveau du défilement courant.
- Les captures couvrent la connexion, l’accueil et sa lettre, la playlist, la frise, le catalogue, les six fiches de jeu, les scores, l’historique et les six onglets de configuration, dont les six banques de jeu et leurs formulaires. Les sélecteurs de fichier du système d’exploitation sont hors périmètre.
- L’historique consulté était vide. Les captures préfixées par **50**, **51** et **52** montrent l’interface déployée avec des réponses de test injectées dans le navigateur. Les données d’exemple ont été produites par les moteurs de jeu du dépôt. Elles couvrent les six écrans en cours de partie, le passage du téléphone, la saisie, le choix, la révélation, le résultat, la partie interrompue et sa confirmation. Le parcours d’audit a bloqué les écritures HTTP métier en production. Le multijoueur en ligne reste à vérifier.
- **P1** gêne l’accès, l’usage ou dévoile du contenu de travail. **P2** gêne la lecture ou la compréhension. **P3** concerne surtout la cohérence visuelle et éditoriale.

## Défauts communs

| Priorité | Observation et impact | Correction proposée | Capture |
| --- | --- | --- | --- |
| P1 | Les fenêtres d’ajout de la configuration assombrissent le contenu, mais le formulaire s’ouvre sous le premier écran à 390 px. Sur ordinateur, le panneau est décalé vers le bas et le voile s’arrête aux bords de la colonne centrale. L’en-tête, la navigation mobile et le lecteur restent au-dessus du voile. | Monter les dialogues au niveau de la fenêtre et donner au panneau une hauteur maximale adaptée au viewport. Conserver les actions visibles quand le corps défile. | [Mobile](audit-design-captures/mobile/22-config-frise-ajout.png) · [Ordinateur](audit-design-captures/ordinateur/22-config-frise-ajout.png) |
| P1 | Dans le formulaire « Ajouter un moment », Échap ne ferme pas le panneau et Tab parcourt les commandes derrière lui. Le titre visible n’est pas associé au rôle de dialogue. | Donner le focus au panneau, borner la tabulation, gérer Échap et rendre le focus au déclencheur. Associer le titre au dialogue. [Guide W3C](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | [Formulaire](audit-design-captures/mobile/22-config-frise-ajout.png) |
| P1 | La pastille musicale masque le coin droit du contenu. On le voit sur la lettre, sous les jauges de scores et sur des lignes de la playlist de configuration. À 680 px, elle descend aussi dans la zone de la barre de navigation mobile, car leurs points de rupture diffèrent. | Aligner les points de rupture sur ceux de la navigation. Réserver une zone au lecteur ou l’intégrer à la barre mobile. | [Lettre](audit-design-captures/mobile/03b-lettre-ouverte.png) · [Scores](audit-design-captures/mobile/06-scores.png) · [680 px](audit-design-captures/mobile/60-680-accueil.png) |
| P2 | Sur « Nos scores », « Jeux » et « Scores » sont actifs en même temps. Deux marqueurs concurrents font perdre le repère principal de navigation. | Définir une seule section active pour le tableau de bord et expliciter le parent dans les sous-pages. | [Ordinateur](audit-design-captures/ordinateur/06-scores.png) |
| P2 | Le badge « Adèle » dans l’en-tête peut être pris pour l’identité du compte actif. Il représente la présence du partenaire, avec un statut surtout porté par la couleur d’un point. | Identifier le compte courant et rendre le statut du partenaire compréhensible par un libellé accessible. | [Accueil](audit-design-captures/mobile/03-accueil.png) |
| P2 | Les caractères fins sur rose clair, les textes en gris translucide et certaines fiches à texte blanc sur or sont difficiles à lire. Le fond dégradé rend le contraste variable sur un même écran. | Augmenter le contraste des textes utiles et foncer les zones du dégradé qui portent du texte. | [Défis](audit-design-captures/mobile/14-jeu-love-challenges.png) · [Scores](audit-design-captures/mobile/06-scores.png) · [Frise](audit-design-captures/mobile/04-frise.png) |
| P2 | Les menus et sélecteurs utilisent des couleurs pour matérialiser l’état actif. Les sélecteurs de mode, d’appareil et de difficulté n’exposent pas la sélection comme état de contrôle. | Utiliser des radios groupées ou un état ARIA adapté à l’interaction, avec un indicateur visuel distinct de la couleur. | [Configuration de partie](audit-design-captures/mobile/10c-jeu-appareil-partage.png) |
| P2 | Le thème applique battements, cœurs flottants, scintillement, parallaxe, ressorts d’entrée et animations de sélection. Le fond animé tient déjà compte du mouvement réduit. Plusieurs autres animations Framer Motion restent actives, dont la parallaxe. | Appliquer la préférence à ces composants et réserver les animations expressives à la révélation ou à la réussite. | [Connexion](audit-design-captures/mobile/01-connexion-profils.png) · [Accueil](audit-design-captures/mobile/03-accueil.png) |

### Échantillons de contraste

Les valeurs ci-dessous sont calculées à partir des couleurs CSS sur des fonds représentatifs. Sur un dégradé, le rapport varie selon la position du texte. Le repère WCAG AA est de 4,5:1 pour le texte courant et de 3:1 pour le grand texte. [WCAG 2.2, contraste minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)

| Combinaison de couleurs | Rapport | Où regarder |
| --- | ---: | --- |
| Rose #D85A7B sur crème #FFF8F3 | 3,52:1 | Libellés et dates utilisant ce rose |
| Rose #D85A7B sur rose pâle #FDE2E7 | 3,04:1 | Même teinte sur les zones plus roses |
| Or #C9974F sur blanc rosé #FFFBFC | 2,55:1 | Libellé « Compatibilité » du tableau de bord |
| Blanc sur or #DDB273 | 1,96:1 | Borne claire des fiches « Memory of Us » et « Love Challenges » |
| Encre #3A1C27 à 40 % sur blanc | 2,40:1 | Textes et contrôles estompés, dont l’action d’interruption |

## Observations par écran

### Connexion et accueil

| Priorité | Observation et correction proposée | Capture |
| --- | --- | --- |
| P2 | À la connexion, le choix des profils entre après un délai d’animation programmé de plus d’une seconde. Afficher immédiatement les deux commandes et animer seulement le décor. | [Profils](audit-design-captures/mobile/01-connexion-profils.png) |
| P2 | Le pavé présente quatre points et se valide automatiquement, sans annoncer ces deux règles. Les points constituent un retour visuel, mais le composant ne contient pas de champ natif pour la saisie ou le collage. Rendre la consigne visible et proposer une saisie numérique native avec un retour accessible. | [Code](audit-design-captures/mobile/02-connexion-code.png) |
| P1 | La lettre destinée à Adèle affiche une instruction de travail demandant à Miguel de remplacer le brouillon. Prévoir un statut brouillon et n’afficher sur l’accueil qu’une lettre publiée. | [Lettre ouverte](audit-design-captures/mobile/03b-lettre-ouverte.png) · [Éditeur](audit-design-captures/ordinateur/23-config-lettre.png) |
| P2 | Le nom du site apparaît dans l’en-tête, puis sous forme de très grand titre. Sur mobile, le salut, le titre, la date et les quatre compteurs repoussent la lettre et les jeux. Mettre la lettre ou le fait marquant du jour plus haut et réduire l’emprise du compteur. | [Accueil mobile](audit-design-captures/mobile/03-accueil.png) · [320 px](audit-design-captures/mobile/60-320-accueil.png) |
| P3 | À 320 px, le nom du site passe sur deux lignes dans l’en-tête. Le badge et l’icône de sortie gardent la même place. Prévoir un en-tête compact à cette largeur. | [320 px](audit-design-captures/mobile/60-320-accueil.png) |
| P2 | Le texte « Toucher pour ouvrir » suppose un écran tactile. Une fois la lettre ouverte, le texte entier reste dans le bouton et l’indication de repli disparaît. Donner à la lettre un bouton « Ouvrir la lettre » puis « Refermer la lettre », associé à un contenu séparé. | [Lettre ouverte](audit-design-captures/ordinateur/03b-lettre-ouverte.png) |
| P3 | Le compteur mesure des jours, heures, minutes et secondes dans quatre surfaces identiques. Le chiffre des jours est le plus porteur de sens, mais il a le même poids que les secondes. Mettre en valeur les jours et alléger la précision secondaire. | [Accueil](audit-design-captures/ordinateur/03-accueil.png) |

### Frise et musique

| Priorité | Observation et correction proposée | Capture |
| --- | --- | --- |
| P2 | La frise publique présente des événements datés comme certains alors que l’administration marque plusieurs entrées « À confirmer ». Prévoir une étape de publication ou rendre le caractère provisoire explicite. | [Frise publique](audit-design-captures/ordinateur/04-frise.png) · [Édition](audit-design-captures/mobile/22-config-frise.png) |
| P2 | En grand écran, l’alternance gauche-droite laisse une demi-colonne vide à chaque étape et fait zigzaguer la lecture. Sur mobile, le rail écarte la colonne de texte. Rapprocher dates et récits d’un même axe et réduire le retrait sur petit écran. | [Ordinateur](audit-design-captures/ordinateur/04-frise.png) · [Mobile](audit-design-captures/mobile/04-frise.png) |
| P2 | La frise déborde horizontalement à 390 px. Au chargement, la largeur de défilement a atteint 438 px et deux cartes en attente de leur animation se prolongeaient jusqu’au bord de cette zone. Sur mobile, faire entrer les cartes verticalement ou borner le débordement du rail. | [Premier écran](audit-design-captures/mobile/04b-frise-premier-ecran.png) · [Après défilement](audit-design-captures/mobile/04c-frise-apres-defilement.png) |
| P3 | Les dates en cursive rose sont peu distinctes. Certains souvenirs ont une description très générique, comme « Le jour où tout a commencé ». Donner aux dates un style fonctionnel et réserver la singularité aux détails confirmés. | [Frise](audit-design-captures/mobile/04-frise.png) |
| P2 | Le panneau musique juxtapose une barre de progression et une barre de volume sans libellés visuels accolés. La fermeture est un petit chevron centré. Distinguer les deux curseurs, rendre le contrôle de fermeture explicite et indiquer près des boutons quelles actions s’appliquent aux deux appareils. | [Lecteur](audit-design-captures/mobile/03c-lecteur-musique.png) |
| P2 | Le panneau du lecteur n’a pas de rôle de dialogue dans le composant. Il peut prendre une grande partie de l’écran en cumulant en-tête, commandes et liste déroulante. Le traiter comme un panneau accessible et dimensionner sa liste selon la hauteur restante. | [Lecteur](audit-design-captures/mobile/03c-lecteur-musique.png) |

### Catalogue et fiches de jeu

| Priorité | Observation et correction proposée | Capture |
| --- | --- | --- |
| P2 | « Tableau de bord » et « Historique » se trouvent après les six cartes. Sur mobile, l’historique demande de traverser le catalogue malgré son rôle de reprise. Ajouter un accès en tête, en particulier pour les parties existantes. | [Catalogue](audit-design-captures/mobile/05-jeux.png) |
| P3 | Les numéros 01 à 06, identiques dans leur traitement, ne correspondent pas à un ordre à suivre. Les cartes ont les mêmes coins décoratifs, pictogrammes, pastilles et flèches. Retirer les numéros et donner plus de place au format de jeu ou à l’information utile pour choisir. | [Catalogue](audit-design-captures/ordinateur/05-jeux.png) |
| P3 | Cinq titres sont en anglais et un en français. « Our Love Games » cohabite avec « Jouons ensemble », « Scores », « Tableau de bord » et « Nos scores ». Garder les noms qui ont une raison éditoriale et stabiliser les libellés de navigation. | [Catalogue](audit-design-captures/ordinateur/05-jeux.png) |
| P2 | Les six fiches commencent par une grande carte, des pastilles puis une carte de règles. Le bouton « Commencer la partie » arrive après ces blocs et les réglages. Raccourcir l’introduction et placer une action ou un résumé des réglages plus tôt. | [Who Knows Who?](audit-design-captures/mobile/10-jeu-who-knows-who.png) · [Do You Remember?](audit-design-captures/mobile/13-jeu-do-you-remember.png) |
| P2 | « Progressive », « Intermédiaire à difficile » et « Personnel + commun » demandent une interprétation. Les étiquettes de présentation et le choix de difficulté reprennent une partie des mêmes notions. Remplacer par des indications concrètes sur la durée, le nombre de joueurs et le déroulement. | [Memory of Us](audit-design-captures/mobile/12-jeu-memory-of-us.png) · [Complete My Sentence](audit-design-captures/mobile/15-jeu-complete-my-sentence.png) |
| P2 | En mode multi-appareils, le réglage et l’état de présence se trouvent loin l’un de l’autre. Le lancement promet une invitation sans préciser dans cette zone où le partenaire doit être connecté pour la recevoir. Afficher la présence et expliquer la réception près du bouton. | [Tu préfères quoi ?](audit-design-captures/mobile/11-jeu-would-you-rather.png) |
| P2 | Le choix « Qui joue ? » en solo propose les deux prénoms, alors que la session a été ouverte sous Miguel. Pour un téléphone partagé, expliquer le changement de personne à l’écran. Mettre « Miguel » en évidence comme valeur courante. | [Mode solo](audit-design-captures/mobile/12b-jeu-configuration-solo.png) |

### Scores et historique

| Priorité | Observation et correction proposée | Capture |
| --- | --- | --- |
| P2 | À l’état initial, quatre jauges affichent des tirets, les compteurs valent zéro et six cartes promettent des courbes. Sur mobile, ce cadre vide occupe beaucoup de place avant de proposer une prochaine action. Afficher un seul état de départ avec un accès direct à un jeu. | [Scores](audit-design-captures/mobile/06-scores.png) |
| P2 | Une jauge commune, deux individuelles et une de compatibilité ont presque le même traitement. La compatibilité est une mesure propre à certains jeux, mais ressemble à un indicateur global de la relation. Nommer la mesure avec son périmètre. | [Scores](audit-design-captures/ordinateur/06-scores.png) |
| P3 | « Encore 2 partie(s) pour voir la courbe » se répète sous chaque jeu dans l’état initial. Afficher une explication commune et gérer le singulier/pluriel. | [Progression](audit-design-captures/ordinateur/06-scores.png) |
| P3 | Les deux filtres restent en tête d’un historique sans partie. Le lien de lancement est petit par rapport à la carte vide. Mettre « Choisir un jeu » en action principale et afficher les filtres quand ils réduisent une liste. | [Historique](audit-design-captures/mobile/07-historique.png) |

### Configuration

| Priorité | Observation et correction proposée | Capture |
| --- | --- | --- |
| P2 | Deux carrousels de pastilles sont empilés dans l’onglet Jeux. Un accès direct à un onglet hors écran, comme Musique, peut laisser sa pastille sélectionnée invisible. Utiliser un sélecteur compact pour les banques et faire défiler l’onglet actif dans la zone visible. | [Jeux](audit-design-captures/mobile/20-config-jeux.png) · [Musique](audit-design-captures/mobile/24-config-musique.png) |
| P2 | Les lignes de banques rapprochent de petites icônes pour activer, modifier et supprimer. La suppression se distingue surtout par la forme de la corbeille et sa teinte pâle. Donner davantage d’espace et regrouper les actions secondaires dans un menu nommé. | [Banque de questions](audit-design-captures/mobile/20-config-jeux.png) |
| P2 | Les introductions générales répètent les catégories. Des formulations comme « sans toucher au code », « banque », « ordre d’affichage » et « actif(s) » rendent l’outil plus technique que nécessaire pour ses deux utilisateurs. Donner des titres propres à chaque onglet et employer « Questions actives », « Renommer » et « Déplacer ». | [Configuration](audit-design-captures/ordinateur/20-config-jeux.png) · [Formulaire frise](audit-design-captures/ordinateur/22-config-frise-ajout.png) |
| P2 | L’onglet Photos sans image affiche surtout un bouton et un grand vide, sans titre d’état ni explication de la prochaine étape au-delà du paragraphe. Structurer l’état « Aucune photo » et relier l’ajout aux usages dans la frise et le jeu de paires. | [Photos](audit-design-captures/mobile/21-config-photos.png) |
| P2 | La date libre et le champ numérique « Ordre d’affichage » demandent deux décisions pour un même moment. Le rendu mélange dates complètes et mois seuls. Donner un ordre par date par défaut et conserver un mode « mois seulement » ou un déplacement explicite si nécessaire. | [Frise](audit-design-captures/ordinateur/22-config-frise.png) · [Ajout](audit-design-captures/ordinateur/22-config-frise-ajout.png) |
| P2 | L’éditeur « Accueil & lettre » juxtapose un corps en serif imposant, sa signature et des champs de formulaire. Le passage d’une lettre en cours à sa forme publique n’est pas visible. Prévoir un aperçu et un statut de publication à côté de l’action principale. | [Éditeur](audit-design-captures/ordinateur/23-config-lettre.png) |
| P2 | « Relire le dossier » et « volume Railway » reprennent des termes d’hébergement. Les boutons de réordonnancement sont très petits et le titre, l’artiste et le nom de fichier partagent peu d’espace sur mobile. Utiliser « Actualiser la liste » et privilégier titre/artiste dans la ligne. | [Musique](audit-design-captures/mobile/24-config-musique.png) · [Renommer](audit-design-captures/mobile/24b-config-musique-renommer.png) |
| P2 | La sauvegarde présente d’abord « Sans les photos » comme action principale, alors que le choix dépend du besoin. « Choisir un fichier » ne décrit pas l’étape suivante. Clarifier ce que chaque export contient et annoncer la suite du parcours de restauration. | [Sauvegarde](audit-design-captures/mobile/25-config-sauvegarde.png) |



### Parties et résultats avec données d’exemple

| Priorité | Observation et correction proposée | Capture |
| --- | --- | --- |
| P2 | Le premier écran en appareil partagé empile le rôle, le prénom, le passage du téléphone et la promesse de secret. Réduire à une instruction prioritaire du type « Passe le téléphone à Miguel » et garder une confirmation explicite avant la révélation. | [Passage du téléphone](audit-design-captures/mobile/50-test-local-who-knows-who.png) |
| P2 | Les champs de réponse utilisent le texte indicatif à la place d’un libellé persistant. Dans Who Knows Who?, « Miguel demande » s’ajoute à « Miguel écrit sa vraie réponse » sur le même écran. Donner un libellé au champ et distinguer la personne qui répond de celle à qui il faudra passer le téléphone. | [Réponse de référence](audit-design-captures/mobile/52-test-local-reference.png) · [Saisie de phrase](audit-design-captures/mobile/52-test-local-saisie.png) |
| P2 | La difficulté, l’appareil et l’état temps réel sont regroupés en petits indicateurs. Les deux derniers sont surtout des pictogrammes. Montrer une information de connexion quand elle change ou devient utile, avec un texte lisible. | [En partie](audit-design-captures/ordinateur/50-test-local-would-you-rather.png) |
| P2 | Dans Love Challenges, « Ensemble » et « Défi à deux » se suivent. Le verdict « En partie » est un petit texte blanc sur or clair. Fusionner les deux libellés et augmenter le contraste du verdict intermédiaire. | [Défi](audit-design-captures/mobile/50-test-local-love-challenges.png) |
| P2 | Memory of Us affiche six cartes au niveau 1 et « 0 / 7 paires » sans qualifier ce total. Le nombre de paires à trouver sur le plateau et la progression de toute la partie se confondent. Indiquer les deux échelles avec leurs libellés. | [Jeu de paires](audit-design-captures/mobile/50-test-local-memory-of-us.png) |
| P2 | « Interrompre la partie » est petit et pâle. Le dialogue explique également que quitter suffit pour une pause. La différence entre une partie en cours et une partie interrompue est visible trop tard. Rendre ces deux conséquences explicites près des commandes. | [En partie](audit-design-captures/mobile/50-test-local-would-you-rather.png) · [Confirmation](audit-design-captures/mobile/51-test-local-confirmation-interruption.png) |
| P2 | Dans le résultat de « Tu préfères quoi ? », les deux scores individuels à 100 et le score commun à 13 sont affichés sans expliquer près des jauges que les premiers reflètent la participation et que le dernier reflète les choix communs. Étiqueter chaque mesure à l’endroit où elle est lue. | [Résultat](audit-design-captures/mobile/50-test-local-resultat.png) · [Révélation](audit-design-captures/mobile/50-test-local-revelation.png) |

## Motifs qui peuvent donner une impression de design généré par IA

Cette appréciation stylistique décrit des similitudes avec des interfaces de démonstration assemblées à partir de composants génériques. Les captures ne permettent pas d’attribuer l’origine du code, du texte ou des visuels.

| Motif perçu | Indices visibles | Ce qui ferait la différence |
| --- | --- | --- |
| Accumulation d’effets décoratifs | Fond à plusieurs halos roses, cœurs et étoiles dispersés, ombres diffuses, surfaces transparentes, contour lumineux des boutons. Plusieurs effets habillent une même carte. [Accueil](audit-design-captures/ordinateur/03-accueil.png) · [Connexion](audit-design-captures/ordinateur/01-connexion-profils.png) | Choisir une matière ou un effet dominant. Donner aux écrans de lecture un fond calme. |
| Romantisme de modèle préfabriqué | Cœur plein dans l’identité, avatars par initiale, chiffres dans des tuiles, vinyle décoratif, cœurs dans chaque en-tête de jeu. La plupart des motifs pourraient convenir à n’importe quel site d’anniversaire. [Catalogue et fiches](audit-design-captures/ordinateur/05-jeux.png) · [Playlist](audit-design-captures/mobile/03c-lecteur-musique.png) | Faire dériver les choix visuels des souvenirs, dates, photos et formulations propres à Miguel et Adèle. |
| Même grille de composition partout | Surtitre cursif, grand titre serif, phrase d’introduction, cartes arrondies, icône dans une pastille, étiquettes et flèche. L’administration reprend le même registre que la lettre, le catalogue et les scores. [Scores](audit-design-captures/ordinateur/06-scores.png) · [Configuration](audit-design-captures/ordinateur/20-config-jeux.png) | Distinguer mise en page éditoriale, navigation de jeu et écrans de gestion. Garder une palette commune avec des densités adaptées. |
| Variations cosmétiques entre les jeux | Les fiches changent principalement le dégradé et le pictogramme. Les six cœurs animés, le bloc de règles et les pastilles sont déclinés de la même façon. [Memory of Us](audit-design-captures/mobile/12-jeu-memory-of-us.png) · [Love Challenges](audit-design-captures/mobile/14-jeu-love-challenges.png) | Montrer un aperçu propre à la mécanique, comme une paire à retourner, un exemple de question ou deux réponses à comparer. |
| Hiérarchie fabriquée par la décoration | Numéros 01 à 06, quarts de cercle dans les coins, doubles intitulés, badges de difficulté avant les réglages. Des éléments captent l’œil sans aider à choisir. [Catalogue](audit-design-captures/mobile/05-jeux.png) | Utiliser le poids visuel pour la prochaine action, la durée et la façon de jouer. |
| Microcopie chaleureuse mais interchangeable | « Rire, se souvenir et se découvrir encore », « Et tout le reste à écrire », « Le jour où tout a commencé ». Le ton se répète, y compris sur les surfaces où l’on cherche des instructions. [Accueil](audit-design-captures/ordinateur/03-accueil.png) · [Frise](audit-design-captures/mobile/04-frise.png) | Partir des événements confirmés et employer des libellés directs dans les formulaires et les jeux. |
| Tableau de bord conçu pour une démonstration | Jauges, trophées et emplacements de courbes restent affichés même lorsque l’historique est vide. Le décor de mesure prend plus de place que les informations disponibles. [Scores vides](audit-design-captures/mobile/06-scores.png) | Concevoir l’état initial autour du premier jeu et faire apparaître les graphiques quand ils ont une série à montrer. |
| Mouvement ajouté à chaque niveau | Texte scintillant, cœur qui bat, cartes qui se soulèvent, pastilles à ressort, éléments qui entrent au défilement, disque animé et célébrations. La répétition donne aux transitions le même ton quel que soit l’enjeu. [Accueil](audit-design-captures/mobile/03-accueil.png) · [Fiche jeu](audit-design-captures/mobile/15-jeu-complete-my-sentence.png) | Réserver les animations expressives à la lettre, aux révélations et à des résultats précis. |
| Page de démonstration publiée avec ses traces de préparation | Lettre de travail dans l’accueil, événements à confirmer visibles dans la frise et banque commentée comme un contenu à vérifier. [Lettre](audit-design-captures/mobile/03b-lettre-ouverte.png) · [Banque](audit-design-captures/mobile/20-config-jeux.png) | Relire le site dans le rôle de chaque destinataire et publier les éléments confirmés. |

## Ordre de correction

1. Corriger les dialogues et le lecteur flottant, puis vérifier au clavier et à 320, 390 et 680 px.
2. Retirer le brouillon de l’accueil et vérifier la publication des souvenirs provisoires.
3. Renforcer les contrastes des textes et clarifier les états actifs dans la navigation et les sélecteurs.
4. Simplifier l’état initial des scores, remonter le lancement des jeux et faciliter la reprise depuis l’historique.
5. Réserver la cursive, les cœurs et les animations aux quelques moments où ils servent le récit.


## Index des captures

### Connexion

| Écran | Ordinateur | Mobile |
| --- | --- | --- |
| Choix du profil | [1440 px](audit-design-captures/ordinateur/01-connexion-profils.png) | [390 px](audit-design-captures/mobile/01-connexion-profils.png) |
| Saisie du code | [1440 px](audit-design-captures/ordinateur/02-connexion-code.png) | [390 px](audit-design-captures/mobile/02-connexion-code.png) |

### Accueil et frise

| Écran | Ordinateur | Mobile |
| --- | --- | --- |
| Accueil | [1440 px](audit-design-captures/ordinateur/03-accueil.png) | [390 px](audit-design-captures/mobile/03-accueil.png) |
| Lettre ouverte | [1440 px](audit-design-captures/ordinateur/03b-lettre-ouverte.png) | [390 px](audit-design-captures/mobile/03b-lettre-ouverte.png) |
| Playlist ouverte | [1440 px](audit-design-captures/ordinateur/03c-lecteur-musique.png) | [390 px](audit-design-captures/mobile/03c-lecteur-musique.png) |
| Frise | [1440 px](audit-design-captures/ordinateur/04-frise.png) | [390 px](audit-design-captures/mobile/04-frise.png) |

### Catalogue et scores

| Écran | Ordinateur | Mobile |
| --- | --- | --- |
| Catalogue | [1440 px](audit-design-captures/ordinateur/05-jeux.png) | [390 px](audit-design-captures/mobile/05-jeux.png) |
| Tableau de bord | [1440 px](audit-design-captures/ordinateur/06-scores.png) | [390 px](audit-design-captures/mobile/06-scores.png) |
| Historique | [1440 px](audit-design-captures/ordinateur/07-historique.png) | [390 px](audit-design-captures/mobile/07-historique.png) |

### Fiches et réglages des jeux

| Écran | Ordinateur | Mobile |
| --- | --- | --- |
| Who Knows Who? | [1440 px](audit-design-captures/ordinateur/10-jeu-who-knows-who.png) | [390 px](audit-design-captures/mobile/10-jeu-who-knows-who.png) |
| Appareil partagé | [1440 px](audit-design-captures/ordinateur/10c-jeu-appareil-partage.png) | [390 px](audit-design-captures/mobile/10c-jeu-appareil-partage.png) |
| Tu préfères quoi ? | [1440 px](audit-design-captures/ordinateur/11-jeu-would-you-rather.png) | [390 px](audit-design-captures/mobile/11-jeu-would-you-rather.png) |
| Memory of Us | [1440 px](audit-design-captures/ordinateur/12-jeu-memory-of-us.png) | [390 px](audit-design-captures/mobile/12-jeu-memory-of-us.png) |
| Mode solo | [1440 px](audit-design-captures/ordinateur/12b-jeu-configuration-solo.png) | [390 px](audit-design-captures/mobile/12b-jeu-configuration-solo.png) |
| Do You Remember? | [1440 px](audit-design-captures/ordinateur/13-jeu-do-you-remember.png) | [390 px](audit-design-captures/mobile/13-jeu-do-you-remember.png) |
| Love Challenges | [1440 px](audit-design-captures/ordinateur/14-jeu-love-challenges.png) | [390 px](audit-design-captures/mobile/14-jeu-love-challenges.png) |
| Complete My Sentence | [1440 px](audit-design-captures/ordinateur/15-jeu-complete-my-sentence.png) | [390 px](audit-design-captures/mobile/15-jeu-complete-my-sentence.png) |

### Configuration

| Écran | Ordinateur | Mobile |
| --- | --- | --- |
| Jeux et banque Who Knows Who? | [1440 px](audit-design-captures/ordinateur/20-config-jeux.png) | [390 px](audit-design-captures/mobile/20-config-jeux.png) |
| Photos | [1440 px](audit-design-captures/ordinateur/21-config-photos.png) | [390 px](audit-design-captures/mobile/21-config-photos.png) |
| Frise | [1440 px](audit-design-captures/ordinateur/22-config-frise.png) | [390 px](audit-design-captures/mobile/22-config-frise.png) |
| Ouverture du formulaire Frise | [1440 px](audit-design-captures/ordinateur/22-config-frise-ajout.png) | [390 px](audit-design-captures/mobile/22-config-frise-ajout.png) |
| Formulaire Frise après navigation au clavier | [1440 px](audit-design-captures/ordinateur/22-config-frise-formulaire-defile.png) | [390 px](audit-design-captures/mobile/22-config-frise-formulaire-defile.png) |
| Accueil & lettre | [1440 px](audit-design-captures/ordinateur/23-config-lettre.png) | [390 px](audit-design-captures/mobile/23-config-lettre.png) |
| Musique | [1440 px](audit-design-captures/ordinateur/24-config-musique.png) | [390 px](audit-design-captures/mobile/24-config-musique.png) |
| Renommage d’un titre | [1440 px](audit-design-captures/ordinateur/24b-config-musique-renommer.png) | [390 px](audit-design-captures/mobile/24b-config-musique-renommer.png) |
| Sauvegarde | [1440 px](audit-design-captures/ordinateur/25-config-sauvegarde.png) | [390 px](audit-design-captures/mobile/25-config-sauvegarde.png) |

### Autres banques de jeux

| Écran | Ordinateur | Mobile |
| --- | --- | --- |
| Tu préfères quoi ? | [1440 px](audit-design-captures/ordinateur/30-banque-would-you-rather.png) | [390 px](audit-design-captures/mobile/30-banque-would-you-rather.png) |
| Memory of Us | [1440 px](audit-design-captures/ordinateur/31-banque-memory-of-us.png) | [390 px](audit-design-captures/mobile/31-banque-memory-of-us.png) |
| Do You Remember? | [1440 px](audit-design-captures/ordinateur/32-banque-do-you-remember.png) | [390 px](audit-design-captures/mobile/32-banque-do-you-remember.png) |
| Love Challenges | [1440 px](audit-design-captures/ordinateur/33-banque-love-challenges.png) | [390 px](audit-design-captures/mobile/33-banque-love-challenges.png) |
| Complete My Sentence | [1440 px](audit-design-captures/ordinateur/34-banque-complete-my-sentence.png) | [390 px](audit-design-captures/mobile/34-banque-complete-my-sentence.png) |

### Formulaires de banques

| Écran | Ordinateur | Mobile |
| --- | --- | --- |
| Who Knows Who? | [1440 px](audit-design-captures/ordinateur/20-config-jeux-formulaire.png) | [390 px](audit-design-captures/mobile/20-config-jeux-formulaire.png) |
| Tu préfères quoi ? | [1440 px](audit-design-captures/ordinateur/30-banque-would-you-rather-formulaire.png) | [390 px](audit-design-captures/mobile/30-banque-would-you-rather-formulaire.png) |
| Memory of Us | [1440 px](audit-design-captures/ordinateur/31-banque-memory-of-us-formulaire-defile.png) | [390 px](audit-design-captures/mobile/31-banque-memory-of-us-formulaire-defile.png) |
| Do You Remember? | [1440 px](audit-design-captures/ordinateur/32-banque-do-you-remember-formulaire-defile.png) | [390 px](audit-design-captures/mobile/32-banque-do-you-remember-formulaire-defile.png) |
| Love Challenges | [1440 px](audit-design-captures/ordinateur/33-banque-love-challenges-formulaire-defile.png) | [390 px](audit-design-captures/mobile/33-banque-love-challenges-formulaire-defile.png) |
| Complete My Sentence | [1440 px](audit-design-captures/ordinateur/34-banque-complete-my-sentence-formulaire-defile.png) | [390 px](audit-design-captures/mobile/34-banque-complete-my-sentence-formulaire-defile.png) |

### Parties avec données d’exemple

| Écran | Ordinateur | Mobile |
| --- | --- | --- |
| Who Knows Who? | [1440 px](audit-design-captures/ordinateur/50-test-local-who-knows-who.png) | [390 px](audit-design-captures/mobile/50-test-local-who-knows-who.png) |
| Tu préfères quoi ? | [1440 px](audit-design-captures/ordinateur/50-test-local-would-you-rather.png) | [390 px](audit-design-captures/mobile/50-test-local-would-you-rather.png) |
| Memory of Us | [1440 px](audit-design-captures/ordinateur/50-test-local-memory-of-us.png) | [390 px](audit-design-captures/mobile/50-test-local-memory-of-us.png) |
| Do You Remember? | [1440 px](audit-design-captures/ordinateur/50-test-local-do-you-remember.png) | [390 px](audit-design-captures/mobile/50-test-local-do-you-remember.png) |
| Love Challenges | [1440 px](audit-design-captures/ordinateur/50-test-local-love-challenges.png) | [390 px](audit-design-captures/mobile/50-test-local-love-challenges.png) |
| Complete My Sentence | [1440 px](audit-design-captures/ordinateur/50-test-local-complete-my-sentence.png) | [390 px](audit-design-captures/mobile/50-test-local-complete-my-sentence.png) |
| Passage à Adèle | [1440 px](audit-design-captures/ordinateur/50-test-local-attente.png) | [390 px](audit-design-captures/mobile/50-test-local-attente.png) |
| Révélation | [1440 px](audit-design-captures/ordinateur/50-test-local-revelation.png) | [390 px](audit-design-captures/mobile/50-test-local-revelation.png) |
| Résultat | [1440 px](audit-design-captures/ordinateur/50-test-local-resultat.png) | [390 px](audit-design-captures/mobile/50-test-local-resultat.png) |
| Partie interrompue | [1440 px](audit-design-captures/ordinateur/50-test-local-partie-interrompue.png) | [390 px](audit-design-captures/mobile/50-test-local-partie-interrompue.png) |
| Confirmation d’interruption | [1440 px](audit-design-captures/ordinateur/51-test-local-confirmation-interruption.png) | [390 px](audit-design-captures/mobile/51-test-local-confirmation-interruption.png) |
| Saisie d’une réponse de référence | [1440 px](audit-design-captures/ordinateur/52-test-local-reference.png) | [390 px](audit-design-captures/mobile/52-test-local-reference.png) |
| Choix entre deux réponses | [1440 px](audit-design-captures/ordinateur/52-test-local-choix.png) | [390 px](audit-design-captures/mobile/52-test-local-choix.png) |
| Saisie d’une phrase | [1440 px](audit-design-captures/ordinateur/52-test-local-saisie.png) | [390 px](audit-design-captures/mobile/52-test-local-saisie.png) |

### Largeurs complémentaires

| Écran | 320 px | 680 px |
| --- | --- | --- |
| Accueil | [320 px](audit-design-captures/mobile/60-320-accueil.png) | [680 px](audit-design-captures/mobile/60-680-accueil.png) |
| Scores | [320 px](audit-design-captures/mobile/60-320-scores.png) | [680 px](audit-design-captures/mobile/60-680-scores.png) |
| Fiche Love Challenges | [320 px](audit-design-captures/mobile/60-320-jeu-defis.png) | [680 px](audit-design-captures/mobile/60-680-jeu-defis.png) |
| Configuration | [320 px](audit-design-captures/mobile/60-320-config.png) | [680 px](audit-design-captures/mobile/60-680-config.png) |



### États complémentaires des formulaires

| Écran | Ordinateur | Mobile |
| --- | --- | --- |
| Nouveau moment au clavier | [1440 px](audit-design-captures/ordinateur/22-config-frise-formulaire.png) | [390 px](audit-design-captures/mobile/22-config-frise-formulaire.png) |
| Ouverture du formulaire Memory of Us | [1440 px](audit-design-captures/ordinateur/31-banque-memory-of-us-formulaire.png) | [390 px](audit-design-captures/mobile/31-banque-memory-of-us-formulaire.png) |
| Ouverture du formulaire Do You Remember? | [1440 px](audit-design-captures/ordinateur/32-banque-do-you-remember-formulaire.png) | [390 px](audit-design-captures/mobile/32-banque-do-you-remember-formulaire.png) |
| Ouverture du formulaire Love Challenges | [1440 px](audit-design-captures/ordinateur/33-banque-love-challenges-formulaire.png) | [390 px](audit-design-captures/mobile/33-banque-love-challenges-formulaire.png) |
| Ouverture du formulaire Complete My Sentence | [1440 px](audit-design-captures/ordinateur/34-banque-complete-my-sentence-formulaire.png) | [390 px](audit-design-captures/mobile/34-banque-complete-my-sentence-formulaire.png) |

