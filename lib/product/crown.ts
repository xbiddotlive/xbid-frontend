export type ContractCrownSide = 1 | 2;

/** Converts the Solidity CrownSide enum (None=0, A=1, B=2) to the UI side index. */
export function crownSideIndex(crownSide: ContractCrownSide | null): 0 | 1 | null {
  if (crownSide === 1) return 0;
  if (crownSide === 2) return 1;
  return null;
}
