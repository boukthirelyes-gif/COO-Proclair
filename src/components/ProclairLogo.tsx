'use client';
/** Official supplied Proclair wordmark. The white presentation surface keeps the navy-to-water-blue letters legible on dark layouts. */
export default function ProclairLogo({placement='sidebar'}:{placement?:'sidebar'|'login'|'header'|'hero'}){
 return <span className={'proclair-wordmark proclair-wordmark-'+placement}>
  <img src="/proclair-wordmark.webp" alt="Proclair" width={450} height={70} decoding="async"/>
 </span>;
}
