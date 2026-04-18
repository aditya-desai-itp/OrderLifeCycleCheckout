export const deterministicRandom = (seedStr: string): number => {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) hash = Math.imul(31, hash) + seedStr.charCodeAt(i) | 0;
  return (Math.abs(hash) % 50) + 10; // Stable random number between 10 and 60
};