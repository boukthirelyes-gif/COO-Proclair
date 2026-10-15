# Vérifications des PR fusionnées

Une PR fusionnée reste dans la liste Closed, même si des vérifications de son ancien commit ont échoué. Une croix historique ne décrit pas à elle seule le commit actuel de main. Il faut consulter chaque nom de vérification, son journal et le SHA associé. Une construction locale réussie ne valide pas les contrôles GitHub ni un déploiement Vercel.

## Défauts reproduits et corrigés

- Dix-neuf commandes navigateur exigeaient un fichier .env privé, absent d’un checkout GitHub. Elles utilisent maintenant --env-file-if-exists=.env : les variables locales restent prises en charge et les variables injectées en CI fonctionnent sans fichier. Aucune variable requise par les tests n’est inventée ni aucun contrôle désactivé.
- Le test Superhub accédait à OMEGA sans ouvrir son onglet Opérations puis attendait une vue cachée. Il ouvre maintenant cet onglet avant de réviser et d’approuver un suivi. Les assertions de sécurité, d’absence d’envoi et de non-écriture financière restent présentes.
- En cas d’échec navigateur, le workflow conserve les journaux des deux serveurs de tests pendant sept jours pour faciliter le diagnostic.

## Prévention recommandée sur GitHub

Dans Settings → Rules → Rulesets, protéger main et exiger une pull request ainsi que les vérifications validate et superhub-browser avant fusion. Vérifier les noms réellement proposés par GitHub ; les contrôles de déploiement Vercel sont distincts. Limiter les exceptions permettant de contourner ces règles. Aucun réglage du dépôt distant n’a été modifié depuis cet environnement.

## Limites de l’audit

L’API GitHub refuse ici la lecture des résultats détaillés (Forbidden). Ce rapport ne prétend pas attribuer tous les échecs historiques des PR à ces deux défauts. Les résultats locaux concernent le code courant, pas un rerun des anciens commits sur GitHub. Les contrôles Vercel, la facturation GitHub et les paramètres d’accès nécessitent leurs journaux propres.

## Validation locale du correctif

- 136 tests serveur : réussis, aucun ignoré.
- 3 tests Python et vérification de la matrice : réussis.
- Les 17 suites navigateur du workflow : réussies dans une copie des fichiers suivis sans .env, avec variables injectées, dépendances locales installées et serveurs de test locaux. Le scénario d’hôte de prévisualisation est inclus.
- Contrôle des secrets et des différences : réussis.

Ces résultats ne sont pas une confirmation d’un workflow exécuté sur les runners GitHub ; vérifier Actions sur le nouveau commit après le push. Aucun test en échec n’a été supprimé ou ignoré.
