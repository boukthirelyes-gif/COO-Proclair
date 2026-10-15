# Fiche Entreprise complémentaire

Ajout du site Web, du nom interne et d’une description courte avec compteur de 160 caractères. Les champs sont persistés, auditables, exportés par l’export natif et modifiables uniquement par un administrateur. Le formulaire permet de les effacer ; un ancien client qui les omet conserve leurs valeurs.

La migration additive 20261015020000_business_details conserve les fiches existantes avec trois colonnes nullables. Les adresses du site Web doivent utiliser HTTP(S) sans identifiants intégrés ; aucun appel réseau n’est lancé vers ces adresses. Le nom interne et la description sont conservés dans la fiche ; ce lot n’ajoute ni sélecteur multi-entreprises, ni métadonnées publiques, ni sous-domaine du portail.

Validation : compilation production, tests ciblés de sauvegarde/validation et de conservation des documents émis, navigateur avec rechargement et effacement des nouveaux champs, contrôle des secrets. Les bases utilisées sont isolées des données clients. Aucune nouvelle variable d’environnement requise ; la migration est incluse dans le processus de déploiement existant.
