# Proclair bleu et chargement Google Maps

L'identité Proclair utilise le bleu : marque, boutons principaux, navigation active, liens, progression, OMEGA, classement et groupes de portes. Les couleurs métier enregistrées des pins, les alertes, annulations et priorités ne sont pas réécrites.

## Configuration Google à l'exécution

La carte lit `/api/prospecting/map-config` après authentification avec `map.read`. La réponse n'est pas mise en cache. Le serveur utilise `GOOGLE_MAPS_BROWSER_API_KEY`, ou `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` pour compatibilité. La clé est expressément destinée au navigateur ; le code ne publie jamais `GOOGLE_MAPS_API_KEY` ou une autre clé serveur.

Cela évite la sélection Google/Leaflet figée dans le bundle au moment de compiler Next.js. Les variables du serveur doivent néanmoins être présentes dans le déploiement Vercel actif : modifier une variable Vercel n'altère pas une ancienne instance déjà déployée.

Activer Maps JavaScript API et la facturation du projet Google. Restreindre la clé aux référents HTTPS du CRM et des Preview autorisées, ainsi qu'à Maps JavaScript API. Ne pas utiliser de clé privée serveur ou désactiver les restrictions pour masquer une erreur. Aucun domaine supplémentaire n'est autorisé automatiquement par ce changement.

## Chargement et dégradation

Les bibliothèques Google `maps` et `marker` sont chargées explicitement. Le chargement est limité à 12 secondes. Une panne réseau, une clé refusée ou un délai dépassé active la carte de secours, avec une explication et un bouton de reprise. Les portes restent persistées et disponibles dans la liste. Le conteneur respecte sa hauteur mobile sans chevaucher les contrôles suivants.

## Validation

La suite navigateur existante `map-filters` conserve les mesures de 100, 1 000 et 10 000 portes et ajoute une simulation déterministe du SDK Google : sélection par configuration à l'exécution, import maps/marker, interaction avec la carte, rechargement, palette bleue, panne réseau, refus d'authentification, délai dépassé et refus de configuration pour une session anonyme. Cette simulation n'est pas une preuve de connexion au service Google réel.

Le test serveur vérifie aussi que seules les clés expressément publiques sont retournées. Le rendu du projet Google réel et ses restrictions nécessitent encore une validation avec sa clé effective sur le domaine déployé. Aucun statut connecté ou vérifié n'est affiché sans preuve.
