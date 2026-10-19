"use client";
import { useRef, useState, type ReactNode } from "react";
import {
  AlignCenter,
  Bookmark,
  Captions,
  Crop,
  Highlighter,
  Info,
  Palette,
  Play,
  Plus,
  RotateCcw,
  Trash2,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DEFAULT_EFFECTS,
  clamp,
  replaceWords,
  uid,
  type EditDocument,
  type CaptionStyle,
  type EditorState,
} from "@/lib/editor/document";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { Field, Panel, Range, Section } from "./studio-ui";
export type InspectorTab = "captions" | "framing" | "audio" | "effects";

const TABS = [
  ["captions", "ed.tab.captions", Captions],
  ["framing", "ed.tab.framing", Crop],
  ["audio", "ed.tab.audio", Volume2],
  ["effects", "ed.tab.effects", Palette],
] as const;

function ColorField({
  label,
  inputLabel,
  value,
  onChange,
}: {
  label: string;
  inputLabel: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex h-9 items-center gap-2 rounded-md border bg-transparent pl-1.5 pr-2 shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
        <input
          aria-label={inputLabel}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="size-6 shrink-0 cursor-pointer rounded border-0 ring-1 ring-border bg-transparent p-0 outline-none [&::-moz-color-swatch]:rounded [&::-moz-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
        />
        <span className="font-mono text-xs uppercase text-muted-foreground">
          {value}
        </span>
      </div>
    </Field>
  );
}

