> Mise à jour : la branche pilote est fusionnée dans main. La carte Google est sélectionnée avec sa clé au build ; sans clé, la carte existante reste active. Les mentions de branche pilote ci-dessous décrivent les validations historiques, pas un déploiement Vercel confirmé.

# Configuration et limites

Google Maps : configurer NEXT_PUBLIC_GOOGLE_MAPS_API_KEY dans l’environnement Preview,
activer Maps JavaScript API, activer la facturation Google, restreindre la clé à cette
API et aux origines HTTPS autorisées. Recompiler après toute modification de clé.
Ne pas réutiliser cette clé publique pour des services serveur. Places et Routes
nécessitent un lot distinct ; aucun géocodage automatique ni ETA simulé ici.

Preview : utiliser une base séparée et des identifiants Stripe/Twilio de test.
Ce lot ne déploie pas la production et ne copie pas les clients dans une Preview.
Les paiements, SMS et OAuth Rotor existants ne sont pas testés contre leurs services
réels dans ce lot. Aucun secret n’est ajouté aux fichiers suivis.
