/** Build POS select options from General Settings discount list. */
export function buildPosDiscountOptions(settings) {
  const discounts = Array.isArray(settings?.discounts) ? settings.discounts : [];
  const options = [{ name: "", label: "No Discount", rate: 0 }];
  for (const d of discounts) {
    const name = String(d?.name ?? "").trim();
    if (!name) continue;
    const pct = Math.min(100, Math.max(0, Number(d.pct) || 0));
    options.push({
      name,
      label: `${name} (${pct}%)`,
      rate: pct / 100,
    });
  }
  return options;
}

export function discountRateForName(settings, name) {
  const key = String(name ?? "").trim();
  if (!key) return 0;
  const hit = (Array.isArray(settings?.discounts) ? settings.discounts : []).find(
    (d) => String(d?.name ?? "").trim() === key,
  );
  if (!hit) return 0;
  return Math.min(1, Math.max(0, (Number(hit.pct) || 0) / 100));
}

export function discountLabelForName(settings, name) {
  const key = String(name ?? "").trim();
  if (!key) return "No Discount";
  const hit = (Array.isArray(settings?.discounts) ? settings.discounts : []).find(
    (d) => String(d?.name ?? "").trim() === key,
  );
  if (!hit) return "No Discount";
  const pct = Math.min(100, Math.max(0, Number(hit.pct) || 0));
  return `${hit.name} (${pct}%)`;
}

export const FALLBACK_POS_DISCOUNT_SETTINGS = {
  discounts: [
    { name: "Employee", pct: 20 },
    { name: "PWD", pct: 20 },
    { name: "Senior Citizen", pct: 20 },
  ],
  defaultDiscountName: "",
};
