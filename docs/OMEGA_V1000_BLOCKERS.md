# OMEGA V1000 — blocages

| Sujet | État | Prérequis / solution |
| --- | --- | --- |
| Déploiement Render | BLOCKED | Accès au compte et variables privées ; la directive rapporte DATABASE_URL absente, état distant non vérifié ici |
| Vercel | BLOCKED | Message exact du quota et accès aux diagnostics ; aucun délai de réinitialisation confirmé |
| Stripe réel | BLOCKED | Clés privées absentes ici ; code actuel limité au mode test et sans écriture comptable |
| Twilio réel | BLOCKED | Identifiants, numéro et origine publique absents ici ; envoi/Voice désactivés par défaut |
| Rotor/Surge | BLOCKED | OAuth et découverte des capacités réellement autorisées ; pas de preuve d'accès réel dans cet audit |
| Numéro professionnel dans Rotor | BLOCKED | Identifier le fournisseur et le titulaire ; ne pas porter ou rerouter le numéro pendant le développement |
| Appels navigateur/enregistrement | BLOCKED | Infrastructure Voice et autorisations de conservation/consentement |
| Dépendances majeures | TODO | Évaluer séparément Prisma, TypeScript 7 et Zod 4 ; ne pas fusionner automatiquement les branches Dependabot |

Audit local : seules les présences/absences des variables sont examinées. Aucune valeur de clé, URL de base ou jeton ne doit apparaître dans ces documents. Conserver le secret de session existant pour préserver le chiffrement des jetons Rotor.

## Validations encore en cours

Compilation finale et dix groupes navigateur : TESTING. Les 93 tests serveur et TypeScript ont réussi. Les lectures Stripe restent TEST_ONLY ; elles ne prouvent ni activation Live ni encaissement comptable. Les brouillons OMEGA n'envoient rien.

Contrôle de cette session : la requête publique vers `/api/health` du site Vercel a échoué dans le tunnel réseau (HTTP 403), y compris après une nouvelle tentative autorisée. Cela ne prouve pas une erreur du CRM distant. Le dépôt Git HTTPS reste accessible. Les PR et états de déploiement API ne sont pas vérifiés.

Restent à construire indépendamment des clés : attribution/lecture des conversations par propriétaire, scénarios d’automatisation configurables, dispatch paramétrable et simulation des trajets. Les suivis persistants sont désormais livrés ; le moteur n’envoie rien automatiquement.
