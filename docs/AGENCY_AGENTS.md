# The Agency x COO-Proclair — catalogue complet

**267 profils** issus du depot libre
[msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents),
version epinglee `652b2692f8d8ec2b1f1a38e559073e287dfdc469`, licence MIT
(`docs/licenses/AGENCY-AGENTS-MIT.txt`).

Le depot contient les **267 agents originaux** convertis en TOML natif pour Codex,
avec la personnalite et les instructions originales conservees, ainsi qu'un
preambule de garde-fous Proclair. Il comprend 18 divisions d'agents (les documents de strategie sont des guides, pas des profils).

## Acces et usage

Raccourci : `$proclair-agency`. Guide : `CODEX_START_HERE.md`.

Dans Codex, ouvrir le projet `COO-Proclair` en tant que projet de confiance.
Avec un Codex prenant en charge les agents personnalises du projet, les fichiers
`.codex/agents/*.toml` sont accessibles comme roles de sous-agents.
Demander explicitement par exemple :

> Utilise agency_engineering_backend_architect, agency_testing_test_automation_engineer
> et agency_security_appsec_engineer pour diagnostiquer les problemes de connexion.
> Fais des corrections minimales apres reproduction et montre les tests. Ne touche
> ni a Production, ni aux paiements reels, ni aux messages de clients.

Le nombre de **267 agents disponibles** n'est **pas** un nombre de processus
automatiquement actifs. Codex orchestre le travail selon les outils,
permissions, limites et parametres du client. Ici, le plafond V2 configure est de 267
sous-agents actifs au maximum, plus le coordinateur (268 places). Il ne s'agit pas de l'orchestrateur OMEGA dans l'application.

## Provenance et verification

- Liste et SHA256 des fichiers sources : `.codex/agency-manifest.json`
- Code reproductible du convertisseur : `scripts/vendor-agency-agents.py`
- Verification : `python3 scripts/check-agency-agents.py`
- Amont : commit `652b2692f8d8ec2b1f1a38e559073e287dfdc469`
- Cette integration ne change aucune route du CRM, DB, stripe, Twilio ou Vercel Production.

La PR de configuration doit passer les tests avant fusion. Pour actualiser le catalogue
plus tard, mettre a jour le commit epingle et le nombre attendu **apres revue du diff**
et regenerer les profils a partir d'un checkout propre.

## Mode 267 agents actifs simultanément

Lancer la skill `$proclair-all-agents` explicitement, dans une **nouvelle session** Codex ouverte sur cette branche. Avec Multi-Agent V2, `[features.multi_agent_v2] max_concurrent_threads_per_session = 268` **inclut** un coordinateur et 267 sous-agents. Il ne s'agit pas d'une garantie de capacité ou de financement. La concurrence réellement observée peut être plus basse; l'agent principal doit en rendre compte sans inventer d'activité.

Chaque expert reçoit une question indépendante et bornée sur le CRM. La première phase doit être un audit en lecture seule, sans interaction client ni édition simultanée des mêmes fichiers. Ce mode peut coûter très cher en jetons et épuiser rapidement les quotas : aucun programme de CI ne l'exécute automatiquement.