function SwitchRow({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={id} className="text-sm font-normal">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

interface Props {
  doc: EditDocument;
  asset: EditorState;
  tab: InspectorTab;
  setTab: (tab: InspectorTab) => void;
  time: number;
  seek: (value: number) => void;
  update: (change: (doc: EditDocument) => EditDocument, group?: string) => void;
  applyAll: (style: CaptionStyle) => Promise<void>;
}
export function Inspector({
  doc,
  asset,
  tab,
  setTab,
  time,
  seek,
  update,
  applyAll,
}: Props) {
  const t = useT();
  const scriptWords = useRef(doc.words);
  const [script, setScript] = useState<string | null>(null),
    [applying, setApplying] = useState(false);
  const caption = (change: Partial<CaptionStyle>, group = "caption-style") =>
    update((d) => ({ ...d, captions: { ...d.captions, ...change } }), group);
  return (
    <Panel
      aria-label={t("ed.tools")}
      className="md:sticky md:top-4 xl:col-start-3"
    >
      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as InspectorTab)}
        className="gap-0"
      >
        <div className="border-b p-2">
          <TabsList className="grid w-full grid-cols-4 group-data-[orientation=horizontal]/tabs:h-auto">
            {TABS.map(([id, label, Icon]) => (
              <TabsTrigger
                key={id}
                value={id}
                className="h-auto flex-col gap-1 py-2 text-xs"
              >
                <Icon />
                {t(label)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <div className="md:max-h-[calc(100dvh-250px)] md:overflow-y-auto">
          <TabsContent value="captions" className="space-y-6 p-4">
            <Section
              title={t("ed.captionStyle")}
              description={t("ed.captionStyleDesc")}
              action={
                <Switch
                  aria-label={t("ed.showCaptions")}
                  checked={doc.captions.enabled}
                  onCheckedChange={(enabled) => caption({ enabled })}
                />
              }
            >
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["ed.preset.clean", false, "#FFFFFF"],
                    ["ed.preset.highlight", true, "#FACC15"],
                    ["ed.preset.pop", true, "#A3E635"],
                  ] as const
                ).map(([name, background, accent]) => {
                  const active =
                    doc.captions.background === background &&
                    doc.captions.accent.toUpperCase() === accent;
                  return (
                    <button
                      key={name}
                      aria-pressed={active}
                      className={cn(
                        "rounded-lg border p-1.5 text-left transition-colors outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50",
                        active && "border-primary ring-1 ring-primary",
                      )}
                      onClick={() => caption({ background, accent })}
                    >
                      <span className="flex h-10 items-center justify-center rounded-md bg-stone-900 text-xs font-bold text-white">
                        <span
                          className={cn(
                            "px-1",
                            background && "rounded-sm bg-black/60",
                          )}
                        >
                          {t("ed.yourStory")} <span style={{ color: accent }}>{t("ed.story")}</span>
                        </span>
                      </span>
                      <span className="block px-0.5 pt-1.5 text-xs font-medium">
                        {t(name)}
                      </span>
                    </button>
                  );
                })}
              </div>
              <Field label={t("ed.font")}>
                <Select
                  value={doc.captions.font}
                  onValueChange={(font) =>
                    caption({ font: font as CaptionStyle["font"] })
                  }
                >
                  <SelectTrigger aria-label={t("ed.captionFont")} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TikTokSans-Regular">TikTok Sans</SelectItem>
                    <SelectItem value="TikTokSans-Bold">TikTok Sans Bold</SelectItem>
                    <SelectItem value="Poppins-ExtraBold">
                      Poppins Extra Bold
                    </SelectItem>
                    <SelectItem value="THEBOLDFONT">The Bold Font</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Range
                label={t("ed.subtitleSize")}
                value={doc.captions.size}
                min={20}
                max={132}
                onChange={(size) => caption({ size })}
              />
              <Range
                label={t("ed.subtitleY")}
                value={doc.captions.y * 100}
                min={10}
                max={90}
                unit="%"
                onChange={(y) => caption({ y: y / 100 })}
              />
              <div className="grid grid-cols-2 gap-3">
                <ColorField
                  label={t("ed.text")}
                  inputLabel={t("ed.captionTextColor")}
                  value={doc.captions.color}
                  onChange={(color) => caption({ color })}
                />
                <ColorField
                  label={t("ed.highlight")}
                  inputLabel={t("ed.highlightColor")}
                  value={doc.captions.accent}
                  onChange={(accent) => caption({ accent })}
                />
              </div>
              <SwitchRow
                id="caption-background"
                label={t("ed.textBackground")}
                checked={doc.captions.background}
                onChange={(background) => caption({ background })}
              />
              <SwitchRow
                id="caption-karaoke"
                label={t("ed.highlightSpoken")}
                checked={!!doc.captions.karaoke}
                onChange={(karaoke) => caption({ karaoke })}
              />
              <SwitchRow
                id="caption-uppercase"
                label={t("ed.uppercase")}
                checked={!!doc.captions.uppercase}
                onChange={(uppercase) => caption({ uppercase })}
              />
              <div className="flex items-center justify-between gap-3">
                <Label className="text-sm font-normal">{t("ed.wordsPerCaption")}</Label>
                <Select
                  value={String(doc.captions.wordsPerLine)}
                  onValueChange={(n) => caption({ wordsPerLine: Number(n) })}
                >
                  <SelectTrigger
                    size="sm"
                    aria-label={t("ed.wordsPerCaption")}
                    className="w-16 tabular-nums"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    try {
                      localStorage.setItem(
                        "supoclip-caption-style",
                        JSON.stringify(doc.captions),
                      );
                      toast.success(t("ed.styleSaved"));
                    } catch {
                      toast.error(t("ed.styleSaveFailed"));
                    }
                  }}
                >
                  <Bookmark />
                  {t("ed.saveStyle")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    try {
                      const style = JSON.parse(
                        localStorage.getItem("supoclip-caption-style") ||
                          "null",
                      );
                      if (style?.font && style?.size) caption(style);
                      else toast.info(t("ed.saveFirst"));
                    } catch {
                      toast.error(t("ed.styleLoadFailed"));
                    }
                  }}
                >
                  {t("ed.loadStyle")}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="col-span-2"
                  disabled={applying}
                  onClick={async () => {
                    setApplying(true);
                    try {
                      await applyAll(doc.captions);
                    } finally {
                      setApplying(false);
                    }
                  }}
                >
                  {applying ? t("ed.applying") : t("ed.applyAll")}
                </Button>
              </div>
            </Section>
            <Separator />
            <Section
              title={
                <>
                  {t("ed.transcript")}{" "}
                  <span className="font-normal text-muted-foreground">
                    {t("ed.wordsCount", { count: doc.words.length })}
                  </span>
                </>
              }
              description={t("ed.transcriptDesc")}
              action={
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    scriptWords.current = doc.words;
                    setScript(
                      script === null
                        ? doc.words.map((w) => w.text).join(" ")
                        : null,
                    );
                  }}
                >
                  {script === null ? t("ed.editScript") : t("ed.closeScript")}
                </Button>
              }
            >
              {script !== null && (
                <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
                  <Textarea
                    className="min-h-24 bg-background text-sm"
                    aria-label={t("ed.subtitleText")}
                    value={script}
                    onChange={(e) => {
                      const text = e.target.value;
                      setScript(text);
                      try {
                        update(
                          (d) => ({
                            ...d,
                            words: replaceWords(
                              scriptWords.current,
                              text,
                              asset.duration,
                            ),
                          }),
                          "script",
                        );
                      } catch (error) {
                        toast.error((error as Error).message);
                      }
                    }}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      {t("ed.scriptHint")}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => {
                        try {
                          update((d) => ({
                            ...d,
                            words: replaceWords(
                              scriptWords.current,
                              script,
                              asset.duration,
                            ),
                          }));
                          setScript(null);
                        } catch (e) {
                          toast.error((e as Error).message);
                        }
                      }}
                    >
                      {t("ed.applyScript")}
                    </Button>
                  </div>
                </div>
              )}
              <ol className="max-h-72 space-y-1 overflow-y-auto rounded-lg border p-1">
                {doc.words.map((word, i) => {
                  const current = time >= word.start && time < word.end;
                  return (
                    <li
                      key={word.id}
                      className={cn(
                        "group grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-x-1 rounded-md py-1 pr-1 transition-colors hover:bg-accent/60",
                        current && "bg-accent",
                      )}
                    >
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={t("ed.seekWordN", { n: i + 1 })}
                        title={t("ed.seekWord")}
                        onClick={() => seek(word.start)}
                        className="size-7 text-muted-foreground"
                      >
                        <Play className="size-3" />
                      </Button>
                      <input
                        className="h-7 min-w-0 rounded-sm bg-transparent px-1.5 text-sm outline-none focus:bg-background focus:ring-2 focus:ring-ring/50"
                        aria-label={t("ed.wordN", { n: i + 1 })}
                        maxLength={120}
                        value={word.text}
                        onChange={(e) =>
                          update(
                            (d) => ({
                              ...d,
                              words: d.words.map((w) =>
                                w.id === word.id
                                  ? { ...w, text: e.target.value }
                                  : w,
                              ),
                            }),
                            `word-${word.id}`,
                          )
                        }
                      />
                      <span className="flex items-center">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={t("ed.highlightWordN", { n: i + 1 })}
                          aria-pressed={word.highlight}
                          className={cn(
                            "size-7",
                            word.highlight
                              ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                              : "text-muted-foreground",
                          )}
                          onClick={() =>
                            update((d) => ({
                              ...d,
                              words: d.words.map((w) =>
                                w.id === word.id
                                  ? { ...w, highlight: !w.highlight }
                                  : w,
                              ),
                            }))
                          }
                        >
                          <Highlighter className="size-3.5" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={t("ed.deleteWordN", { n: i + 1 })}
                          className="size-7 text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            update((d) => ({
                              ...d,
                              words: d.words.filter((w) => w.id !== word.id),
                            }))
                          }
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </span>
                      <div className="col-start-2 col-span-2 flex items-center gap-1.5 px-1.5 text-[11px] text-muted-foreground tabular-nums">
                        <input
                          aria-label={t("ed.wordNStart", { n: i + 1 })}
                          className="w-14 [appearance:textfield] rounded-sm bg-transparent px-1 outline-none hover:bg-background focus:bg-background focus:ring-2 focus:ring-ring/50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          type="number"
                          min={0}
                          max={word.end - 0.01}
                          step="0.01"
                          value={Number(word.start.toFixed(2))}
                          onChange={(e) =>
                            update(
                              (d) => ({
                                ...d,
                                words: d.words.map((w) =>
                                  w.id === word.id
                                    ? {
                                        ...w,
                                        start: clamp(
                                          Number(e.target.value),
                                          0,
                                          w.end - 0.01,
                                        ),
                                      }
                                    : w,
                                ),
                              }),
                              `timing-${word.id}`,
                            )
                          }
                        />
                        <span aria-hidden>→</span>
                        <input
                          aria-label={t("ed.wordNEnd", { n: i + 1 })}
                          className="w-14 [appearance:textfield] rounded-sm bg-transparent px-1 outline-none hover:bg-background focus:bg-background focus:ring-2 focus:ring-ring/50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          type="number"
                          min={word.start + 0.01}
                          max={asset.duration}
                          step="0.01"
                          value={Number(word.end.toFixed(2))}
                          onChange={(e) =>
                            update(
                              (d) => ({
                                ...d,
                                words: d.words.map((w) =>
                                  w.id === word.id
                                    ? {
                                        ...w,
                                        end: clamp(
                                          Number(e.target.value),
                                          w.start + 0.01,
                                          asset.duration,
                                        ),
                                      }
                                    : w,
                                ),
                              }),
                              `timing-${word.id}`,
                            )
                          }
                        />
                      </div>
                    </li>
                  );
                })}
              </ol>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() =>
                  update((d) => ({
                    ...d,
                    words: [
                      ...d.words,
                      {
                        id: uid(),
                        text: t("ed.newWord"),
                        start: Math.min(time, asset.duration - 0.1),
                        end: Math.min(asset.duration, time + 0.5),
                        highlight: false,
                      },
                    ].sort((a, b) => a.start - b.start),
                  }))
                }
              >
                <Plus />
                {t("ed.addWord")}
              </Button>
            </Section>
          </TabsContent>
          <TabsContent value="framing" className="space-y-6 p-4">
            <Section
              title={t("ed.framing")}
              description={t("ed.framingDesc")}
            >
              <Field label={t("ed.aspect")}>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  aria-label={t("ed.aspect")}
                  className="w-full"
                  value={doc.framing.aspect}
                  onValueChange={(aspect) =>
                    aspect &&
                    update((d) => ({
                      ...d,
                      framing: {
                        ...d.framing,
                        aspect: aspect as EditDocument["framing"]["aspect"],
                      },
                    }))
                  }
                >
                  {(
                    [
                      ["vertical", "9:16", "ed.aspect.vertical"],
                      ["square", "1:1", "ed.aspect.square"],
                      ["original", "ed.aspect.src", "ed.aspect.original"],
                    ] as const
                  ).map(([value, ratio, label]) => (
                    <ToggleGroupItem
                      key={value}
                      value={value}
                      aria-label={t(label)}
                      className="h-auto flex-1 flex-col gap-0.5 py-2"
                    >
                      <span className="text-sm font-semibold">{ratio.startsWith("ed.") ? t(ratio as "ed.aspect.src") : ratio}</span>
                      <span className="text-[11px] font-normal text-muted-foreground">
                        {t(label)}
                      </span>
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </Field>
              <Field label={t("ed.fit")}>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  aria-label={t("ed.fit")}
                  className="w-full"
                  value={doc.framing.fit}
                  onValueChange={(fit) =>
                    fit &&
                    update((d) => ({
                      ...d,
                      framing: {
                        ...d.framing,
                        fit: fit as EditDocument["framing"]["fit"],
                      },
                    }))
                  }
                >
                  <ToggleGroupItem value="cover" className="flex-1 text-xs">
                    {t("ed.fit.cover")}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="contain" className="flex-1 text-xs">
                    {t("ed.fit.contain")}
                  </ToggleGroupItem>
                </ToggleGroup>
              </Field>
            </Section>
            <Separator />
            <Section title={t("ed.position")}>
              <Range
                label={t("ed.zoom")}
                min={1}
                max={3}
                step={0.01}
                value={doc.framing.zoom}
                unit="×"
                onChange={(zoom) =>
                  update(
                    (d) => ({ ...d, framing: { ...d.framing, zoom } }),
                    "zoom",
                  )
                }
              />
              <Range
                label={t("ed.hPos")}
                min={0}
                max={100}
                value={doc.framing.x * 100}
                unit="%"
                onChange={(x) =>
                  update(
                    (d) => ({ ...d, framing: { ...d.framing, x: x / 100 } }),
                    "position",
                  )
                }
              />
              <Range
                label={t("ed.vPos")}
                min={0}
                max={100}
                value={doc.framing.y * 100}
                unit="%"
                onChange={(y) =>
                  update(
                    (d) => ({ ...d, framing: { ...d.framing, y: y / 100 } }),
                    "position",
                  )
                }
              />
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() =>
                  update((d) => ({
                    ...d,
                    framing: { ...d.framing, x: 0.5, y: 0.5, zoom: 1 },
                  }))
                }
              >
                <AlignCenter />
                {t("ed.center")}
              </Button>
            </Section>
          </TabsContent>
          <TabsContent value="audio" className="space-y-6 p-4">
            <Section
              title={t("ed.audio")}
              description={t("ed.audioDesc")}
            >
              {!asset.hasAudio && (
                <Alert>
                  <Info />
                  <AlertDescription>
                    {t("ed.noAudio")}
                  </AlertDescription>
                </Alert>
              )}
              <Range
                label={t("ed.volume")}
                value={doc.volume * 100}
                min={0}
                max={200}
                unit="%"
                onChange={(volume) =>
                  update((d) => ({ ...d, volume: volume / 100 }), "volume")
                }
              />
              <SwitchRow
                id="mute-export"
                label={t("ed.muteExport")}
                checked={doc.muted}
                onChange={(muted) => update((d) => ({ ...d, muted }))}
              />
              {doc.volume > 1 && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {t("ed.boost")}
                </p>
              )}
            </Section>
          </TabsContent>
          <TabsContent value="effects" className="space-y-6 p-4">
            <Section
              title={t("ed.effects")}
              description={t("ed.effectsDesc")}
              action={
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() =>
                    update((d) => ({ ...d, effects: { ...DEFAULT_EFFECTS } }))
                  }
                >
                  <RotateCcw />
                  {t("ed.reset")}
                </Button>
              }
            >
              {(
                [
                  ["ed.fx.brightness", "brightness", 40, 180, 1],
                  ["ed.fx.contrast", "contrast", 40, 180, 1],
                  ["ed.fx.saturation", "saturation", 0, 220, 1],
                  ["ed.fx.blur", "blur", 0, 8, 0.1],
                  ["ed.fx.hue", "hue", -180, 180, 1],
                ] as const
              ).map(([label, key, min, max, step]) => (
                <Range
                  key={key}
                  label={t(label)}
                  value={doc.effects[key]}
                  min={min}
                  max={max}
                  step={step}
                  onChange={(value) =>
                    update(
                      (d) => ({
                        ...d,
                        effects: { ...d.effects, [key]: value },
                      }),
                      key,
                    )
                  }
                />
              ))}
            </Section>
          </TabsContent>
        </div>
      </Tabs>
    </Panel>
  );
}
