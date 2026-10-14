# Validation native V2000 — 2026-10-14

114 tests serveur réussis, zéro ignoré, PostgreSQL proclair_test avec schémas isolés. Trois nouveaux tests natifs : capacité week-end/créneaux retirés, permissions/validation avant accès DB et snapshot/pagination 26 dossiers en pages 25/1, compteurs exacts et invariance des visites/audits.

Nouveau parcours navigateur utilise proclair_browser_test, distinct de la base principale, et supprime ses propres clients/sites/contrats/visites/technicien. Aucun fournisseur externe contacté. Tests CRM A–F, persistance, dispatch, annulation, transfert de date et mobile : VERIFIED, 17 contrôles réussis, zéro erreur JavaScript. Compilation réussie. Contrats signés : six contrôles réussis, accord, PDF et passages distincts, aucun paiement. Le parcours historique conserve ses fixtures synthétiques uniquement dans la base navigateur.

Les connexions Stripe/Twilio réelles restent BLOCKED. Les tests du fournisseur utilisent les simulations ou événements signés synthétiques. Aucun objectif arbitraire de 2 000 tests revendiqué.

Finances natives : 17 contrôles navigateur réussis, zéro erreur JavaScript. Paiements manuels synthétiques, contrepassation, impayés, dépenses corrigées, CSV et PDF vérifiés ; aucun mouvement Stripe réel.
