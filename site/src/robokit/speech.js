// The pace of what the robots say, in all four places (Anna's House, Vesper Street, Cloud Spring Harbor, Anna's
// Basement): how long a line stays on the screen, how it comes and goes, and how long each turn of a conversation
// between two of them is given. Each site's own speech bubbles (staff/bubbles.js, clerks/bubbles.js,
// faculty/bubbles.js) take their numbers from here, so that a line reads at the same unhurried pace everywhere and
// always fades: it is never simply gone. (Anna, 22 November 2026: "it appears and disappears too quickly, and it
// should maybe fade instead of just disappearing".) Nothing here needs three.js.

// How long a line needs: time to notice it, then a comfortable reading pace. Callers may ask for longer, never shorter.
export const readTime = text => Math.min(20, 4.2 + text.length * 0.1);
// The least a line is given before a newer one may take its place
export const minTime = text => Math.min(8, 2.2 + text.length * 0.05);
// One turn of a conversation between two robots, overheard: the line read through, and a breath before the reply
export const turnTime = text => Math.max(5.5, readTime(text) * 0.85 + 1.2);
// Fades, in seconds: a line coming in, going out when it is finished, going out when its speaker is lost to view (round
// a corner, behind a wall: still a fade), and (milliseconds) one line giving way to the next in the same bubble
export const FADE = { in: 1.1, out: 2.2, lost: 1.4, swap: 1100 };
