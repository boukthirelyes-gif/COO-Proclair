# Carte Google Maps — activation en production

La sélection du rendu Google est maintenant livrée dans le code destiné à main.
Avec NEXT_PUBLIC_GOOGLE_MAPS_API_KEY au build, le CRM charge le SDK officiel Google.
Sans cette variable, la carte précédente reste active et le CRM explique ce qui
manque. Les pins, filtres, pagination, vendeurs, restrictions de contact et
territoires restent natifs. Aucune donnée client n’est copiée dans le dépôt.

Dans Vercel, projet COO-Proclair, Settings → Environment Variables : ajouter
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY pour Production. Activer Maps JavaScript API et la
facturation dans Google Cloud ; restreindre la clé à cette API et aux référents
https://coo-proclair.vercel.app/* (et seulement les autres domaines autorisés).
Redéployer le dernier commit de main : la variable est intégrée à la compilation.

Le code Google comprend les modes route/satellite/hybride, Street View, les pins
natifs, regroupements, contours de territoire et dessin. Le rendu réel Google,
les restrictions de clé et ces interactions restent à vérifier avec une clé valide.
Places, recherche d’adresse et Routes/ETA ne sont pas inclus. Cette intégration
n’active aucun SMS, paiement, import ni action OMEGA.

Validation de cette livraison : compilation production et TypeScript réussis ;
6 contrôles navigateur du chemin sans clé, regroupements de la carte existante,
recherche, filtres et pagination, sans erreur JavaScript. Contrôle des secrets réussi.
Le SDK Google réel n’a pas été validé faute de clé et de déploiement accessible.
