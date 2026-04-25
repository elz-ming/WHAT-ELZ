/**
 * Conditionally joins class names, filtering out falsy values.
 * Lightweight stand-in for `clsx` until we need the full library.
 */
export function cn(
  ...inputs: Array<string | number | false | null | undefined>
): string {
  return inputs.filter(Boolean).join(" ");
}
