# Modèle métier Proclair et écart Rotor

Le code existant est conservé : `Customer → Property → Contract → Job → Visit`, avec des clés étrangères pour chaque relation. Un client a plusieurs propriétés ; un contrat appartient à un client et un site ; un job dépend d’un contrat ; plusieurs visites peuvent dépendre du même job. Les contrôles métier empêchent les liens incohérents.

Rotor documente `Service Plan → Job → Visit` : plan commercial/récurrence, occurrence facturable, rendez-vous terrain. Le `Contract` natif représente actuellement une partie du plan, mais ne comporte pas encore les fréquences, modes de facturation, suspension saisonnière et génération d’occurrences. Le `Job` natif ne porte pas encore ses propres lignes de prix, son statut d’achèvement et sa relation de facture. La facturation locale référence un client et éventuellement un contrat. Cette livraison ne prétend pas résoudre ces écarts.

`passageNumber` est unique par contrat dans le système actuel. Une reprise terrain ne doit pas être assimilée silencieusement à un nouveau passage facturable : ce point nécessite une évolution compatible du modèle. Terminer une visite n’émet aucune facture automatiquement. Les factures sont créées et émises explicitement, avec versions, clés d’idempotence, compteur transactionnel et ledger de paiement.

Les devis acceptés deviennent une facture brouillon unique. L’acceptation ne génère ni contrat ni visite artificielle. `issuerSnapshot` fige l’identité à l’émission, et les liens clients privés ne donnent accès qu’à leur document.

Les portes locales `ProspectPin` restent distinctes des prospects, clients et ventes. Une porte peut maintenant être liée à un unique `Lead` natif. Le prospect appartient à un vendeur et à un `SalesPipeline` avec cinq `SalesStage` ordonnées ; sa conversion explicite référence un client existant ou crée un client et éventuellement son site. `MapPinType` est une catégorie de carte ; `status` reste un suivi local. `Never Knock` impose la restriction de contact, sans confondre un marqueur « Made Sale » avec une vente financière encaissée. Les catégories historiques et audits sont préservés par migration additive.

`RotorMapPin` et `RotorMirrorRecord` conservent les références externes sans fabriquer de clients natifs. Les nouveaux snapshots et guards documentent uniquement les capacités techniques du client OAuth. Aucune identité d’un membre Rotor n’est fusionnée avec `AppUser` sans rapprochement vérifié. Les secrets OAuth demeurent exclusivement dans `IntegrationSecret`, chiffrés, et sont exclus des exports métier.
