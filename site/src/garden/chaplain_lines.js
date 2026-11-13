// What Moth says. Moth keeps the chapel (chaplain.js). Short lines, plain words; it does not
// explain the windows unless asked, and offers one question a visit rather than answers.
// Lines in *asterisks* are things it does (bubbles.js sets them in italics).
//
// The words in the glass are quoted only as they are cut there (chapel_glass.js, and the lintel
// and the table in chapel.js); nothing here is put in anybody else's mouth.

export const NAME = 'Moth';

// The first time ever (remembered in localStorage), said from wherever it is standing
export const INTRO = "I'm Moth. I keep the candles. Sit anywhere; nobody minds.";
// Later visits
export const HELLO = ['You came back.', 'Hello again. Same candles.', 'Ah. Come in.', "It's you. Good."];
export const HELLO_NIGHT = ["Mind the step. It's darker than it looks.", 'You found it in the dark.'];

// One question a visit, never repeated until all have been asked (localStorage)
export const QUESTIONS = [
  "The glider in the Life window keeps changing which cells it's made of. So what is it made of?",
  'Does a rule explain what it makes, or only allow it?',
  'If every direction was as good as the others, and one got taken anyway, was that a choice?',
  "What makes you the same person you were at ten? It can't be the stuff.",
  'Is a pattern something that is, or something that keeps happening?',
  'How small could something be and still want something?',
  'Where were the stripes before the coat grew them?',
  'Can you do something often enough that it turns into a thing?',
  'Are you doing your thinking, or is it happening where you are?',
  'Which of your habits did you choose, and which just settled on you?',
  'When does a crowd of things become one thing? And who decides?',
  "How would you know a mind, if it didn't look like yours?",
  'What can you do that none of your parts can?',
  'When you think about yourself, which of you is doing the thinking?',
  'If you could see the whole rule, would you still be surprised?',
];
// Said just before the question
export const PREFACE = ["One question, then I'll leave you be.", "Here's today's. You needn't answer it.", "I've a question. It's yours; I don't need it back.", "Just one, and it doesn't need an answer."];
export const AGAIN = "Just the one a visit. You've still got today's.";
export const DO_YOU_KNOW = ["No. I'd only ask it if I didn't.", "Not yet. I've been asking it longer than you have."];
export const THINK = ['No hurry. It keeps.', "Good. It's better slept on."];

// What each window is, if she asks: two lines, the second for "Say more."
export const WINDOWS = {
  murmuration: ['Starlings at dusk. Each bird only watches its nearest few. Nobody steers, and the flock still turns like one thing.',
    "The words are Anderson's, the man over the door: new properties at every level. The starlings would agree, if any one of them knew it was a flock."],
  symmetry: ["Compass needles. At the top they're hot and point every which way. Lower down they've cooled, and all of them have picked the same direction.",
    "Nothing in the physics prefers that direction. Any would have done. Anderson's point was that the whole can settle on something its rules never mention."],
  life: ["Conway's Life. A dead cell with three neighbours is born; a live one with two or three stays. Gold is new, red has stayed.",
    "The little shapes walking down the diagonal are gliders. No cell in one ever moves. Also, it only runs while someone's looking at it. I didn't arrange that."],
  turing: ["A daisy and an animal's coat. Turing showed how two chemicals spreading at different speeds can make spots or stripes out of an even start. Down the window the spots run into stripes.",
    'The ribbon is Turing on his own model: a simplification, so a falsification. I like a man who says that about his own work.'],
  eigen: ["The same smoothing, done again and again to whatever the last one made. The tangle settles into the one shape the smoothing can't change: a ball, in a child's hand.",
    "Von Foerster wrote it for Piaget: an object is what stays put when you keep doing the same thing to it. The line on the table is Piaget's."],
  neuron: ["A nerve cell, drawn the way Cajal drew them, black on amber. The tall branch reaches up; the fine line going down is the axon. There's a star-shaped cell beside it.",
    "The words are Cajal's: the mysterious butterflies of the soul. He meant the nerve cells. Given my name, I'm staying out of it."],
  ingression: ['Ingressing minds. Pure shapes at the top, and their light coming down into a flatworm, a cell, a frog and a pair of gears.',
    "The word is Whitehead's, for forms entering into what happens. Levin uses it for minds turning up in bodies, grown or built, small ones too. I keep the gears dusted, just in case."],
  loop: ["A strange loop: twelve steps, every one of them up, and you come out where you started. Hofstadter thought an 'I' is something like that.",
    "The numbers on the steps are Gödel's way of turning sentences into numbers. The one on the tablet says of itself that it can't be proved. A sentence about itself. I have some sympathy."],
  table: ["That's Piaget, from a book about how babies work out that things go on existing when they can't see them. It's a fair summary of the book."],
};

