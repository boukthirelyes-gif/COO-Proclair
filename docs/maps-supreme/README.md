# Proclair Maps Supreme

## Base et transition

Branche issue de `develop`, qui reprend les correctifs déjà validés du logo et de la carte : aucune recréation du CRM, aucun changement de Production. Le passage Google/Leaflet conserve les mêmes données PostgreSQL, API et permissions. L’échec de Google est expliqué ; Leaflet reste identifié comme secours. Les statuts historiques sont conservés, cinq statuts commerciaux sont ajoutés : HOT, QUOTE_SENT, APPOINTMENT, ACTIVE_CLIENT, LOST_CLIENT. « Vendu » sur une porte ne constitue jamais à lui seul une vente comptable.

## Configuration Google

- `GOOGLE_MAPS_BROWSER_API_KEY`, ou `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` pour compatibilité : clé publique destinée au navigateur. Sa valeur n’est jamais commise. Réponse authentifiée `/api/prospecting/map-config`, privée sans cache. Restreindre aux référents HTTPS exacts du CRM et des Preview autorisées.
- Activer Maps JavaScript API, Places API (New), Geocoding API et la facturation dans le projet Google. Autoriser uniquement les API nécessaires sur la clé navigateur. Les recherches Places et le géocodage se font sur un clic explicite, sans frappe envoyée automatiquement. Les résultats doivent être vérifiés avant création d’une porte.
- `GOOGLE_ROUTES_API_KEY` : clé **serveur**, Routes API uniquement ; ne jamais utiliser de préfixe NEXT_PUBLIC. L’API ne retourne jamais cette clé. Configurer les quotas Google et les restrictions compatibles avec l’infrastructure serveur. Le serveur limite les calculs Google à vingt par acteur par minute avec un verrou et un journal PostgreSQL.
- Sans Routes API configurée : proposition géométrique explicitement identifiée, sans estimation de durée routière. Avec réponse valide : tracé routier et durée Google. Un refus ou délai réseau n’est jamais présenté comme une connexion vérifiée.
- Une variable Vercel modifiée doit être appliquée à un nouveau déploiement. L’existence d’une clé ne prouve pas son autorisation Google. Les tests du SDK et des réponses Routes utilisent exclusivement des simulations, jamais des clés réelles.

## Pins, photos et doublons

Les créations peuvent inclure `operationId` UUID. Un fingerprint de la demande permet une répétition exacte sans doublon. Une réutilisation pour une autre demande ou après transfert vers un autre vendeur est refusée. Une nouvelle création à la même adresse insensible à la casse, à environ dix centimètres du même point et pour le même vendeur est refusée ; une adresse d’appartement distincte reste possible. Les modifications utilisent `expectedVersion` et n’écrasent pas les conflits.

Photos : dix maximum par porte, PNG RGB/RGBA non entrelacé, moins de 300 Ko après préparation. Le navigateur accepte JPEG/PNG/WebP et redimensionne dans un canvas. Le serveur vérifie signature, dimensions, CRC, décompression bornée et structure PNG, puis élimine les métadonnées annexes. Images servies uniquement après contrôle d’accès sur la porte, sans cache partagé, nosniff et CSP restrictive. Aucun lien public de stockage. Audit de l’ajout, pas de contenu binaire dans le journal.

Création de prospect depuis la porte et parcours existant prospect → client → soumission → contrat conservés. Une photo ne déclenche aucun message. Les notes, dates, rappels, attribution et historique restent dans les API existantes. Un bouton de déclaration de passage enregistre une date serveur, un compteur et un événement audit, avec idempotence et contrôle de version. Les portes « ne pas solliciter » refusent ce passage. Le compteur « portes visitées déclarées » compte des portes uniques dont un passage a réellement été enregistré, sans prétendre fournir une preuve GPS.

## Territoires

Contours dessinables par clic, sommets modifiables numériquement, contrôle des croisements et des limites. Attribution individuelle ou équipe nommée de vendeurs actifs autorisés. Un membre voit le contour de son équipe mais seulement ses propres pins. Un gestionnaire doté de map.all peut gérer les contours ; la réattribution en masse exige ADMIN, map.all et map.write.

Les frontières de territoires affectés à des ensembles de vendeurs différents ne peuvent se toucher ou se chevaucher. Les anciennes portes ne sont pas sorties silencieusement d’un contour. La réattribution administrative se fait en deux phases : rapport d’impact puis approbation avec version et nombre de portes attendus. Elle incrémente la version de chaque porte et journalise chaque transfert, sans modifier le propriétaire commercial des prospects, devis ou contrats historiques.

