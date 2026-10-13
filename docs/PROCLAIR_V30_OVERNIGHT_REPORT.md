# Proclair OS V30 — compte rendu de la première livraison

Date : 13 octobre 2026. Version applicative : 0.3.0. Branche : `feature/proclair-v30-titan`. Projet existant conservé ; cette branche représente une première tranche V30, pas l’ensemble des quinze parties terminé. Aucune fusion dans main ni publication Vercel de cette tranche.

## CE QUI EST VRAIMENT UTILISABLE MAINTENANT

- Thème anthracite/orange repris des deux commits de `design/rotor-dark-mode`, correspondant au head Git de la PR #12, puis adapté aux nouveaux modules. Navigation regroupée en sept familles, icônes SVG originales, barre mobile et bouton d’action rapide. Les modules inexistants ne sont pas présentés comme opérationnels.
- Recherche globale serveur, accessible par bouton ou Ctrl/Cmd + K : clients par nom/téléphone/adresse, contrats, factures, visites, prospects, pins et employés selon permissions. Jusqu’à huit résultats par catégorie ; ouverture du dossier ou de la fiche ciblée. Les vendeurs retrouvent uniquement leurs pins/prospects.
- Tableau de bord : créations directes client/contrat/visite/facture, carte et OMEGA ; synthèse des encaissements manuellement enregistrés, factures émises et soldes impayés réservée au droit Finance. Graphique des dernières dates enregistrées, sans rapprochement bancaire annoncé.
- Dossier client Details / Service / Activity : coordonnées, plusieurs adresses, notes, contrats, réalisations, passages restants calculés par PostgreSQL, visites et documents financiers autorisés. Les actions ouvrent les vrais formulaires. Le journal provient des événements enregistrés et exige Audit.
- Carte native : résultats rapides No Home / Not Interested / Interested / Made Sale, avec version et audit, sans ressaisir une porte. Never Knock bloque ces raccourcis. Plein écran lorsque le navigateur le permet. Les cinq catégories existantes, propriétaires, notes et relances sont conservés.
- Parcours natif administrateur/gestionnaire **Service → Agree → Schedule** : lignes et remises par passage, prix en dollars, vendeur facultatif, échéances contractuelles et conditions saisies. Brouillon modifiable ; émission fige un snapshot et crée un lien privé. Nom saisi, consentement et horodatage produisent un PDF signé archivé en PostgreSQL avec empreinte SHA-256. La création explicite des passages produit un job et une visite PENDING par passage, sans rendez-vous ni technicien attribué.
- Exemple testé : 439 $ moins 200 $, puis 239 $, donnent 478 $ avant taxes dans deux lignes distinctes. Aucun contrat existant supprimé ; les contrats historiques restent accessibles et modifiables. Les conditions des accords émis sont protégées contre les modifications du formulaire historique.
- OMEGA : interface de conversation déterministe sur les vrais comptes de contrats actifs, visites à confirmer, passages restants et factures impayées. Résultats cliquables et passage vers le planificateur supervisé existant. Les requêtes sont auditées, sans annonce d’action exécutée à tort. Aucun modèle de langage connecté et AUTOPILOT désactivé.

Les nouveaux contrats à signer exigent `crm.write`; créer les passages exige `dispatch`. Le vendeur actuel conserve un accès limité carte/prospects : son parcours de contrat personnel complet reste à livrer, sans lui ouvrir les dossiers de toute l’entreprise. Les PDF/accords utilisent un lien privé et ne constituent pas une signature qualifiée ni un mandat de prélèvement.

## Import Rotor : infrastructure développée et données réelles

Le nouveau moteur prend un bail, lit une catégorie et une page par requête, conserve son checkpoint dans PostgreSQL et peut reprendre après une interruption. Les retentatives ont un délai persistant. La réception de `has_more` est obligatoire ; répétitions, identifiants déjà vus, pages incohérentes et totaux contradictoires bloquent la progression. La limite de 2 000 pages est annoncée comme LIMIT_REACHED, jamais COMPLETE.

Les trois adaptateurs disponibles sont clients, jobs et visites. Clients/jobs parcourent toutes les pages reçues ; les visites sont limitées à la période explicitement choisie, jusqu’à 32 jours. Chaque fin de catégorie est indépendante. Totaux annoncés, identifiants uniques, pages, nouveaux/modifiés/identiques et erreurs figurent dans le rapport. Un lot navigateur traite au plus 100 pages ; il peut continuer depuis le checkpoint. Fermer l’onglet conserve la progression mais ne remplace pas un worker permanent.

