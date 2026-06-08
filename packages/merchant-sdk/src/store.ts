/**
 * Replay guard. A settled payment (tx hash) should only unlock a resource once.
 * The default is in-memory; pass a Redis/DB-backed store in production.
 */
export interface PaymentStore {
  has(txHash: string): Promise<boolean> | boolean;
  add(txHash: string): Promise<void> | void;
}

export function memoryStore(): PaymentStore {
  const used = new Set<string>();
  return {
    has: (tx) => used.has(tx.toLowerCase()),
    add: (tx) => {
      used.add(tx.toLowerCase());
    },
  };
}