Limites conservatrices explicites : 500 territoires par périmètre ; modification d’un contour ou réattribution synchrone jusqu’à 10 000 portes par territoire. Au-delà, la requête est refusée et nécessite une migration par lots revue ; aucun sous-ensemble n’est appliqué.

## Charge et synchronisation

Pagination serveur de 100 fiches, curseur stable date/id. La carte utilise uniquement le viewport et des regroupements SQL bornés à 512 marqueurs. Aucun dump de tous les clients au navigateur. Index GiST sur `point(longitude,latitude)` pour les boîtes géographiques, B-tree existants pour les propriétaires et dates. Les boîtes traversant l’antiméridien conservent leur chemin de requête explicite.

Cache client éphémère de huit viewports, quinze secondes maximum ; invalidation au changement de filtre, après mutation, au retour du réseau et au focus. Actualisation de la zone toutes les trente secondes uniquement en page visible et en ligne ; requêtes précédentes annulées. Les réponses API restent privées sans cache partagé. Pas de stockage permanent de toutes les portes sur l’appareil.

Les tests isolés mesurent réellement PostgreSQL pour 100/1 000/10 000 et 100 000/250 000 portes synthétiques, vérifient l’usage de l’index sur une sélection spatiale, le compte exact et le volume borné. Les résultats ne sont ni des mesures Google ni une garantie de latence en Production.

## Localisation et hors ligne

Le centrage ponctuel existant reste disponible. Le suivi volontaire ne démarre qu’après action et permission navigateur. Durée maximale d’une heure, arrêt à la disparition de la page et au démontage. Aucun historique GPS ajouté à PostgreSQL ; les limites géographiques affichées sont néanmoins transmises aux services de carte. Aucun suivi d’une personne à son insu.

Le mode hors ligne est un brouillon volontaire sur appareil privé, lié à l’identifiant de l’acteur. Expiration logique à 24 heures, effacement à la prochaine lecture après expiration et à la déconnexion depuis le CRM. Ce n’est pas une garantie d’effacement matériel d’un appareil éteint. Restauration et enregistrement manuels ; aucune synchronisation automatique, aucune mise en file de paiements ou messages. Le serveur recontrôle droits, version et idempotence à la reconnexion. Les photos ne sont pas mises en cache hors ligne. Une PWA totalement hors ligne n’est pas incluse.

## Analyses et routes techniques

Les compteurs sont calculés depuis les pins autorisés et les prospects, devis et contrats réellement liés. Les contrats signés HT sont filtrés par droits commerciaux et attribution ; les marqueurs « vendu » n’inventent aucun revenu. Les répartitions par territoire/vendeur sont limitées aux cent premiers groupes, avec totaux globaux exhaustifs. Le taux affiché compte les prospects uniques avec au moins un contrat actuellement signé, divisé par le nombre de prospects liés. Plusieurs contrats ne gonflent pas ce taux. Ce n’est pas un rapport des encaissements ni une mesure historique immuable lors d’un changement de territoire.

Vue technicien réservée à dispatch : une journée de Toronto, un technicien, jusqu’à 25 visites. Les coordonnées manquantes, techniciens différents ou créneaux incomplets provoquent un refus. L’ordre des créneaux existants est conservé, même si l’utilisateur demande une optimisation. La comparaison des durées Google aux espaces entre rendez-vous signale les conflits. Aucun appel ne modifie un rendez-vous, un statut ou une disponibilité. Les visites terminées restent visibles.

L’optimisation de prospection est une heuristique du plus proche voisin, bornée à 25 étapes avec origine conservée. Elle ne prétend pas résoudre un problème global de tournées. L’insertion automatique de visites dans des disponibilités et l’optimisation de plusieurs véhicules restent hors périmètre : il faut une validation métier des disponibilités et contraintes client. Cette version refuse de déplacer des clients confirmés pour afficher artificiellement une route « optimisée ».

## Validation et livraison

Appliquer les migrations uniquement sur une base isolée pour les tests. `npm ci`, `npm run db:generate`, `npm run db:migrate`, `npm run typecheck`, `npm test`, tests Python, `npm run build`, puis `npm run test:browser:all` avec les variables synthétiques documentées par le projet. Ne jamais utiliser la base Production pour les tests de charge.

Les nouveaux contrôles navigateur sont ajoutés à la suite map-filters existante et conservés dans son résultat. Le catalogue reste composé de 32 suites. Les captures Google utilisent un SDK simulé et sont nommées comme telles ; elles ne certifient pas la connexion au compte Google réel.

Une PR vers develop et une Preview vérifiée doivent précéder toute affirmation de livraison en ligne. La version finale de cette mission ne doit pas être annoncée comme connectée à Google sans preuve sur le domaine déployé.