Le staging conserve les champs source filtrés, leur empreinte, la normalisation et l’état précédent du miroir. Il ne crée ni facture ni paiement natif et ne modifie rien chez Rotor. Les propriétés de secret/token/carte sensibles sont exclues. Une modification de source concernant un client rapproché produit SOURCE_CHANGED et demande une réconciliation ; elle n’écrase pas sa fiche native.

La promotion client est séparée : import COMPLETE, comparaison du contenu et des correspondances nom/courriel/téléphone, décision explicite ou justification d’une personne distincte. Une correspondance vers un client existant conserve ses données. La table `RotorCustomerMapping` enregistre les identifiants, empreintes et décision, avec idempotence. Les données financières ne sont jamais promues par ce parcours.

**Données Rotor réelles importées dans cette instance : 0.** Contrôle de la base locale principale : zéro client, zéro ligne de staging, zéro import et zéro correspondance ; aucune autorisation Rotor enregistrée. Les données de tests sont uniquement dans les bases/schémas dédiés. La connexion Rotor de production n’est pas observable depuis ce réseau : cet état local ne prouve pas qu’elle est absente sur Vercel.

Les tests ont importé 27 clients synthétiques sur deux pages, repris une erreur de débit, rejoué un import sans doublon et effectué une promotion native approuvée. L’état OAuth utilisé par le test d’interface est simulé ; aucun appel externe Rotor dans ce test. Aucune fixture n’a été importée dans la base principale.

Factures, paiements, plans Rotor, prospects Rotor, employés, communications et autres objets ne disposent pas encore d’adaptateurs exhaustifs de ce moteur. Les pins gardent leur import distinct par page. Ne pas déclarer une migration complète de l’entreprise sur la base de ces trois adaptateurs. Les schémas et scopes réels doivent être découverts depuis le client OAuth de Proclair, jamais présumés depuis ChatGPT.

## CE QUI N’EST PAS ENCORE CONNECTÉ

- Rotor réel dans cette instance ; production et GUI privée non vérifiables depuis le proxy. Reprendre la connexion/découverte depuis le compte autorisé sur le domaine configuré, puis commencer par le staging.
- Stripe, Twilio SMS/Voice et fournisseur de courriel : **infrastructure complète et webhooks encore à développer**, en plus des comptes, numéros, clés et consentements requis. Cette livraison ne comprend aucun SDK de paiement/téléphonie opérationnel ni simulation annoncée comme production.
- Satellite, recherche d’adresse, clustering, territoires polygonaux et routage : pas encore livrés. Le fond OpenStreetMap demeure bloqué par le proxy Codex ; aucun fond satellite fictif utilisé.
- Portails vendeurs/techniciens complets, commissions, classement, tâches natives avancées, récurrences et renouvellements automatiques, avenants après émission, glisser-déposer du planning : à développer.
- Catalogue tarifaire administrable : pas livré. Le contrat utilise des descriptions libres et suggestions de noms de services, sans tarifs Proclair inventés.
- Assistant IA de langage et politiques AUTOPILOT : pas connectés/activés. OMEGA reste déterministe et les plans exigent l’approbation humaine existante.

## Composants modifiés et nouvelles pages

`AppNavigation`, `GlobalSearch`, `Dashboard`, `CustomerDossier`, `Prospecting`, `Leads`, `Finance`, `Users`, `RotorImportRuns`, `RotorCustomerReview`, `ServiceAgreements` et `OmegaAssistant`. Le gros composant principal délègue navigation, recherche, dossier, contrat et assistant à des modules distincts.

Services ajoutés : recherche, dossier, synthèse financière, import/checkpoints, promotion client, calcul exact par passage, génération PDF et accords de service. Permissions et erreurs restent centralisées. Le nouveau portail public **`/agreement`** expose uniquement le snapshot de son document privé. Les PDF administratifs passent par des routes authentifiées ; le portail télécharge via son jeton hashé, sans mettre ce jeton dans une requête GET.

## Migrations et sauvegardes

Trois migrations additives :

1. `20261013040000_rotor_import_runs` : runs, checkpoints et items de staging ; enrichissement du miroir.
2. `20261013041000_rotor_customer_mappings` : correspondances clients approuvées.
3. `20261013042000_service_agreements` : documents, prix par passage, empreintes, PDF et liens privés.

Sauvegardes locales vérifiées avant les migrations ; aucun reset ou suppression de données. Sauvegarde finale restaurée dans `proclair_v30_restore_test` : 18 migrations, cinq catégories et table ServiceAgreement présentes. La base principale ne contient pas d’accord signé ; cette restauration ne prouve donc pas la restauration d’un PDF client de production. La persistance des PDF est vérifiée dans les tests PostgreSQL dédiés.

