# PROCLAIR OS — Native V2000

Branche de travail : feature/proclair-native-operations-20261014. Reprise de f991c7d, héritant des corrections 8cf37e7. Aucune modification directe de production ni nouvelle application. PostgreSQL est la source des opérations natives ; Rotor demeure une source historique facultative.

| Périmètre | État | Preuve ou travail restant |
| --- | --- | --- |
| Clients/sites/contrats/prestations/interventions natifs | VERIFIED | Parcours navigateur natif 17 contrôles : création, modification, affectation, annulation et persistance |
| Contrats signés et PDF, passages distincts | VERIFIED | Six contrôles navigateur : brouillon, émission, accord, PDF, deux visites distinctes et révocation |
| Dispatch natif | VERIFIED | Trois tests module/service et parcours navigateur de file, dossier, calendrier et mobile |
| Capacité et week-end | VERIFIED | Tests native-operations : objectif nul le week-end et créneaux retirés exclus |
| Navigation sans doublons Rotor | VERIFIED | Messages historiques accessibles par import/intégrations ou lien existant, hors navigation principale |
| Modifications atomiques de visites | TODO | Ancien formulaire modifie les champs puis change l’état dans deux requêtes ; corriger sans enregistrement partiel |
| Factures/paiements manuels natifs | VERIFIED | 17 contrôles navigateur finance : montants, paiements manuels, annulations, dépenses, CSV et PDF |
| Stripe réel | BLOCKED | Clés absentes ; mode test uniquement, aucune preuve de débit réel |
| Twilio réel et Voice/voicemail | BLOCKED | Fournisseur/numéro/audio non configurés ; pas de bouton d’appel présenté comme connecté |
| Carte/territoires/vendeurs | VERIFIED | Tests PostgreSQL existants réussis pour propriété, limites, territoires et ventes ; revalidation navigateur restant à étendre |
| OMEGA supervisé | VERIFIED | Préparation, marges, approbation, idempotence et kill switch testés ; aucun autopilot externe activé |
| Routes routières | TODO | Pas de moteur de distance ou preuve d’optimisation routière ; capacités et créneaux sont des heuristiques |
| Commissions contractuelles | TODO | Formaliser assiette, méthode des paliers et encaissements admissibles avant calcul |
| Automatisations événementielles | TODO | Généraliser événements, tâches, retry et permissions au-delà du worker de préparation existant |
| Performance des listes principales | TODO | Dispatch paginé ; état global hérité et métriques financières à réduire progressivement |
| Preview distante | BLOCKED | Pas d’accès Vercel/Render ; environnement local isolé ne constitue pas une Preview hébergée |

États : TODO, IN_PROGRESS, BLOCKED, TESTING, DONE, VERIFIED. Un test local ne confirme jamais une connexion réelle ou la production. Aucune promesse d’exécution continue après fermeture de la session.
