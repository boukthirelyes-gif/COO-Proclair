# Validation locale du pilote SaaS

Date UTC : 2026-10-17.

Code et compilation navigateur : `b0353a37b1ea3fb9c451c55da0c156340561b27c`. Les 170 tests serveur ont été exécutés sur `d17fece48a31e5a7ed31c7e54ee51b7ad8441fa2` ; la seule différence suivante est la présentation du nom client dans SaasWorkspace.tsx, vérifiée au navigateur et par TypeScript/build.

| Contrôle | Résultat local |
|---|---|
| Tests serveur | 170 réussis, 0 échec, 0 ignoré |
| Suites navigateur existantes et étendues | 32/32, 0 échec |
| Tests Python | 3/3 |
| TypeScript / Next.js build | Réussis |
| Prisma | Validation WASM officielle réussie ; génération du client réussie |
| Migrations | Appliquées sur les deux bases synthétiques locales uniquement |
| Isolation SaaS | A/B/C, accès croisés, contrats, invitations, secrets/AAD, OMEGA, droits et quotas vérifiés |
| Provisioning | Rollback, reprise et rejeu READY vérifiés |
| Finance | Admission bornée, expiration sans démarrage tardif ; cinq répétitions réussies et paiement idempotent entre deux clients indépendants |
| Audit npm complet | 0 vulnérabilité connue |
| Recherche de secrets | Aucun fichier privé ni secret détecté |
| Parité fonctionnelle | 512 capacités / 32 domaines |

## Mesure reproductible

Jeu isolé : 10,000 clients synthétiques ; 10 appels directs de SaasTenant.list, page de 100 lignes maximum. Médiane **27 ms**, p95 **33 ms** sur cette machine locale. Le client Prisma est créé et fermé à chaque appel. Ce n’est pas un temps HTTP de Production, un test Google Maps, une charge distribuée ou une validation d’un million de lignes.

Les tests et le benchmark sont dans tests/saas-foundations.test.ts. Les rapports bruts, traces, captures et fixtures privées restent sous .local/saas-foundations ; ils ne contiennent ici que des données synthétiques et ne sont pas versionnés.

## Échecs intermédiaires corrigés et conservés

- Blocage financier concurrent reproduit ; un simple délai entre reprises ne suffisait pas. Admission ordonnée et bornée par client ajoutée, sans retirer les tests de concurrence ; test supplémentaire entre deux clients indépendants.
- Fixture de pins sans createdBy : fixture complétée, assertions de pagination 100 + 2 conservées.
- Nom client mêlé au courriel dans la liste : nom rendu séparément dans un élément sémantique, assertion exacte conservée.

## Portée et limites

Aucune modification ni validation de Production. Aucune charge, communication ou import Proclair réel. Pilote désactivé par défaut. Les modules SaaS non adaptés sont refusés, sans accès de secours au CRM historique.

La checklist de commercialisation, les limites de l’isolation par schéma, la MFA SaaS encore absente, le billing commercial et les transports multitenants à terminer sont dans [README.md](README.md).

Les résultats GitHub Actions et Vercel ne sont pas vérifiés par ces résultats locaux. Un push ou une page HTTP 200 ne vaut pas validation distante.

La sauvegarde du brouillon de configuration cloud n’a pas pu être confirmée par le service. Les instructions versionnées restent disponibles dans le guide ; les helpers locaux ont été exécutés. Aucune publication de l’environnement cloud n’est annoncée.
