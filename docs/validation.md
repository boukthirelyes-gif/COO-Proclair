# Validation du CRM Proclair

Validation initiale le 9 octobre 2026, complétée le 12 octobre pour Vercel. Résultats de cette instance ; aucune publication Vercel, restauration dans une nouvelle tâche ou fidélité Rotor certifiée.

| Contrôle | Résultat réel |
|---|---|
| Installation reproductible `bash scripts/setup.sh` | Réussie : npm ci, génération Prisma JS, migrations répétables, seed idempotent, import legacy, build et sauvegarde |
| TypeScript | Réussi |
| Build Next.js production | Réussi |
| Tests TypeScript avec PostgreSQL séparé | 32 exécutés, 32 réussis, 0 ignoré |
| Prototype Python conservé | 3 exécutés, 3 réussis |
| Parcours Chromium | 23 étapes CRM/OMEGA + 17 étapes financières + 9 contrôles Intégrations validés sur le build de production, aucun événement pageerror |
| Mobile | Parcours 390×844 et capture inspectée ; Safari non exécuté |
| Backup PostgreSQL | Dump custom restauré dans `proclair_restore_test`; comptes techniciens, clients et migrations identiques |
| Instance principale | Connexion, état CRM et financier, base PostgreSQL et worker vérifiés ; 3 techniciens configurés, 0 client, 0 visite, 0 facture et 0 paiement fictifs |
| OMEGA | Aperçu, application idempotente, conflits, permissions, worker concurrent, retry, dead-letter, kill switch et ouverture du plan testés |
| Rotor MCP / site | Nouveau contrôle : site HTTP200, MCP HTTP401 OAuth requis ; métadonnées OAuth publiques HTTP200 ; compte et outils non accessibles |
| Audit dépendances runtime | 0 vulnérabilité signalée par npm audit ; ce contrôle ne certifie pas toute la sécurité de l’application |

Le parcours navigateur a créé les données uniquement dans `proclair_browser_test` : connexion, client, site, contrat, prestation, visite confirmée, proposition OMEGA, approbation et affectation, modification de notes, affichage semaine et mois, fiche client persistante par URL, journal, activation du worker, mise en file, traitement hors navigateur, ouverture du plan, désactivation et interface mobile.

Les tests métier contrôlent transitions, horaires Toronto, durée, week-end, capacité de base, passage unique, concurrence de version, conflit de technicien et rollback, audit, idempotence et interdiction de confirmation par OMEGA. Le worker utilise un schéma de test propre et vérifie désactivation par défaut, permission ADMIN, déduplication, concurrence, persistance des plans et trois essais avant dead-letter.

Problèmes corrigés pendant cette validation : moteur Rust Prisma indisponible remplacé par le mode JavaScript officiel, origine navigateur distincte du hostname interne Next, libellés accessibles des selects, isolation de la file worker et conflits de sérialisation sans consommation des tentatives métier.

## Non validé ou non livré

Pas de 1 500 tests, pas de référence visuelle Rotor, pas de test Safari, pas d’intégration externe opérationnelle. Les marges de déplacement sont fixes et ne vérifient ni circulation ni consentement client. SMS, courriels, encaissement externe, PDF serveur et envoi de factures, commissions V10, cartes, optimisation de routes, modèle IA, multi-utilisateurs et déploiement public restent ouverts. Les clients et contrats sont maintenant modifiables avec version et audit. Sites, prestations et techniciens restent sans édition complète. Le calendrier n’a pas encore le glisser-déposer ni une vue dispatch cartographique.

Lors des premières tranches, les commits étaient locaux dans le checkout, sans push GitHub ni activation d’une version publiée. La conservation/restauration des commits locaux dans une nouvelle tâche n’a pas été testée ; les volumes Docker exigent une sauvegarde restaurable depuis le workspace.

## Tranche financière

Migration additive des factures, lignes, paiements, contrepassations et compteur de numérotation, puis migration de précision des taux sans modifier les migrations déjà appliquées. Les tests isolés valident centimes exacts, arrondi par ligne, taux fractionnaires (997,5 bps), doublons, concurrence, facture/client/contrat cohérents, factures émises immuables, solde recalculé et permissions humaines.

