// Chat pieces the phone and the server share: stickers (a sticker is a word and an emoji drawn as a
// coloured badge, no image files), the emoji trays, and how a chat is named and sorted.

export type ChatKind = "team" | "topic" | "direct";

// key: [words on it, emoji, colour from, colour to]. The server accepts only these keys.
export const STICKERS: Record<string, [string, string, string, string]> = {
  reached: ["Reached site", "📍", "#13d3e3", "#478bd0"],
  onway: ["On the way", "🛵", "#478bd0", "#7a5cff"],
  started: ["Work started", "🚧", "#f5b400", "#e08a00"],
  done: ["Work done", "✅", "#10a36e", "#0b7d55"],
  rain: ["Rain, work stopped", "🌧️", "#5e6283", "#3b3579"],
  material: ["Need material", "📦", "#e08a00", "#c6283f"],
  callme: ["Call me", "📞", "#2f6fcb", "#5b3fe6"],
  chaya: ["Chaya break", "☕", "#a0522d", "#6b3a1f"],
  pwoli: ["Pwoli!", "🔥", "#ff7a18", "#c6283f"],
  adipoli: ["Adipoli", "🤩", "#7a5cff", "#c03fe6"],
  kidu: ["Kidu", "👌", "#13d3e3", "#10a36e"],
  setaayi: ["Setaayi", "👍", "#10a36e", "#478bd0"],
  okboss: ["OK boss", "🫡", "#270869", "#5b3fe6"],
  thanks: ["Thank you", "🙏", "#f5b400", "#7a5cff"],
};
export const isSticker = (k: string) => Object.prototype.hasOwnProperty.call(STICKERS, k);

export const EMOJI: { tab: string; list: string[] }[] = [
  { tab: "Fun", list: ["😀", "😂", "🤣", "😊", "😍", "😎", "🤩", "😅", "😉", "🤔", "😴", "😢", "😡", "🥳", "🙌", "👏", "🔥", "🎉", "💯", "⭐", "😜", "🤗", "😇", "🥲"] },
  { tab: "Work", list: ["👍", "👌", "✅", "❌", "⚠️", "📍", "🚧", "⚡", "🔌", "🛠️", "🔧", "🪛", "📦", "🚚", "🛵", "📞", "📝", "⏰", "🧾", "💰", "📷", "🏗️", "🦺", "⛑️"] },
  { tab: "Kerala", list: ["🌴", "🥥", "🍌", "☕", "🍛", "🐘", "🛶", "🌧️", "☔", "🌊", "🏝️", "🌾", "🙏", "🪔", "🎆", "🥭", "🐟", "🚤"] },
  { tab: "Hearts", list: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🤍", "💖", "💕", "💝", "🫶", "😘"] },
];

// a message of only 1-3 emoji is shown big
export function bigEmoji(s: string | null | undefined): boolean {
  if (!s) return false;
  const t = s.replace(/\s+/g, "");
  if (!t || t.length > 24) return false;
  if (!/^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|‍|️)+$/u.test(t)) return false;
  const seg = typeof Intl !== "undefined" && "Segmenter" in Intl ? [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(t)].length : Math.ceil(t.length / 2);
  return seg >= 1 && seg <= 3;
}

export const chatTitle = (kind: string, title: string | null, otherName?: string | null) =>
  kind === "team" ? "Team chat" : kind === "topic" ? title || "Group chat" : otherName || "Chat";
