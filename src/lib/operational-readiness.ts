/** Local configuration checks only: never a certification of live operations. */
export type ReadinessCheck = {id:string; label:string; status:'CONFIGURED_UNVERIFIED'|'BLOCKED'|'REQUIRES_VALIDATION'; action:string};
type Providers = {stripe:{configured:boolean;livePaymentsEnabled:boolean};twilio:{configured:boolean;sendingEnabled:boolean;voiceEnabled:boolean}};
export function operationalReadiness(env:Record<string,string|undefined>, providers:Providers){
 const checks:ReadinessCheck[]=[];
 const add=(id:string,label:string,configured:boolean,action:string)=>checks.push({id,label,status:configured?'CONFIGURED_UNVERIFIED':'BLOCKED',action});
 let https=false;try{const u=new URL(env.PROCLAIR_PUBLIC_ORIGIN||'');https=u.protocol==='https:'&&!u.username&&!u.password&&u.pathname==='/'&&!u.search&&!u.hash}catch{}
 add('origin','Adresse publique HTTPS',https,'Configurer PROCLAIR_PUBLIC_ORIGIN avec l’origine HTTPS exacte du CRM.');
 add('session','Protection des sessions',(env.PROCLAIR_SESSION_SECRET?.length??0)>=32,'Configurer un secret stable d’au moins 32 caractères dans l’hébergement.');
 add('admin','Connexion administrateur',(env.PROCLAIR_ADMIN_PASSWORD?.length??0)>=12,'Configurer le mot de passe administrateur privé (12 caractères minimum).');
 add('cron','Authentification des tâches planifiées',(env.CRON_SECRET?.length??0)>=32,'Configurer CRON_SECRET et vérifier une exécution planifiée authentifiée.');
 add('maps','Google Maps',!!env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim(),'Configurer la clé Google Maps restreinte aux domaines du CRM, reconstruire puis vérifier les pins.');
 add('stripe','Configuration Stripe',providers.stripe.configured,'Configurer Stripe et son secret de webhook, puis vérifier un paiement de test et sa réception.');
 add('live-payments','Encaissements Stripe réels',providers.stripe.livePaymentsEnabled,'Les encaissements réels restent désactivés dans cette version ; terminer et valider leur prise en charge avant utilisation commerciale.');
 add('sms','Envoi SMS Twilio',providers.twilio.configured&&providers.twilio.sendingEnabled,'Configurer Twilio ; activer les envois uniquement après validation du numéro, du consentement et des webhooks.');
 add('voice','Appels Twilio',providers.twilio.configured&&providers.twilio.voiceEnabled,'Configurer Twilio et une destination de transfert valide, puis vérifier un appel.');
 for(const [id,label,action] of [
 ['journey','Parcours métier complet','Valider prospect → contrat signé → visite → facture → paiement → commission avec un jeu de données dédié.'],
 ['migration','Migration Rotor','Rapprocher les nombres et montants importés avec les exports sources, et contrôler les doublons.'],
 ['restore','Restauration des sauvegardes','Restaurer une sauvegarde dans une base isolée et vérifier les données.'],
 ['tenant-isolation','Commercialisation multi-entreprise','Démontrer l’isolation de deux entreprises, leurs utilisateurs et leurs données avant de vendre des espaces clients.'],
 ['release','Version publiée et vérifications distantes','Vérifier les contrôles GitHub et comparer le commit Vercel Ready au commit attendu.'],
 ] as const)checks.push({id,label,status:'REQUIRES_VALIDATION',action});
 return {scope:'LOCAL_CONFIGURATION_ONLY' as const,commercialReadiness:'NOT_CERTIFIED' as const,checks,blocked:checks.filter(c=>c.status==='BLOCKED').length,requiresValidation:checks.filter(c=>c.status==='REQUIRES_VALIDATION').length};
}
