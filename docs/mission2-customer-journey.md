# Mission 2 : parcours commercial natif

## Comportement livré

Le parcours vendeur existant conserve le pin, le prospect, son propriétaire, le client,
le devis accepté et le contrat signé. Les passages du contrat sont créés explicitement,
puis planifiés et réalisés par un opérateur autorisé Dispatch.

Depuis Dossier client → Services, « Facturer cette intervention » crée un brouillon
uniquement pour une visite COMPLETED d’un contrat signé et actif. Les lignes du
passage signé, remises et taxes sont conservées ; client et contrat sont dérivés de
la visite et ne sont pas choisis librement. La relation Invoice.sourceVisitId est
unique et protégée par une clé étrangère. Les requêtes concurrentes ou nouvelles
clés de tentative retrouvent la même facture. Une échéance différente est refusée.
Une facture annulée reste liée : sa correction nécessite une revue, pas une seconde
facture automatique. Le devis déjà contractualisé ne peut plus être facturé à part.

Les paiements manuels sont toujours des écritures de paiements déjà reçus, sans débit
Stripe. Un reçu imprimable/PDF est accessible depuis Paiements, avec référence,
montant, date, méthode et avertissement si le paiement a été contrepassé.

## Prix, rabais, TPS et TVQ

Les devis vendeur acceptent un rabais fixe par ligne et le régime QUEBEC. Le calcul
utilise des entiers/BigInt : montant net après rabais, TPS 5 % arrondie au centime,
TVQ 9,975 % sur le net (sans TPS) arrondie séparément, puis addition des taxes.
Le régime CUSTOM conserve le calcul historique au taux de points de base explicite.
Les anciens documents ne sont pas recalculés ; leurs nouvelles colonnes ont des
valeurs neutres. Le mode et les composantes sont conservés dans le devis, le contrat,
la facture et les documents imprimables. Aucun catalogue externe n’est inventé.

## Commissions : migration et impact

Le leaderboard natif utilisait DÉJÀ les ventes SIGNED HT par vendeur, sur les dates de
signature dans l’année civile Toronto. Les paliers restent 20/25/30/35/40 % aux seuils
0/100k/200k/300k/400k CAD et s’appliquent rétroactivement à toute la base annuelle.
La migration 20261016050000 enregistre cette politique comme SIGNED_HT_ANNUAL_V1.
Elle ne réécrit aucun accord signé, aucune commission externe, facture ou paiement.

GET /api/finance/commission-impact?year=2026 fournit un rapport JSON réservé aux
permissions finance + leads.all + sales.write. Il compare la règle signée à une
HYPOTHÈSE servi/encaissé : minimum entre prestations réalisées dans la période et
encaissements manuels nets HT dans cette période, pour les accords natifs signés
cette même année. Cette comparaison n’est PAS un relevé des dettes historiques.
Les données Rotor non rapprochées, contrats sans accord, vendeurs manquants et accords
signés inactifs sont signalés. Aucune migration financière destructive n’est exécutée.
Avant un changement réel de politique historique, exporter les obligations existantes,
rapprocher chaque différence et faire approuver les ajustements versionnés.

## Preuves automatisées

- tests/customer-journey.test.ts : parcours complet exécuté deux fois dans un schéma
  PostgreSQL isolé, signature/PDF, requêtes concurrentes, absence de doublons, taxes,
  paiements, droits, commission et classement ; reconnexion à PostgreSQL.
- tests/browser-seller-sales.mjs + tests/support/completed-sale.mjs : parcours réel
  HTTP/UI vendeur, portail client mobile, contrat, intervention réalisée, facture
  depuis le dossier, paiement synthétique, reçu, leaderboard et rechargement mobile.
- Les 32 suites restent obligatoires ; aucune assertion préexistante supprimée.

## Limites à conserver visibles

- Les tests Google Maps portent sur les pins natifs et le moteur de secours. La clé
  Google réelle et le rendu du SDK distant ne sont pas attestés dans cet environnement.
- L’accord électronique est un nom saisi + consentement par lien privé, horodaté avec
  empreintes et PDF archivé ; ce n’est pas une signature qualifiée.
- Un accord signé est immuable. Un parcours d’avenants liés, renouvellements et
  transferts de vendeur avec ajustements de commission historiques reste à concevoir.
  Le transfert d’un contrat lié à un prospect est actuellement refusé explicitement.
- La désactivation opérationnelle d’un contrat ne constitue pas automatiquement une
  annulation juridique de vente ; le rapport signale les accords signés inactifs.
- Dispatch est un rôle d’opérateur de planification existant. Un espace technicien
  strictement limité à ses interventions n’existe pas encore ; ne pas le présenter
  comme une isolation validée pour chaque technicien.
- Les historiques de communication sont limités aux messages effectivement importés
  et reliés. Aucun envoi ni encaissement réel n’est exécuté par les tests.
- Pas de déploiement de production autorisé dans les missions de stabilisation.