Le parcours Chromium financier vérifie brouillon, édition, émission, paiement partiel, rejet du dépassement de solde, paiement complet, contrepassation, persistance après rechargement, annulation du brouillon et export CSV contenant le vrai client et les montants exacts. Cas vérifié : 2 × 10 000 cents à 997,5 bps donne 1 995 cents de taxe, total 21 995 cents. Aucun débit ni remboursement externe n’est simulé.

Corrections supplémentaires : conservation de la navigation en mode React Strict lors du rechargement, soumission des seuls champs éditables des contrats, récupération après conflit de version et protection des CSV contre les formules. Assets du prototype déplacés sous legacy/static, sans changer ses URLs de service ni ses données ; ses trois tests restent réussis.

## Tranche dépenses

Les 25 tests TypeScript restent réussis avec des contrôles supplémentaires dans le test de registre financier isolé : dépense positive, date réelle, idempotence concurrente, conflit de clé, interdiction OMEGA, correction administrateur, version et conservation de l’original avec deux événements d’audit. Typecheck et build production réussis.

Le parcours financier de 15 étapes a été exécuté sur le nouveau build : saisie d’une dépense de 12 345 cents, rechargement, export CSV, annulation motivée et diminution exacte du total de dépenses actives. Aucun événement pageerror. Le solde présenté est encaissements nets moins dépenses payées enregistrées, toutes dates confondues ; aucune prétention de bénéfice comptable, de solde bancaire ou de crédit de taxes récupérable. Les justificatifs ne sont pas téléversés. Nouvelle sauvegarde PostgreSQL créée après migration additive ; sa restauration dans une nouvelle tâche n’est pas certifiée.

## Documents imprimables

Le parcours financier complet de 17 étapes passe sur le build de production, sans pageerror : ouverture du document depuis la facture, numéro réel, styles d’impression masquant les commandes, génération d’un PDF A4 valide par Chromium et accès anonyme refusé (401). Un test de rendu vérifie échappement des champs HTML, montants et taux fractionnaire, date d’émission Toronto, mentions brouillon/annulation et absence de solde demandé pour ces états. Réponse privée no-store, CSP restrictive et protection contre l’encapsulation dans un iframe.

Il s’agit d’une impression navigateur ; aucun PDF serveur archivé ou courriel envoyé. Les coordonnées légales et numéros fiscaux de l’émetteur restent à configurer. Les coordonnées du client et les paiements sont les données actuelles, pas une archive de l’état au moment de l’émission.

## Connexion Rotor dans le CRM — 12 octobre 2026

27 tests TypeScript réussis, dont un scénario OAuth simulé : client public, scopes de lecture, PKCE, chiffrement authentifié, refus de state incorrect, retour à usage unique, persistance chiffrée, initialization MCP, découverte sans tools/call et suppression locale de l’accès. Aucun compte réel Rotor connecté, aucun import ni envoi externe. Le build production passe. La connexion distante dépend d’une origine publique HTTPS et de l’autorisation du compte ; le renouvellement automatique et la révocation distante restent ouverts.

Quatre contrôles Chromium réussis sur build production : page Intégrations accessible, bouton désactivé sans origine HTTPS, navigation conservée après rechargement et démarrage refusé avec CONFIG_REQUIRED/409. Aucun pageerror. Correction du débordement du menu sur petits écrans desktop : toutes les entrées restent accessibles par défilement.

## Cycle de vie Rotor — 12 octobre 2026

30 tests TypeScript réussis, zéro ignoré. Les nouveaux scénarios simulés couvrent renouvellement concurrent sans double rotation, refresh token conservé chiffré, pagination JSON/SSE avec schémas, panne temporaire préservant l’accès, invalid_grant imposant une reconnexion, refus de droits plus larges et révocation distante conservant les secrets sur échec puis suppression après succès. Typecheck et build production réussis.

L’utilisateur confirme ne pas avoir de domaine public pour le CRM. Aucune adresse supposée, aucun compte Rotor connecté, aucune donnée importée. Le renouvellement est déclenché à l’utilisation et non par un service permanent. La sérialisation est locale au processus serveur ; déploiement à plusieurs réplicas non pris en charge. La découverte est bornée à 20 pages, 1 000 outils et 1 Mo par réponse ; une pagination résiduelle est signalée. Les snapshots PostgreSQL ne sauvegardent pas le fichier de jetons.

