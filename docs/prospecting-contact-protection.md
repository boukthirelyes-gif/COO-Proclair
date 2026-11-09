# Restrictions de prospection et filtres OMEGA

## Identité d’une porte

La migration `20261109010000_prospect_contact_identity` ajoute une clé d’adresse calculée par PostgreSQL et un index Hash PostgreSQL. Elle normalise Unicode (NFKC), casse et espaces, en conservant ponctuation et numéros d’unité. Les coordonnées seules ne définissent pas une porte : deux appartements aux mêmes coordonnées restent distincts.

L’index Hash est choisi pour les recherches d’égalité : contrairement à un index B-tree sur le texte complet, il accepte aussi les adresses UTF-8 longues permises par le formulaire. PostgreSQL vérifie toujours l’égalité du texte après un accès par hash.

Cette clé ne constitue pas un géocodage. Les variantes postales (« rue » / « r. »), les adresses incomplètes et les libellés différents d’une même propriété nécessitent encore une revue. Fournir une adresse complète avec unité et localité. Une collision ambiguë doit être examinée par un administrateur.

## Comportement

Une restriction `DO_NOT_CONTACT`, ou une catégorie Never Knock, s’applique aux opérations protégées à cette même adresse dans l’entreprise. Un autre vendeur ne peut pas la contourner en créant ou déplaçant un pin actif. Le refus ne révèle ni le propriétaire, ni l’identifiant, ni les notes du pin à l’origine de la restriction.

Un pin restreint ne peut pas être déplacé ou renommé pour déplacer silencieusement sa restriction. L’administrateur doit d’abord lever celle-ci à son adresse actuelle, avec la note justificative déjà exigée et auditée. Il peut ensuite modifier le pin.

Les anciens doublons restent conservés avec leur historique ; aucun nettoyage ou changement de propriétaire automatique n’est effectué. Les prospects liés à ces doublons doivent afficher une restriction effective et les parcours commerciaux contrôlés la respecter. Les prospects manuels sans lien de pin ne sont pas automatiquement rapprochés à une adresse : ce lot ne certifie pas un moteur universel de suppression de tous les contacts.

Les recherches de restriction utilisent le client Prisma du tenant et des lectures regroupées par clés ; aucun SQL brut ne lit une table sans qualification de tenant. La normalisation SQL de l’entrée n’a aucune référence à une table.

## Migration et déploiement

Tester d’abord sur une base isolée. La colonne générée recalcule les adresses existantes et l’index doit être construit ; prévoir la durée et le verrou PostgreSQL selon la volumétrie. Aucun statut, contrat, paiement ou historique n’est supprimé par cette migration.

Appliquer les migrations via le mécanisme existant pour chaque schéma concerné avant de servir la nouvelle version. Cela inclut les schémas tenant existants, pas seulement `public`. Ne pas appliquer aux bases de production dans cette mission. Le contrôle `/api/health` exige désormais la colonne générée dans le schéma applicatif et renvoie `schema_incomplete` si elle manque.

Une réponse `CONFLICT` due à une transaction sérialisable doit conduire à actualiser puis réessayer ; aucun refus de contact ne doit être transformé en nouvelle création automatique.

## OMEGA : confirmations datées

L’assistant distingue visites à confirmer/replanifier et visites confirmées ou planifiées. Les périodes prises en charge sont aujourd’hui, demain et cette semaine (lundi à dimanche), calculées à Toronto avec bornes de début inclusif / fin exclusive, y compris lors des changements d’heure.

Les recherches datées utilisent `startsAt` et excluent explicitement les visites sans date. Les périodes/heures non prises en charge et les demandes de statuts contradictoires demandent une clarification sans requête de visites. Ce moteur est déterministe et borné ; il ne représente pas une compréhension universelle du langage et ne confirme ni ne déplace aucun rendez-vous.