Les nouvelles fonctions natives n’exigent aucune variable Vercel supplémentaire. La police Open Sans Apache-2.0 et sa licence sont versionnées ; son fichier et les WASM Prisma sont vérifiés dans le tracing du build. Les snapshots/jetons OAuth et archives client restent hors Git. Les PDF binaires et secrets de liens sont exclus de l’export JSON métier ; les documents s’exportent individuellement avec leurs permissions.

## Tests exécutés et corrections

- TypeScript et compilation Next.js production réussis ; santé locale : database connected.
- **52 tests Node exécutés, 52 réussis, zéro ignoré.** Incluent pagination, reprise, sources incohérentes, staging idempotent, promotion/doublons, permissions de recherche, OMEGA, prix/remises/taxes, modification de brouillon, signature concurrente, PDF persisté, liens révoqués et visites uniques non confirmées.
- Trois tests Python historiques réussis.
- Parcours Chromium exécutés pendant cette livraison : CRM/OMEGA 27, finances 17, devis 8, portail existant 6, utilisateurs/carte 8, compatibilité 9, intégrations 9 (cinq cycles simulés), prospects 7, V30 visuel/recherche/OMEGA 8, staging/promotion de fixture 4, accords/PDF/passages 6. **109 contrôles réussis**, sans pageerror dans les parcours finalisés.
- Mobile Chromium 390 × 844 et desktop exercés ; capture du dashboard et PDF bleu rendus et inspectés. Safari et comparaison pixel à des captures privées Rotor non exécutés : aucune image de référence jointe à cette directive.
- Matrice : 512 identifiants / 32 domaines vérifiés, uniquement les capacités natives réellement ajoutées reclassées, limites documentées. Aucun statut PRODUCTION_VERIFIED attribué.
- Audit npm runtime : AJV signalé modérément vulnérable, remplacé par 8.20.0 ; audit suivant **zéro vulnérabilité signalée**. Cela ne certifie pas toute la sécurité applicative. Scan Git et fichiers de travail : aucun secret détecté.

Corrections : pagination sans métadonnée auparavant assimilée à une fin ; protection contre les pages répétées ; ancienne importation par page invalide l’empreinte de promotion au lieu de garder un hash périmé ; source modifiée signalée sans écrasement natif ; prix en dollars convertis exactement ; contrats à lignes protégés contre l’édition historique ; contrôles de tax/discount et génération de passages idempotente. Une réponse invalide de liste d’import est désormais une erreur affichée. Le mock OAuth a été étendu aux nouvelles routes. Les suites Node sont exécutées séquentiellement au niveau des fichiers après un blocage intermittent du runner en parallèle ; les tests de concurrence métier internes restent actifs.

## Commits, PR et Preview

Base inspectée : main `34d1398`. Source sombre : head `3750ec3` de `design/rotor-dark-mode` et `refs/pull/12/head`, repris dans cette branche par `879867b` et `f0fab39`, sans fusion automatique de la PR #12. L’état GitHub détaillé de la PR reste bloqué par l’API.

Les commits applicatif et de rapport, le push et la tentative de PR sont consignés en fin de fichier après validation. Aucun lien de Preview vérifié disponible : pas d’accès Vercel dans cette instance, et `api.github.com` / le site public sont refusés par le proxy. Le push Git HTTPS fonctionne. Une URL de branche GitHub ne constitue pas une Preview déployée.

## Opérations nécessitant une validation spécifique

Aucune demande supplémentaire nécessaire pour les modifications réversibles déjà effectuées. Ne pas activer AUTOPILOT, encaisser réellement, envoyer massivement des messages, changer des rendez-vous en production ou promouvoir une importation financière à risque sans validation spécifique. Cette session n’a effectué aucune de ces opérations.

Avant production : revue de branche/Preview avec base séparée, sauvegarde de la base distante, confirmation des variables/domaines déjà documentés, migrations additives et contrôle des parcours. Après émission d’accords, un retour à un ancien build exige de conserver les documents et empêcher les anciennes routes d’en altérer les conditions ; privilégier un correctif compatible. Aucune migration destructive à annuler.

## Point de reprise et prochaines priorités

