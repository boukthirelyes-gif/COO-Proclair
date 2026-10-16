# Audit OMEGA ULTRA — état vérifiable

Base finale : develop 47564b0, incluant PR 28/29/30. Au début de l'audit, la référence locale develop/main était 268c55e ; une récupération explicite a permis d'intégrer l'avancement distant. Les lots métier, Stripe, communications et diagnostic du schéma Preview sont conservés. Aucune modification de main.

L'inventaire reproductible `node scripts/audit-surface.mjs` répertorie les composants interactifs, formulaires, routes, modèles, migrations, workflows et tests. C'est un inventaire, pas une preuve d'exécution de chaque bouton. Les 32 suites existantes restent obligatoires. Les validations de 2a17e33 sont locales ; aucun résultat GitHub Actions ou Vercel récent n'est certifié.

| Fonction | État réel / frontend | Backend / persistance | Autorisation | Tests / problème | Priorité / correction |
|---|---|---|---|---|---|
| Sessions et utilisateurs | Connexion, invalidation, rôles | Sessions signées, AppUser | Serveur, grants explicites | Suites accès et mauvais mot de passe | P0 : conserver et rejouer |
| Carte | Google conditionnel, repli Leaflet explicite | ProspectPin, territoires, audit | map.read/write/all, propriétaire | Pages de 100 ; marqueurs limités aux pages chargées | P1 : zone géographique et agrégats bornés, charge synthétique |
| Chargement clients | État global historique lourd | API state | crm.read | Ouverture carte admin charge inutilement les clients | P1 : bootstrap MAP sans clients ni visites |
| Prospects et ventes | Pin → prospect → client → devis/contrat | Liens sourcePin/sourceLead, idempotence | Vendeur propriétaire contrôlé au serveur | Parcours natif et vendeur existants | P1 : montrer les liens réels du pin et tester les requêtes falsifiées |
| Clients | Fiches, multi-sites, contrats, timeline | Customer/Property et audit | crm.read/write | Communications importées et natives séparées | P1 : conserver ; archivage/fusion documentaire avancée à développer |
| Contrats | Émission, accord typé, PDF | Empreinte, preuve et PDF archivés | Propriétaire/gestion, signé immuable | Parcours signé testé localement | P1 : aucun certificat légal de signature revendiqué ; avenants à développer |
| Visites/calendrier | Jour/semaine/mois, techniciens et dispatch | Transitions, capacité, versions | dispatch côté serveur | Suites calendrier et parcours métier | P1 : ne pas déplacer les confirmations sans approbation |
| Routes | Proposition de créneaux | Marge fixe de 30 min, heuristique | omega/dispatch | Pas de temps routiers Google réellement vérifiés | P2 : estimation explicitement indiquée, fournisseur à configurer |
| Stripe | Tableau par mode, Checkout, remboursements | Registre serveur, événements immuables | Administration humaine, LIVE désactivé par défaut | Simulations, doublons et désordre | P1 : recette fournisseur réelle manquante ; pas d'encaissement réel |
| Communications | Centre, conversations, notes, brouillons | Consentement, DND, horaires, outbox persistante | CRM + intégrations ; approbation humaine | Webhooks/transport simulés, panne et concurrence | P1 : recette fournisseur/DNS/numéro nécessaire ; aucun portage |
| Commissions | Classement annuel et impact | Politique SIGNED_HT_ANNUAL_V1 ; historique préservé | Données personnelles / gestion | Paliers rétroactifs, signé HT | P1 : ne pas remplacer silencieusement par servi/encaissé ; séparer les bases |
| Import Rotor | Pages, reprise, provenance, contrôle | Staging/imports, correspondances, idempotence | Intégrations et approbation | Import paginé/réimport et export privé testés | P1 : totalité des données réelles non certifiée sans accès/export complet |
| OMEGA | Assistant déterministe, priorités, superviseur | Tâches persistantes, versions, jobs et DLQ | Permissions par outil, arrêt et revue | Pas de modèle IA externe branché ni autonomie permanente certifiée | P2 : préparation bornée des confirmations reliée aux visites |
| Finances | Factures, paiements, dépenses, CSV | Taxes, soldes dérivés, audit | finance | Tests exactitude et reçus | P2 : coûts véhicules/équipes et marges détaillées à développer |
| Portail | Liens privés par document, PDF et accord | Tokens hachés, expiration, révocation | Accès au seul document autorisé | Tests portail et isolation de documents | P2 : portail multi-services complet à développer |
| Multi-entreprise | Non activé | Modèles encore mono-entreprise | Aucun espace SaaS tiers ouvert | Pas de preuve d'isolation de deux entreprises | P0 pour commercialisation : blocage commercial maintenu ; migration organisationnelle séparée nécessaire |
| Hébergement | Dépôt de travail, pas de production | Preview doit utiliser base isolée | Échec fermé hors configuration | API GitHub refusée auparavant, pas d'outil Vercel | P1 : PR/Preview à confirmer si les accès deviennent disponibles |

