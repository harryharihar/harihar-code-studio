/**
 * Every screen that loads data is in exactly ONE of these states.
 *
 * A discriminated union: TypeScript only lets you read `data` after
 * checking `status === 'success'`, and `message` after 'error'.
 * No more `isLoading && error && data` all at once.
 */
export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: T };
