import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
const usd0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** $1,234.56 (or $1,235 with whole=true). Negative values keep their minus sign. */
export const money = (n: number | null | undefined, whole = false) =>
  n === null || n === undefined || Number.isNaN(n)
    ? "—"
    : (whole ? usd0 : usd).format(n).replace("-$", "−$");

/** Split $27.40 into "$27" and ".40" so the cents can be styled smaller. */
export const moneyParts = (n: number) => {
  const s = usd.format(Math.abs(n));
  const dot = s.lastIndexOf(".");
  return {
    sign: n < 0 ? "−" : "",
    whole: s.slice(0, dot),
    cents: s.slice(dot),
  };
};

const parse = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const day = (iso: string) =>
  parse(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
export const shortDay = (iso: string) =>
  parse(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
export const weekday = (iso: string) =>
  parse(iso).toLocaleDateString("en-US", { weekday: "short" });
export const dayNum = (iso: string) => parse(iso).getDate();
export const longDay = (iso: string) =>
  parse(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

export const plural = (n: number, word: string) =>
  `${n} ${word}${n === 1 ? "" : "s"}`;

export const relativeDays = (n: number) =>
  n === 0 ? "today" : n === 1 ? "tomorrow" : `in ${n} days`;
