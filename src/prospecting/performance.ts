/** Unknown groups stay uncoloured; zero is never fabricated for a missing metric. */
export function territoryPerformanceColor(rate:number|null|undefined){if(rate===null||rate===undefined||!Number.isFinite(rate)||rate<0||rate>100)return null;return rate>=20?'#0e7490':rate>=5?'#0284c7':rate>0?'#38bdf8':'#334155'}
