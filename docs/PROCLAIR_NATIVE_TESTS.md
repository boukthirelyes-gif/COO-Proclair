# Validation native V2000 — 2026-10-14

114 tests serveur réussis, zéro ignoré, PostgreSQL proclair_test avec schémas isolés. Trois nouveaux tests natifs : capacité week-end/créneaux retirés, permissions/validation avant accès DB et snapshot/pagination 26 dossiers en pages 25/1, compteurs exacts et invariance des visites/audits.

Nouveau parcours navigateur utilise proclair_browser_test, distinct de la base principale, et supprime ses propres clients/sites/contrats/visites/technicien. Aucun fournisseur externe contacté. Tests CRM A–F, persistance, dispatch, annulation, transfert de date et mobile : VERIFIED, 17 contrôles réussis, zéro erreur JavaScript. Compilation réussie. Contrats signés : six contrôles réussis, accord, PDF et passages distincts, aucun paiement. Le parcours historique conserve ses fixtures synthétiques uniquement dans la base navigateur.

Les connexions Stripe/Twilio réelles restent BLOCKED. Les tests du fournisseur utilisent les simulations ou événements signés synthétiques. Aucun objectif arbitraire de 2 000 tests revendiqué.

Finances natives : 17 contrôles navigateur réussis, zéro erreur JavaScript. Paiements manuels synthétiques, contrepassation, impayés, dépenses corrigées, CSV et PDF vérifiés ; aucun mouvement Stripe réel.

## Deuxième lot : sauvegarde atomique des interventions

116 tests serveur réussis, zéro ignoré ; compilation finale réussie. Deux nouveaux tests : droits/prix immuables puis transaction PostgreSQL (transition invalide sans écriture ni audit, créneau obligatoire, version obsolète, concurrence, report explicite et annulation malgré technicien/contrat inactifs). Le formulaire utilise un endpoint de sauvegarde unique ; les API existantes restent disponibles.

22 contrôles navigateur natifs réussis, zéro erreur JavaScript. Le parcours vérifie l’absence de notes/audit partiellement enregistrés après transition interdite, le report qui libère le créneau et la confirmation humaine sans planification automatique. Les champs vidés sont transmis comme NULL. Aucune communication ou facture générée par cette correction.

## Troisième lot : synthèse financière PostgreSQL

Remplacement du chargement de toutes les factures/lignes/clients/paiements du dashboard par des agrégats PostgreSQL en snapshot. Totaux CAD en centimes, paiements contrepassés exclus des reçus nets, 14 jours de mouvements maximum, dates Toronto. Les factures d’autres devises sont exclues explicitement plutôt que converties ou mélangées.

Deux tests ciblés réussis : droits avant lecture et registre réel PostgreSQL avec paiements partiels, contrepassations, brouillons/annulations, devise étrangère, exclusion de Stripe PAID_TEST, limite de dates et absence d’exposition des dossiers. TypeScript réussi. Compilation finale et navigateur de ce lot : TESTING, à terminer avec le prochain lot leaderboard.
