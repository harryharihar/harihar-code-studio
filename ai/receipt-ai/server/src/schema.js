import { z } from 'zod';

export const CATEGORIES = [
  'Food & Dining',
  'Travel',
  'Shopping',
  'Bills & Utilities',
  'Health',
  'Entertainment',
  'Other',
];

// What the model must return.
export const ReceiptSchema = z.object({
  merchant: z.string(),
  amount: z.number(),
  currency: z.string(),
  date: z.string().nullable(),
  category: z.enum(CATEGORIES),
  confidence: z.number(),
  note: z.string(),
});

// What the client must send.
export const CategorizeBody = z.object({
  text: z.string().trim().min(5).max(4000),
});