Neuf contrôles Chromium réussis sur le build production, aucun pageerror : quatre contrôles locaux de la page/configuration et cinq contrôles d’interface avec réponses Rotor simulées (renouvellement, schéma d’outil, retour avant révocation, panne de révocation préservant la connexion, succès avec état déconnecté). Aucun service Rotor contacté par ces simulations.

## Préparation Vercel — 12 octobre 2026

Projet existant conservé. Node 24, installation npm ci gelée avec scripts de dépendances désactivés (génération Prisma explicite), puis commande `vercel:build` exécutée en mode Production sur une base isolée neuve : six migrations, seed idempotent des trois techniciens et compilation réussis. Réapplication migrations/seed vérifiée : zéro client, facture ou accès OAuth fictif.

32 tests TypeScript/PostgreSQL, zéro ignoré ; 3 tests Python ; 23 étapes navigateur CRM/OMEGA, 17 financières/PDF et 9 Intégrations réussis sur build production. Aucune pageerror. OAuth et débit de connexions testés avec deux clients PostgreSQL distincts représentant des réplicas : callback à usage unique, rotation distribuée, ciphertext durable et invalid_grant conservé en base. Cron sans secret refusé ; les accès OAuth ont quitté le système de fichiers éphémère.

Protection Git élargie aux fichiers .env.*, .vercel, clés, bases et sauvegardes. Scanner des blobs de tout l’historique et des fichiers destinés à Git : aucun secret ni fichier privé détecté. Aucun client réel ou export de base n’est inclus dans le dépôt. Les identifiants des bases de développement et CI sont explicitement fictifs, à ne pas réutiliser en production.

Déploiement Vercel réel non effectué : compte Vercel, PostgreSQL distant et variables non configurés dans cette session. Le domaine HTTPS Vercel pourra servir au callback sans acheter de domaine. Rotor réel reste non connecté. Voir docs/deploy-vercel.md ; aucun score de parité ou certification production n’est revendiqué.

Six vérifications HTTP supplémentaires sur une instance locale configurée comme la production : santé PostgreSQL, cron anonyme 401, cron signé autorisé avec worker désactivé, finances anonymes 401, session HttpOnly/Secure/SameSite strict et réponses API privées no-store. Aucun secret ni cookie affiché. Une nouvelle sauvegarde locale PostgreSQL est conservée hors Git après la migration.

## Améliorations OMEGA et pilotage — 12 octobre 2026

33 tests réussis : tableau de bord excluant les visites terminées/annulées des prochaines interventions et calculant le jour Toronto ; reprise de dead-letter contrôlée, permission administrateur, tentative attendue, concurrence (une seule reprise), audit, refus de date passée et kill switch. Compteurs de la file lus depuis PostgreSQL, y compris les anciens jobs au-delà de la liste récente.

Parcours Chromium étendu de 27 étapes CRM/OMEGA : tableau de bord et indicateur de progression, remise en file d’un échec dans la base séparée, traitement manuel avec résultat visible, déconnexion et API privée 401. Les 17 étapes financières et 9 contrôles Intégrations passent aussi. Aucun pageerror. Capture desktop inspectée, mobile revalidé. Aucun client réel ajouté à la base principale ; test de reprise exclusivement dans proclair_browser_test. OMEGA reste déterministe : aucun modèle IA ni nouvel envoi externe.

La branche distante contenait entre-temps des correctifs Vercel (tracing WASM Prisma, diagnostic sûr, connexion directe temporaire) et un miroir Rotor en lecture seule. Ces changements ont été fusionnés sans écrasement. Le fixture navigateur a été adapté à l’endpoint miroir et la commande npm test charge la configuration locale sans imprimer ses valeurs. Le miroir distant reste distinct des contrats et visites locales ; validation des appels Rotor par simulations uniquement dans cette session.

Après fusion : 36 tests exécutés, 36 réussis, zéro ignoré ; compilation réussie ; 27 + 17 + 9 contrôles Chromium réussis. Le miroir Rotor issu de la branche distante est préservé. Aucun compte réel Rotor n’a été sollicité dans ces tests.

