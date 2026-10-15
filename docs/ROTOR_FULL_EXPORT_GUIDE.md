# EXPORT PRIVÉ ROTOR → PROCLAIR OS

**Ne jamais publier les archives** : les fichiers contiennent des renseignements personnels, des messages, des détails de facturation, des notes commerciales et des coordonnées GPS.

## État actuel

- La connexion Rotor que ChatGPT peut consulter est distincte de l'authentification Rotor OAuth enregistrée dans PROCLAIR OS.
- Cette procédure emploie **la connexion OAuth du CRM** et ses propres permissions : elle peut demander une reconnexion et des portées supplémentaires.
- Les totaux relevés le 14 octobre 2026 dans le compte Rotor de Proclair (métadonnées) sont : 998 clients, 38 leads, 1 820 jobs, 967 plans, 882 factures, 780 paiements, 18 456 pins et 6 134 messages. Ces totaux évoluent et ne garantissent pas le contenu d'un export particulier.
- Aucune donnée réelle n'est incluse dans le code source GitHub. Ne commitez jamais les archives privées.

## Exécution privée

Depuis une copie privée du dépôt (Node.js 24, dépendances installées et DB Proclair configurée) :

```bash
npm ci
npm run db:generate
node --env-file-if-exists=.env --import tsx scripts/export-rotor-full.ts
```

Pour continuer après interruption :

```bash
node --env-file-if-exists=.env --import tsx scripts/export-rotor-full.ts --resume
```

Si le lot du jour est déjà exporté, `--resume` est obligatoire. Pour lancer un lot indépendant, utilisez `ROTOR_EXPORT_BATCH` avec un identifiant unique, non sensible.

Dossier généré : `private-exports/rotor-full-AAAA...`.

Contenu : `manifest.json` et sous-dossiers de fichiers `page-00001.ndjson`, `page-00002.ndjson` par catégorie. Chaque ligne est le JSON brut d'un enregistrement lu chez Rotor.

## Catégories prises en charge

Clients, leads, jobs, plans de service, devis, factures, paiements, tâches, campagnes, modèles de messages, pipelines, étapes, catégories de pins, pins, messages, membres; visites, feuilles de temps, minuteries et payroll par intervalles mensuels depuis janvier 2024.

Certains endpoints peuvent être bloqués, paginés différemment ou soumis à des permissions. L'export ne prétend pas inclure des images, pièces jointes, PDF signés ou enregistrements audio lorsque leur binaire n'est pas fourni par ces endpoints. Les métadonnées et liens éventuellement exposés peuvent figurer dans le JSON.

## Validation indispensable

1. Vérifier le `manifest.json` et son booléen `complete`. Si faux, identifier les catégories incomplètes.
2. Comparer les totaux annoncés par l'API avec les comptes exportés, par catégorie.
3. Vérifier les identifiants `id` uniques de chaque catégorie; éviter les imports multiples par réinsertion aveugle.
4. Construire des tables de correspondance `rotor_id` → `proclair_id`.
5. Importer dans une base de test isolée, dans l'ordre : membres/références → clients/prospects → plans/jobs/visites → factures/paiements → communications et pins.
6. Préserver le brut et le fuseau horaire; convertir les centimes en CAD explicitement.
7. Ne **pas** créer de nouveaux paiements Stripe, envoyer de SMS ni envoyer des factures par l'importation.
8. Réconcilier les clients et dossiers qui existent déjà dans Proclair avant toute insertion en production.
9. Tester les sommes, les passages restants, les états financiers et les relations avant une bascule.
10. Faire un export différentiel final avant de cesser d'utiliser Rotor.

## Sécurité

Les exports sont exclus de Git par `.gitignore` et stockés sous `private-exports/`. Les transférer seulement par canal privé chiffré, avec contrôle d'accès; supprimer les copies inutiles après migration.

## Important

**Le code de l'exporteur est préparé, pas validé avec un lot complet en production.** Aucune garantie de migration totale tant que l'export, son audit et l'import natif ne sont pas réellement exécutés.

## Garde-fous après intégration de la branche

Les noms de lots restent dans private-exports/ du projet ; chemins absolus et traversées de répertoire refusés. Les diagnostics enregistrés ne contiennent que des codes bornés, jamais les messages bruts de fournisseur ou PostgreSQL. Les noms d’outils hérités du prototype sont refusés avant accès aux jetons. Tests locaux de ces garde-fous uniquement : aucun export de données réelles exécuté pendant cette livraison native.

Le relais HTTP authentifié exige les droits CRM/intégrations/export et les droits supplémentaires de la catégorie (finance, employés, accès global pins/prospects ou devis). Les contrôles HTTP exécutés n’ont demandé que des cas refusés ; aucun export réel n’est déclaré validé.
