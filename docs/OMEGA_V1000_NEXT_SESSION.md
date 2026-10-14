# OMEGA V1000 — point de reprise au 14 octobre 2026

Dernier lot : correctif de connexion Vercel/proxy HTTPS et intégration agenda iCalendar. 111 tests serveur, trois tests agenda ciblés repassés, compilation finale et 34 groupes navigateur réussis. Consulter ACCESS_AND_CALENDAR.md. La connexion distante reste non vérifiée (proxy de sortie CONNECT 403) ; ne pas annoncer l’accès utilisateur rétabli sans preuve. Ne pas changer le secret de session pour résoudre un problème de mot de passe. L’URL de déploiement fournie par l’utilisateur est immuable ; la mise à jour doit être déployée puis ouverte sur le domaine principal.

Le CRM existant est conservé. Dernier lot : cockpit des priorités respectant les permissions, briefing de l’assistant et analyse de capacité quotidienne en lecture seule. 104 tests serveur, dix groupes navigateur OMEGA, TypeScript, compilation et trois tests Python réussis. Aucun modèle de langage ou routage routier connecté ; aucun contact ou paiement réel pendant les tests.

1. Inspecter Git et lire les rapports avant de modifier le code ; préserver les branches récupérées et les migrations appliquées.
2. Continuer le développement sans demander une mise en ligne : l’utilisateur a demandé de préparer le CRM pour demain.
3. Prochain lot : attributions persistantes des conversations avec droits par propriétaire, puis disponibilités individuelles et horaires configurables. Conserver les blocages STOP, les versions concurrentes et les permissions côté serveur.
4. Faire évoluer les scénarios de capacité vers les durées réelles et déplacements, en distinguant une simulation d’un plan réservé. Le bouton actuel ne reporte que la date au planificateur.
5. Après chaque modification, exécuter les tests adaptés. Les tests navigateur utilisent proclair_browser_test, distinct de la base principale ; redémarrer le serveur après chaque compilation finale.
6. Quand la mise en ligne redevient possible, réutiliser base et secret de session existants, vérifier les migrations puis la santé PostgreSQL distante. Ne pas assimiler un push GitHub à un déploiement.

Les suivis persistants, filtres SMS/appels/appels manqués, équipe configurable et marge OMEGA sont déjà livrés. Aucun besoin de les réimplémenter. Les lectures Stripe sont TEST_ONLY ; Rotor nécessite une connexion autorisée réelle. Aucun envoi, appel, portage ou débit pendant le développement.