## Devis et portabilité sans Rotor — 12 octobre 2026

37 tests TypeScript réussis, aucun ignoré. Devis natif : montant 21 995 cents dont 1 995 de taxes, édition versionnée, lignes figées à émission, accord humain, refus, expiration et conversion concurrente unique. La répétition reste idempotente même après édition de l’échéance de la facture. Aucun contrat ou visite fictif créé. Export métier vérifié sur PostgreSQL : devis/facture inclus, sentinelles du stockage des secrets et du rate limit exclues. Le rendu de devis est distinct de la facture, sans demande de paiement.

Types et compilation réussis. Les 27 étapes CRM/OMEGA, 17 financières et 9 Intégrations restent réussies. Source de référence Rotor : documentation/fonctions publiques déjà inventoriées et miroir existant ; aucune prétention d’extraction complète de règles privées ou de parité totale. Les fonctionnalités restantes sont explicites dans docs/autonomie-proclair.md.

Identité entreprise et portail ajoutés à la validation PostgreSQL : version de fiche, snapshot d’émetteur conservé après changement du profil, partage refusé pour brouillons/OMEGA, jeton hashé, lien ciblé, consentement obligatoire, acceptation concurrente unique sous rôle CLIENT, idempotence, expiry et révocation. Aucun token de lien client inclus dans l’export. Les 37 tests restent réussis.

Parcours natifs supplémentaires sur build production : 8 étapes devis/PDF/conversion/export et 6 étapes identité/partage/client anonyme/accord/révocation, zéro pageerror. La requête anonyme vers l’administration est refusée (401), les notes internes ne sont pas rendues et la révocation est constatée après rechargement (410). Le parcours financier de 17 étapes reste réussi après ces ajouts. Données uniquement dans la base de test séparée.

## Utilisateurs et porte-à-porte (2026-10-13)

- 39 tests Node exécutés, 39 réussis, aucun ignoré : nouveaux contrôles des rôles, absence d’élévation de privilèges, hachage salé des mots de passe, révocation des sessions après désactivation/réactivation/réinitialisation, restrictions sur les pins, historique, conflit de version et protection « Ne pas contacter ».
- Correction d’une collision de création de préparation OMEGA détectée lors des tests concurrents ; huit mises en file simultanées retrouvent la même préparation.
- Migration additive appliquée sans réinitialisation des bases locale et navigateur. Compilation de production et vérification TypeScript réussies.
- Nouveau parcours Chromium utilisateurs/carte : huit contrôles réussis (création par l’interface, affectation, vendeur sur mobile, absence de débordement horizontal, refus des routes sensibles, clic sur pin, rappel Toronto, désactivation et révocation).
- Portal client : six contrôles réussis ; intégrations : neuf contrôles réussis, dont cinq avec cycle Rotor simulé. Le contexte OAuth est signé, limité au callback en SameSite=Lax, et les droits actuels sont revérifiés sans dépendre du cookie de session SameSite=Strict lors du retour externe.
- Contrôle visuel desktop/mobile réalisé. Les tuiles `tile.openstreetmap.org` répondent 403 via le proxy Codex : fond de rues non validé dans cet environnement. Ajouter ce domaine aux destinations autorisées sans remplacer la liste existante. Les pins, filtres, fiches et restrictions restent testables sans tuiles ; aucun substitut de fond fictif utilisé.
- Installation `npm ci --include=dev --ignore-scripts --cache /workspace/.npm-cache` puis génération Prisma vérifiées avec le lockfile actuel.
- Régression complète sur le build final : CRM/OMEGA 27, finances 17, devis 8, portail 6, intégrations 9, utilisateurs/carte 8, soit **75 contrôles navigateur réussis**, aucune erreur JavaScript relevée.

## Première livraison des directives V6 / OMEGA SUPREME — 2026-10-13

