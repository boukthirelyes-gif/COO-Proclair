# Proclair — UI polish & Google Maps Preview

Cette branche **ne dépend pas de Codex**. Elle conserve la logique métier, les catégories et les permissions de la prospection. La couleur rouge signale toujours les refus/erreurs et le vert une vente/succès ; les oranges décoratifs non nécessaires sont neutralisés à l'affichage par `proclair-ui-polish.css`.

## Google Maps
`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` est désormais définie dans Vercel **Preview**. Elle y a été copiée depuis la configuration existante de Vercel **Production**, sans modifier la variable de production. Il s'agit d'une clé de navigateur publique, mais sa valeur ne doit pas être inscrite dans GitHub.

Un nouveau build Preview doit incorporer cette clé. Si elle est autorisée pour les domaines de test, le composant `GoogleProspectingMap` utilise Google Maps. Si Google Maps refuse la clé ou que le script échoue, on retombe sur **OpenStreetMap avec les mêmes portes et contrôles**, avec un message d'erreur et un bouton « Réessayer Google Maps ».

Si Google affiche `RefererNotAllowedMapError`, ajouter le domaine HTTPS exact de la Preview aux HTTP referrers autorisés dans Google Cloud ; si `BillingNotEnabledMapError`, contrôler la facturation ; si `ApiNotActivatedMapError`, activer Maps JavaScript API. Ne pas supposer la réussite sans test sur un vrai navigateur.

Le schéma de la Preview et les données ne sont pas modifiés.
