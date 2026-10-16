'use client';
import GoogleProspecting from './GoogleProspecting';
import LegacyProspecting from './LegacyProspecting';
export default function Prospecting(props:{initialId?:string;createLead?:(pin:any)=>void}){
 const configured=Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim());
 return configured?<GoogleProspecting {...props}/>:<><aside className="map-google-setup" role="status"><div><span className="eyebrow">GOOGLE MAPS / ACTIVER LE FOND</span><strong>Google Maps attend sa configuration</strong><p>La carte OpenStreetMap avec vos vraies portes reste utilisable dès maintenant. Pour afficher le fond Google Maps dans le CRM, il manque une clé Google Cloud autorisée.</p><p>Activez la facturation et <b>Maps JavaScript API</b> dans Google Cloud, créez une clé de navigateur restreinte aux domaines HTTPS de Proclair, puis ajoutez-la à <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> pour <b>Preview</b> dans Vercel et redéployez. Aucun mot de passe ne doit être partagé ici.</p></div><div className="map-google-setup-actions"><a href="https://console.cloud.google.com/google/maps-apis/credentials" target="_blank" rel="noopener noreferrer">1. Clé Google Cloud ↗</a><a href="https://vercel.com/proclair/coo-proclair/settings/environment-variables" target="_blank" rel="noopener noreferrer">2. Variable Vercel ↗</a></div></aside><LegacyProspecting {...props}/></>;
}
