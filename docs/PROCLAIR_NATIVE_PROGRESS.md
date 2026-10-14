# Avancement natif — 2026-10-14

Reprise de la branche demandée, sans perdre les commits précédents. Premier module native-operations inspecté avant modifications. Corrections : objectifs nuls le week-end, créneaux RESCHEDULED exclus de la journée et rendez-vous futurs limités aux visites réellement confirmées/planifiées.

Ajout Dispatch indépendant de Rotor : snapshot PostgreSQL, compteurs exacts, file paginée de 25 dossiers, contrats actifs pour visites sans créneau, file distincte FAILED/NO_ACCESS/NEEDS_FOLLOWUP, objectifs par technicien. Lecture CRM obligatoire côté API ; l’ouverture d’un dossier utilise les droits de modification existants. Pas de réservation, message ou calcul routier automatique.

Navigation : Messages Rotor ne figure plus deux fois ni dans les fonctions natives principales ; les outils d’import et archives sont conservés. Nouvelle entrée Dispatch dans Opérations.

Audit navigateur initial : création/modification client, site, contrat, prestation, visite, technicien et créneau réussis avant l’assertion finale. L’assertion attendait un courriel effacé sous forme chaîne vide ; la base stocke NULL conformément au service. Attente corrigée, parcours complet à repasser.

Compilation de production réussie. Parcours natif complet : 17 contrôles navigateur réussis, sans erreur JavaScript, fixtures propres nettoyées. Contrats signés : six contrôles navigateur réussis, deux passages PENDING distincts et PDF conservé ; aucun encaissement.

Finances natives : 17 contrôles navigateur réussis, zéro erreur JavaScript. Paiements manuels synthétiques, contrepassation, impayés, dépenses corrigées, CSV et PDF vérifiés ; aucun mouvement Stripe réel.