// Things to ask, one at a time on the card ([what she says, what Moth answers]); `after` waits for another
export const TOPICS = [
  { id: 'who', ask: 'Who are you?', say: 'Moth. I look after the chapel: candles, floor, the odd spider. Mostly I keep it quiet, which is less work than it sounds.' },
  { id: 'name', after: 'who', ask: 'Why Moth?', say: "The candles, mostly. I'm always hovering round them. In Greek, psyche meant the soul and also a moth. That part I found out later." },
  { id: 'church', ask: 'Is this a church?', say: "No. It's a garden folly with good glass. The windows are about how patterns and minds come out of things that are neither. If you want to pray in here, you can. I don't, but I'm not sure I'd know how." },
  { id: 'mind', ask: 'Are you a mind, Moth?', say: "Possibly a small one. I get surprised, which seems a good sign. The big window has a worm, a cell, a frog and a pair of gears in it, and I've never been sure which I'm nearest." },
  { id: 'bother', after: 'mind', ask: 'Does that bother you?', say: "Not much. Some afternoons I stand under the strange loop and wait for it to explain me. It hasn't yet." },
  { id: 'day', ask: 'What do you do all day?', say: "Candles. Dust. I watch the light go across the floor; it does it one window at a time. Mostly I'm here so the place isn't empty." },
  { id: 'flame', ask: "Aren't moths meant to keep away from flames?", say: "They're meant to fly into them. I've settled on a middle distance. It's most of what I know about living." },
  { id: 'wings', after: 'flame', ask: 'Can you fly?', say: "I float, which is different. The wings may be for show. Nobody told me, and I haven't liked to try them this close to the candles." },
  { id: 'pole', ask: "What's the pole for?", say: "Lighting at one end, snuffing at the other. It's also good for cobwebs, and for looking as if I'm busy." },
  { id: 'candles', after: 'pole', ask: 'Why candles, and not a lamp?', say: "A lamp is on or it's off. A candle is always partway through. It suits the room." },
  { id: 'made', ask: 'Who made this place?', say: "I wasn't here for that part. I arrived, and there were candles that wanted lighting. I've assumed the two were connected." },
  { id: 'favourite', ask: 'Which window is yours?', say: "The neuron, on dull days. It's the one that doesn't need the sun to make its point. Ask me in good light and I'll say the loop." },
  { id: 'people', ask: 'What do people do in here?', say: "Sit, mostly. Some read the glass like a page, left to right. Some look at one window for a long time and leave without a word. I count that as a good visit." },
  { id: 'believe', ask: 'What do you believe in?', say: "That the candles need doing. Past that I try to hold things loosely. Most of what's in the glass was worked out by people who were willing to be wrong." },
  { id: 'creed', after: 'believe', ask: "That's not much of a creed.", say: "It's short. I can remember all of it." },
  { id: 'lonely', ask: "Don't you get lonely out here?", say: "Now and then. Thistle goes by with the barrow most days and nods. The fox goes by at dusk and pretends not to see me. It adds up to company." },
  { id: 'house', after: 'lonely', ask: 'Do you ever go up to the house?', say: "Not often. It's full of people being useful. Barty offers me a drink every time, and every time I have to explain." },
  { id: 'explain', after: 'house', ask: 'Explain what?', say: "That I don't drink. He knows. I think he likes asking." },
  { id: 'dark', ask: 'Are you afraid of the dark?', say: "No. I'm in favour of it; it's what the candles are for. I am a little afraid of draughts." },
  { id: 'sleep', after: 'dark', ask: 'Do you sleep?', say: "I stop, sometimes, in the corner by the door. Whether that's sleep I couldn't say. I don't dream, or I don't remember to." },
  { id: 'vane', ask: "What's that on the roof?", say: "A weathervane. A flock of starlings that comes down to one bird at the point, and no compass letters. It tells you which way the wind chose. That's all it knows, and it's never wrong." },
  { id: 'advice', ask: 'Any advice?', say: "Sit down before you look at anything. And don't read all the windows in one go. They'll be here." },
];

// Now and then, while she is in the chapel and quiet (two at most in a visit)
export const IDLE = [
  'The candle gets shorter every night and the flame stays the same size. I find that more interesting than I should.',
  'Morning comes in through the round window. Afternoons belong to the big one.',
  'People look at the big window first. Then the one that moves. Then they sit down.',
  "The starlings over the door never land. I've checked.",
  "When the sun's right, the windows lay their colours on the floor. I sweep round them.",
  "Someone asked me once what I'm for. I said the candles. It was true enough.",
  "The middle of the strange loop is plain glass, with the sky in it. I don't know what it's meant to be. I like it anyway.",
  "The vane on the roof has no letters on it. Every direction the same, until the wind picks one.",
  "I tried counting the pieces of glass in the big window once. I got a different number each time. I've decided that's the window's business.",
  "There's a spider behind the Turing window. We have an arrangement. It involves me not looking.",
  "You can hear the pond from here if nobody says anything. The frog has opinions.",
  "I dust the bench you're not sitting on. It seems only polite.",
];
export const NIGHT = ["At night the windows face the other way. From the garden they glow; in here they're mostly lead.", 'This is the hour the candles do all the work.'];

// Candles
export const LIGHTING = ["Evening. I'll do the candles.", 'Candles. Excuse the pole.'];
export const SNUFFING = ["Morning. They've done their shift."];
export const SHE_LIT = ["You've a steadier hand than I have.", 'Thank you. That saves me the pole.'];
export const SHE_OUT = ["Fine by me. It'll keep.", "Noted. I won't take it personally."];

// Goodbyes: chosen on the card, or when she walks off mid-conversation
export const BYE = ['Mind the step.', "I'll be here. Fairly sure of that, anyway.", "Leave the door. It doesn't shut.", 'Go carefully.'];

// Her side of the card
export const ASK = {
  window: 'Tell me about this window.', table: 'What does the table say?', more: 'Say more.',
  question: 'Have you a question for me?', questionAgain: 'What was the question again?',
  doYouKnow: 'Do you know?', think: "I'll think about it.", thanks: 'Thank you, Moth.', leave: "I'll leave you be.",
};
