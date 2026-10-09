# CRM Proclair

Première version locale du CRM : clients et prospects, recherche, notes, tâches et assistant commercial à règles. L’assistant résume les dossiers, signale les tâches en retard, prépare un brouillon de relance et crée les tâches de suivi à la demande sans dupliquer les tâches ouvertes. Il n’utilise pas de modèle IA et n’envoie aucun message.

## Démarrage

Python 3.12 ou supérieur, sans dépendance à installer :

```sh
cd /workspace/COO-Proclair
python3 app.py
```

Le serveur écoute par défaut sur `127.0.0.1:8000`. Les données SQLite sont conservées dans `.local/crm.sqlite3`, ignoré par Git. Variables facultatives : `PROCLAIR_PORT`, `PROCLAIR_HOST`, `PROCLAIR_DATA_DIR`.

## Validation

```sh
python3 -m unittest discover -s tests -v
```

Cette version est destinée au développement local. L’authentification, les droits d’accès, le déploiement partagé et la connexion à un modèle IA restent à ajouter avant un usage en production.
