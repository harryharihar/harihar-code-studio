import { z } from 'zod';

/** One message per form field, e.g. { title: 'Title is required' }. */
export type FieldErrors = Partial<Record<string, string>>;

/** Turns a Zod error into the first message for each field. */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const { fieldErrors } = z.flattenError(error);
  const result: FieldErrors = {};
  for (const [field, messages] of Object.entries(fieldErrors) as [
    string,
    string[] | undefined,
  ][]) {
    if (messages && messages.length > 0) {
      result[field] = messages[0];
    }
  }
  return result;
}
