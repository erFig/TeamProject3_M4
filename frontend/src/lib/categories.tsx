import {
  Banknote,
  Home,
  Zap,
  Shield,
  CreditCard,
  GraduationCap,
  ShoppingBasket,
  Coffee,
  Fuel,
  ShoppingBag,
  Ticket,
  Repeat,
  HeartPulse,
  Scissors,
  Landmark,
  ArrowLeftRight,
  CircleDashed,
  type LucideIcon,
} from "lucide-react";

// One icon and one hue per category, used everywhere a category appears.
export const CAT: Record<
  string,
  { label: string; icon: LucideIcon; hue: string }
> = {
  income: { label: "Income", icon: Banknote, hue: "#1F8A63" },
  housing: { label: "Rent & housing", icon: Home, hue: "#5B6CD6" },
  utilities: { label: "Utilities & phone", icon: Zap, hue: "#3F8FC4" },
  insurance: { label: "Insurance", icon: Shield, hue: "#6A7F92" },
  debt_payment: { label: "Loans & cards", icon: CreditCard, hue: "#8A5BC4" },
  education: { label: "Education", icon: GraduationCap, hue: "#2F9EA3" },
  groceries: { label: "Groceries", icon: ShoppingBasket, hue: "#4E9A3A" },
  dining: { label: "Dining & coffee", icon: Coffee, hue: "#D27A2C" },
  transport: { label: "Gas & transport", icon: Fuel, hue: "#C5543F" },
  shopping: { label: "Shopping", icon: ShoppingBag, hue: "#C9468B" },
  entertainment: { label: "Entertainment", icon: Ticket, hue: "#9B59D0" },
  subscriptions: { label: "Subscriptions", icon: Repeat, hue: "#D0A12A" },
  health: { label: "Health & fitness", icon: HeartPulse, hue: "#D2484F" },
  personal: { label: "Personal care", icon: Scissors, hue: "#B26B9E" },
  fees: { label: "Bank fees", icon: Landmark, hue: "#7D8590" },
  transfer: { label: "Transfers", icon: ArrowLeftRight, hue: "#7D8590" },
  other: { label: "Other", icon: CircleDashed, hue: "#8C9A92" },
};

export const catInfo = (id: string) => CAT[id] ?? CAT.other;

export function CatIcon({
  id,
  size = 18,
  className = "",
}: {
  id: string;
  size?: number;
  className?: string;
}) {
  const c = catInfo(id);
  const Icon = c.icon;
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl ${className}`}
      style={{
        background: `${c.hue}1f`,
        color: c.hue,
        width: size + 16,
        height: size + 16,
      }}
      aria-hidden
    >
      <Icon size={size} strokeWidth={2.1} />
    </span>
  );
}
