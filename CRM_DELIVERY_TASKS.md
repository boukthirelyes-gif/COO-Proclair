# Livraison du CRM : tâches et critères de réception

Aucun pourcentage global : chaque lot doit apporter une preuve vérifiable.
Les 32 suites de la récupération précédente sont des preuves locales historiques,
ni une certification de production ni une preuve de tous les parcours interconnectés.

## Lot livré dans le code : visibilité de l’exploitation

- [x] Afficher le commit réellement exécuté dans Santé et compatibilité.
- [x] Présenter les prérequis HTTPS, sessions, connexion administrateur, cron et Google Maps.
- [x] Distinguer configuration présente, blocage et validation réelle à effectuer.
- [x] Signaler explicitement que Stripe réel est désactivé dans cette version.
- [x] Ne publier aucune valeur de clé ou de secret dans ce diagnostic.
- [x] Empêcher la mise en cache du diagnostic authentifié.
- [ ] Vérifier le rendu sur la Preview du commit livré et sur mobile.

## Priorité 1 : réception métier sur base isolée

- [ ] Relier dans un même scénario une vente terrain, son client, le contrat signé,
  la visite affectée au technicien, la facture, le paiement et la commission annuelle.
  Réception : mêmes identifiants de bout en bout, montants HT/taxes cohérents,
  persistance après reconnexion, aucun doublon sur répétition de requête.
- [ ] Refaire le parcours avec vendeur et technicien restreints.
  Réception : données non autorisées inaccessibles via interface ET API.
- [ ] Vérifier Google Maps avec clé restreinte : ajout, affectation, déplacement,
  filtres et conservation des pins ; contrôler le téléphone et le desktop.
- [ ] Vérifier les missions OMEGA : double lancement, interruption, reprise,
  permissions et journal des actions ; aucun envoi ou encaissement implicite.

## Priorité 2 : fournisseurs opérationnels

- [ ] Stripe : prendre en charge explicitement le mode réel après validation du
  mode test. Réception : facture payée uniquement sur événement signé et montant,
  devise et facture correspondants ; rejeu sans doublon ; remboursement cohérent.
  Le code actuel exige sk_test_ ; renseigner sk_live_ ne résout pas ce blocage.
- [ ] Twilio : vérifier SMS sortant, entrant, statut de livraison et appel sur
  numéros de test autorisés ; consentement, désabonnement et refus respectés.
- [ ] Courriels : choisir/configurer le transport et valider délivrabilité,
  signature de domaine et réception. Une adresse d’expéditeur ne suffit pas.
- [ ] Cron : prouver une exécution authentifiée et la reprise d’un travail échoué.

## Priorité 3 : données et exploitation

- [ ] Migration Rotor : inventaire des exports accessibles, import à blanc,
  rapprochement des totaux clients/contrats/factures/paiements et doublons.
  Ne pas assimiler des captures d’écran à une archive complète.
- [ ] Sauvegarde/restauration : démontrer une restauration dans une base isolée.
- [ ] Supervision : erreurs, incidents de paiement, tâches bloquées et procédure
  de reprise ; aucun secret dans les journaux.
- [ ] Recette équipe : réaliser une journée représentative sans intervention
  technique et consigner chaque anomalie avant livraison générale.

## Priorité 4 : vente à d’autres entreprises

- [ ] Définir puis prouver l’isolation de deux entreprises sur toutes les API,
  fichiers, recherches, exports, webhooks, tâches et missions OMEGA.
  Les rôles internes actuels ne démontrent pas une isolation multi-entreprise.
- [ ] Inscription, invitations, récupération de compte et départ d’un utilisateur.
- [ ] Abonnement au CRM, droits associés, suspension et export des données.
- [ ] Conditions de service, confidentialité, conservation et support.

## Livraison distante

- [ ] PR vers develop, contrôles GitHub verts sur le SHA exact.
- [ ] Preview Vercel Ready et recette sur ce SHA.
- [ ] Promotion autorisée en production, vérification du SHA servi et smoke test.

Accès : lors de la récupération précédente, Git HTTPS fonctionnait mais l’API
GitHub refusait les requêtes (Forbidden). Aucune fusion ni publication ne peut
être déduite d’un push. Ne pas contourner les protections pour livrer.
