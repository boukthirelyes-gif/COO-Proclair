# Territoires natifs de prospection

Le gestionnaire ouvre Carte de prospection, puis « Dessiner un territoire ». Les clics ajoutent des sommets dans l’ordre du contour. Il choisit nom, couleur, vendeur et état actif. Les coordonnées de chaque sommet peuvent être corrigées ; le contour peut être redessiné. Aucun déplacement par poignées ou import de polygones Rotor annoncé.

Les vendeurs voient uniquement leurs territoires, statistiques et portes autorisées. Créer/modifier une zone exige `map.all` et `map.write`. Les polygones actifs de vendeurs différents ne peuvent ni se toucher ni se chevaucher ; cette règle conservatrice exige de laisser une séparation entre secteurs. Polygones simples uniquement, trois à cent sommets distincts, sans trous ni traversée de l’antiméridien.

Une porte créée dans une zone active est liée au territoire. Le responsable doit correspondre à celui de la zone. Un vendeur ayant des territoires actifs crée/déplace ses nouvelles portes à l’intérieur de ses zones ; il ne peut pas travailler dans celle d’un autre vendeur ni retirer le lien territorial d’une porte. Les comptes sans zone conservent le fonctionnement historique hors des secteurs attribués.

Les portes historiques ne sont pas réaffectées automatiquement. Modifier un contour ne doit pas exclure ses portes déjà liées. Réaffecter une zone contenant des portes est bloqué pour exiger une revue séparée de ces affectations ; aucune réaffectation de prospects/clients en cascade. Désactiver une zone conserve portes et historique : notes/statuts des portes existantes restent modifiables, nouvelles portes ou déplacement vers cette zone refusés.

Les statistiques comptent les portes liées par statut et restent limitées aux droits du compte. Made Sale est un résultat de porte, pas un paiement ou une commission. Le filtre territorial et le bouton Voir ce territoire ciblent les portes et le contour. Les restrictions Never Knock, versions et audits restent applicables.

Migration additive : `20261013160000_sales_territories`. Tables SalesTerritory et lien nullable ProspectPin.territoryId ; index d’affectation et clés étrangères. Sauvegarde locale préalable, aucune donnée supprimée. Limites actuelles : 500 territoires par liste et contrôle ; carte native paginée par lots de 100 portes. Clustering, recherche cartographique serveur, géocodage et satellite constituent les prochaines étapes.

Validation : 54 tests Node avec PostgreSQL séparé, build et TypeScript ; cinq contrôles Chromium de dessin réel, affectation, mobile, liaison automatique, filtre/statut et refus d’accès ; huit contrôles utilisateurs/carte et sept prospects en régression. Aucun échange Rotor ni import de géométrie réelle dans ces tests.

### Évolution : lecture par pages

La carte native lit désormais 100 portes par requête avec un curseur stable sur la date de création et l'identifiant. Elle ne refuse plus un compte possédant plus de 2 000 portes. « Charger 100 autres portes » étend le calque ; « Actualiser les portes » revient à la première page et reprend les données courantes. Les filtres et statistiques locaux concernent seulement les portes chargées, avec total autorisé explicitement indiqué. La recherche globale reste disponible pour ouvrir directement une porte par son identifiant. Les calques Rotor, les territoires et les contrôles de propriété restent distincts. Cette pagination ne constitue pas une gestion des clusters, une recherche cartographique serveur ou un instantané des modifications concurrentes.
