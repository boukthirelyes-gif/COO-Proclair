# Démarrer les 267 agents avec Codex

Dans Codex, ouvre `boukthirelyes-gif/COO-Proclair` sur la branche **`feat/codex-agency-agents-proclair`** (PR #36, non fusionnée). Démarre une **nouvelle tâche**.

Colle :

```text
$proclair-agency Vérifie les 267 profils, utilise backend, sécurité et tests pour diagnostiquer le CRM Proclair en lecture seule. Indique les noms des sous-agents vraiment lancés, et leurs preuves. Ne touche pas à Production.
```

Si le skill n'apparaît pas, dis : « Lis `.agents/skills/proclair-agency/SKILL.md` et suis ses instructions. Dis-moi si mon client Codex peut réellement lancer les rôles personnalisés. »

Sur Codex CLI ou VS Code : `git fetch origin feat/codex-agency-agents-proclair && git switch --track origin/feat/codex-agency-agents-proclair`, puis `python3 scripts/check-agency-agents.py` et `codex`. Si la branche existe déjà, `git switch feat/codex-agency-agents-proclair && git pull --ff-only`. Les commandes `/skills` et `/subagents` permettent de voir le skill et les agents actifs.

Les 267 TOML sont des *rôles*, pas des processus toujours actifs. Certains clients Codex ne permettent pas encore de choisir un rôle par nom : le skill offre un mode dégradé explicite. Aucune modification du CRM en production.
