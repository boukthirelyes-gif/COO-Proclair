# OMEGA — Classement et brouillons SMS Rotor

Cette livraison développe la **réponse assistée**, sans émission de SMS.

Dans Intégrations → Boîte SMS Rotor, pour les conversations dont le dernier SMS importé est entrant :
- classement déterministe des demandes (prix, rendez-vous, report, annulation, facture, questions de lavage, réclamation, urgence, désabonnement)
- priorité et raison présentées à l'opérateur
- réponse en français prête à copier puis ajuster dans le canal Rotor
- désabonnement et urgence : aucune réponse automatique suggérée
- vérification humaine requise dans tous les cas

L'IA générative n'est pas activée : les suggestions sont des modèles prudents sans accès au contrat, aux montants, à l'horaire ni à la dernière réponse chez Rotor. Le texte d'un SMS est une donnée non fiable et n'autorise pas d'action. Les brouillons ne promettent aucune prestation, prix, paiement ou confirmation de réservation.

## Limites
- Fonctionne sur le miroir des SMS déjà importés depuis Rotor (les 500 messages les plus récents, 20 conversations max), pas sur la boîte réelle en temps réel.
- Aucun envoi, aucune modification des messages Rotor, aucune création de rendez-vous et aucun rappel automatique.
- Le compte connecté à ChatGPT ne confère pas automatiquement les droits OAuth au CRM sur Vercel.
- Avant d'envoyer en automatique depuis le **numéro Proclair actuel**, il faut une API d'envoi Rotor/Surge autorisée ou le portage/routage testé du numéro vers Twilio ; ne pas remplacer le routage sans tests.
- La future livraison pourra activer des réponses transactionnelles opt-in via Twilio, contrôles STOP, idempotence, modèle IA et escalade, sur un environnement de test puis après approbation.
