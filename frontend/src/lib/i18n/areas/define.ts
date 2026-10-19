/** Declares one area's strings; `pt` must define exactly the keys of `en`. */
export function defineArea<const T extends Record<string, string>>(en: T, pt: Record<keyof T, string>) {
  return { en, pt };
}
