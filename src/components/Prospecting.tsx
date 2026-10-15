'use client';
import GoogleProspecting from './GoogleProspecting';
import LegacyProspecting from './LegacyProspecting';
export default function Prospecting(props:{initialId?:string;createLead?:(pin:any)=>void}){
 const configured=Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim());
 return configured?<GoogleProspecting {...props}/>:<><div className="notice" role="status"><strong>Google Maps attend sa configuration</strong><p>La carte actuelle reste disponible. Pour activer Google Maps, configurez NEXT_PUBLIC_GOOGLE_MAPS_API_KEY dans Vercel puis redéployez cette version.</p></div><LegacyProspecting {...props}/></>;
}
