export type BusySlot={startsAt:Date|null;endsAt:Date|null};
export type AvailableSlot={startsAt:Date;endsAt:Date};

/** Finds the earliest fit inside supplied local-day boundaries, without mutating inputs. */
export function findAvailableSlot(start:Date,finish:Date,durationMinutes:number,busy:readonly BusySlot[],buffer=30):AvailableSlot|null{
 const first=start.getTime(),last=finish.getTime();
 if(!Number.isFinite(first)||!Number.isFinite(last)||first>=last
  ||!Number.isSafeInteger(durationMinutes)||durationMinutes<=0
  ||!Number.isSafeInteger(buffer)||buffer<0)return null;
 const duration=durationMinutes*60000,margin=buffer*60000;
 if(!Number.isSafeInteger(duration)||!Number.isSafeInteger(margin)||duration>last-first)return null;
 const blocked:{start:number;end:number}[]=[];
 for(const slot of busy){
  if(!slot.startsAt||!slot.endsAt)return null;
  const from=slot.startsAt.getTime(),to=slot.endsAt.getTime();
  if(!Number.isFinite(from)||!Number.isFinite(to)||from>=to)return null;
  if(!Number.isSafeInteger(from-margin)||!Number.isSafeInteger(to+margin))return null;
  blocked.push({start:from-margin,end:to+margin});
 }
 blocked.sort((a,b)=>a.start-b.start||a.end-b.end);
 let cursor=first;
 for(const interval of blocked){
  if(interval.end<=cursor)continue;
  if(cursor+duration<=interval.start)return {startsAt:new Date(cursor),endsAt:new Date(cursor+duration)};
  cursor=Math.max(cursor,interval.end);
  if(cursor+duration>last)return null;
 }
 return cursor+duration<=last?{startsAt:new Date(cursor),endsAt:new Date(cursor+duration)}:null;
}
