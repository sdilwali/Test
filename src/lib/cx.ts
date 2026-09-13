/** Join class names, dropping anything absent. CSS-module lookups are typed
 *  `string | undefined` under `noUncheckedIndexedAccess`, and a bare template
 *  literal would happily stringify that into a literal "undefined" class. */
export function cx(
  ...parts: readonly (string | false | null | undefined)[]
): string {
  return parts.filter((p): p is string => typeof p === "string" && p !== "").join(" ");
}