## Livrables et limites

L'audit couvre la surface du dépôt et les preuves disponibles. Il n'assimile ni un inventaire statique, ni des simulations, ni un ancien build à une recette réelle. Les objectifs 100 000 prospects et centaines de milliers de pins ne sont pas présumés acquis. La première mesure cible 100/1 000/10 000 pins, comme demandé en mission 5.

## Itération carte : protocole reproductible

La migration `20261016080000_prospect_viewport` ajoute deux index géographiques, sans modifier les données. `/api/prospecting/viewport` calcule les groupes en PostgreSQL dans la zone visible, avec un maximum de 512 marqueurs. Les droits vendeur sont appliqués avant l'agrégation. Les marqueurs ne transportent ni notes, ni courriels, ni dossiers clients. Le détail est relu par une API autorisée à l'ouverture de la fiche. La liste conserve sa pagination de 100 portes.

Le démarrage direct sur la carte utilise `/api/state?scope=map`, y compris pour l'administrateur : les dossiers, contrats et visites ne sont pas téléchargés. Le miroir Rotor n'est demandé qu'après activation explicite. Le regroupement de sécurité reste actif pour des portes très proches, même au zoom maximal ; la liste permet d'ouvrir chacune.

`tests/prospecting-viewport.test.ts` mesure cinq requêtes chaudes par volume sur une vraie base PostgreSQL isolée. Un premier passage pour 100/1 000/10 000 portes donne respectivement 7/7/35 marqueurs et environ 1,4/1,6/7 Ko. Ces chiffres concernent les données synthétiques et la zone testée, sans garantie universelle de latence. Le rapport détaillé est généré dans `.local/omega-ultra/map-benchmark.json`.

La suite navigateur `browser-map-filters` conserve les contrôles de filtre, pagination et mobile et ajoute des chargements 100/1 000/10 000 portes, un contrôle du payload géographique et de l'état léger, puis une résolution tablette. Son rapport est distinct : `.local/omega-ultra/browser-map-benchmark.json`. Le fond de secours Leaflet testé ne valide pas le service Google réel.

Pour Google Maps, activer Maps JavaScript API, restreindre la clé navigateur à cette API et aux origines HTTPS autorisées, puis reconstruire l'application. Une clé publique de navigateur n'est pas un secret serveur. Les restrictions, la facturation et le rendu du projet Google réel nécessitent une recette avec sa configuration effective ; aucun statut « vérifié » n'est déduit de la seule présence de la variable.

## Actualisation de la base distante

Pendant la validation, `develop` est passé à `47564b0f9dc39b51ec87b52970c5993992a28625` (intégration PR 30). Cette référence a été récupérée explicitement et intégrée sans conflit dans la branche OMEGA ULTRA. Les PR 28/29/30 sont donc conservées, dont le contrôle en lecture seule qui renvoie un échec de santé si le schéma Preview est incomplet. La mention initiale de `268c55e` décrit le début de l'audit, pas la base finale de livraison.

Le contrôle tablette a détecté un débordement des compteurs à 768 px. Les compteurs de prospection utilisent désormais une grille adaptative. Le clic sur un groupe agrandit jusqu'au zoom maximal du fond concerné, sans revenir à un zoom inférieur. Les tests de groupe vérifient la somme des membres après zoom, même si un groupe se sépare en plusieurs marqueurs.

## Génération Prisma après installation propre

Une installation `npm ci` dans un dossier neuf a permis de reproduire une génération silencieusement incomplète lorsque `node_modules` est lié symboliquement. Le point d’entrée du générateur Prisma compare son chemin exécuté au chemin réel ; le sous-processus quittait avec 0 avant de répondre au RPC. Le script résout désormais le chemin réel, vérifie les modèles du client produit et échoue si le processus se termine avant génération complète. Un test génère réellement un client dans un projet temporaire à dépendances liées, puis vérifie le refus d’un schéma invalide. Aucun téléchargement de moteur Rust ou contournement de somme de contrôle n’est nécessaire pour le générateur WASM existant.
