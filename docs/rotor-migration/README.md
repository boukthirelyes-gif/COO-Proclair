# Migration Rotor — état et exploitation

Branche dédiée issue de develop. Aucune opération sur Production ; aucun accès Rotor réel exercé pendant ce lot.

## Moyens autorisés existants

- OAuth propre au CRM vers `mcp.getrotor.com`, PKCE et autorisations de lecture explicites. La connexion ChatGPT n'est pas celle du CRM.
- Découverte MCP avec schémas et permissions ; catalogue local = référence historique, pas preuve de disponibilité actuelle.
- Staging transactionnel : clients, jobs, visites (période maximale 366 jours par lot). Identifiants source préservés, liens client/job source et données brutes filtrées ; rapprochement explicite des clients, sans écraser leurs notes locales.
- Import CSV avec prévisualisation : clients et archives de factures/paiements. Archives financières séparées des paiements natifs : aucune charge créée.
- Export privé NDJSON `scripts/export-rotor-full.ts` : membres, clients, prospects, plans, jobs, devis, factures, paiements, tâches, modèles, campagnes, pipelines/étapes, types de pins, pins, communications, visites, heures, chronomètres, paie. Disponibilité conditionnelle aux outils réellement exposés et scopes accordés.
- Captures d'écran : références visuelles uniquement, jamais exports structurés.

Archive fournie auditée sans exécution de son script : CSV de 38 prospects, CSV de 9 membres (également présent en JSON) et JSON de types de pins. Ce sont des fichiers partiels disponibles, pas des données importées. L'extracteur fourni dans le ZIP contient lui aussi un plafond de 2 000 pages ; il n'est pas corrigé en modifiant le serveur et ne doit pas être utilisé comme preuve d'exhaustivité.

Contrats signés/preuves/PDF, documents binaires, photos, territoires, historique exhaustif, attribution vendeur et relations financières natives : non garantis par les trois adaptateurs de staging. Ne pas inventer de correspondances. Il reste à développer des adaptateurs vérifiés avant toute indépendance complète de Rotor.

## Corrections de ce lot

Suppression du plafond de 2 000 pages du staging et de l'export privé ; les anciens lots LIMIT_REACHED peuvent reprendre. La taille des pages et les transactions restent bornées. La session navigateur traite 100 pages puis permet de reprendre : ce n'est pas une limite du jeu de données.

Le compteur de staging détecte les totaux changeants/contradictoires et garde le dernier total connu si une réponse omet ce champ. En cas d'échec, transaction de page annulée et checkpoint inchangé ; reprise après délai existant (60 s sur rate limit, 10 s autrement). Les identifiants déjà lus sur une autre page restent une erreur explicite ; pas de doublon silencieux. Une nouvelle exécution rapproche les empreintes NEW/UNCHANGED/UPDATED. Les changements d'un client déjà promu demandent une revue manuelle, jamais un écrasement automatique.

Rapport par catégorie : accessible (nullable), parcouru, restant (nullable), niveau de confiance, explication. Rapport JSON téléchargeable limité aux compteurs/statuts/limitations, sans noms, coordonnées, échantillons ni identifiants source. `migrationCertified` reste faux : une fin de pages ne certifie pas toutes les catégories de Rotor.

L'export privé enregistre son manifeste par remplacement atomique. `ROTOR_EXPORT_FIRST_YEAR` règle le début historique des objets à période (défaut 2024). Ne pas confondre la fin des fenêtres sélectionnées avec toute l'histoire de l'entreprise. Conserver les archives sous `private-exports`, ignoré par Git. Ne lancer qu'un exporteur par lot. Les catégories indisponibles restent bloquées avec code d'erreur sans message sensible.

## Limites et travail restant

Les trois adaptateurs opérationnels utilisent la pagination numérotée annoncée par leurs schémas. Ne pas fabriquer un curseur pour une interface qui ne l'expose pas. Les curseurs de découverte MCP sont distincts des pages de données. Les interfaces exclusivement à curseurs requièrent un adaptateur et ses tests avant import.

L'export NDJSON n'est pas une promotion native et ne garantit pas à lui seul la cohérence d'un snapshot mouvant. Pas encore de synchronisation incrémentale générale, de journal de conflits par champ ni de promotion native de toutes les relations Client→Contrat→Visite→Technicien→Facture→Paiement. Pas de test de charge d'import en base à 100 025 enregistrements : ce volume teste uniquement le calcul de progression. Ne pas annoncer cette mission entièrement terminée.

## Vérification locale isolée

`node --import tsx --test tests/rotor-pagination.test.ts tests/rotor-mirror.test.ts tests/rotor-private-export.test.ts`

Avec `TEST_DATABASE_URL` vers une base PostgreSQL de test explicitement isolée :
`node --import tsx --test --test-concurrency=1 tests/v30-search-import.test.ts`

Cette suite crée puis supprime uniquement ses schémas aléatoires `v30_*`. Ne jamais fournir une URL Production. `npm run typecheck`, `npm run check:secrets`, `npm run build` complètent la vérification. Les tests serveur ne remplacent pas une vérification distante GitHub/Preview.
