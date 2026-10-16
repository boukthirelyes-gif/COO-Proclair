# Centre de communications — mise en service contrôlée

## Périmètre livré

Le centre complète les modules Twilio existants. Les conversations SMS et appels sont paginées par numéro ; les brouillons, courriels, appels supervisés, notes et notifications internes sont associés à un client explicite. Le centre est accessible depuis Fournisseurs et le dossier client. Les communications Rotor importées sont conservées séparément.

OMEGA peut préparer des brouillons de rappel, confirmation, retard, disponibilité, suivi après service, facture et contrat. Il ne peut ni approuver ni envoyer. Les brouillons liés à une visite/document conservent une empreinte : une modification interdit leur envoi et exige une nouvelle préparation. L'échéance est choisie à la préparation ; le rappel de la veille doit être préparé pour la veille du rendez-vous. Aucun ordonnanceur d'envoi autonome n'est activé.

## Envoi et preuves

Les SMS utilisent le transport Twilio existant. Consentement et STOP sont contrôlés sous verrou ; un numéro partagé par plusieurs clients bloque l'envoi. Tous les envois sortants respectent 09:00–19:00 America/Toronto, le mode ne pas déranger et trois tentatives maximum par canal/client sur 24 heures. Les SMS directs partagent une limite par numéro.

Le centre exige une preuve Twilio récente : compte actif et numéro réellement présent dans ce compte. Cette preuve expire après une heure ou un changement de configuration. La preuve du domaine courriel est relue chez Resend et doit correspondre exactement au domaine de EMAIL_FROM. Les états affichés distinguent configuration, autorisation et vérification ; une erreur ne vaut pas connexion réussie.

Les variables EMAIL_SEND_ENABLED, TWILIO_SEND_ENABLED et TWILIO_OUTBOUND_ENABLED restent false par défaut. Les brouillons nécessitent une approbation humaine et une échéance atteinte. Le transport réserve une seule tentative concurrente. Une panne ambiguë passe en UNKNOWN_REVIEW_REQUIRED : vérifier le fournisseur avant de préparer une autre opération. Aucune reprise automatique risquant un doublon.

## Courriels

Configurer RESEND_API_KEY, RESEND_DOMAIN_ID, EMAIL_FROM, un EMAIL_UNSUBSCRIBE_SECRET distinct d'au moins 32 caractères et RESEND_WEBHOOK_SECRET. Vérifier DNS SPF/DKIM et DMARC dans le fournisseur ; le CRM relit le statut de domaine, sans créer ou modifier les DNS.

Webhook signé Svix/Resend : `/api/webhooks/email`. Événements gérés : email.sent, email.delivered, email.delivery_delayed, email.bounced, email.failed, email.complained, email.suppressed. Signatures, horodatages, identité de courriel et doublons sont contrôlés. Un événement avant association du fournisseur reçoit une réponse réessayable. Les événements anciens ne remplacent pas un état terminal plus fort.

Le message comporte un lien privé de désabonnement avec confirmation POST. Le personnel ne peut lever un désabonnement. Les plaintes/suppressions fournisseur désabonnent aussi. Un contrat émis est joint en PDF depuis son archive ; une facture émise LIVE est jointe en HTML imprimable. Aucun lien public vers les données du CRM n'est créé. Les adresses sont relues avant envoi.

## Appels et numéro Rotor

L'appel sortant appelle d'abord TWILIO_AGENT_PHONE, puis relie le client via TwiML. Il ne s'agit pas d'un téléphone WebRTC dans le navigateur. Configurer un agent distinct du client et du numéro Twilio. Le transfert entrant existant utilise TWILIO_FORWARD_TO et TWILIO_VOICE_ENABLED. Aucun enregistrement ni transcription automatique.

Le numéro actuellement dans Rotor n'est pas considéré comme propriété du compte Twilio. La présence dans Twilio vérifie uniquement le compte configuré, jamais une portabilité Rotor. Avant tout transfert, obtenir la preuve de propriété et l'autorisation du titulaire, la facture opérateur et le dossier de portage, vérifier les capacités voix/SMS et les exigences réglementaires avec les deux fournisseurs, organiser la continuité/routage, l'échéance et un retour arrière. Aucun portage ni changement chez Rotor n'est exécuté par ce module.

## Limites de validation

Les transports de tests sont simulés. Aucun SMS, appel ou courriel réel n'est envoyé. Une recette fournisseur avec destinataires autorisés, réception des webhooks hébergés et vérification de la délivrabilité reste requise avant mise en service. Les anciens SMS sont liés par correspondance unique du téléphone dans la boîte ; les envois du centre et leurs notes conservent le customerId. Les notifications internes figurent dans l'historique du centre ; elles ne constituent pas des notifications push système.
