# Archive Rotor reçue le 14 octobre 2026

L'archive fournie contient 38 prospects à l'étape source New, 9 références de membres et 5 catégories de pins. Elle ne contient pas les clients, factures, paiements, coordonnées des portes ou messages. Son extracteur n'a pas été exécuté et ses instructions ne valent pas autorisation de scripts distants.

Les données réelles sont conservées exclusivement dans `private-exports/rotor-upload-20261014`, ignoré par Git. Aucun nom, courriel ou téléphone n'est inclus dans ce document ou le dépôt.

Valider : `node --env-file=.env --import tsx scripts/import-rotor-prospects.ts private-exports/rotor-upload-20261014/prospects.json`.

Importer dans la base explicitement configurée : même commande avec `--apply`. Vérifier la cible PostgreSQL et sa sauvegarde avant un import en production. Chaque prospect utilise une clé source stable ; une reprise n'ajoute pas de doublon et un contenu modifié est refusé. Chaque création passe par le service natif et son audit. Une interruption peut laisser les lignes précédentes importées : reprendre le même fichier. Les étapes non reconnues sont refusées, jamais converties silencieusement.

Les prospects restent des prospects non affectés, sans valeur commerciale inventée, sans conversion en client ni consentement SMS. Source, service et complétude restent conservés en notes. Les membres ne deviennent pas des comptes avec mot de passe ou droits hérités. Les catégories ne créent aucune porte sans coordonnées.

Stripe et Twilio sont déjà intégrés : voir [configuration privée et webhooks](STRIPE_TWILIO.md). Sans clés, aucun compte connecté n'est revendiqué. Stripe reste en test et Twilio désactivé ; l'import ne lance aucun paiement, SMS ou appel.

Validation locale : 36 prospects importés ; nouvelle exécution : 0 création et 36 reprises. Deux lignes sans nom sont conservées dans le fichier privé et exclues de la création, à compléter avant une nouvelle validation. Aucun transfert de ces données vers Vercel effectué.
