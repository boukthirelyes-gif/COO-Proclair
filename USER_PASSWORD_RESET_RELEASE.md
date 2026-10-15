# Réinitialisation des mots de passe

Ajout d’une action dédiée dans Utilisateurs et accès. L’administrateur saisit deux fois un nouveau mot de passe de 12 à 256 caractères. Le formulaire refuse une confirmation différente et rappelle la déconnexion des sessions et la transmission privée du mot de passe. Annuler efface le formulaire.

Le mécanisme serveur existant reste utilisé : autorisation utilisateurs, contrôle de version, hachage du mot de passe, révocation des sessions et audit sans secret. Rôle, restrictions et état actif sont conservés. Un compte désactivé reste désactivé. Le compte principal admin configuré par l’environnement n’apparaît pas dans cette liste ; son mot de passe reste géré dans les variables de déploiement. Aucun lien de récupération, courriel, mot de passe généré ni invitation automatique n’est ajouté.

Validation : compilation production et navigateur isolé vérifiant confirmation différente sans mutation, révocation d’une session ouverte, refus de l’ancien mot de passe, connexion avec le nouveau, conservation des droits et annulation. Aucun secret ni compte réel n’a été modifié. Aucune migration ni nouvelle variable d’environnement.
