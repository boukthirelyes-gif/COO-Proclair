# Google Maps — configuration et diagnostic Preview

Le CRM existant utilise le SDK officiel `@googlemaps/js-api-loader` lorsque
`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` est renseignée au build. Sans cette variable,
le rendu cartographique précédent reste disponible avec une indication explicite.
Une variable présente ne prouve pas que Google accepte la clé.

## Configuration de la Preview

1. Dans Google Cloud, sélectionner le projet auquel appartient la clé destinée
   au navigateur. Utiliser une clé distincte pour la Preview afin de conserver
   la configuration Production.
2. Activer **Maps JavaScript API** dans ce même projet et vérifier que son compte
   de facturation est actif. Une clé de Routes API côté serveur ne remplace pas
   une clé navigateur autorisée pour Maps JavaScript API.
3. Dans les restrictions d’application de la clé navigateur, choisir **Sites Web
   (référents HTTP)**, et autoriser le domaine HTTPS exact de la Preview.
   Pour la Preview signalée dans cette mission :
   `https://coo-proclair-bcohb5ct2-proclair.vercel.app/*`.
   Une nouvelle URL de déploiement peut nécessiter un nouveau référent. Un alias
   Preview stable peut éviter cette répétition lorsqu’il est configuré dans Vercel.
4. Dans les restrictions d’API, autoriser **Maps JavaScript API**. Ne pas retirer
   les restrictions ni autoriser globalement toutes les applications Vercel.
5. Dans le projet Vercel existant `coo-proclair`, renseigner
   `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` dans le périmètre **Preview** avec la clé
   navigateur correspondante. Ne jamais y copier les clés Stripe, Neon ou Routes.
6. Si la valeur de la clé change dans Vercel, reconstruire la Preview : les
   variables `NEXT_PUBLIC_` sont intégrées aux fichiers JavaScript à la compilation.
   Une modification de référents Google seule ne nécessite pas de nouvelle
   compilation ; attendre sa propagation puis recharger la page.

Le référent Production `https://coo-proclair.vercel.app/*` n’autorise pas les
sous-domaines Preview. La politique `strict-origin-when-cross-origin` du CRM
conserve l’origine HTTPS lors du chargement Google ; elle ne supprime pas le référent.

## Identifier la cause réelle

Le message du CRM « Google Maps a refusé la clé » vient de `gm_authFailure`.
Il est générique. Dans la console du navigateur, relever uniquement le code après
`Google Maps JavaScript API error`, sans copier l’URL du SDK contenant la clé.

| Code Google | Vérification |
|---|---|
| `RefererNotAllowedMapError` | Référent HTTPS exact de la page et restrictions Sites Web de la clé utilisée au build |
| `InvalidKeyMapError` / `ExpiredKeyMapError` | Clé existante et active, projet correct, valeur Preview correcte puis reconstruction si changée |
| `ApiNotActivatedMapError` | Maps JavaScript API activée dans le projet de cette clé |
| `ApiTargetBlockedMapError` | Restrictions d’API autorisant Maps JavaScript API |
| `BillingNotEnabledMapError` / `ClientBillingNotEnabledMapError` | Compte de facturation actif et rattaché au projet Google concerné |
| `OverQuotaMapError` | Quotas et consommation dans le projet Google ; ne pas augmenter les limites sans décision du propriétaire |

Documentation officielle :
https://developers.google.com/maps/documentation/javascript/error-messages

## Validation réelle requise

Vérifier sur la Preview : carte chargée sans erreur d’authentification Google,
pins, ouverture des fiches, regroupement, filtres, clic cartographique et mobile.
Les tests synthétiques du CRM ne prouvent pas la validité d’une clé Google réelle.
Ne jamais annoncer Google Maps connecté sur la seule présence d’une variable ou
sur un test qui simule le SDK.

L’intégration actuelle comprend route/satellite/hybride, Street View, marqueurs,
regroupements et contours de territoires. Places, recherche d’adresse et Routes/ETA
ne sont pas activés par la seule configuration de Maps JavaScript API.

Cette procédure ne demande aucun changement sur main ou Production. Les pins,
notes, vendeurs et historiques restent dans le CRM ; aucune donnée client ni clé
réelle n’est ajoutée au dépôt.

## Gestion des refus dans le CRM

Un refus d’authentification ou un chargement dépassant 20 secondes retire désormais
le handle de la carte et son état prêt. Le conteneur Google en erreur est masqué ;
les fiches et la saisie des notes restent disponibles. Le diagnostic affiche
uniquement l’origine du domaine courant, sans la clé ni les paramètres de l’URL.
Les erreurs synchrones du chargeur sont également prises en charge.

Cinq scénarios navigateur utilisent le composant réel avec un transport Google
simulé : refus avant initialisation, refus après création de la carte, panne
réseau, erreur synchrone et délai dépassé. Ils sont intégrés à la suite existante
users-map, sans appel aux API Google. Ces tests ne constituent pas une autorisation
d’une clé réelle et ne prouvent pas que Google Maps est rétabli à distance.
