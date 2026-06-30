import type { MethodCard, MethodPreference, TrackingTool, UserProfile } from "./models.ts";

export const METHOD_CARDS: MethodCard[] = [
  {
    id: "symptothermal",
    methodId: "sensiplan",
    title: "Symptothermal learning",
    subtitle: "BBT plus cervical mucus cross-checking",
    bestFor: "People with a thermometer or wearable temperature source and mucus observations.",
    requirements: ["manual_bbt", "cervical_mucus"],
    caution: "Best used with qualified instruction when avoiding pregnancy.",
  },
  {
    id: "symptohormonal",
    methodId: "marquette",
    title: "Symptohormonal learning",
    subtitle: "LH tests with optional mucus or BBT cross-checks",
    bestFor: "People who want hormone-test support or are trying to conceive.",
    requirements: ["lh_tests"],
    caution: "Protocol details vary by method and life stage.",
  },
  {
    id: "mucus_only",
    methodId: "billings",
    title: "Mucus-only learning",
    subtitle: "Daily sensation and cervical fluid patterns",
    bestFor: "People without temperature tools who want body-literacy-first tracking.",
    requirements: ["cervical_mucus"],
    caution: "Observation quality and instruction matter a lot.",
  },
  {
    id: "temperature_calendar",
    methodId: "natural_cycles",
    title: "Temperature/calendar learning",
    subtitle: "Temperature shift plus cycle history",
    bestFor: "People with consistent BBT or wearable temperature data.",
    requirements: ["manual_bbt", "calendar_history"],
    caution: "This MVP does not provide Natural Cycles-style contraception decisions.",
  },
  {
    id: "calendar_only",
    methodId: "rhythm",
    title: "Calendar-only education",
    subtitle: "Past cycle length arithmetic",
    bestFor: "People with only cycle dates available.",
    requirements: ["calendar_history"],
    caution: "Calendar-only methods are less reliable and are shown here for education.",
  },
];

export function toolsInclude(tools: TrackingTool[], wanted: TrackingTool): boolean {
  return tools.includes(wanted) || (wanted === "manual_bbt" && (tools.includes("apple_watch") || tools.includes("oura")));
}

export function recommendMethod(profile: Pick<UserProfile, "tools" | "lifeStage" | "goals">): MethodCard {
  if (profile.lifeStage === "post_menopause") {
    return {
      id: "none",
      methodId: "none",
      title: "Wellness tracking",
      subtitle: "No cycle method needed",
      bestFor: "Post-menopause symptom, reminder, and wellness tracking.",
      requirements: [],
      caution: "Cycle interpretation is disabled for post-menopause mode.",
    };
  }

  const hasTemp = toolsInclude(profile.tools, "manual_bbt");
  const hasMucus = toolsInclude(profile.tools, "cervical_mucus");
  const hasLh = toolsInclude(profile.tools, "lh_tests");
  const hasHistory = toolsInclude(profile.tools, "calendar_history");

  if (hasTemp && hasMucus) return METHOD_CARDS[0];
  if (hasLh) return METHOD_CARDS[1];
  if (hasMucus) return METHOD_CARDS[2];
  if (hasTemp || hasHistory) return METHOD_CARDS[3];
  return METHOD_CARDS[4];
}

export function methodIdFromPreference(preference: MethodPreference, profile: Pick<UserProfile, "tools" | "lifeStage" | "goals">): string {
  if (preference === "pick_for_me") return recommendMethod(profile).methodId;
  return METHOD_CARDS.find((card) => card.id === preference)?.methodId ?? "sensiplan";
}

export function methodCardsForProfile(profile: Pick<UserProfile, "tools" | "lifeStage" | "goals">): MethodCard[] {
  const recommended = recommendMethod(profile);
  const cards = profile.lifeStage === "post_menopause" ? [recommended] : METHOD_CARDS;
  return cards.map((card) => (card.id === recommended.id ? { ...card, title: `${card.title} (picked for you)` } : card));
}
