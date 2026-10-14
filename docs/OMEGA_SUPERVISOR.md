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

## Cockpit et traitement de la file

Le cockpit ajoute des indicateurs sur toute la file autorisée : missions à examiner, approuvées, ouvertes et clôturées pendant les sept derniers jours. Les filtres ne modifient pas ces indicateurs globaux. La liste est triée globalement par urgence (retard, rappel, confirmation, placement), puis ancienneté. La recherche serveur couvre le client, le détail, la note et l'identifiant source, avec caractères `%`, `_` et barre oblique inverse traités littéralement. Les filtres par scénario et statut restent soumis aux droits.

**Analyser en continu** lance des cycles successifs jusqu'à la fin du passage ou vingt cycles. La pause termine le cycle en cours et conserve les curseurs ; elle ne désactive pas le superviseur ni son cron. Le bouton d'arrêt reste distinct. La limite ne signifie pas que tous les dossiers ont été examinés : reprendre si la file continue. Les compteurs incluent les dossiers revérifiés au cours des cycles.

Une sélection de la page permet d'approuver ou écarter jusqu'à 25 missions avec une note commune. L'opération est atomique : version incorrecte, source obsolète pour une approbation, mission fermée ou scénario interdit annule l'ensemble du lot et ses événements d'audit. La clôture « traitée » reste individuelle et décrit le travail humain ; aucune action externe n'est exécutée par les décisions groupées.

Les réglages non enregistrés sont conservés pendant les recherches et paginations. Il faut les enregistrer avant une nouvelle analyse. Une autre modification concurrente de configuration provoque un conflit ; **Recharger les scénarios enregistrés** permet d'abandonner explicitement le brouillon local. Une nouvelle recherche ne remplace pas silencieusement le brouillon ou sa version initiale.

Migration supplémentaire additive : `20261014031000_omega_mission_priority`, avec index et priorité recalculée sur les missions existantes. Aucune nouvelle clé ou dépendance. Validation du cockpit : 127 tests serveur, 18 groupes navigateur superviseur (dont pause et plafond avec transport simulé) et 10 groupes du cockpit existant ; compilation réussie. Aucun compte fournisseur utilisé.

## Explication et chronologie des missions

Chaque mission propose **Comprendre cette mission** ; les missions clôturées proposent **Historique de la mission**. La fiche affiche le critère du scénario, puis la vérification actuelle de la source (existence, état, échéances, affectation, contrat actif ou restriction de prospection). Elle ne reconstitue pas des valeurs historiques absentes : les informations du dossier source sont celles de la lecture actuelle. Les décisions seront à nouveau revalidées lors de leur enregistrement.

La chronologie affiche la date de préparation, puis les approbations, clôtures et rejets audités avec leurs notes. Elle exige le droit `audit` en plus des droits du scénario et du superviseur. Sans ce droit, la mission et sa vérification restent consultables mais les décisions du journal sont masquées. Seuls les champs nécessaires sont projetés : aucun corps fournisseur, jeton, mot de passe, identifiant d'un autre acteur ou objet d'audit brut. Les autres auteurs sont libellés Utilisateur autorisé ; vos décisions portent Vous. La dernière note de la mission reste un champ métier visible selon les droits de la mission.

La fiche est en lecture seule. Une mission ouverte permet de revenir à sa décision avec l'état et la version relus. Le formulaire de décision est amené dans la vue et son champ de note reçoit le focus. La fenêtre se ferme avec Échap, maintient le focus clavier à l'intérieur et restaure le focus à la fermeture ; sa présentation mobile est contrôlée.

Aucune nouvelle migration, dépendance ou variable. Validation : suite serveur de 127 tests réussie, contrôles ciblés du format d'explication et des droits réussis après correction, compilation finale réussie et 32 groupes navigateur OMEGA (22 superviseur, 10 cockpit existant). Aucun appel fournisseur ou paiement.
