# Territoires natifs de prospection

Le gestionnaire ouvre Carte de prospection, puis « Dessiner un territoire ». Les clics ajoutent des sommets dans l’ordre du contour. Il choisit nom, couleur, vendeur et état actif. Les coordonnées de chaque sommet peuvent être corrigées ; le contour peut être redessiné. Aucun déplacement par poignées ou import de polygones Rotor annoncé.

Les vendeurs voient uniquement leurs territoires, statistiques et portes autorisées. Créer/modifier une zone exige `map.all` et `map.write`. Les polygones actifs de vendeurs différents ne peuvent ni se toucher ni se chevaucher ; cette règle conservatrice exige de laisser une séparation entre secteurs. Polygones simples uniquement, trois à cent sommets distincts, sans trous ni traversée de l’antiméridien.

Une porte créée dans une zone active est liée au territoire. Le responsable doit correspondre à celui de la zone. Un vendeur ayant des territoires actifs crée/déplace ses nouvelles portes à l’intérieur de ses zones ; il ne peut pas travailler dans celle d’un autre vendeur ni retirer le lien territorial d’une porte. Les comptes sans zone conservent le fonctionnement historique hors des secteurs attribués.

Les portes historiques ne sont pas réaffectées automatiquement. Modifier un contour ne doit pas exclure ses portes déjà liées. Réaffecter une zone contenant des portes est bloqué pour exiger une revue séparée de ces affectations ; aucune réaffectation de prospects/clients en cascade. Désactiver une zone conserve portes et historique : notes/statuts des portes existantes restent modifiables, nouvelles portes ou déplacement vers cette zone refusés.

Les statistiques comptent les portes liées par statut et restent limitées aux droits du compte. Made Sale est un résultat de porte, pas un paiement ou une commission. Le filtre territorial et le bouton Voir ce territoire ciblent les portes et le contour. Les restrictions Never Knock, versions et audits restent applicables.

Migration additive : `20261013160000_sales_territories`. Tables SalesTerritory et lien nullable ProspectPin.territoryId ; index d’affectation et clés étrangères. Sauvegarde locale préalable, aucune donnée supprimée. Limites actuelles : 500 territoires par liste et contrôle ; carte native toujours limitée à 2 000 portes. Pagination/clustering, géocodage et satellite constituent les prochaines étapes.

Validation : 54 tests Node avec PostgreSQL séparé, build et TypeScript ; cinq contrôles Chromium de dessin réel, affectation, mobile, liaison automatique, filtre/statut et refus d’accès ; huit contrôles utilisateurs/carte et sept prospects en régression. Aucun échange Rotor ni import de géométrie réelle dans ces tests.
