# PROCLAIR OS — Native V2000

Branche de travail : feature/proclair-native-operations-20261014. Reprise de f991c7d, héritant des corrections 8cf37e7. Aucune modification directe de production ni nouvelle application. PostgreSQL est la source des opérations natives ; Rotor demeure une source historique facultative.

| Périmètre | État | Preuve ou travail restant |
| --- | --- | --- |
| Clients/sites/contrats/prestations/interventions natifs | VERIFIED | Parcours navigateur natif 17 contrôles : création, modification, affectation, annulation et persistance |
| Contrats signés et PDF, passages distincts | VERIFIED | Six contrôles navigateur : brouillon, émission, accord, PDF, deux visites distinctes et révocation |
| Dispatch natif | VERIFIED | Trois tests module/service et parcours navigateur de file, dossier, calendrier et mobile |
| Capacité et week-end | VERIFIED | Tests native-operations : objectif nul le week-end et créneaux retirés exclus |
| Navigation sans doublons Rotor | VERIFIED | Messages historiques accessibles par import/intégrations ou lien existant, hors navigation principale |
| Modifications atomiques de visites | VERIFIED | Deux tests serveur + parcours natif de 22 contrôles : rollback, report, annulation, concurrence et audit |
| Factures/paiements manuels natifs | VERIFIED | 17 contrôles navigateur finance : montants, paiements manuels, annulations, dépenses, CSV et PDF |
| Stripe réel | BLOCKED | Clés absentes ; mode test uniquement, aucune preuve de débit réel |
| Twilio réel et Voice/voicemail | BLOCKED | Fournisseur/numéro/audio non configurés ; pas de bouton d’appel présenté comme connecté |
| Carte/territoires/vendeurs | VERIFIED | Tests PostgreSQL existants réussis pour propriété, limites, territoires et ventes ; revalidation navigateur restant à étendre |
| OMEGA supervisé | VERIFIED | Préparation, marges, approbation, idempotence et kill switch testés ; aucun autopilot externe activé |
| Routes routières | TODO | Pas de moteur de distance ou preuve d’optimisation routière ; capacités et créneaux sont des heuristiques |
| Commissions annuelles et leaderboard | VERIFIED | Règle confirmée : ventes signées HT, année civile Toronto, rétroactif par vendeur ; tests serveur et sept contrôles navigateur |
| Automatisations événementielles | TODO | Généraliser événements, tâches, retry et permissions au-delà du worker de préparation existant |
| Performance du dashboard | VERIFIED | Agrégats PostgreSQL et 14 dates maximum ; compteurs et centimes testés sans charger les dossiers financiers |
| Performance des listes principales | TODO | Dispatch et leaderboard paginés ; état global et certaines listes héritées à réduire progressivement |
| Preview distante | BLOCKED | Pas d’accès Vercel/Render ; environnement local isolé ne constitue pas une Preview hébergée |

États : TODO, IN_PROGRESS, BLOCKED, TESTING, DONE, VERIFIED. Un test local ne confirme jamais une connexion réelle ou la production. Aucune promesse d’exécution continue après fermeture de la session.

## Inventaire des 30 opérations demandées

| N° | Opération | État | Preuve / limite |
| --- | --- | --- | --- |
| 1–2 | Créer/modifier client | VERIFIED | Navigateur natif, rechargement et persistance PostgreSQL |
| 3 | Créer prospect | VERIFIED | Tests serveur lead : ownership, validation, versions et conversion |
| 4 | Créer contrat | VERIFIED | Parcours natif et contrats à signer |
| 5 | Accord/signature du contrat | VERIFIED | Six contrôles navigateur, consentement et PDF ; pas de certificat de signature qualifiée |
| 6–7 | Prestation/visite | VERIFIED | Parcours natif lié au client/site/contrat |
| 8–12 | Planifier, modifier, annuler, reporter, assigner | VERIFIED | Sauvegarde atomique, version, conflits et contrôle navigateur |
| 13–14 | Consulter/optimiser routes routières | TODO | Calendrier/dispatch existants ; aucun moteur routier certifié |
| 15–16 | Envoyer/recevoir SMS réels | BLOCKED | Twilio absent ; gestion et webhooks synthétiques testés |
| 17 | Conversations natives | VERIFIED | Tests PostgreSQL et Superhub navigateur |
| 18–19 | Appels réels sortants/entrants | BLOCKED | Infrastructure Voice et numéro non configurés |
| 20 | Appels manqués enregistrés | VERIFIED | Filtre natif et source récente vérifiés ; réception réelle non activée |
| 21 | Messagerie vocale | TODO | Fournisseur, stockage/accès et consentements à implémenter |
| 22 | Facture native | VERIFIED | 17 contrôles navigateur finance, centimes et émission |
| 23 | Encaisser avec Stripe réel | BLOCKED | Clés absentes ; tests et SDK simulés uniquement |
| 24–25 | Paiements/impayés natifs | VERIFIED | Registre manuel, contrepassations et synthèse exacts |
| 26 | Commissions/leaderboard | VERIFIED | Ventes SIGNED HT de l’année, taux rétroactif et arrondi au centime |
| 27 | Vendeurs et rôles | VERIFIED | Tests serveur utilisateurs, création API et connexion personnelle dans le leaderboard |
| 28 | Techniciens | VERIFIED | Tests serveur capacités/configuration et affectation dans le navigateur |
| 29 | Carte de prospection | VERIFIED | Tests serveur pins, territoires, permissions et pagination > 2 000 ; les tuiles et parcours visuels restent dépendants de leur accès réseau |
| 30 | OMEGA | VERIFIED | Préparation/approbation supervisée et cockpit ; autopilot externe non activé |

VERIFIED est limité à la preuve indiquée. Documents/photos du dossier client, horaires variables, attribution des conversations et moteur événementiel complet restent TODO. Une signature enregistrée n’est ni une facture payée ni une autorisation de prélèvement.

Dernière validation : sauvegarde atomique + transitions guidées et dossiers terminaux en lecture seule ; 121 tests serveur et couverture navigateur de 79 groupes. Les défauts de parcours constatés ont été corrigés sans retirer les validations serveur.
