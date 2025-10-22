export type AreaOption = {
  id: string;
  label: string;
  description?: string;
};

export const AREA_OPTIONS: AreaOption[] = [
  {
    id: "14410",
    label: "Mont-Blanc Massif",
    description: "Mont-Blanc range and satellites",
  },
  {
    id: "14404",
    label: "Haut Giffre · Aiguilles Rouges · Fiz",
    description: "North of Chamonix valley",
  },
  {
    id: "14411",
    label: "Chablais",
    description: "Western Alps between Léman and Mont-Blanc",
  },
];

export const DEFAULT_AREA_IDS = AREA_OPTIONS.slice(0, 2).map((area) => area.id);

export function normaliseAreaIds(
  ids: ReadonlyArray<string | number>,
): string[] {
  return Array.from(
    new Set(
      ids
        .map((value) => String(value).trim())
        .filter((value) => value.length > 0),
    ),
  );
}
