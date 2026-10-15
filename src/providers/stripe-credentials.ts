// Normalize accidental surrounding whitespace, never expose a credential.
export function stripeSecretKey(){return process.env.STRIPE_SECRET_KEY?.trim()||''}
export function stripeWebhookSecret(){return process.env.STRIPE_WEBHOOK_SECRET?.trim()||''}
export function stripeKeyProblem(){
 const key=stripeSecretKey();
 if(!key)return 'STRIPE_SECRET_KEY est absente de ce déploiement. Ajoutez-la dans Vercel pour Production, puis redéployez.';
 if(key.startsWith('sk_live_')||key.startsWith('rk_live_'))return 'Une clé Stripe réelle est configurée. Cette version exige une clé Stripe de test sk_test_ : les paiements réels ne sont pas encore disponibles.';
 if(key.startsWith('pk_'))return 'La clé Stripe publique a été saisie. STRIPE_SECRET_KEY doit contenir la clé secrète de test sk_test_, pas pk_.';
 if(!key.startsWith('sk_test_'))return 'Format Stripe incompatible. Copiez uniquement la clé secrète de test sk_test_, sans guillemets ni nom de variable.';
 return null;
}