1. Vérifier la Preview et OAuth réel ; découvrir les scopes/schémas actifs, lancer un import reprenable, contrôler les totaux et promouvoir les clients explicitement. Ajouter les autres adaptateurs seulement sur preuve officielle accessible.
2. Accès vendeur aux contrats de ses propres clients, passerelle pin/prospect/vente vers le parcours signé, attribution et modification de pin après vente avec version. Le rôle SELLER ne doit pas recevoir l’accès CRM global pour contourner ce manque.
3. Territoires, carte paginée/clusterisée, géocodage et satellite avec fournisseur autorisé ; calendrier/dispatch/routage et vue technicien.
4. Catalogue administrable, taxes/politiques/configurations, avenants, renouvellements et échéanciers complets ; job facturable lié explicitement à la facture.
5. Stripe test/webhooks/idempotence, Twilio SMS/Voice test et courriels, puis commissions et tâches/consentements. Aucune activation financière réelle implicite.
6. Étendre OMEGA aux modules raccordés, avec politiques explicites, supervision et kill switch ; conserver l’absence d’AUTOPILOT production par défaut.

## État de livraison enregistré

- Commit applicatif : **`80a3380`**, après les deux reprises de thème `879867b` / `f0fab39`.
- Push Git réussi sur `feature/proclair-v30-titan` dans le dépôt demandé. Main demeure à `34d1398` ; aucune fusion de cette tranche.
- Création de PR tentée avec la description prête ; réponse GitHub GraphQL **Forbidden (403)**. **Aucune nouvelle PR créée** par cette session. Lien pour l’ouvrir : https://github.com/boukthirelyes-gif/COO-Proclair/pull/new/feature/proclair-v30-titan.
- Description complète : `docs/PR_PROCLAIR_V30.md`. Rapport ajouté au commit applicatif et complété dans un commit documentaire suivant ; tous les changements sont conservés sur la branche.
- Aucun déploiement/Preview vérifié. État local du CRM : endpoint health connecté à PostgreSQL. Les autorisations financières, d’envoi massif et AUTOPILOT demeurent inchangées.

## Suite : ergonomie générale et supervision — 13 octobre 2026

La lecture native de la carte est paginée par lots de 100, avec total autorisé, chargement supplémentaire et actualisation dédiée ; la limite globale bloquante de 2 000 portes est retirée. Les filtres et statistiques locaux concernent les portes chargées. Les clusters et filtres cartographiques serveur restent à développer.

Toutes les rubriques autorisées sont accessibles par un menu mobile. La recherche globale se pilote avec les flèches et Entrée. Le formulaire des utilisateurs respecte les dépendances des permissions. Un compte possédant OMEGA sans dispatch ne peut plus appliquer une affectation ; le décompte des passages terminés utilise une agrégation PostgreSQL.

Validation de cette tranche : 59 tests serveur, compilation de production et 27 vérifications navigateur réussis, sans erreur de page. Les tests de volume et parcours utilisent des données synthétiques séparées. La connexion aux fournisseurs, les imports Rotor réels et le statut Vercel de production demeurent non vérifiés depuis cette instance.

## Suite : ventes personnelles depuis la porte — 13 octobre 2026

Nouvel espace Mes ventes et droit sales.write : devis depuis son prospect, acceptation dans le portail existant, contrat prérempli du devis accepté, signature mobile et archive PDF existantes, puis transmission explicite à la planification. Étape Gagné et pin Made Sale actualisés sous contrôle de propriété. Aucun paiement, commission, confirmation ni rendez-vous attribué automatiquement. Les correspondances client exigent le rapprochement par un gestionnaire, sans écrasement de fiche.

Comptes non administrateurs existants sans droit supplémentaire automatique. Activer le droit dans Utilisateurs pour un vendeur existant. Deux migrations additives ; anciens contrats, devis et API CRM conservés. Correction du curseur de carte pour préserver l'affichage des portes récentes. Voir PARCOURS_VENDEUR.md pour les limites, dont transferts coordonnés non proposés et listes de documents personnelles bornées à 100.

Validation : 60 tests serveur, compilation de production, 41 vérifications navigateur distinctes, zéro erreur de page sur les parcours réussis. Aucune connexion fournisseur ni statut Vercel Ready vérifié ; publication GitHub et déploiement Vercel restent deux états distincts.

## Suite : filtres serveur et groupes de pins — 13 octobre 2026

Les filtres de carte natifs et compteurs sont maintenant calculés côté PostgreSQL sur tous les résultats autorisés. La recherche atteint les portes absentes de la première page, conserve la pagination et refuse l'accès à d'autres vendeurs sans map.all. Les pins natifs chargés peuvent être regroupés au dézoom et ouverts individuellement au zoom 18 ; le regroupement ne représente pas les portes encore non chargées. Aucun géocodage, itinéraire ou suivi continu des vendeurs. Rotor reste un calque distinct.

