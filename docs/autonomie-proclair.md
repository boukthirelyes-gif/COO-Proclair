# Proclair autonome : état réel

Proclair est une application métier avec sa propre base PostgreSQL. Rotor est une source facultative de données : le CRM, les devis, les factures, les paiements manuels, les dépenses et le planificateur OMEGA fonctionnent sans connexion Rotor. Un compte Rotor n’est pas un prérequis de création d’un client ou d’une opération locale.

Le site public Rotor annonce notamment prospects, pipelines, territoires, plans de service, messagerie, planning, facturation et analyses. Ces descriptions constituent une référence fonctionnelle, pas un accès à tous ses écrans ou règles privées. Aucun code propriétaire n’est repris et aucune parité complète n’est attestée.

| Fonction métier | Proclair natif | État / limite |
|---|---|---|
| Clients et sites | PostgreSQL local au CRM | Création, clients éditables, historique |
| Contrats, prestations, visites | Entités distinctes | Passages, transitions, contrôles de dates et concurrence |
| Planning jour/semaine/mois | Données Proclair | Heure Toronto ; pas d’optimisation routière réelle |
| OMEGA | File PostgreSQL et propositions | Activation, kill switch, retries, reprise d’échec et approbation ; moteur déterministe |
| Devis | Nouveau module local | Brouillon, édition, émission, accord/refus consigné, annulation, PDF navigateur |
| Devis → facture | Conversion locale transactionnelle | Facture brouillon unique ; montants/taxes exacts conservés ; aucun contrat/visite fabriqué |
| Factures et paiements | Registre Proclair | Audit, version, numérotation, paiements manuels, contrepassation, PDF navigateur |
| Dépenses et rapports | Registre Proclair | Trésorerie enregistrée et exports CSV ; pas de bénéfice comptable certifié |
| Propriété des données | Export JSON métier | Clients, liens métier, finance, audit, plans et miroir déjà stocké ; aucun appel Rotor |
| Rotor | Connecteur facultatif | OAuth/mirror conservés ; aucun blocage des opérations natives sans OAuth |
| Prospects/pipelines avancés | Partiel dans le prototype historique | Module commercial Next.js complet à construire |
| SMS/courriels/campagnes | Pas de connecteurs actifs | Fournisseurs, autorisations et suivi d’envoi à établir |
| Carte porte-à-porte | Native Proclair | Pins, affectations, statuts, rappels et historique ; territoires polygonaux, géocodage et routes restants |
| Portail client | Natif Proclair | Consultation de devis/facture par lien privé, accord client consigné, expiration et révocation |
| Signature certifiée/paiement en ligne | À connecter | Aucun certificat de signature ou encaissement bancaire simulé |
| Identité entreprise | Natif Proclair | Coordonnées/mentions saisies, versions et identité figée à émission |
| Paie/commissions | À construire | Règles Proclair V10 non fournies ; aucun barème inventé |
| Comptes et permissions | Multi-utilisateur natif | Rôles, restrictions serveur, désactivation et révocation des sessions |
| IA générale | Sans modèle connecté | OMEGA reste un moteur de propositions déterministe |

## Devis natifs

La page Devis fonctionne avec les clients Proclair. Les lignes, quantités, prix et taux sont explicitement saisis. Une émission attribue DV-000001 et fige les lignes. Un accord ou refus exige une note de décision ; l’accord est une trace d’un consentement déjà obtenu. Une offre dépassée ne peut être acceptée.

Seul un devis accepté peut être converti. La conversion et son lien vers la facture sont enregistrés ensemble ; une double demande simultanée retourne la même facture. Le prix et les taxes du devis sont repris exactement. La facture reste en brouillon, sans émission ni envoi automatique. Modifier ultérieurement l’échéance de la facture ne crée pas une seconde facture lorsqu’une demande initiale est répétée.

OMEGA peut préparer/modifier un devis brouillon via le service métier. Émission, décisions et conversion restent réservées à un humain. Aucun nouveau comportement commercial autonome, aucune communication ou signature externe n’est simulé.

## Export des données

Mes données → Télécharger mes données Proclair fournit un JSON versionné avec les données métier et leur comptage, dans un snapshot PostgreSQL cohérent. IntegrationSecret, OAuthReceipt, LoginBucket, mots de passe et secret de session sont exclus. Le miroir Rotor est inclus comme données externes déjà stockées, distinctes des entités natives.

