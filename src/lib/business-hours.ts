import {z} from 'zod';
export const businessDays=['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'] as const;
const time=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/,'Heure attendue au format HH:MM.');
export const businessHoursSchema=z.array(z.object({closed:z.boolean(),opens:time,closes:time}).strict().superRefine((day,ctx)=>{if(!day.closed&&day.opens>=day.closes)ctx.addIssue({code:'custom',path:['closes'],message:'La fermeture doit suivre l’ouverture dans la même journée.'})})).length(7,'Les sept jours doivent être renseignés.');
export type BusinessHours=z.infer<typeof businessHoursSchema>;
export const emptyBusinessHours=():BusinessHours=>businessDays.map(()=>({closed:true,opens:'09:00',closes:'17:00'}));
