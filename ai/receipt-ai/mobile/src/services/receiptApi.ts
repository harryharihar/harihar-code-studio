export type Category =
  | 'Food & Dining'
  | 'Travel'
  | 'Shopping'
  | 'Bills & Utilities'
  | 'Health'
  | 'Entertainment'
  | 'Other';

export type ReceiptResult = {
  merchant: string;
  amount: number;
  currency: string;
  date: string | null;
  category: Category;
  confidence: number;
  note: string;
};

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

// Only these are worth retrying: busy, bad AI output, AI unreachable.
const RETRYABLE = [429, 502, 504];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function categorizeReceipt(
  text: string,
  { timeoutMs = 25_000, retries = 1 } = {},
): Promise<ReceiptResult> {
  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let res: Response;
    try {
      res = await fetch(`${API_URL}/api/receipts/categorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });
    } catch (err) {
      const timedOut = controller.signal.aborted;
      if (attempt < retries) {
        await sleep(1500 * (attempt + 1));
        continue;
      }
      throw timedOut
        ? new ApiError('TIMEOUT', 'The server took too long to answer. Please try again.')
        : new ApiError('NETWORK', "Can't reach the server. Check your Wi-Fi and the API URL.");
    } finally {
      clearTimeout(timer);
    }

    const body = await res.json().catch(() => null);

    if (res.ok && body?.data) {
      return body.data as ReceiptResult;
    }

    if (RETRYABLE.includes(res.status) && attempt < retries) {
      await sleep(1500 * (attempt + 1));
      continue;
    }

    throw new ApiError(
      body?.error?.code ?? 'UNKNOWN',
      body?.error?.message ?? 'Something went wrong. Please try again.',
      res.status,
    );
  }
}
