type Visit={id:string;status:string;startsAt?:string|null};
export function dashboardVisits<T extends Visit>(visits:T[],now=new Date()){
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const isDay=(value:string)=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value))===day;
 const closed=new Set(['COMPLETED','CANCELLED']);
 const today=visits.filter(v=>v.startsAt&&isDay(v.startsAt)&&v.status!=='CANCELLED');
 const upcoming=visits.filter(v=>v.startsAt&&!closed.has(v.status)&&new Date(v.startsAt).getTime()>=now.getTime()).sort((a,b)=>new Date(a.startsAt!).getTime()-new Date(b.startsAt!).getTime());
 return {today,upcoming,completedToday:today.filter(v=>v.status==='COMPLETED').length,unplanned:visits.filter(v=>!v.startsAt&&!closed.has(v.status)),followup:visits.filter(v=>['FAILED','NO_ACCESS','NEEDS_FOLLOWUP'].includes(v.status))};
}
