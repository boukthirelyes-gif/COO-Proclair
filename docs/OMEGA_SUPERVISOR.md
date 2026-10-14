# Superviseur OMEGA natif

OMEGA prépare désormais des missions persistantes à partir de quatre scénarios configurables : visites en retard, visites à confirmer, visites confirmées sans créneau sur contrat actif et rappels de prospects échus. Les prospects à ne pas contacter et les portes Never Knock sont exclus des rappels. Aucune dépendance Rotor, Stripe, Twilio ou clé de modèle n'est nécessaire.

## Utilisation

Dans OMEGA, un administrateur choisit les scénarios, active le superviseur et enregistre. **Analyser les dossiers maintenant** crée des missions internes. Examiner une mission, ouvrir le dossier puis consigner une décision : approbation, traitement manuel ou rejet. L'approbation ne réalise pas une modification du dossier. Une note et une confirmation sont obligatoires pour chaque décision. **Arrêter le superviseur** empêche les cycles suivants, tout en conservant les missions et leur historique.

Une mission dont la source a changé ne peut plus être approuvée. Une mission précédemment approuvée peut être clôturée avec une note après traitement manuel du dossier, même si ce traitement a modifié la source. Les décisions concurrentes sont protégées par la version de mission ; les nouvelles analyses dédupliquent par scénario, source et empreinte.

Le tableau est paginé à 25 missions avec compteur total et historique. Chaque cycle analyse au plus 25 sources par scénario (100 pour les quatre scénarios), puis conserve un curseur PostgreSQL. Le résultat indique quand poursuivre ; les cycles suivants avancent vers les autres sources avant de recommencer une vérification. Le verrou du superviseur sérialise configuration, arrêt et décisions avec le cycle. Un administrateur sans les droits d'un scénario ne peut pas l'exécuter ni consulter ses missions. Les droits sont recontrôlés dans la transaction.

## Automatisation et hébergement

Le superviseur est **désactivé par défaut** et indépendant du worker de planning. Le worker local et le cron existant `/api/cron/omega` exécutent également son cycle lorsqu'il est activé. Sur Vercel, la planification livrée reste quotidienne à 13:00 UTC, soit 09:00 à Toronto le 14 octobre 2026 et 08:00 en heure d'hiver. L'hébergeur doit effectivement exécuter le cron ; cette livraison ne confirme pas une cadence distante. Le bouton d'analyse permet de continuer sans attendre. Les limites de durée de l'hébergeur restent applicables, et les transactions interrompues ne valident pas de missions partielles.

Migration additive : `20261014030000_omega_supervisor`, qui crée deux tables sans toucher aux données métier existantes. Le build de production applique les migrations habituelles. Préparer une sauvegarde distante avant migration ; les bases Preview restent séparées. Aucune variable d'environnement nouvelle. Les missions et contrôles sont inclus dans l'export métier natif, qui demeure privé.

## Validation et limites

127 tests serveur ont réussi, sans tests ignorés. Le parcours navigateur du nouveau superviseur couvre dix groupes : configuration, génération, approbation, clôture après modification de source, historique, arrêt, mobile et refus de requêtes invalides/non authentifiées. Les dix groupes navigateur du cockpit OMEGA existant ont également réussi après la compilation finale (20 groupes OMEGA au total). Les tests utilisent PostgreSQL et une base navigateur séparée. Aucun paiement, SMS ou appel fournisseur exécuté.

Ce lot termine le parcours de supervision et de préparation des missions natives. OMEGA reste déterministe : il ne s'agit pas d'un assistant de langage général. Les trajets routiers réels, la téléphonie avancée, les envois automatiques aux clients et les paiements réels ne sont pas terminés par cette livraison. Leur réalisation exige des adaptateurs, règles et validations spécifiques ; une mission interne n'en constitue pas une exécution.
