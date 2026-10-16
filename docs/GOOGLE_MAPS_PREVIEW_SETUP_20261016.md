# Activer Google Maps — Proclair CRM Preview

Les cartes natives existent déjà dans `GoogleProspectingMap.tsx`. Sans `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, le CRM affiche **OpenStreetMap avec les données de prospection réelles**, pas une fausse carte Google.

1. Ouvrir https://console.cloud.google.com/google/maps-apis/credentials dans son propre compte Google Cloud. Activer la facturation si nécessaire et **Maps JavaScript API**.
2. Créer une clé d'API **Application restrictions = Websites (HTTP referrers)** limitée aux domaines HTTPS de la Preview et au domaine final approuvé (par exemple `https://*.vercel.app/*` pour les previews réellement utilisées, à resserrer quand les domaines sont connus). Restreindre également aux APIs nécessaires, idéalement **Maps JavaScript API uniquement**.
3. Dans https://vercel.com/proclair/coo-proclair/settings/environment-variables, créer la variable **Preview uniquement** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. C'est une clé publique visible côté navigateur; elle doit être correctement restreinte.
4. **Redéployer la Preview** pour que Next.js embarque la nouvelle valeur. La carte affiche alors Google Maps, les pins, secteurs et regroupements. Vérifier directement la console navigateur et le statut de la facturation si Google refuse la clé.
5. Ne pas modifier la production ni activer des paiements live, envois SMS/appels ou importations Rotor.

La barre de commande regroupe cinq statuts, la recherche déjà existante, les secteurs locaux et un lien de secteur ouvrable immédiatement dans le site Google Maps (même sans clé). Les compteurs `pins` filtrés sont ceux **chargés**, le total provient du serveur; aucun chiffre fictif.

Note: un lien externe Google Maps ne remplace pas l'intégration native Google Maps dans le CRM.
