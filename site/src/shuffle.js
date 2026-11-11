// A fair shuffle (Fisher-Yates), in place; returns the same array. Pass the random source in
// use (the staff have a seeded one), so that a seeded run stays repeatable.
// Not `list.sort(() => random() - 0.5)`: a comparison that contradicts itself does not give
// every order an equal chance, and a sort is entitled to do anything at all with it.
export function shuffle(list, random = Math.random) {
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  return list;
}
