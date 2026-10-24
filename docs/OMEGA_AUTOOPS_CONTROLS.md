# OMEGA AutoOps — contrôle opérationnel

Cette livraison ajoute deux mécanismes d'alerte internes au CRM existant, sans action externe.

- **Visites à moins de 48 h sans technicien** : prioritaires dans le cockpit OMEGA, contrat actif et statut SCHEDULED ou CONFIRMED. La nouvelle règle du superviseur permet de créer des missions internes dédupliquées après activation administrateur, avec validation de fraîcheur au moment de l'approbation.
- **SMS Rotor potentiellement sans réponse depuis une heure** : derniers SMS entrants par numéro, uniquement dans le miroir local (potentiellement incomplet ou ancien). Une réponse sortante plus récente retire le signal. Le contenu des SMS ne figure pas dans le résumé.

Les anciens scénarios, protections de rôles et validations manuelles sont conservés. Le superviseur est toujours désactivé par défaut : activation administrateur et Cron Vercel vérifié requis. L'automatisation ne déplace pas les rendez-vous, ne répond pas aux clients, n'effectue pas de prélèvements et ne modifie pas les commissions.

**Limitation importante :** la connexion Rotor de ChatGPT n'active pas l'OAuth du CRM sur Vercel. Le miroir SMS n'est pas une preuve d'absence de réponse dans la boîte Rotor en temps réel. Vérifier le message sortant le plus récent dans Rotor avant toute relance.
