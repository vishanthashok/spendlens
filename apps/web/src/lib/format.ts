export function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function compactMoney(cents: number) {
  const dollars = cents / 100;
  const abs = Math.abs(dollars);
  if (abs >= 1000) {
    const scaled = dollars / 1000;
    const digits = Math.abs(scaled) >= 10 ? 0 : 1;
    return `$${scaled.toFixed(digits)}k`;
  }
  return money(cents);
}

export function shortDate(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function clock(iso: string) {
  const time = iso.slice(11, 16);
  if (!time || !time.includes(":")) return "";
  const [hourRaw, minuteRaw] = time.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const suffix = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function percent(part: number, whole: number) {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}
