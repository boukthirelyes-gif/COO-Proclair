'use client';
/**
 * Official Proclair wordmark: use the supplied artwork, not a recreated typeface.
 * On deep-blue surfaces the source image is presented as a subtle monochrome
 * mark using screen blending; on the login panel its original blue gradient remains.
 */
export default function ProclairLogo({placement='sidebar'}:{placement?:'sidebar'|'login'}){
 return <span className={'proclair-wordmark proclair-wordmark-'+placement}>
  <img
   src="/proclair-wordmark.webp"
   alt="Proclair"
   width={500}
   height={78}
   loading={placement==='login'?'eager':'lazy'}
   decoding="async"
  />
 </span>;
}
