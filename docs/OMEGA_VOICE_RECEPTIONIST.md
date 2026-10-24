# OMEGA — Réceptionniste téléphonique (V1, OFF par défaut)

Cette livraison ajoute au **CRM existant**, sans changement de l'agenda, de la base ou de la production, un premier standard vocal Twilio. Ce n'est **pas** encore un agent conversationnel IA. Le menu accepte la voix transcrite par Twilio en français canadien et les touches DTMF, puis répond de façon déterministe ou transfère à l'humain.

## Fonctionnement
- Annonce explicitement que l'accueil est automatisé.
- Réponses vocales basiques : demande d'estimation, rendez-vous ou report, facturation, préparation au lavage.
- Transfert vers le numéro de l'équipe sur zéro, demande humaine, plainte, urgence, reconnaissance inconnue ou silence.
- **Aucune** réservation, annulation, promesse de créneau, calcul de prix, paiement, message automatique ou appel sortant.
- **Aucun** enregistrement audio ni conservation de transcription dans le CRM. Twilio peut facturer les appels, le transfert, la synthèse et la reconnaissance vocale ; vérifier les tarifs.
- Les appels entrants gardent la journalisation existante. Aucun nouveau lead ni tâche n'est généré automatiquement.

## Activation exclusivement après tests
1. Garder \`TWILIO_RECEPTIONIST_ENABLED=false\` dans tous les environnements, production incluse.
2. Dans une Preview **isolée** (base, domaine, Twilio et numéro de test), configurer les secrets existants \`TWILIO_ACCOUNT_SID\`, \`TWILIO_AUTH_TOKEN\`, \`TWILIO_PHONE_NUMBER\`, \`PROCLAIR_PUBLIC_ORIGIN\` et \`TWILIO_FORWARD_TO\` par variables privées. Ne jamais coller de secret dans une conversation ou le Git.
3. Configurer le webhook Twilio Voice sur \`POST https://ORIGINE/api/webhooks/twilio/voice\` ; le callback Gather est \`/api/webhooks/twilio/voice-input\` ; toutes les requêtes sont signées et vérifiées.
4. Activer \`TWILIO_VOICE_ENABLED=true\` puis \`TWILIO_RECEPTIONIST_ENABLED=true\` **uniquement dans la Preview** et tester appels réels depuis un numéro personnel vers un numéro de test : menu, voix, zéro, indisponibilité de l'équipe, signatures invalides, facture, report.
5. Vérifier les tests serveur, CI et les callbacks ; examiner le comportement de \`fr-CA\` chez Twilio selon le compte avant usage réel.
6. Seulement après approbation explicite, décider des heures de transfert, de la couverture anglaise, du portage/routage du numéro actuel et d'un plan de secours. Ne jamais pointer le numéro client actuel vers une Preview.

## Déploiement futur de l'IA
Pour une réceptionniste IA conversationnelle, il faudra le vrai routage du numéro, le fournisseur de voix/modèle, des règles de consentement et de confidentialité, la disponibilité réelle et les règles de transfert, plus des tests d'appels et d'escalade. Aucun branchement de modèle ou d'envoi automatique n'est ajouté par ce premier lot.

## Retour arrière
Remettre \`TWILIO_RECEPTIONIST_ENABLED=false\` restaure le transfert vocal historique si le transfert Twilio est activé. Aucun changement automatique n'est apporté au numéro ou au routage Twilio externe.
