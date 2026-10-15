# Horaires entreprise

La fiche Entreprise permet de configurer sept jours avec ouverture, fermeture et jours fermés. Aucune plage n’est supposée pour les anciennes fiches ; le bouton Configurer prépare une semaine fermée à renseigner. Les heures sont locales America/Toronto et doivent se suivre dans la même journée. Les plages traversant minuit ne sont pas prises en charge.

La migration additive 20261015010000_business_hours ajoute un champ JSON nullable et conserve les fiches existantes. La sauvegarde utilise le contrôle de version et l’audit existants, reste réservée aux administrateurs et préserve les horaires quand ils sont omis par un ancien client. L’export natif inclut automatiquement le champ. Ces horaires décrivent l’entreprise et ne modifient pas les rendez-vous ni les disponibilités individuelles.

Validation : compilation production, 136 tests serveur sans échec ni test ignoré, et test navigateur dédié de sauvegarde/rechargement, validation refusée sans écriture, conflit de version, fermeture d’un jour et largeur mobile. Bases de tests isolées ; aucune migration de la base clients de production exécutée depuis cet environnement.

Aucune variable supplémentaire requise. Le déploiement exécute la migration via le mécanisme existant. La publication Vercel reste à vérifier séparément du push GitHub.
