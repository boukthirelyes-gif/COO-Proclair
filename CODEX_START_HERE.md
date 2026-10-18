# Démarrer les 267 agents avec Codex

Dans Codex, ouvre `boukthirelyes-gif/COO-Proclair` sur la branche **`feat/codex-agency-agents-proclair`** (PR #36, non fusionnée). Démarre une **nouvelle tâche**.

Colle :

```text
$proclair-agency Vérifie les 267 profils, utilise backend, sécurité et tests pour diagnostiquer le CRM Proclair en lecture seule. Indique les noms des sous-agents vraiment lancés, et leurs preuves. Ne touche pas à Production.
```

Si le skill n'apparaît pas, dis : « Lis `.agents/skills/proclair-agency/SKILL.md` et suis ses instructions. Dis-moi si mon client Codex peut réellement lancer les rôles personnalisés. »

Sur Codex CLI ou VS Code : `git fetch origin feat/codex-agency-agents-proclair && git switch --track origin/feat/codex-agency-agents-proclair`, puis `python3 scripts/check-agency-agents.py` et `codex`. Si la branche existe déjà, `git switch feat/codex-agency-agents-proclair && git pull --ff-only`. Les commandes `/skills` et `/subagents` permettent de voir le skill et les agents actifs.

Les 267 TOML sont des *rôles*, pas des processus toujours actifs. Certains clients Codex ne permettent pas encore de choisir un rôle par nom : le skill offre un mode dégradé explicite. Aucune modification du CRM en production.

## Travail simultané façon Agent Teams

Le fichier `.codex/config.toml` configure un plafond de **16 sous-agents en parallèle** (le coordinateur n'est pas compté). Redémarrer ou rouvrir la session Codex pour charger le nouveau réglage.

Dans une nouvelle tâche Codex, écris :

```text
$proclair-agency Active le mode équipe multi-agents pour COO-Proclair. Découpe le travail en tâches indépendantes et mobilise jusqu'à 16 spécialistes en parallèle, avec un coordinateur principal. Commence par un plan d'attribution des fichiers, répartis backend, frontend, OMEGA, Stripe, Twilio, données, carte, UX, sécurité, tests et CI si nécessaire. Vérifie les résultats et rapporte le nombre d'agents réellement actifs. Aucun paiement, message client, migration ni déploiement Production sans autorisation explicite.
```

Le nombre de 16 est un *maximum de configuration*, non une promesse de 16 exécutions effectives; certains clients Codex (dont un mode multi-agent V2 ou une gestion à distance) peuvent appliquer leurs propres limites. Plus d'agents augmente la consommation de tokens et peut aggraver les conflits si plusieurs modifient les mêmes fichiers.

## Utiliser tous les 267 simultanément

Après avoir sélectionné la branche `feat/codex-agency-agents-proclair` et démarré une nouvelle session Codex, demander :

```text
$proclair-all-agents Lance un audit simultané de COO-Proclair avec les 267 spécialistes The Agency, chacun sur une mission indépendante et en lecture seule. Le coordinateur doit vérifier le nombre vraiment lancé (objectif 267 sous-agents actifs à la fois), les refus de quotas et les résultats. Aucun message client, paiement réel, import, migration ou déploiement.
```

La valeur `268` dans la configuration V2 compte **l'agent principal**; il reste **267** places pour les spécialistes. Ce plafond n'est pas une promesse que Codex ou ton forfait peut réellement les faire travailler tous en même temps. Sans capacité effective, donner la limite observée.
