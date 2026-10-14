# OMEGA V1000 — déploiement

## Code préparé — 2026-10-14

Ce lot enrichit OMEGA sans migration, nouvelle dépendance ou variable d’environnement. Conserver les variables privées et la base existantes. Compilation de production réussie et API protégées sans cache public.

La consigne actuelle est de préparer les améliorations avant la prochaine mise en ligne. Un envoi GitHub ne prouve pas que Vercel ou Render a déployé ce code. Aucun fournisseur réel activé par ces modifications ; la préparation d’un plan et son approbation humaine restent distinctes.

GitHub contient le code, jamais les données de production. Base main observée avant les travaux : `f99eb5a`. Un push GitHub ne prouve pas qu'une nouvelle version est servie.

Render gratuit est préparé par `render.yaml` : Node 24, migrations lors de compilation, écoute sur le port fourni et `/api/health`. Lire `deploy-render.md` avant la bascule : sauvegarde PostgreSQL, migrations additives compatibles et conservation du secret de session.

Variables indispensables : DATABASE_URL, DIRECT_DATABASE_URL, PROCLAIR_ADMIN_PASSWORD, PROCLAIR_SESSION_SECRET, PROCLAIR_PUBLIC_ORIGIN, CRON_SECRET. Fournisseurs facultatifs : STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER. Configuration privée exclusivement serveur.

État : BLOCKED pour la mise en ligne réelle tant que le compte Render et la base existante ne sont pas accessibles/configurés. Aucun nouveau lien de production n'est inventé. L'état READY de Vercel mentionné dans la directive doit être revérifié ; le quota n'a pas de délai confirmé ici.

Après déploiement : santé PostgreSQL, connexion, utilisateurs, dossier client, carte vendeur, devis/signature, finance et OMEGA ; puis URL OAuth et webhooks signés. Conserver les envois et paiements réels désactivés jusqu'à validation explicite. Le plan gratuit met en veille le service et ne garantit pas des crons/communications continus.

## Tranche V1000

Les modules SMS et Rotorlive récupérés, le thème sombre et les nouveaux centres Stripe/Twilio sont intégrés au code de travail. Suite serveur : 93 tests réussis et TypeScript réussi. Compilation réussie ; 11 groupes navigateur Superhub et 11 groupes de régression fournisseurs réussis. La publication Git et le déploiement restent à consigner après leur vérification réelle.

Deux migrations additives Rotor SMS sont incluses : 20261013200000_rotor_sms_inbox et 20261013203000_rotor_sms_sync. Elles ont été appliquées à la base locale de test ; aucune migration distante de production n’a été exécutée. Le cron Rotor SMS récupéré est opt-in, limité aux 100 messages récents, et n’est pas provisionné sur Render gratuit. Configurer un ordonnanceur autorisé ou utiliser l’import manuel.

Commit applicatif de ce lot : `81bbee8`, après les trois fusions de récupération. La réponse de livraison précise la référence distante publiée ; vérifier `git ls-remote origin refs/heads/main` avant reprise. La dernière inspection des secrets couvre 659 blobs Git sans détection.

Second lot : migration additive `20261014020000_communication_followups`. Appliquée à la base locale de test navigateur ; aucune opération sur la base distante. Prévoir une sauvegarde avant le build Render, qui applique les migrations. Les suivis approuvés restent à traiter manuellement et n’activent pas Twilio.

Validation finale du second lot : compilation réussie, 94 tests serveur, 13 groupes navigateur Superhub (plus 11 groupes de régression fournisseurs du premier lot), zéro erreur JavaScript. Migrations appliquées aux bases locales principale et navigateur ; trois contrôles de santé PostgreSQL locaux HTTP 200 après redémarrage. Index additifs `20261014021000_communication_activity_indexes`, export métier des suivis et du miroir SMS inclus. Aucun site de production ni connexion externe n’est annoncé vérifié.

Migration additive `20261014022000_technician_versions` : appliquée aux bases locales principale, navigateur et serveur de test. Les plans récents enregistrent la version du technicien ; une modification invalide leur application. Les anciens plans restent soumis aux validations existantes et expirent normalement. Aucun rendez-vous existant déplacé par le paramétrage.
