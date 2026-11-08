# LearnableMeta FR

Un script Tampermonkey pour traduire les popups de LearnableMeta en français sur GeoGuessr.

Un bouton dans la popup permet de revenir à l’anglais et de réactiver la traduction. Le choix est mémorisé. Les images et les liens restent accessibles.

## Installation

1. Installer [Tampermonkey](https://www.tampermonkey.net/).
2. Installer le script original depuis [LearnableMeta](https://learnablemeta.com/) et le garder activé.
3. Dans Tampermonkey, créer un nouveau script.
4. Remplacer le contenu par celui de `learnablemeta-fr.user.js`, puis enregistrer.
5. Recharger GeoGuessr.

La traduction se lance à l’apparition de la popup LearnableMeta.

## Traduction et confidentialité

Le texte des popups est envoyé à Google Traduction via un accès non officiel, sans clé API ni compte à configurer.

Les traductions sont conservées dans le stockage du script pour éviter les requêtes répétées. Le cache peut être vidé depuis le menu Tampermonkey.

Le service peut être temporairement indisponible ou limiter les requêtes. Dans ce cas, le texte reste en anglais et un bouton permet de réessayer.

La traduction est automatique et peut contenir des erreurs, notamment sur les termes propres à GeoGuessr. Les textes intégrés aux images ne sont pas traduits.

## Mises à jour

Les mises à jour se font manuellement en remplaçant le contenu du script dans Tampermonkey par la dernière version du dépôt.

## À propos

Projet indépendant, non affilié à LearnableMeta, GeoGuessr ou Google.

Ce script complète [LearnableMeta](https://learnablemeta.com/) et nécessite son script original pour fonctionner.
