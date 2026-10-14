# Avancement natif — 2026-10-14

Reprise de la branche demandée, sans perdre les commits précédents. Premier module native-operations inspecté avant modifications. Corrections : objectifs nuls le week-end, créneaux RESCHEDULED exclus de la journée et rendez-vous futurs limités aux visites réellement confirmées/planifiées.

Ajout Dispatch indépendant de Rotor : snapshot PostgreSQL, compteurs exacts, file paginée de 25 dossiers, contrats actifs pour visites sans créneau, file distincte FAILED/NO_ACCESS/NEEDS_FOLLOWUP, objectifs par technicien. Lecture CRM obligatoire côté API ; l’ouverture d’un dossier utilise les droits de modification existants. Pas de réservation, message ou calcul routier automatique.

Navigation : Messages Rotor ne figure plus deux fois ni dans les fonctions natives principales ; les outils d’import et archives sont conservés. Nouvelle entrée Dispatch dans Opérations.

Audit navigateur initial : création/modification client, site, contrat, prestation, visite, technicien et créneau réussis avant l’assertion finale. L’assertion attendait un courriel effacé sous forme chaîne vide ; la base stocke NULL conformément au service. Attente corrigée, parcours complet à repasser.

Compilation de production réussie. Parcours natif complet : 17 contrôles navigateur réussis, sans erreur JavaScript, fixtures propres nettoyées. Contrats signés : six contrôles navigateur réussis, deux passages PENDING distincts et PDF conservé ; aucun encaissement.

Finances natives : 17 contrôles navigateur réussis, zéro erreur JavaScript. Paiements manuels synthétiques, contrepassation, impayés, dépenses corrigées, CSV et PDF vérifiés ; aucun mouvement Stripe réel.

## Deuxième lot : sauvegarde atomique des interventions

116 tests serveur réussis, zéro ignoré ; compilation finale réussie. Deux nouveaux tests : droits/prix immuables puis transaction PostgreSQL (transition invalide sans écriture ni audit, créneau obligatoire, version obsolète, concurrence, report explicite et annulation malgré technicien/contrat inactifs). Le formulaire utilise un endpoint de sauvegarde unique ; les API existantes restent disponibles.

22 contrôles navigateur natifs réussis, zéro erreur JavaScript. Le parcours vérifie l’absence de notes/audit partiellement enregistrés après transition interdite, le report qui libère le créneau et la confirmation humaine sans planification automatique. Les champs vidés sont transmis comme NULL. Aucune communication ou facture générée par cette correction.
