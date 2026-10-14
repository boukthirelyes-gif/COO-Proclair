# Intégration des lots de travail — 14 octobre 2026

Les branches distantes feature, fix, design, deployment et codex retrouvées ont
été vérifiées par leur ascendance Git et intégrées à cette livraison. La dernière
branche carte Google et ses rapports sont fusionnés avec les correctifs récents
OMEGA et le rendu de secours conservés. Les lots d’isolation Preview et d’état
honnête des fournisseurs sont également intégrés. Les propositions automatiques
Dependabot de changements de versions ne sont pas des lots CRM développés et ne
sont pas incluses dans cette intégration fonctionnelle.

Les tests d’isolation Preview dépendaient d’un runner non installé. Ils sont
convertis au runner node:test existant et placés sous tests/ pour npm test ; les
cinq assertions originales sont conservées. Une Preview nécessite une connexion
PROCLAIR_PREVIEW_DATABASE_URL distincte. La sélection de connexion Production est
conservée. La CI inclut désormais les parcours carte, territoires et utilisateurs.
La préférence de livraison du propriétaire est enregistrée dans AGENTS.md.

Validation sur la version intégrée : build et contrôle TypeScript réussis,
135 tests TypeScript/PostgreSQL réussis sans échec ni ignoré, 3 tests Python
réussis ; 19 contrôles navigateur carte/territoires/utilisateurs réussis, sans
erreur JavaScript. Les tests métier et navigateur utilisent des bases isolées, aucun client
ou paiement de production. Google réel reste non vérifié sans clé.

La publication Vercel ne peut être annoncée comme réussie : ni VERCEL_TOKEN ni
hook de déploiement ne sont disponibles dans cette instance. Le prérequis d’accès
sécurisé a été enregistré dans le brouillon d’environnement dans la session
précédente, sans valeur inventée. GitHub/main et Vercel Ready restent deux preuves
distinctes. Il faut l’accès au fournisseur pour lancer/vérifier une publication.
