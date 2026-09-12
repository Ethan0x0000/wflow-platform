type Dict = Record<string, unknown>;

/** Deep-merge language modules; arrays and primitives replace, plain objects merge. */
export function mergeDicts(...dicts: Dict[]): Dict {
  return dicts.reduce<Dict>((acc, dict) => {
    for (const [key, value] of Object.entries(dict)) {
      const current = acc[key];
      if (
        current && typeof current === 'object' && !Array.isArray(current) &&
        value && typeof value === 'object' && !Array.isArray(value)
      ) {
        acc[key] = mergeDicts(current as Dict, value as Dict);
      } else {
        acc[key] = value;
      }
    }
    return acc;
  }, {});
}
