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
| Carte/territoires/routes | À construire | Géocodage, fournisseur de carte et contraintes routières |
| Portail client | Natif Proclair | Consultation de devis/facture par lien privé, accord client consigné, expiration et révocation |
| Signature certifiée/paiement en ligne | À connecter | Aucun certificat de signature ou encaissement bancaire simulé |
| Identité entreprise | Natif Proclair | Coordonnées/mentions saisies, versions et identité figée à émission |
| Paie/commissions | À construire | Règles Proclair V10 non fournies ; aucun barème inventé |
| Identités et IA générale | Mono-administrateur / sans modèle connecté | Ne pas présenter OMEGA comme un agent IA général déployé |

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
