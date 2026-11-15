import { niceDay } from "./clock";
import type { Kind, Store, Task } from "./types";

// Part 3: the agent's world is a street of small shops: a bakery, a decor shop, a gift shop …
// They are pretend shops: no real orders, no real money. But they behave like real ones:
// every task has a few choices, each with a price, a rating and a delivery time.
// The same task always gets the same choices, so a recording is easy to repeat.

export type Option = { shop: string; item: string; price: number; rating: number };

const SHOPS: Record<Kind, [string, string][]> = {
  cake: [["Cake Corner", "Chocolate truffle cake, 1 kg"], ["Sweet Treats Bakery", "Black forest cake, 1 kg"], ["Royal Cakes", "Photo cake, 1.5 kg"]],
  food: [["Snack Shack", "Samosa and chips party pack"], ["Pizza Point", "4 large chicken pizzas"], ["Tasty Tiffins", "Mini thali for 10"]],
  decor: [["Balloon Bazaar", "Balloons and a banner"], ["Party Pals", "Balloon arch and lights"], ["Dream Decor", "Full theme decoration"]],
  gift: [["Toy Town", "10 small toy sets"], ["Gift Galaxy", "10 chocolate hampers"], ["Happy Hamper", "10 custom mugs"]],
  invite: [["QuickInvite", "Digital invite to 20 people"], ["CardCraft", "Printed cards, 20"], ["InviteHub", "Video invite to 20 people"]],
  travel: [["QuickTrips", "Standard cab or train ticket"], ["YatraGo", "Comfort cab or AC train ticket"], ["Comfort Travels", "Premium cab or 1st-class train"]], // Part 5: cabs and trains
  // Part 5: a studio upgrade and a shoot trip
  flight: [["SkyHop", "Economy round trip"], ["IndiFly", "Economy round trip, extra bag"], ["Jetline Plus", "Premium economy round trip"]],
  gear: [["GearDepot", "Basic backdrop + stand"], ["CreatorKart", "Backdrop kit + tripod"], ["StudioPro Supply", "Pro backdrop system + tripod"]],
  stay: [["Budget Inn", "Room, 2 nights"], ["Sea View Stays", "Sea-view room, 2 nights"], ["Grand Palms", "Resort room, 2 nights"]],
  audio: [["SoundMart", "Wired studio mic + arm"], ["MicPro Store", "Wireless mic kit, 2 mics"], ["AudioHaus", "Pro wireless mic kit + recorder"]],
  camera: [["CamCorner", "Used mirrorless body"], ["LensKart Pro", "Mirrorless body + kit lens"], ["Pixel Pro Store", "Full-frame body + lens"]],
  light: [["LightBox", "2 LED panels"], ["GlowGear", "Key light + softbox"], ["Studio Lux", "3-light kit with stands"]],
  other: [["Local Mart", "Party supplies"], ["Party Store", "Party supplies kit"], ["Mega Mart", "Premium party kit"]],
};

const round10 = (n: number) => Math.max(0, Math.round(n / 10) * 10);

// Three choices around the plan's estimate: cheaper, about right, and a premium one.
export function optionsFor(t: Pick<Task, "kind" | "cost">): Option[] {
  const shops = SHOPS[t.kind] ?? SHOPS.other;
  const base = Math.max(t.cost, 0);
  const prices = base === 0 ? [0, 0, 0] : [round10(base * 0.8), round10(base * 0.95), round10(base * 1.4)];
  const ratings = [4.2, 4.7, 4.9];
  return shops.map(([shop, item], i) => ({ shop, item, price: prices[i], rating: ratings[i] }));
}

export const spent = (tasks: Task[]) => tasks.reduce((n, t) => n + (t.order?.price ?? 0), 0);
export const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

// The shop's own order list: everything that was really saved.
export function orderList(tasks: Task[]) {
  return tasks.filter((t) => t.order).map((t) => ({ ref: t.ref, title: t.title, ...t.order!, by: niceDay(t.day) }));
}

// VERIFY: never trust "ordered". Read the shop's order list back and check the order is really there and really fits.
export async function verifyOrder(store: Store, ref: string): Promise<string[]> {
  const tasks = await store.listTasks();
  const t = tasks.find((x) => x.ref === ref);
  if (!t) return [`${ref} does not exist.`];
  if (!orderList(tasks).some((o) => o.ref === ref)) return [`${ref} is NOT in the order list.`];

  const problems: string[] = [];
  const budget = await store.getBudget();
  if (budget && spent(tasks) > budget) problems.push(`Total ${rupees(spent(tasks))} is over the budget of ${rupees(budget)}.`);
  for (const d of t.dependsOn) {
    const dep = tasks.find((x) => x.ref === d);
    if (dep && !dep.order) problems.push(`${ref} is ordered, but ${d} (which must come first) is not.`);
  }
  return problems;
}
