import { Ionicons } from "@expo/vector-icons";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOut, LinearTransition } from "react-native-reanimated";

import { Brand } from "@/constants/brand";
import { sortItems } from "@/store/items";
import type { SavedItem } from "@/types";
import { whenLabel } from "@/utils/when";

const ICON = { reminder: "alarm", task: "checkbox", note: "document-text" } as const;
const TINT = { reminder: Brand.violet, task: Brand.green, note: Brand.pink } as const;

const pad = (n: number) => String(n).padStart(2, "0");
const dayOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Today · Tomorrow · Later · Notes · Done, in that order
function sections(items: SavedItem[]) {
  const today = dayOf(new Date());
  const tomorrow = dayOf(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const groups: Record<string, SavedItem[]> = { Today: [], Tomorrow: [], Later: [], Notes: [], Done: [] };
  for (const i of sortItems(items)) {
    if (i.done) groups.Done.push(i);
    else if (!i.date) groups.Notes.push(i);
    else if (i.date <= today) groups.Today.push(i);
    else if (i.date === tomorrow) groups.Tomorrow.push(i);
    else groups.Later.push(i);
  }
  return Object.entries(groups).filter(([, list]) => list.length > 0);
}

// "My Plan": everything saved on the phone. ✓ = done (keeps it, cancels the
// notification); trash = deleted from the phone for good.
export function Upcoming({ items, onDone, onDelete }: {
  items: SavedItem[];
  onDone: (item: SavedItem) => void;
  onDelete: (item: SavedItem) => void;
}) {
  const open = items.filter((i) => !i.done).length;

  function confirmDelete(item: SavedItem) {
    Alert.alert("Delete this?", `“${item.title}” will be removed from your phone${item.notificationId ? " and its reminder cancelled" : ""}.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => onDelete(item) },
    ]);
  }

  return (
    <View style={styles.box}>
      <View style={styles.head}>
        <Text style={styles.heading}>My Plan</Text>
        <Text style={styles.count}>{open} open</Text>
      </View>

      {items.length === 0 && (
        <View style={styles.empty}>
          <Ionicons name="sparkles-outline" size={22} color={Brand.textFaint} />
          <Text style={styles.emptyText}>Nothing saved yet. Call your assistant and say “Kal subah 9 baje client ko call karna hai”.</Text>
        </View>
      )}

      {sections(items).map(([name, list]) => (
        <View key={name} style={styles.section}>
          <Text style={styles.sectionTitle}>{name.toUpperCase()}</Text>
          {list.map((i) => (
            <Animated.View key={i.id} layout={LinearTransition} entering={FadeInDown} exiting={FadeOut}
              style={[styles.row, i.done && styles.rowDone]}>
              <View style={[styles.icon, { backgroundColor: `${TINT[i.intent]}26` }]}>
                <Ionicons name={ICON[i.intent]} size={18} color={TINT[i.intent]} />
                {/* reminder is set: a small bell badge on the icon's corner */}
                {!!i.notificationId && !i.done && (
                  <View style={styles.bell}>
                    <Ionicons name="notifications" size={10} color={Brand.bg} />
                  </View>
                )}
              </View>
              <View style={styles.text}>
                <Text style={[styles.title, i.done && styles.titleDone]} numberOfLines={1}>
                  {i.title}{i.priority === "high" ? "  🔥" : ""}
                </Text>
                {/* under TODAY / TOMORROW the day is already said: show just the time */}
                <Text style={styles.meta} numberOfLines={1}>
                  {(name === "Today" || name === "Tomorrow" ? whenLabel(null, i.time) : whenLabel(i.date, i.time)) ?? (i.intent === "note" ? "Note" : "Any time")}
                </Text>
              </View>
              {!i.done && (
                <Pressable onPress={() => onDone(i)} hitSlop={8} style={[styles.action, styles.doneBtn]}
                  accessibilityRole="button" accessibilityLabel={`Mark ${i.title} done`}>
                  <Ionicons name="checkmark" size={18} color={Brand.green} />
                </Pressable>
              )}
              <Pressable onPress={() => confirmDelete(i)} hitSlop={8} style={[styles.action, styles.deleteBtn]}
                accessibilityRole="button" accessibilityLabel={`Delete ${i.title}`}>
                <Ionicons name="trash-outline" size={17} color={Brand.red} />
              </Pressable>
            </Animated.View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: "100%",
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 24,
    padding: 16,
    gap: 6,
  },
  head: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 },
  heading: { color: Brand.text, fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  count: { color: Brand.textMuted, fontSize: 13, fontWeight: "600" },
  empty: { flexDirection: "row", gap: 10, alignItems: "center", paddingVertical: 10 },
  emptyText: { flex: 1, color: Brand.textMuted, fontSize: 14, lineHeight: 20 },
  section: { gap: 8, marginTop: 8 },
  sectionTitle: { color: Brand.textFaint, fontSize: 11, fontWeight: "800", letterSpacing: 1.4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: Brand.surfaceRaised,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  rowDone: { opacity: 0.55 },
  icon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  bell: {
    position: "absolute", top: -5, right: -5, width: 18, height: 18, borderRadius: 9,
    alignItems: "center", justifyContent: "center", backgroundColor: Brand.green,
    borderWidth: 2, borderColor: Brand.surfaceRaised,
  },
  text: { flex: 1, gap: 3 },
  title: { color: Brand.text, fontSize: 16, fontWeight: "700" },
  titleDone: { textDecorationLine: "line-through", color: Brand.textMuted },
  meta: { color: Brand.textMuted, fontSize: 13 },
  action: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  doneBtn: { borderColor: Brand.green, backgroundColor: Brand.greenSoft },
  deleteBtn: { borderColor: "rgba(255, 77, 94, 0.5)", backgroundColor: Brand.redSoft },
});