- Départ GitHub main vérifié à `4008fc4`. Branche de fonctionnalité dédiée ; aucune fusion automatique.
- Sept articles officiels et deux métadonnées OAuth lus en HTTP 200, empreintes conservées dans le registre des sources. App Rotor et health Vercel refusés par le proxy (403), aucune vérification de production attribuée.
- 44 tests Node réussis, aucun ignoré : snapshots, différences de schémas, pagination partielle sans fausse suppression, guards persistants, refus des outils destructifs, validation JSON Schema, import de pins idempotent, visibilité par rôle, Never Knock, bail de surveillance et consentement progressif.
- Vérification métier native : deux visites liées au même job ; achèvement d’une visite sans facture ni paiement automatique ; contraintes et calendrier existants couverts par les tests de domaine. Les écarts de prix/facture par job sont explicitement documentés.
- Matrice : 512 identifiants distincts, 16 par domaine, génération canonique et existence des références de tests contrôlées. Aucun statut PRODUCTION_VERIFIED et aucune preuve MCP privée inventée.
- Build Next.js et TypeScript réussis. Migration additive appliquée sur les bases locale et navigateur.
- Sauvegarde locale privée restaurée dans une nouvelle base séparée : cinq catégories et treize migrations retrouvées ; seconde restauration refusée parce que la cible était non vide.
- Les lectures Rotor métier sont testées avec fixtures et transport simulé. Aucun token du compte n’est enregistré dans cette instance, aucun client réel importé, aucun SMS ou paiement effectué.
- Build final : 84 contrôles navigateur réussis, aucun pageerror (CRM/OMEGA 27, finances 17, devis 8, portail 6, intégrations 9 dont cinq simulés, utilisateurs/carte 8, compatibilité/catégories 9). Les trois tests Python historiques passent également.
- L’API GitHub est refusée au CONNECT par le proxy (403) pour REST et GraphQL. Le push Git reste utilisable ; la création de PR doit être achevée depuis l’interface GitHub ou après ajout d’api.github.com aux domaines autorisés.

## Prospects et pipeline natifs — 2026-10-13

- 46 tests Node exécutés et réussis, aucun ignoré, sur PostgreSQL séparé après migrations : propriétaires, permissions, idempotence, versions, restriction de contact, doublons normalisés, conversions concurrentes et absence de facturation automatique.
- Build de production réussi. Sept nouveaux contrôles navigateur commerciaux réussis, zéro pageerror : vendeur mobile depuis une porte, relance Toronto, étape, conversion vendeur refusée, conversion administrateur, choix d’un client existant et visibilité des seules affectations. Capture mobile inspectée.
- Régression exécutée sur cette tranche : 27 contrôles CRM/OMEGA, huit utilisateurs/carte et neuf compatibilité, tous réussis. Les autres 40 contrôles financiers, devis, portail et intégrations étaient validés sur la tranche précédente ; ils ne sont pas présentés comme réexécutés ici.
- Deux migrations additives appliquées en local et dans les bases de test. Correction d’une animation Leaflet qui pouvait survivre au passage carte → prospects ; nouveau parcours sans erreur JavaScript.
- Matrice canonique enrichie uniquement pour les fonctions natives livrées. Pas de changement du statut de production ou de preuve Rotor privée. Aucun message ni paiement externe.

## Première tranche V30 — 2026-10-13

52 tests Node exécutés et réussis, aucun ignoré ; compilation et TypeScript réussis, trois tests Python conservés. Contrôles Chromium exécutés pendant la livraison : 109 réussis, dont 18 nouveaux V30/accords/import de fixture ; aucun pageerror dans les parcours finalisés. Import/promotion : données synthétiques et OAuth simulé, pas de compte Rotor réel. Détail des scénarios et limites dans PROCLAIR_V30_OVERNIGHT_REPORT.md.

Backup restauré dans une cible vide avec 18 migrations et cinq catégories. Police PDF et WASM Prisma présents dans le tracing. AJV corrigé à 8.20.0, audit runtime suivant sans vulnérabilité signalée, scan de secrets sans détection. Safari et production Vercel non vérifiés.

## Territoires natifs — 2026-10-13

54 tests Node réussis, aucun ignoré. Compilation et TypeScript réussis. Cinq contrôles navigateur de territoires, huit utilisateurs/carte et sept prospects réussis. Les tests PostgreSQL vérifient contours invalides, visibilité, conflits concurrents, frontières, versions, réaffectations protégées et conservation des portes historiques. Toutes les fixtures sont séparées de la base principale.
