---
name: proclair-agency
description: Coordonner 267 agents The Agency directement dans Codex pour COO-Proclair. Pour les tâches CRM Proclair, OMEGA, Stripe, Twilio, tests, cartes, contrats, bugs, design et déploiements.
---

# Proclair Agency — skill de lancement

1. Lire `AGENTS.md` et vérifier le dépôt et la branche; rester hors Production.
2. Lire `.codex/agency-manifest.json` et `references/roles.md` pour choisir les profils réellement présents, sans charger les 267 profils d'un coup.
3. Répartir le travail entre **4 agents** au maximum en parallèle, chacun avec une mission distincte et des fichiers non chevauchants.
4. Si ce client Codex permet d'invoquer des rôles personnalisés par nom, créer les sous-agents nommés (préfixe `agency_`) et attendre leurs résultats.
5. Si le client ne le permet pas, le dire explicitement; lire les TOML concernés, puis utiliser les instructions avec des agents génériques si possible, sinon travailler dans le fil principal. Ne pas prétendre avoir créé ces rôles.
6. Reproduire tout bug avant correction, exécuter les tests ciblés et généraux applicables, puis livrer un rapport avec rôles *réellement* utilisés, fichiers modifiés et résultats.

**Garde-fous :** pas de modifications Production, paiements réels, SMS/courriels/appels clients, migrations de données ou secrets sans approbation explicite. Préserver l'isolation multi-entreprise et les permissions héritées du parent.

Les 267 rôles sont des configurations de développement dans Codex, **pas** des agents OMEGA opérationnels autonomes.

Exemple : `$proclair-agency Diagnostique la connexion du CRM en Preview avec backend, sécurité et tests; aucun déploiement Production.`
