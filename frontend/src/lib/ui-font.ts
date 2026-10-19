/** Interface font choice, stored in a cookie so the server renders the right font on first paint. */
export const UI_FONTS = ["manrope", "geist"] as const;
export type UiFont = (typeof UI_FONTS)[number];

export const DEFAULT_UI_FONT: UiFont = "manrope";
export const UI_FONT_COOKIE = "supoclip-ui-font";

export const UI_FONT_LABELS: Record<UiFont, string> = {
  manrope: "Manrope",
  geist: "Geist",
};

export function isUiFont(value: unknown): value is UiFont {
  return typeof value === "string" && (UI_FONTS as readonly string[]).includes(value);
}
