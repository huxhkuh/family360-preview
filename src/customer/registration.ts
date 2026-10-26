import {z} from 'zod';
import {validPhoneNumber} from '../families/questionnaire-validation';
export const registrationSchema=z.object({
 first:z.string().trim().min(2).max(80),last:z.string().trim().min(2).max(80),
 email:z.string().trim().email().max(254).transform(value=>value.toLowerCase()),
 phone:z.string().trim().max(30).refine(validPhoneNumber),
});
export type Registration=z.infer<typeof registrationSchema>;
