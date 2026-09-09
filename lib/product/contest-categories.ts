export const contestCategories = [
  { label: "crypto", value: "crypto" },
  { label: "sports", value: "sports" },
  { label: "politics", value: "politics" },
  { label: "finance", value: "finance" },
  { label: "tech", value: "technology" },
  { label: "culture", value: "culture" },
  { label: "entertainment", value: "entertainment" },
  { label: "predictions", value: "predictions" },
  { label: "other", value: "other" },
] as const;

export type ContestCategory = (typeof contestCategories)[number]["value"];
