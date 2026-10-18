---
name: proclair-all-agents
description: À utiliser uniquement quand le propriétaire demande explicitement de faire travailler simultanément les 267 profils The Agency dans COO-Proclair. Protocole intensif d'audit en lecture seule.
---

# Proclair ALL 267 — exécution réellement simultanée, si possible

Ce protocole **demande** de lancer **267 vrais sous-agents spécialisés en parallèle**, en plus de l'agent coordinateur. Le réglage du projet autorise un total V2 de **268** threads, mais la capacité effective et les quotas peuvent être plus faibles.

## Avant toute création
1. Vérifier l'accès au projet, `AGENTS.md`, les permissions et le manifeste `.codex/agency-manifest.json` avec précisément 267 noms uniques. Ne pas confondre disponibilité d'un rôle et lancement effectif.
2. Respecter les limites et autorisations du client, et avertir que la demande peut consommer énormément de ressources et de jetons. Ne pas acheter de capacité supplémentaire ni contourner de quotas sans accord.
3. Cette invocation est l'**opt-in** du propriétaire pour essayer l'équipe complète. Si la fonctionnalité sous-agents n'est pas exposée, signaler le blocage, ne pas prétendre à un lancement.

## Répartition et lancement
4. Parcourir le manifeste et associer à **chaque profil une mission indépendante** : auditer en lecture seule COO-Proclair depuis sa spécialité, vérifier jusqu'à trois risques/améliorations avec preuves (fichier/ligne ou reproduction), ou indiquer « hors domaine » si non pertinent. Pas d'hallucinations et pas de partage de données clients sensibles.
5. Tenter de créer réellement un sous-agent par profil, **avant d'attendre** les rapports des précédents. Chaque rôle n'est lancé qu'une fois. Tenir un compteur des demandes acceptées et des agents réellement actifs. Plusieurs tours peuvent être requis pour soumettre les créations; mesurer le **pic de concurrence**, ne pas compter des travaux séquentiels comme 267 simultanés.
6. **Interdire aux sous-agents de créer d'autres agents.** Ne modifier aucun code, ne créer aucun déploiement, aucune migration ni aucun paiement. Ne pas faire travailler plusieurs agents sur les mêmes fichiers.
7. Le coordinateur reçoit et déduplique les observations et classe les problèmes. Toute phase d'implémentation est organisée séparément, avec propriété exclusive des fichiers et nouvelles autorisations au besoin.

## Compte rendu obligatoire
Indiquer : objectif 267, réellement lancés, **pic d'agents actifs simultanés observé**, terminés, refusés, raisons exactes, consommation si observable, et améliorations prioritaires. Ne jamais affirmer que 267 sont simultanément actifs simplement parce que la configuration annonce 268 slots.

La simple présence du skill ne démarre pas 267 agents. Un utilisateur doit le déclencher dans un client Codex capable de faire de la délégation.