Validation : compilation de production, 62 tests serveur et 19 vérifications navigateur réussis. Voir CARTE_FILTRES_GROUPES.md. Publication du code et statut Vercel Ready restent distincts ; aucun statut de production vérifié depuis cet environnement.
## Suite : suivis de ventes supervisés — 13 octobre 2026

OMEGA propose des suivis à partir des dossiers natifs existants, avec vue personnelle dans Mes ventes et supervision globale selon les permissions. Chaque proposition exige une approbation humaine et un compte rendu manuel ; le dossier, sa version et les restrictions sont revérifiés. Aucun envoi, paiement, transmission ou planification automatique. Voir OMEGA_SUIVIS_VENTES.md pour les limites de volume et les dates historiques inconnues.

Validation : compilation de production, 63 tests serveur et 25 vérifications navigateur réussis sans erreur de page. Serveur redémarré et base connectée. Le statut Vercel Ready et les connexions fournisseurs restent non vérifiés.

## Suite : correction des devis personnels — 13 octobre 2026

Les vendeurs peuvent corriger leurs devis brouillons dans Mes ventes, avec recalcul serveur des taxes et montants, audit et contrôle du propriétaire actuel. Les devis émis restent figés ; émission, accord, contrat, signature et transmission conservent leurs actions distinctes. Aucune migration ou nouvelle clé. Voir DEVIS_PERSONNELS_CORRECTIONS.md.

Validation : compilation de production, 64 tests serveur et 12 vérifications navigateur réussis, sans erreur de page sur les parcours terminés. Serveur redémarré et base connectée. La publication GitHub ne certifie pas le déploiement Vercel.

## Suite : priorités et échéances OMEGA — 13 octobre 2026

Les suivis ouverts sont chargés avant l'historique et triés par échéance. Recherche, filtres d'état et compteurs sur les éléments chargés aident les vendeurs à trouver les suivis à traiter. Le report manuel d'une échéance conserve son approbation et vérifie dossier, droits et version ; échéances avant/après auditées. Les comptes rendus sont consultables dans les suivis clôturés. Voir OMEGA_SUIVIS_VENTES.md pour les limites.

Validation : compilation de production, 65 tests serveur et 13 vérifications navigateur réussis sans erreur de page. Aucun contact externe, paiement ou rendez-vous exécuté par ces actions. Aucune migration ou nouvelle clé. Publication GitHub et statut Vercel Ready restent distincts.

## Suite : transfert Rotor, interface et connexions fournisseur — 13 octobre 2026

Centre de transfert CSV natif en tête d'Intégrations : colonnes associées explicitement, aperçu, conflits bloquants, reprise sans doublon et rapprochement client approuvé. Archives de factures et paiements consultables dans Finances, avec montants signés exacts et références source, sans changement du registre comptable. Interface mobile et cartes fournisseur améliorées ; contrôles Stripe/Twilio en lecture seule, erreurs privées masquées et webhooks non déclarés vérifiés.

Les changements GitHub de la période annuelle et des diagnostics PostgreSQL sont conservés. Le lecteur et une migration additive alignent toutes les limites de staging à 366 jours. Voir TRANSFERT_ROTOR.md et STRIPE_TWILIO.md pour les permissions, variables et limites.

Validation : compilation, 74 tests serveur et 62 contrôles navigateur distincts réussis sur cette tranche ; les 17 contrôles CSV/fournisseurs sont répétés sur le build final. Aucun contact, prélèvement ou paiement natif créé par ces imports. Migration locale appliquée et serveur redémarré. Aucun import réel ni compte fournisseur vérifié. L'accès à Vercel reste refusé par le proxy : publication GitHub et production Ready demeurent distinctes.

## Suite : contrôle du transfert et historique par client — 13 octobre 2026

Le centre de transfert affiche les clients en staging, rapprochés, à rapprocher et modifiés depuis la correspondance. Les statistiques financières réservées aux comptes autorisés repèrent les références client non résolues et les factures source absentes de l'archive. Les fiches clients autorisées disposent d'un onglet Historique Rotor, avec leur pagination et leurs correspondances existantes. Aucun paiement comptable ou transfert de fonds effectué ; compteurs limités aux données enregistrées, sans certification de complétude Rotor.

Validation : compilation, 74 tests serveur et 25 contrôles navigateur réussis, zéro erreur de page. Serveur redémarré et base connectée. Aucune nouvelle migration ou clé requise ; production Vercel et connexion réelle Rotor non vérifiées.
