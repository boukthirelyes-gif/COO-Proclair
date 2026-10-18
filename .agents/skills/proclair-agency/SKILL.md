---
name: proclair-agency
description: Coordonner 267 agents The Agency directement dans Codex pour COO-Proclair. Pour les tâches CRM Proclair, OMEGA, Stripe, Twilio, tests, cartes, contrats, bugs, design et déploiements.
---

# Proclair Agency — skill de lancement

1. Lire `AGENTS.md` et vérifier le dépôt et la branche; rester hors Production.
2. Lire `.codex/agency-manifest.json` et `references/roles.md` pour choisir les profils réellement présents, sans charger les 267 profils d'un coup.
3. Pour les projets volumineux, former une équipe comme Claude Agent Teams : **jusqu'à 16 agents** parallèles, plus un coordinateur principal. Pour les petits sujets, n'en lancer que le nombre utile (2 à 6).
4. Diviser le travail en vagues diagnostic → implémentation → revue/tests, avec propriété exclusive des fichiers par spécialiste. Faire rendre des comptes à l'agent principal qui coordonne, arbitrera les conflits, et compilera les preuves.
5. Si ce client Codex permet d'invoquer des rôles personnalisés par nom, créer les sous-agents nommés (préfixe `agency_`) et attendre leurs résultats.
6. Si le client ne le permet pas, le dire explicitement; lire les TOML concernés, puis utiliser les instructions avec des agents génériques si possible, sinon travailler dans le fil principal. Ne pas prétendre avoir créé ces rôles.
7. Reproduire tout bug avant correction, exécuter les tests ciblés et généraux applicables, puis livrer un rapport avec rôles *réellement* utilisés, fichiers modifiés et résultats.

**Garde-fous :** pas de modifications Production, paiements réels, SMS/courriels/appels clients, migrations de données ou secrets sans approbation explicite. Préserver l'isolation multi-entreprise et les permissions héritées du parent.

Les 267 rôles sont des configurations de développement dans Codex, **pas** des agents OMEGA opérationnels autonomes.

Exemple : `$proclair-agency Diagnostique la connexion du CRM en Preview avec backend, sécurité et tests; aucun déploiement Production.`

## Mode intensif — 16 agents

Pour une grosse demande, envisager frontend, UX, backend, API, données, Stripe, communications, IA OMEGA, architecte multi-agents, sécurité, secrets, DevOps, Playwright, tests API, revue de code et validation finale, selon les profils réellement présents dans le manifeste. Les agents partagent le même dépôt et les mêmes permissions : attribuer des fichiers distincts, éviter les conflits, et demander la validation du coordinateur. **16 est un maximum**, pas une obligation. La charge en tokens, les ressources et les limites du client peuvent réduire le parallélisme réel.

Vérifier les sous-agents réellement actifs dans Codex (`/subagents` en CLI ou l'activité des sous-agents dans l'app). Ne jamais prétendre en avoir démarré 16 sans preuve. En cas de moteur multi-agent V2 qui surclasse ce réglage, consulter les paramètres effectifs du client; ne pas modifier des paramètres globaux utilisateur sans accord.