L’export est limité à 10 000 lignes par entité et 4 Mo. Un dépassement refuse la création du document ; aucun export incomplet n’est présenté comme une sauvegarde complète. Pour les volumes supérieurs et la restauration de l’environnement, utiliser une sauvegarde PostgreSQL et le secret de chiffrement gardé dans un coffre. L’export contient des données personnelles et financières : le conserver en privé, hors Git. Aucun import JSON automatique n’est livré.

Les exports proclair-export-*.json sont ignorés et détectés par le contrôle de sécurité du dépôt.

## Portail et entreprise

Entreprise permet de saisir nom légal, adresse, contact et mentions fiscales, avec version et audit. Aucun renseignement réel n’est deviné. Les nouveaux devis/factures émis conservent leur snapshot d’émetteur ; une modification de la fiche ne réécrit pas leur identité historique. Les documents antérieurs sans snapshot restent identifiables comme tels.

Un administrateur peut partager un document émis via un lien privé valable de 1 à 30 jours (7 par défaut). Le jeton aléatoire de 256 bits est stocké uniquement sous forme SHA-256. Il est transporté dans le fragment de l’URL, puis dans le corps des requêtes HTTPS, pas dans les chemins ou query strings des requêtes au serveur. Aucun email/SMS automatique envoyé. Les liens ne sont jamais inclus dans l’export métier.

Le portail montre un document sélectionné et son émetteur ; notes internes, mots de passe, références de paiement et clés sont exclus. Un devis émis non expiré peut être accepté avec nom saisi et consentement explicite. L’accord est audité sous le rôle CLIENT, avec horodatage et protections de concurrence/idempotence. Ce parcours n’est pas une signature électronique certifiée ni une vérification forte d’identité. Un lien donne accès à son destinataire ou à toute personne à qui il serait transmis : partager uniquement avec le client concerné.

L’administrateur peut désactiver tous les liens d’un document. Révocation et acceptation sont sérialisées en base. Les liens expirés/désactivés sont refusés ; un lien facture n’autorise pas une acceptation de devis ou un accès à l’administration. Paiement en ligne non connecté : les paiements reçus continuent d’être consignés dans le registre natif.

## Comptes d’équipe et carte de prospection

Proclair dispose maintenant de comptes d’équipe avec rôles, permissions restreignables, désactivation et révocation des sessions, ainsi que d’une carte native de portes avec affectations, neuf statuts, rappels Toronto et historique. Les territoires polygonaux, le géocodage et les itinéraires restent à développer. Voir [le guide](utilisateurs-prospection.md).

## Prospects et pipeline natifs — 2026-10-13

Depuis **Prospects**, créez une fiche ou ouvrez une porte puis choisissez « Créer un prospect depuis cette porte ». Saisissez le nom et les coordonnées réelles, la source, les tags, le potentiel en centimes CAD et une relance à l’heure de Toronto. Le pipeline livré comporte cinq étapes fixes ; le changement d’étape utilise une sélection. Une valeur potentielle ne représente pas un revenu encaissé et une étape « Gagné » ne crée pas un paiement.

Les nouveaux vendeurs reçoivent `leads.read` et `leads.write`, et voient uniquement les prospects qui leur sont affectés. `leads.all` permet au gestionnaire de consulter et affecter toute l’équipe. La conversion exige également `crm.write` et `leads.write`. Les comptes non administrateurs déjà existants gardent leurs permissions explicites : ajoutez les nouveaux droits depuis Utilisateurs selon leur rôle. Les restrictions sont vérifiées côté serveur à chaque requête.

La conversion propose les clients correspondant au nom, courriel ou téléphone normalisé. Choisissez explicitement une fiche existante ; une nouvelle fiche malgré une correspondance exige une justification. Une conversion rejouée reste unique. Les données du client existant ne sont pas remplacées. Le prospect converti devient consultable uniquement ; les modifications suivantes appartiennent à la fiche client. Never Knock et « Ne pas contacter » bloquent les relances et la conversion.

Relances enregistrées et audit interne sont disponibles ; aucun appel, courriel, SMS, contrat, rendez-vous, facture ou paiement ne découle automatiquement de cette conversion. Les pipelines personnalisés, séquences de messages, commissions et prévisions avancées restent à développer.
