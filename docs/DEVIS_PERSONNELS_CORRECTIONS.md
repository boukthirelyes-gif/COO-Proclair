# Corriger un devis personnel

Dans **Mes ventes**, un devis brouillon propose **Corriger mon brouillon**. Le formulaire reprend les services, quantités, prix, taxes et date de validité enregistrés. **Enregistrer les corrections** recalcule les montants côté serveur et conserve le client et le prospect d'origine. Aucun lien client ni facture n'est créé par cette correction.

Le prospect reste verrouillé dans le formulaire. Chaque enregistrement vérifie le droit `sales.write`, la lecture des prospects, le propriétaire du devis et le propriétaire actuel du prospect. Ne pas contacter et Never Knock interdisent cette action commerciale. Une réattribution ne donne pas implicitement au nouveau vendeur la propriété du devis existant.

Seuls les brouillons peuvent être corrigés. Les versions bloquent les modifications concurrentes et une émission simultanée ; en cas de conflit, fermer le formulaire, actualiser les ventes puis rouvrir le brouillon. Les devis émis, acceptés, refusés ou annulés restent immuables dans ce parcours. L'émission demeure une action séparée.

Les corrections sont enregistrées dans le journal avec les lignes et montants avant et après. La clé de création initiale conserve sa fonction de déduplication et ne crée pas de second client lors d'une reprise. Aucun paiement, rendez-vous ou message ne découle de l'édition.

Cette mise à jour ne nécessite ni migration ni nouvelle variable d'environnement.
