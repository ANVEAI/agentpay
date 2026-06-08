/** Shorten an address or tx hash to 0x1234…abcd. */
export function short(value?: string | null): string {
  if (!value) return "";
  return value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
}
