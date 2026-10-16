/** Only keys explicitly intended for the browser may leave the server. */
export function googleMapsBrowserConfiguration(env:Record<string,string|undefined>){
 const key=env.GOOGLE_MAPS_BROWSER_API_KEY?.trim()||env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim()||'';
 const valid=key.length>=20&&key.length<=200&&/^[A-Za-z0-9_-]+$/.test(key)&&!/^(?:your|replace|example)/i.test(key);
 return {provider:'GOOGLE_MAPS' as const,configured:valid,browserKey:valid?key:null,reason:valid?null:key?'INVALID_BROWSER_KEY':'MISSING_BROWSER_KEY'};
}
