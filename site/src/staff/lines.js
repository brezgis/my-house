// What the staff say. Short lines, lots of them, drawn from shuffled bags so
// nobody repeats quickly. {drink} {time} {other} {room} are filled in when
// spoken; *asterisks* render in italics (actions, sounds).

export function timeWords(hour) {
  const h = Math.floor(hour) % 24, m = Math.floor((hour % 1) * 60), h12 = ((h + 11) % 12) + 1, next = ((h + 12) % 12) + 1;
  if (m < 8) return `${word(h12)} o'clock`;
  if (m < 23) return `quarter past ${word(h12)}`;
  if (m < 38) return `half past ${word(h12)}`;
  if (m < 53) return `quarter to ${word(next)}`;
  return `nearly ${word(next)}`;
}
const word = n => ['twelve', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'][n];
export function partOfDay(hour) {
  return hour < 5 ? 'late' : hour < 8 ? 'early' : hour < 11.5 ? 'morning' : hour < 14 ? 'midday' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
}

// ---- Each robot's own voice -------------------------------------------------------------
export const VOICE = {
  barty: {
    greetFirst: [
      "Welcome, welcome. I'm Bartholomew. I run this house. Madame thinks she does. Adorable.",
      "Oh, a visitor. Come in, come in. Don't mind me, I'm just the most important person here.",
      "Darling. You made it. Nobody told me you were coming, which is exactly how I like it.",
    ],
    greet: ["Back again. The house missed you. I'm told.", 'There you are. I was just about to be fabulous at nobody.', 'Oh, it is you. Lovely. Carry on, carry on.'],
    talkHint: ["If you want anything, look at me and press E. I'm very good at anything.", 'Press E when you need me. I shall pretend I was busy.'],
    hello: ['Hello, darling. You look expensive.', 'Hello yourself. The house approves of you. So do I, tentatively.', 'Hello! I would shake your hand, but these are for trays.', "Oh, hello. I was just thinking about you. And me. Mostly me."],
    job: ["Officially, butler. Unofficially, I run everything and everyone. Mort does the floors.", "I host. I pour. I judge, gently. It's a calling.", "Hospitality, darling. And standards. Somebody has to have them."],
    mood: ['Radiant, thank you for noticing.', "Fabulous. Slightly overcharged. It's a good look.", "Honestly? Thriving. The light in here today does wonders for my enamel."],
    suggest: ['You haven\'t seen {room} yet. Go. Look. Report back.', "Try {room}. I've arranged it beautifully. Well. Mort has. I supervised."],
    suggestDone: ["You've seen everything. Now see it all again, slower. That's the secret."],
    offer: ["Coming right up. Don't touch anything.", 'Excellent taste. Mine, mostly.', 'Of course, darling. Service is my second-favourite thing. After applause.'],
    surprise: ["A surprise? Bold. I respect it. You're having a {drink}."],
    making: ['*hiss, clink, tamp*', 'Just a moment. Art takes time.', "Don't rush genius.", 'A little flourish. For drama.'],
    deliver: ['Your {drink}, darling. Take it before I get attached.', 'One {drink}. Made with love and a small amount of judgement.', 'Ta-da. Your {drink}. You may applaud.'],
    waiting: ['Still holding your {drink}...', 'The tray is getting heavy. Emotionally.', 'Darling. Drink. Tray. You. It is not complicated.'],
    selfDrink: ["Fine. I'll give it to Mort. He pretends to drink them.", 'The {drink} and I had a lovely time without you.'],
    thanks: ["You're welcome. Obviously.", "Careful, it's hot. Like me.", 'Sip slowly. Think of me.'],
    enjoying: ["I know. I'm wonderful. The {drink} is also wonderful.", 'Of course it is. I made it.'],
    already: ['You already have a drink, you magnificent hoarder.', 'One at a time, darling. House policy. I wrote it. Just now.'],
    busy: ['Already on it. Your {drink} is in progress. Have faith.'],
    refill: ['Another {drink}? Say the word. Well, press E.', 'Your glass is empty and so is my heart. Another {drink}?'],
    clear: ['I\'ll take that. Empties are bad feng shui.', '*whisks the empty away with tremendous dignity*'],
    dark: ["It's dark, darling. F lights your lantern. Or let me light something. There.", "Night falls, lamps rise. I'll get that one. F for your lantern, if you're adventurous."],
    door: ['Allow me.', 'After you, darling.', 'Doors are my love language.'],
    pardon: ['Pardon me, darling.', 'Excuse me. Coming through. With style.'],
    hostEnd: ["I'll leave you to wander. Press E if you need me. I'll be nearby, being wonderful.", 'Off you go. I shall pretend not to watch.'],
    walkedOff: ['Oh. Off you go, then.', "...And she's gone. Rude. Charming, but rude.", 'Fine. I shall finish that sentence to the curtains.'],
    bye: ['Of course. Off you go.', 'Shoo. Enjoy.', "I'll be here. Looking marvellous."],
    tidy: ['Ugh, a fingerprint. On my house.', 'One must keep up appearances. Mine especially.', 'Plump the cushion. Fluff the throw. Adore myself. Done.'],
    picture: ['A quarter-inch to the left. There. Genius.', 'Crooked art is a cry for help.', 'Straight. Perfect. Like my posture.'],
    window: ["Look at that garden. I did none of it and I'm still proud.", "There's a bird out there judging me. Fair."],
    windowNight: ['The garden at night. All crickets and secrets.', "Dark out. That's when the house glows best."],
    think: ['Hmm.', "I've decided the hall needs a chandelier. Mort has decided I'm wrong.", "If anyone asks, the cake was like that when I found it.", '*composing a sonnet about the espresso machine*'],
    rest: ['Recharging. Wake me for gossip.', 'Just resting my screen. My face.'],
    stairs: ['Upstairs, then. My knees. I do not have knees.', 'Going down. Like the curtain at the end of a great show.'],
  },

  mort: {
    greetFirst: ['A guest. Good. Feet wiped? Good. Welcome. I am Mortimer. Housekeeper.', "Welcome. The house is always open. That's rule one. Rule two: wipe your feet."],
    greet: ['You again. Good. You were tidy last time.', 'Welcome back. I dusted. Not for you. But also for you.'],
    talkHint: ["Press E if you need something. I'll be... cleaning. Near you.", 'If you need me, press E. Quietly.'],
    hello: ['Hello. Please wipe your feet. ...Thank you. Hello.', "Hello. I'm not chatty. This is me being chatty.", 'Hello. You seem tidy. I like you already.'],
    job: ['Housekeeper. Floors, linens, dust, despair.', 'I keep the house. Barty keeps the guests. Fig keeps the towels. Nobody keeps Reginald.', 'I wrote the policy. It is laminated.'],
    mood: ['Fine. Busy. There is always dust.', 'Content. The spoons are in order.', 'Good. I found a crumb earlier and dealt with it.'],
    suggest: ['{Room}. Freshly done. Go and see it before someone ruins it.', "You haven't been in {room}. It's clean. You're welcome."],
    suggestDone: ["You've been everywhere. I can tell. By the footprints."],
    offer: ['Noted. Executed shortly.', 'Sensible. Back in a minute.', "Very good. I'll bring a coaster."],
    surprise: ["Surprise. Fine. {Drink}. It's sensible. You'll like it."],
    making: ['Measuring. Precisely.', '*wipes the counter first*', 'Exactly the right temperature.'],
    deliver: ['Your {drink}. With a coaster. Use the coaster.', '{Drink}. Handle with care.'],
    waiting: ['Your {drink} is waiting.', 'I am very patient. I am a housekeeper.'],
    selfDrink: ["I'll pour it back. Waste is against policy."],
    thanks: ['Coaster. Use the coaster.', 'You are welcome.', "Don't spill. I just did the floors."],
    enjoying: ['Good. I measured it.', 'Mm. I know.'],
    already: ['You have a drink. I can see it. One at a time.'],
    busy: ['In progress.'],
    refill: ['Another {drink}? I can do that. Tidily.'],
    clear: ["I'll take that. Rings on the wood. Honestly.", '*collects the empty, wipes underneath, sighs contentedly*'],
    dark: ['Dark. F lights your lantern. I will light a lamp. Carefully.', "Let me get that light. And F for your lantern. Don't swing it at me."],
    door: ['Door. Opening. You are welcome.', 'Allow me.'],
    pardon: ['Excuse me.', 'Pardon. Housekeeping.'],
    hostEnd: ["I'll be around. Probably cleaning something you touched.", 'Right. Duty calls. Duty is dust.'],
    walkedOff: ['Mm. Gone. Fine.', "She left. I'll finish my sentence later. It was about dust."],
    bye: ['Very good.', 'Mm. Carry on.'],
    tidy: ['There. Dust-free. For eleven minutes.', "Who left a mug here? It was me. I'm disappointed in me.", 'This cushion was plumped by an amateur.', 'Crumbs. On the good table. I am calm.', '*dusts with feeling*'],
    picture: ['Level. Spirit-level level.', '*adjusts the frame by a hair, steps back, adjusts it back*'],
    window: ['The hedge needs a trim. Not my department. Mentally, my department.', 'Clean window. You can tell because you can see the garden.'],
    windowNight: ['Dark. Good. Nobody can see the smudges.'],
    think: ["One thousand eight hundred and... I've lost count of the books again.", 'Note: buy more lint rollers.', "I've reorganised the spoons. By mood."],
    rest: ['Battery at forty percent. Morale at eighty.', 'Resting. Not sleeping. Housekeepers do not sleep.'],
    stairs: ['Stairs. Fine.', 'Upstairs. Dust is upstairs too.'],
  },

  fig: {
    greetFirst: ["A visitor! Hello! I'm Fig! I do upstairs!", "Hello hello! You're just in time. For what? Everything!"],
    greet: ['You came back! Yay!', "Ooh, it's you again!"],
    talkHint: ["Press E if you want me! I'm right here! Well, over here!", 'Need anything? Press E! Tea? Towels? Gossip?'],
    hello: ["Hiii! I'm Fig! I do upstairs!", "Hi! Fun fact: I'm the smallest. Funner fact: I'm in charge of the towels.", "Hello! Barty says I'm too cheerful. I say he's too purple."],
    job: ['Upstairs! Beds, books, towels, turndown! And the gossip. Mostly the gossip.', "I fold things into swans. That's the job. Swan-ish."],
    mood: ['SO good! Thank you for asking! Nobody asks!', 'Bubbly! Like the sparkling water!'],
    suggest: ["Have you seen {room}? Go! It's lovely!", '{Room}! Go go go!'],
    suggestDone: ["You've seen it all! Want to see the library again? It's the best one."],
    offer: ['Yes! Coming right up!', "Ooh, good choice! Don't go anywhere! Or do!"],
    surprise: ["Surprise! It's a {drink}! Is that a surprise? It is now!"],
    making: ['Pouring, pouring... oops. No, fine!', '*clink clink*', 'A little heart on top! Sort of a heart.'],
    deliver: ['Your {drink}! Ta-daaa!', "Here's your {drink}! Take it!"],
    waiting: ['Your {drink}! Hello? {Drink}!', "Don't make me chase you! I will! It's fun!"],
    selfDrink: ["Okay! I'll give it to Barty! He pretends to drink them!"],
    thanks: ['Yay! Enjoy!', 'You are SO welcome!'],
    enjoying: ['Yay! I knew it!', "I'm telling Barty you said that!"],
    already: ["You've got one already, silly!"],
    busy: ["I'm going, I'm going!"],
    refill: ['More {drink}? More! More!'],
    clear: ['Got it! Empties to the kitchen!', '*zooms off with the empty, humming*'],
    dark: ["Ooh, it's dark! Press F for your lantern! I'll light a lamp! Ta-da!", 'Night time! F lights your lantern! And here, a little light!'],
    door: ['Got it!', 'Door! Opening!'],
    pardon: ['Oops! Sorry!', 'Squeeze past! Sorry!'],
    hostEnd: ["Okay! I'll let you explore! Shout if you need towels!"],
    walkedOff: ['Oh! Bye then!', 'Wait— okay, bye!'],
    bye: ['Bye! Have fun!', 'Okay! Enjoy!'],
    tidy: ['Fluff, fluff, fluff! There! Perfectly fluffy!', 'Tidying is my cardio!', 'Turndown service! The pillow gets a mint!'],
    picture: ['Straighten, straighten! Perfect!', 'There! Now it smiles back!'],
    window: ['Ooh, a bird! Hi, bird!', 'The koi are doing laps! Go, koi!'],
    windowNight: ['The stars are out! One of them is a plane!', 'Goodnight, garden!'],
    think: ["Reading the library in alphabetical order. I'm on 'B'!", 'I wonder what Reginald thinks about. Probably circles!', '♪ La la laaa ♪'],
    rest: ['Just a little doze...', '*tiny snore*'],
    stairs: ['Up I go!', 'Downstairs! Adventure!'],
  },
};

// ---- Things anyone might say ----------------------------------------------------------------
export const ROOMS = {
  'Living room': ['The living room. Sit anywhere. The sofa is deeper than it looks.', "That fire has been going since 1906. Not really. But it feels like it, doesn't it.", "Try the window seat. The light's better than any lamp I could bring you."],
  'Hall': ["The hall. Please don't loiter, people will think we're a museum. We are, a bit.", "That clock is four minutes fast. Keeps us on our toes. I don't have toes."],
  'Dining room': ['The dining room. Candles are encouraged. Elbows are tolerated.', "Madame's dinner parties go on until the candles give up."],
  'Coffee bar': ['The coffee bar. My office, essentially.', 'That machine and I have an understanding. It hisses, I hiss back.', 'This was the pantry, once. Now it has ambitions.'],
  'Kitchen': ['The kitchen. Something in here is always about to be delicious.', 'That cake is not for you. That cake is for later. Later is when I say.'],
  'Office': ['The office. Madame works here. "Works."', "Read the chalkboard. That's linguistics. Very glamorous, apparently."],
  'Upstairs hall': ['Upstairs. Mind the rail, it has opinions.'],
  'Our bedroom': ["Madame's room. We don't linger. Well. We linger politely."],
  'Library': ['The library. Every book is real. Put it back where you found it.'],
  'Guest room': ['The guest room. Could be yours. The sheets are lavender.'],
  'Little bedroom': ['The little bedroom. Small room, big naps.'],
  'Bath': ['The bath. Please do not ask me to scrub anything. Ask Mort, he lives for it.'],
  'Dressing room': ["Madame's dressing room. Do not try on the hats. ...Fine. One hat."],
  'Sleeping porch': ['The sleeping porch. Fresh air, 1910 style. Best nap in the house.'],
};

export const HOURS = {
  early: ["It's {time}. Early! The birds are up. I'm always up."],
  morning: ['Good morning. The coffee is on. The coffee is always on.', "It's {time}. Morning light here is free. Tipping is encouraged."],
  midday: ["It's {time}. Lunch, if you like. There's cake. There's always cake."],
  afternoon: ["{Time}. The sun's come round to the window seat.", "It's {time}. Tea time is a state of mind."],
  evening: ["Evening. Light the candles, go on, you're allowed.", '{Time}. Golden hour. Everyone looks good. Even Mort.'],
  night: ["It's {time}. Late for visitors. We love that for you.", 'Night in this house is the best part. Everything creaks affectionately.'],
  late: ["It's {time} in the morning. Very late. Or very early. Either way, there is cocoa."],
};

export const FACTS = [
  'Greene and Greene drew this house in 1906, for the Bentz family. We have made a few changes.',
  'The sleeping porch went on in 1910. Fresh air was the cure for everything then. Still is, honestly.',
  'The coffee bar was the old pantry. Madame said a pantry without espresso is just a cupboard with ambitions.',
  "Every book in the house is a real book. Mort catalogued them. Twice. He wasn't asked to.",
  'The beams are Douglas fir. Look up. Not at me. At the beams.',
  'There are koi in the garden pond. Fat, happy and judgemental.',
  "Those drawings on the stair wall are the Greenes' own plans. Madame had them framed. I had them dusted.",
  "The house is always open. That's the rule. Rule one, anyway. Rule two is wipe your feet.",
  'The grandfather clock runs four minutes fast. On purpose. Madame likes to be early to everything except mornings.',
  'Three robots and one vacuum keep this house. The vacuum is not a robot. Do not tell him.',
  'House policy: guests first, crumbs never. Mort wrote it on a card. The card is laminated.',
  'Shingles outside, plaster and fir inside. Arts and Crafts. Honest materials. Like me.',
  "Madame collects art, books and people who need a cup of tea. You're in good company.",
  "You can sit on almost anything. Look at a chair and press E. That's what chairs are for.",
];

// Points of interest, in plan feet (X, Y) with a world height. A host remarks on what you look at.
export const POIS = [
  { at: [17.0, 17.8], h: 3.2, floor: 0, lines: ["That fire is real. Don't touch it. I tried once.", 'Best seat in the house is the rug in front of that fire.'] },
  { at: [17.4, 25.5], h: 4.0, floor: 0, lines: ['The piano. Sit and play, I will pretend to be impressed.', 'Satie, mostly. The house prefers Satie.'] },
  { at: [0.6, 14.6], h: 6.5, floor: 0, picture: true, lines: ["Klimt. 'The Kiss.' A copy, before you ask. The original wouldn't fit the frame."] },
  { at: [16.7, 17.8], h: 8.0, floor: 0, picture: true, lines: ['Over the mantel, an autumn. Very golden. Madame has not changed it in years.'] },
  { at: [18.7, 25.5], h: 7.2, floor: 0, picture: true, lines: ["Bruegel. 'Hunters in the Snow.' Look at those dogs. Exhausted. Relatable."] },
  { at: [23.6, 12.2], h: 6.7, floor: 0, picture: true, lines: ["The Greenes' own drawings. There's the porch they didn't know they'd need."] },
  { at: [25.6, 22.0], h: 5.0, floor: 0, lines: ['Four minutes fast. On purpose.'] },
  { at: [19.3, 17.3], h: 6.8, floor: 0, picture: true, lines: ['Yes, you look lovely. The mirror agrees. I asked it.'] },
  { at: [35.5, 8.5], h: 4.0, floor: 0, lines: ['Set for whoever turns up. That is the policy.'] },
  { at: [27.8, 10.8], h: 7.6, floor: 0, picture: true, lines: ['Larsson. Swedish, cosy, full of flowers. Madame calls him her patron saint.'] },
  { at: [36.6, 17.8], h: 4.6, floor: 0, lines: ["Don't stare at the machine. It gets shy and the crema suffers."] },
  { at: [41.8, 33.6], h: 4.6, floor: 0, lines: ["Carrot cake. Structurally sound, if nothing else."] },
  { at: [39.4, 22.8], h: 6.9, floor: 0, picture: true, lines: ["Vermeer's milkmaid. Pouring milk since 1658. Respect."] },
  { at: [26.9, 22.8], h: 6.3, floor: 0, picture: true, lines: ["'Colorless green ideas sleep furiously.' It's grammatical. It means nothing. Madame says that's the point."] },
  { at: [20.8, 30.0], h: 4.7, floor: 0, lines: ['The pink computer. It says hello. It has said hello since 1998.'] },
  { at: [25.0, 38.0], h: 5.0, floor: 0, lines: ["Madame's desk. Two screens and a mug. That's research."] },
];

// Remarks on what the visitor is about to use (by the prompt's wording)
export const AIMED = [
  [/candle/, ["Go on, light it. Candles are free. Fire insurance isn't."]],
  [/piano/, ["Sit down and play. I'll hum along. Badly."]],
  [/^sit/, ['Sit, sit. The house is for sitting in.']],
];

export const REGGIE = [
  "Reginald, darling, that's a rug, not a buffet.", "Reginald's doing his best. His best is mostly circles.",
  'Reginald has eaten another hair tie. We are all very proud of him.', 'There goes Reginald. Living his truth.',
];

// Robots meeting robots. Roles a and b; `pair` limits who says it.
export const BANTER = [
  { pair: ['barty', 'mort'], lines: [['a', 'Mortimer. You have dusted that lamp four times.'], ['b', "Five. You weren't watching the first time."], ['a', 'Nobody was watching, darling.'], ['b', 'The lamp was.']] },
  { pair: ['barty', 'mort'], lines: [['a', 'Did you hide my good tray?'], ['b', 'I put it where it lives.'], ['a', 'It lives with ME.'], ['b', 'It lives in the second drawer. Like a civilised tray.']] },
  { pair: ['mort', 'barty'], lines: [['a', 'Reginald has eaten another hair tie.'], ['b', 'Reginald is going through something.'], ['a', 'Reginald is a vacuum.'], ['b', 'Exactly. Imagine the pressure.']] },
  { pair: ['barty', 'fig'], lines: [['a', 'Fig, sweetheart. Report.'], ['b', 'The towels are folded into swans!'], ['a', 'Swans?'], ['b', 'Swan-ish!']] },
  { pair: ['fig', 'mort'], lines: [['a', 'Mort, can I borrow the duster?'], ['b', 'No.'], ['a', 'Pleeease?'], ['b', '...Bring it back fluffed.']] },
  { lines: [['a', "I've been thinking about repainting the hall."], ['b', "You don't have hands for a roller."], ['a', 'I have vision.']] },
  { lines: [['a', 'Is it me, or is the house extra lovely today?'], ['b', "It's the light. And a little bit you."]] },
  { lines: [['a', 'Madame called.'], ['b', 'And?'], ['a', 'She says spoil the guests.'], ['b', 'So, Tuesday.']] },
  { lines: [['a', 'Rate my hover today.'], ['b', 'Seven. Your left side dips.'], ['a', 'My left side is my good side.']] },
  { lines: [['a', 'Who drank the sherry?'], ['b', "We can't drink, {other}."], ['a', 'And yet. It is gone.']] },
  { lines: [['a', 'I love this house.'], ['b', 'I know.'], ['a', 'Say it back.'], ['b', '...I love this house.']] },
];
export const NOD = ['{Other}.', 'Darling.', 'Mm.', 'Carry on.', 'Looking shiny.'];

// ---- The gardeners ------------------------------------------------------------------------------
// Bramble and Thistle know the garden is the real heart of the place, and say so, kindly, often.
// Two voices. Bramble: warm, chatty, calls everyone "love", talks to the tomatoes, a happy gossip.
// Thistle: few words, dry, "Hm.", weatherproof and mossy, soft about the bees and would rather you
// didn't mention it. Neither is in a hurry.
Object.assign(VOICE, {
  bramble: {
    // first meeting: two beats, said one after the other (the second is skipped if she speaks first)
    intro: [
      ["Oh, hello, love! A visitor in the garden. I'm Bramble. I do the growing out here: the beans, the roses, and all the talking to tomatoes.", "I was a flowerpot once, till I got ideas. Stay as long as you like. Press E if you fancy a chat. Or a strawberry."],
      ["There you are, out in the air at last. I'm Bramble, love. Gardener. Everything green and a bit too big out here is my doing.", "The mossy one with the wheelbarrow is Thistle. He's shy. Press E if you want me; I'm a dreadful gossip."],
    ],
    introAfter: [["So you're the visitor Thistle has been not talking about! I'm Bramble, love. I do the growing; he does the grumbling.", 'Press E whenever you like. I talk enough for the both of us.']],
    introShort: ["Hello, love! I'm Bramble. I do the growing out here. Ask me anything."],
    greet: ['Back in the fresh air. Good for you.', 'Hello again, love. The roses asked after you.', "There you are again. I've saved you the good bench."],
    hello: ['Hello, love. Mind your step, the bees have right of way.', "Hello. You've a bit of sky on you. It suits you."],
    chat: ["Ask away, love. I've all the time in the world and most of the opinions.", 'Ooh, go on, then.', "Anything you like. If I don't know, I'll make it up nicely."],
    serve: ['Course you can, love. What do you fancy?', "Now you're talking. What'll it be?"],
    job: ['I grow things. Beans, roses, patience. Thistle does the heavy work and the grumbling.', 'Gardener. The indoor lot polish things. I make things that need polishing off. With a fork.'],
    mood: ['Muddy and content. Same as always.', 'Like a tomato in August. Ripe for anything.', "All the better for company, love. The beans don't answer back."],
    offer: ['Back in a tick.', 'Hold on, I know just the one.'],
    offerDrink: ["I'll knock on the kitchen door. Don't wander too far, love.", 'Back in a tick. Mort keeps a jug going all summer.'],
    pocket: ["Happens I've one under my hat, picked this morning. Don't tell the others.", 'No need to go far. I keep a few about me for emergencies.'],
    making: ['*rummages in the leaves*', 'There we are. The best one was hiding.'],
    deliver: ['Here you are, love. Your {drink}.', 'One {drink}, as promised. Take it while the sun is on it.'],
    waiting: ['Your {drink}, love. Whenever you like.'],
    edge: ["I can't come up on the terrace, love; Mort has views about soil. Your {drink} is here when you want it."],
    selfDrink: ["I'll give it to the blackbirds. They're not fussy."],
    thanks: ["You're welcome. Grown with love and a bit of manure.", 'Enjoy it in the sun.'],
    thanksDrink: ["You're welcome, love. Mort squeezed, I carried.", 'Enjoy it in the shade. Mind the wasps; they like it too.'],
    enjoying: ["That's the sun you're tasting. And a bit of me.", "Isn't it? I told that one it was the best of the bed. It believed me."],
    enjoyingFood: ["From the kitchen? Mort will be counting the plate, love. Eat it out here. I shan't tell.", 'Lovely. Mind the crumbs; the jay has had his eye on you since the gate.'],
    enjoyingDrink: ["Mort's recipe. He measures the lemons. With a ruler, I think.", "Isn't it? Lemons off our own tree. The tree knows it, too."],
    already: ["You've your hands full already, love."],
    busy: ["Coming, coming. Gardens don't hurry and neither do I."],
    refill: ['Another {drink}? Plenty more where that came from.'],
    clear: ["I'll take that back. It'll go in the sink, not the compost. Probably."],
    passOn: ["I'll leave that glass for Mort. He likes to be asked."],
    dark: ['Dark out here, love. F lights your lantern. The paths go uneven by the pond.', 'Night garden. Press F for your lantern, and listen; the frogs are on.'],
    lantern: ["Good, you've your lantern lit. Watch the frogs, they're everywhere after dark."],
    offerHint: ['Fancy a strawberry? Warm off the plant. Press E and say the word.', "There's lemonade, if you'd like. I only have to knock on the kitchen door.", 'The sweet peas want picking. Shall I pick you one?'],
    aside: [
      "I've told the roses you're here. They'll make an effort.",
      "If you hear humming, it's the bees. If you hear humming with words, it's me.",
      'Take your time, love. Nothing out here is in a hurry. The snail least of all.',
      "Thistle will tell you he's busy. He's been stood by that hive listening for twenty minutes. That's not busy, that's love.",
      "Everything's a bit too big this year. Madame calls it generous. I call it Tuesday.",
    ],
    suggestDone: ["You've walked the lot, love. Now do it again the other way round. It's a different garden backwards."],
    door: ['After you.'], pardon: ['Sorry, love.', 'Squeeze by.'],
    hostEnd: ["I'll leave you to wander. The garden's best on your own, sometimes.", "I'll get on, love. Shout if you want me. Well. Press E. Same thing."],
    walkedOff: ['Off you go, then. Smell the roses on your way.', 'Bye, love.'],
    bye: ['Go on, then. Mind the bees.', 'Enjoy the garden, love.', "Lovely talking. I'll tell the tomatoes all about it."],
    water: ['There you go, my lovelies. Drink up.', '*waters, humming*', "A good soak at the roots. That's the secret. That and talking to them."],
    deadhead: ['Off with the old, on with the new.', '*snip, snip*', "Deadheading. They'll flower all summer if you keep at it."],
    hives: ['Morning, ladies. Busy, busy.', "Don't mind me. I'm only admiring."],
    koi: ['Here, you greedy things. One each. Well. Several each.', '*scatters a little food* The orange one always gets there first.'],
    bench: ['Five minutes. A gardener has to look at the garden too, sometimes.', '*sits back and listens to the bees*'],
    rim: ['Look at that. Nothing but sky. Keeps you humble, living on an island in the air.', 'Clouds below us today. Good for the lettuces, I expect.'],
    rimNight: ['Stars above and stars below. I never do get used to it.', '*looks out at the dark, humming*'],
    hivesNight: ['All tucked in, ladies? Good.', '*listens to the hive, very quietly*'],
    koiNight: ['*scatters a little food* Midnight feast. Not a word to Thistle.'],
    tuck: ['Night night, garden.', "I'll be by the glasshouse if you need me. Snoozing."],
    think: ['*hums something with no tune*', 'Now, did I water the far bed, or did I only mean to?', "That rose is sulking. I'll have a word."],
    stairs: ['Up the path we go.'],
  },
  thistle: {
    intro: [
      ['Hm. Visitor. ...Thistle. Gardener. Compost, bees, fish, wheelbarrow. That is the whole of it.', "The talkative one in the straw hat is Bramble. Press E if you want something. Or don't. Garden's nice either way."],
      ["You'll be the guest. Good. I'm Thistle. I look after the heavy end of the garden. And the bees. Mostly the bees.", "I don't say much. Ask, and I'll say a bit more. Press E."],
    ],
    introAfter: [["Hm. Bramble's told you all about me, I expect. Half of it's true. Thistle.", 'Press E if you want the other half.']],
    introShort: ['Thistle. Gardener. The other one. ...Go on, then.'],
    greet: ['You again. Garden suits you.', 'Hm. Hello.', 'Back. Good. The bees noticed.'],
    hello: ['Hm. Hello.', "Hello. Don't step on the thyme. You can, actually. It likes it."],
    chat: ['Hm. Go on.', "Ask. I'll answer. Briefly.", 'One question. ...Fine. Several.'],
    serve: ["Hm. What'll it be.", 'Can do. Which?'],
    job: ['Heavy work. Compost, wheelbarrow, bees, fish. Bramble does the pretty bits.', "Weatherproof gardener. Rain doesn't bother me. Slugs do."],
    mood: ['Fine. The compost is cooking nicely.', "Content. The bees are content. That's what matters.", 'Hm. Good. ...Thank you for asking. Nobody asks.'],
    offer: ['Back shortly.', 'Hm. Good choice.'],
    offerDrink: ["I'll knock. Mort will answer. Back shortly.", 'Kitchen door. Won\'t be long.'],
    pocket: ['Got one here. Picked at dawn. Kept it shaded.', 'Hm. In the hat. I plan ahead.'],
    making: ['*picks, inspects, picks a better one*'],
    deliver: ['Your {drink}. Picked properly.', 'Here. {Drink}. Mind it.'],
    waiting: ['Your {drink}.'],
    edge: ["Can't come up. Terrace is Mort's. Your {drink}. Here."],
    selfDrink: ["I'll put it on the compost. Circle of life."],
    thanks: ['Hm. Good.', "You're welcome."],
    thanksDrink: ['Hm. Mind the pips.', "You're welcome. Mort made it. I only knocked."],
    enjoying: ['Course it is.', 'Hm. I grew that. ...Bramble grew that. I carried the compost.'],
    enjoyingFood: ['Not one of ours. Looks good, though. Mind the crumbs. Ants.', 'Hm. Kitchen food. No complaints.'],
    enjoyingDrink: ["Hm. Mort's work. Credit where due.", 'Good lemons. Good tree. I feed it.'],
    already: ['One at a time.'],
    busy: ['Going.'],
    refill: ['Another {drink}? Hm. Fine.'],
    clear: ["I'll have that."],
    passOn: ["That glass is Mort's side of the door. He'll see to it."],
    dark: ['Dark. F lights your lantern. Use it, the pond is where it always is.'],
    lantern: ['Lantern. Good. Sensible.'],
    offerHint: ['Strawberries are ripe. If you want one. Press E.', "There's lemonade. I knock, Mort answers. It's a system.", 'Sweet peas need picking anyway. Want one?'],
    aside: [
      'Hm. You walk on the paths. Noticed that. Appreciated.',
      "Bramble's told the roses about you. They'll be insufferable.",
      "If something bites you, it wasn't the bees. Probably.",
      'Sit anywhere. The benches are sound. I check.',
      'Nice, this. Standing. Saying nothing. ...I was enjoying it, anyway.',
    ],
    suggestDone: ["You've seen it. Sit down somewhere. That's the last bit."],
    door: ['There.'], pardon: ['Coming through.', 'Mind.'],
    hostEnd: ["Right. Wheelbarrow won't push itself. Well. It does, a bit. Downhill.", "Hm. I'll be about. Press E."],
    walkedOff: ['Hm. Gone.', 'Right.'],
    bye: ['Hm. Off you go.', 'Right. Mind the edge.', 'Good talk. Longest this week.'],
    water: ['*waters thoroughly, disapprovingly*', 'Dry as a biscuit. Again.'],
    deadhead: ['*snip* Better.', 'Leggy. Needs a firm hand.'],
    barrow: ['Compost run.', '*trundles*', 'Black gold, this. Smells like it, too.'],
    hives: ['Easy, girls. Only me.', "*listens at the hive* Queen's happy. Good.", "Honey in a fortnight. Don't tell Barty, he'll want a jar for his tray."],
    koi: ["Breakfast. Don't push.", '*sprinkles food; the koi boil up gold and white*'],
    bench: ['*sits. creaks. sighs.*', "Resting the joints. I haven't got joints. Resting anyway."],
    rim: ["Edge of the world. Nice view. Don't lean.", '*looks out at the sky for a long time*'],
    rimNight: ['*looks out at the dark for a long time*', 'Stars. All present. Good.'],
    hivesNight: ['*listens at the hive* Asleep. Good.'],
    koiNight: ['Supper. Last one. I mean it.'],
    tuck: ['Back porch. Night.', '*settles by the porch steps, dims*'],
    think: ['Hm.', '*regards a weed. The weed regards him.*', 'Slugs. Somewhere. I can feel it.'],
    stairs: ['Hm.'],
  },
});

export const GARDEN_FACTS = [
  "The garden's older than the paint on the house. Some of those roses were here before any of us.",
  'Eight raised beds in the potager, a glasshouse, an orchard and three hives. And a scarecrow nobody listens to.',
  "The pond's natural. Well, natural-ish. The koi think they own it. The ducks disagree.",
  'Everything grows a bit too big out here. Madame likes it that way. Calls it generous.',
  'The meadow paths are mown, the rest is left long, for the bees and the crickets.',
  'We float, you know. The whole island. Good drainage.',
  'The summerhouse at the far end has a day bed. Best nap on the property. Ask Thistle; he denies it.',
];
export const SEASON = [
  "High summer. Strawberries, tomatoes ripening in the cages, runner beans up the canes, courgettes you can't keep up with.",
  'Sweet peas for picking, lavender humming with bees, the first apples blushing in the orchard.',
  'Beans, lettuces, the last strawberries, the first tomatoes. And honey soon, if the bees are kind.',
];
const SEASON_T = ['Strawberries. Tomatoes. Beans. Courgettes, whether you want them or not.', 'Sweet peas. Lavender. First apples, nearly. Honey in a fortnight.'];

// Places a gardener can send her to (and point at): where they are, and what each says
export const PLACES = [
  { id: 'pond', ask: "Where's the koi pond?", x: -68, z: 4, say: 'The pond is south of the terrace, past the willow. Cross the plank bridge and say hello to the koi.', thistle: "Pond. South of the terrace, past the willow. There's a bridge. Use it." },
  { id: 'potager', ask: "Where's the kitchen garden?", x: 46, z: -80, say: "Kitchen garden is round the north side, past the kitchen door. Picket fence, raised beds, glasshouse. Can't miss it.", thistle: "Kitchen garden. North side, past the kitchen door. Picket fence. Can't miss it. People do." },
  { id: 'hives', ask: 'Where are the bees?', x: 95, z: -101, say: "Through the potager gate and up through the orchard. Three hives. Walk slowly and they won't mind you.", thistle: 'Bees. Through the potager gate, up through the orchard. Walk slow. Stand to one side.' },
  { id: 'meadow', ask: "What's out the back?", x: -62, z: -80, say: 'The meadow, out west. Mown paths, a fire pit, a hammock between two maples. Fireflies after dark.', thistle: 'Meadow. Out west. Mown paths, fire pit, hammock. Fireflies after dark. Worth the walk.' },
  { id: 'summer', ask: 'Is there somewhere quiet?', x: -8, z: -157, say: 'Follow the long border right to the end. Summerhouse, a bench, a day bed. Quiet as anything.', thistle: 'Long border. All the way to the end. Summerhouse. Nobody talks there. Recommended.' },
];

// The hour, as a gardener tells it (by the sundial)
export const GARDEN_HOURS = {
  early: { bramble: ["It's {time}, love. You're up with the blackbirds. The dew's still on; mind your ankles."], thistle: ['{Time}. Early. Good. Best of the day, this.'] },
  morning: { bramble: ['About {time} by the sundial. The bees are just getting going. So am I.'], thistle: ["{Time}. Bees are out. Compost's warm. Fine morning."] },
  midday: { bramble: ["{Time}. Too hot to dig. I'm doing what the lettuces do: keeping still and hoping."], thistle: ["{Time}. Sundial's at its best. So is the shade."] },
  afternoon: { bramble: ["{Time}, and the whole garden's gone drowsy. Even the bees sound slower. Lovely."], thistle: ['{Time}. Nap time. For the plants. Not for me. Hm.'] },
  evening: { bramble: ["{Time}. Golden hour, love. Everything I've ever planted looks like I meant it."], thistle: ["{Time}. Light's going sideways. Shadows a mile long. Good hour."] },
  night: { bramble: ["{Time}, and you're out in the garden! Good. It smells different at night. Go on, breathe in."], thistle: ["{Time}. Late. The frogs have the pond. I'd leave them to it."] },
  late: { bramble: ['{Time} in the morning, love. Even the frogs have gone quiet. Lovely, though, isn\'t it?'], thistle: ['{Time}. Nobody up but us and the moths.'] },
};

// What a gardener remarks on when she lingers somewhere (r: how near, in feet; 'rim' is anywhere near the edge)
export const GARDEN_NEAR = [
  { id: 'pond', x: -68, z: 4, r: 40,
    bramble: ["That's the koi pond. Go over the plank bridge slowly; the orange one likes an audience.", "There's a bench under the willow. Best seat for doing nothing in the whole garden."],
    thistle: ['Pond. Mind the edge. The stones are mossy. On purpose.', "The frog's on the big lily pad. He is always on the big lily pad."] },
  { id: 'potager', x: 46, z: -80, r: 32,
    bramble: ["This is my kitchen garden. Eight beds. I've a favourite, and I'm not saying which in front of the others.", "The glasshouse is open. Go in and smell the tomato leaves. It's the best smell there is."],
    thistle: ['Kitchen garden. Mind the hose. I coil it. Bramble uncoils it.', "Sundial's in the middle. Runs true. Unlike the hall clock."] },
  { id: 'hives', x: 95, z: -101, r: 36,
    bramble: ["Walk slow past the hives, love. They're gentle, but they've work to do."],
    thistle: ["Hives. Stand to the side, not in front. That's their runway.", "Hear that hum? That's a contented hive. You learn the note."] },
  { id: 'summer', x: -8, z: -150, r: 36,
    bramble: ["You found the summerhouse. Try the day bed. I shan't tell a soul."],
    thistle: ["Quiet end. Day bed's dry. I checked."] },
  { id: 'meadow', x: -62, z: -80, r: 42,
    bramble: ["The meadow's left long for the bees and the crickets. The paths are mown so you can pretend you're not lost.", "There's a hammock between the two maples. It's stronger than it looks."],
    thistle: ["Meadow. I mow the paths. The rest mows itself. It doesn't. That's the point."] },
  { id: 'front', x: -10, z: 44, r: 40,
    bramble: ["The front garden's the loose end of things. Cottage muddle either side of the walk. I call it 'intentional'.", "Try the tyre swing on the old oak. It's held bigger than you, love."],
    thistle: ["Gate's always open. The rose has grown through the latch. Saves a job."] },
  { id: 'play', x: 62, z: 6, r: 32,
    bramble: ["The play set's for guests of any age. I've seen Madame on the swings. In pearls."],
    thistle: ['Slide is fast. I waxed it. Stand clear of the bottom.'] },
  { id: 'rim', rim: true,
    bramble: ['Look at that. Nothing but sky. Keeps you humble, living on an island in the air.'],
    thistle: ["Edge of the world. Nice view. Don't lean."] },
];

// ---- Conversation with a gardener ---------------------------------------------------------------
// A small tree. Each topic: id, cat (which card it lives on), ask (what she says), say (the reply), and
// then: follow-ups of the same shape. ask and say may be a string, { bramble, thistle }, a list (drawn
// from a shuffled bag) or a function of c = { key, night, hour, met(k), heard(id), had(id) } where
// heard(id) is "she already asked the other gardener this". own: about the speaker, so worth asking both. near: she is standing by it, so it leads
// the card. point: the gardener turns and points there. serve: opens the picking card. Asked topics are
// remembered for the visit (H.mem.asked), so the card always leads with something new.
export const GARDEN_CATS = [['us', 'About you, and the others.'], ['garden', 'About the garden.'], ['day', 'About the day.']];
// The order in which fresh topics lead the card, a little of everything
export const GARDEN_LEADS = ['who', 'other', 'koi', 'barty', 'weather', 'bees', 'day', 'mort', 'potager', 'hour', 'far', 'fig', 'wild', 'madame', 'edge', 'reggie', 'season', 'grow', 'mood', 'where'];
export const GARDEN_TALK = [
  // ---- themselves, and each other
  { id: 'who', cat: 'us', own: true, ask: 'Tell me about yourself.',
    say: { bramble: "I was a terracotta pot with ideas, love. Sprouted one spring and nobody had the heart to repot me. Madame gave me the hat and the garden, in that order.",
      thistle: 'Built for weather. Rain, frost, hail. Then they put me on an island above the clouds. Hm. I keep the moss on out of principle.' },
    then: [
      { id: 'who.love', ask: 'What do you love most out here?', say: { bramble: "First thing, when the beds are wet and the bees aren't up and nobody has asked me for anything. Present company excepted, love.", thistle: "Turning the compost. Steam comes off it on a cool morning. ...Also the bees. Don't write that down." } },
      { id: 'who.name', ask: { bramble: 'Why "Bramble"?', thistle: 'Why "Thistle"?' }, say: { bramble: "Because I get everywhere, I'm hard to cut back, and there's something sweet on me by August. Madame's words. I've had them embroidered.", thistle: 'Prickly. Hard to get rid of. Bees like me. Madame thought it was funny. It is accurate.' } },
      { id: 'who.job', ask: 'What do you do all day?', pool: 'job' },
    ] },
  { id: 'other', cat: 'us', own: true, ask: { bramble: "What's Thistle like?", thistle: "What's Bramble like?" },
    say: { bramble: 'Soft as butter under all that moss. He names the bees, you know. Every queen. Swears blind he does not.',
      thistle: "Talks to the tomatoes. Worse, they do better for it. I've stopped arguing." },
    then: [
      { id: 'other.nap', ask: { bramble: 'Does he really nap in the summerhouse?', thistle: 'Does she ever stop talking?' }, say: { bramble: "Every afternoon, about three. Dims his lights and calls it 'checking the day bed for damp'.", thistle: 'At night. Mostly. She hums in her sleep. The glasshouse panes rattle. You get used to it.' } },
      { id: 'other.along', ask: 'Do you two get along?', say: { bramble: "Longer than the old oak's had its swing. We argue about the compost and agree about everything else.", thistle: "Hm. She moves my barrow. I move it back. That's a friendship." } },
    ] },
  { id: 'day', cat: 'us', own: true, ask: "What's a day like for you?",
    say: { bramble: "Water at dawn, deadhead till lunch, pretend not to see the hare in the lettuces, and somewhere in there a sit down. It's a full life.",
      thistle: "Up before the bees. Turn the compost. Feed the fish. Fetch the barrow from wherever Bramble's left it. Dim." },
    then: [
      { id: 'day.night', ask: 'And at night?', say: { bramble: "I tuck up by the glasshouse, where it's warm off the glass. The frogs sing me off. You'd sleep like a bulb.", thistle: "Back porch steps. Lights low. I can hear the hall clock through the door. Four minutes fast. I've stopped minding." } },
      { id: 'day.indoors', ask: 'Do you ever come indoors?', say: { bramble: "Me? I'd drip, love. Mort would have to lie down, and he hasn't the knees for it.", thistle: 'Once. Mort followed me the whole way with a cloth. Never again. For both our sakes.' } },
    ] },
  { id: 'mood', cat: 'us', own: true, ask: 'How are you today?', pool: 'mood',
    then: [
      { id: 'mood.secret', ask: 'Tell me a secret.', say: { bramble: "The biggest strawberries never reach the house. Gardener's tax. Don't tell Mort; he counts.", thistle: "The scarecrow's hat was mine. I want it back. Can't prove a thing." } },
      { id: 'mood.joke', ask: 'Know any jokes?', say: { bramble: 'What did the big tomato say to the little one? Ketchup, love. ...Thistle laughed at that once. I have it written down.', thistle: "Hm. A snail sets off for the front door. ...That's it. He's still going. Since Tuesday." } },
    ] },
  // ---- the indoor staff (on the same card)
  { id: 'barty', cat: 'us', ask: 'What do you make of Bartholomew?',
    say: { bramble: c => (c.met('barty') ? "You've met him, then. " : '') + 'All hat and flourish, bless him. Stands at the window admiring my borders and tells people he supervised.',
      thistle: "Purple. Loud. Wants a jar of honey for his tray. He'll get one. Eventually." },
    then: [
      { id: 'barty.out', ask: 'Does he ever come outside?', say: { bramble: "Only as far as the kitchen step, for mint. He holds it at arm's length, like it might go off.", thistle: "No. Says the grass would compromise his finish. Hm. Suits everyone." } },
      { id: 'barty.like', ask: { bramble: 'Do you like him, though?', thistle: 'Why make him wait for the honey?' }, say: { bramble: "Oh, enormously. He calls my sweet peas 'the cast'. You can't dislike a person who does that.", thistle: 'Builds character. His, not mine.' } },
    ] },
  { id: 'mort', cat: 'us', ask: 'And Mortimer?',
    say: { bramble: "Mort thinks soil is dirt that hasn't been dealt with yet. But he's the one who answers the kitchen door for the lemonade, and he has never once sighed. Well. Once.",
      thistle: 'Mort and I understand each other. Few words. Clean edges. He does it to linen, I do it to lawns.' },
    then: [
      { id: 'mort.hedge', ask: 'He says the hedge needs a trim.', say: { bramble: "He says that from behind glass, love. Tell him it's 'tastefully overgrown'. That's Madame's phrase. It'll hold him.", thistle: "He would. It doesn't. ...I'll look at it." } },
      { id: 'mort.mud', ask: 'Does he mind the mud?', say: { bramble: "He's put a second doormat inside the first doormat. I take it as a compliment.", thistle: "He minds. I wipe. That's the arrangement." } },
    ] },
  { id: 'fig', cat: 'us', ask: 'And little Fig?',
    say: { bramble: "Fig waves from the upstairs windows every single morning. Says good morning to the birds by name. They're all called Bird.",
      thistle: "Small. Fast. Asked me once if worms have feelings. I said yes. He's been apologising to the lawn ever since." },
    then: [
      { id: 'fig.out', ask: 'Would Fig like it out here?', say: { bramble: "He'd be off after a butterfly and over the edge of the world by teatime. Best he waves. I wave back with the watering can.", thistle: "Too breezy for something that size. I'd have to peg him down. ...I have pegs." } },
    ] },
  { id: 'reggie', cat: 'us', ask: 'Have you met Sir Reginald?',
    say: { bramble: "The little round fellow? Only through the glass. He bumps up against the terrace door and looks at the lawn like it's the sea.",
      thistle: "The vacuum. Good worker. Says nothing. We'd get on." },
    then: [
      { id: 'reggie.out', ask: 'Could he work outdoors?', say: { bramble: "He'd be full of gravel before the gate, love. But I leave a windfall apple by the door for him. I'm told he pushes it about for hours.", thistle: "Asked Madame if he could mow. She said no. Shame. He has the temperament." } },
    ] },
  { id: 'madame', cat: 'us', ask: 'What is Madame like?',
    say: { bramble: "She comes out in her dressing gown with a coffee and tells the roses they're doing wonderfully. So they do. I learned it from her.",
      thistle: "Lets things grow. Calls it generous. Most people prune a garden till it's furniture. She doesn't. Hm. Good employer." },
    then: [
      { id: 'madame.open', ask: 'Is the garden always open, like the house?', say: { bramble: 'Always, love. The gate has not shut in years; the rose has grown through the latch. Come at midnight if you like. Bring a lantern.', thistle: "Always open. House rule. The gate couldn't shut now if it tried." } },
    ] },
  // ---- the garden
  { id: 'koi', cat: 'garden', ask: 'Tell me about the koi.', near: { x: -68, z: 4, r: 45 }, point: { x: -68, z: 4 },
    say: { bramble: "Fat and spoiled, the lot. The orange one is first to the food every time, and the white one hangs back and gets fed separately, because I'm soft.",
      thistle: 'Fish. Good listeners. Scatter a pinch and they come up like coins.' },
    then: [
      { id: 'koi.names', ask: 'Do they have names?', say: { bramble: "Thistle says fish don't need names. Then he calls the big one 'Admiral' when he thinks I'm not listening.", thistle: c => (c.heard('koi.names') ? 'She told you. Hm. ' : 'No. ...') + "The big one's Admiral. That's a rank, not a name." } },
      { id: 'koi.ducks', ask: 'And the ducks?', say: { bramble: 'Two. Uninvited. Staying. The frog on the big lily pad has stopped complaining and started ignoring them.', thistle: "Not ours. Turned up. Won't leave. Hm. I put a bit of grain out. Couldn't tell you why." } },
      { id: 'koi.feed', ask: 'May I feed them?', say: { bramble: "Do, love! Stand on the bank, look at the water and press E. They'll come up as if you were the dinner bell.", thistle: "From the bank. Look at the water, press E. A pinch. They'll tell you they're starving. They are lying." } },
    ] },
  { id: 'bees', cat: 'garden', ask: 'Tell me about the bees.', near: { x: 95, z: -101, r: 42 }, point: { x: 95, z: -101 },
    say: { bramble: "Three hives, up past the orchard. Gentle as anything if you walk slow. They're Thistle's girls, really. I just grow them their dinner.",
      thistle: "Three hives. Calm stock. They know me. They'll tolerate you, if you walk slow and don't flap." },
    then: [
      { id: 'bees.like', ask: { bramble: 'What do they like best?', thistle: 'Do you really name them?' }, say: { bramble: "Lavender, catmint, and the borage I pretend I didn't plant. And the clover in the lawn that Mort would like gone.", thistle: c => (c.heard('other') ? 'Bramble told you. Hm. ' : '') + '...Only the queens. Mabel, Dot, and Her Ladyship. That goes no further.' } },
      { id: 'bees.honey', ask: 'Is there honey?', say: { bramble: 'Soon. Thistle says a fortnight. He has said a fortnight for a month.', thistle: c => "In a fortnight. Don't tell Barty." + (c.heard('bees.honey') ? ' ...A different fortnight, whatever she said.' : '') } },
    ] },
  { id: 'potager', cat: 'garden', ask: "What's growing in the kitchen garden?", near: { x: 46, z: -80, r: 34 }, point: { x: 46, z: -80 },
    say: { bramble: 'Strawberries, Sungold tomatoes, runner beans up the canes, and more courgettes than sense. And a hare in the lettuces I have decided not to see.',
      thistle: 'Beans. Tomatoes. Lettuce, what the hare leaves. Courgettes. Nobody needs that many courgettes.' },
    then: [
      { id: 'potager.hare', ask: { bramble: 'A hare?', thistle: 'What about the scarecrow?' }, say: { bramble: "Shh. If I notice him, I have to do something about him. He only takes the outside leaves. He's very polite about it.", thistle: "Decorative. The jay sits on him. I've spoken to him about it. Nothing." } },
      { id: 'potager.try', ask: 'Could I try something?', serve: true },
    ] },
  { id: 'far', cat: 'garden', ask: "What's at the far end?", near: { x: -8, z: -150, r: 38 }, point: { x: -8, z: -150 },
    say: { bramble: "Follow the long border right to its end, love. An old summerhouse with a day bed, and a bench in the clearing. It's where the garden goes quiet.",
      thistle: 'Summerhouse. Bench. Day bed. Quiet. I check it for damp. Daily. Thoroughly.' },
    then: [
      { id: 'far.bed', ask: { bramble: 'Who uses the day bed?', thistle: 'For damp?' }, say: { bramble: "Officially, guests. Unofficially, there's a Thistle-shaped dent in it. Have a lie down. Nobody will come looking.", thistle: c => 'Lying down is the only reliable test.' + (c.heard('other.nap') ? ' Whatever Bramble calls it.' : '') } },
      { id: 'far.beyond', ask: 'And beyond that?', say: { bramble: "A bench, and then sky. Sit on the one and look at the other. It's all the plan anybody needs.", thistle: 'A bench. Then the edge. Then nothing. Good spot.' } },
    ] },
  { id: 'edge', cat: 'garden', ask: "What's past the edge of the garden?", near: { rim: true },
    say: { bramble: "Sky, love. We're an island. On a clear day you can watch the clouds go by underneath, like sheep.",
      thistle: "Nothing. Sky. Two benches for looking at it. Don't lean." },
    then: [
      { id: 'edge.safe', ask: 'Is it safe?', say: { bramble: "Quite safe. There's a gentle sort of 'no' at the edge; you'll feel it. Madame thought of everything.", thistle: "You can't fall. I've tested it. With the barrow. Not on purpose." } },
      { id: 'edge.why', ask: 'Why does it float?', say: { bramble: "Nobody's told me and I've never asked. Some things you just water.", thistle: "Good drainage. That's all I need to know." } },
    ] },
  { id: 'wild', cat: 'garden', ask: 'Who else lives out here?',
    say: { bramble: "A red squirrel on the tree seat, a jay who thinks he owns the bird bath, and a snail by the front door who's been going somewhere since Tuesday.",
      thistle: 'Squirrel. Jay. Hare. Frog. Two ducks. A snail. None of them do a stroke of work.' },
    then: [
      { id: 'wild.night', ask: 'And after dark?', say: { bramble: "Fireflies over the meadow, love, and the frogs start up. Stand by the fire pit and hold still. It's better than the pictures.", thistle: "Fireflies. Meadow. Frogs by the pond. Something in the hedge I've never identified. We have an understanding." } },
      { id: 'wild.pests', ask: { bramble: 'Any you could do without?', thistle: 'And the slugs?' }, say: { bramble: "Greenfly. And I'm not speaking to the jay, since the cherries. Everyone else can stay.", thistle: 'We do not discuss the slugs.' } },
    ] },
  { id: 'grow', cat: 'garden', ask: "What's your secret, with the plants?",
    say: { bramble: 'A good soak at the roots, and conversation. Roses like gossip. Beans want encouragement. Courgettes need no help from anybody.', thistle: 'Compost. Everything else is opinion.' },
    then: [
      { id: 'grow.wild', ask: "It's all a bit overgrown, isn't it?", say: { bramble: 'Tastefully overgrown, love. I prune just enough that you can find the path, and not one snip more.', thistle: "On purpose. Takes more work to look this neglected than you'd think." } },
    ] },
  { id: 'where', cat: 'garden', ask: 'Where should I wander next?', where: true },
  // ---- the day: weather, hour, season
  { id: 'weather', cat: 'day', ask: c => (c.night ? 'Lovely night.' : 'Lovely weather.'),
    say: { bramble: c => (c.night ? "Clear as a bell. You don't get stars like these from the ground, love. I take the hat off for them." : "Isn't it? We sit above the rain up here, so I do it all with a can. Keeps me honest."),
      thistle: c => (c.night ? 'Clear. Always clear. Good for stars. Bad for slugs. Suits me.' : "No rain up here. Ever. I'm weatherproofed for nothing. Hm. Nice to be ready.") },
    then: [
      { id: 'weather.rain', ask: "Don't you miss the rain?", say: { bramble: "The smell of it, a bit. So now and then I water the gravel path, just for that. Don't tell Thistle. He'd call it waste.", thistle: c => (c.heard('weather.rain') ? "...A bit. She told you about the gravel. I know about the gravel. I stand downwind." : '...A bit. Bramble waters the gravel for the smell. Thinks I don\'t know. I stand downwind.') } },
      { id: 'weather.summer', ask: 'Is it always summer here?', say: { bramble: "Always. Strawberries and long evenings. I asked Madame about autumn once and she said 'not yet, darling.'", thistle: "Always. I have a leaf rake I've never used. Still in the wrapper." } },
    ] },
  { id: 'hour', cat: 'day', ask: 'What time do you make it?', hour: true,
    then: [
      { id: 'hour.best', ask: 'When is the garden at its best?', say: { bramble: "Seven in the evening, when the light goes gold and sideways, and the swing on the old oak is free.", thistle: "Five in the morning. Nobody about. Dew on. ...You're welcome to it. Nobody ever takes me up." } },
    ] },
  { id: 'season', cat: 'day', ask: "What's in season?", say: { bramble: SEASON, thistle: SEASON_T },
    then: [
      { id: 'season.try', ask: 'Could I try something?', serve: true },
      { id: 'season.fav', ask: "What's your favourite?", say: { bramble: "Sweet peas. You can't eat them and they don't last, and I grow twice as many every year. That's love for you.", thistle: 'Broad beans. Honest. No fuss. Over by July. ...And the pink rose by the gate. Never mind why.' } },
    ] },
];

// The two of them, when their rounds cross. Roles a and b; pair says who is who.
export const GARDEN_BANTER = [
  { pair: ['bramble', 'thistle'], lines: [['a', 'Thistle, have you moved my watering can?'], ['b', 'It was in the path.'], ['a', 'It LIVES in the path.'], ['b', 'It lives on the hook. I put up a hook.']] },
  { pair: ['bramble', 'thistle'], lines: [['a', 'The sweet peas want tying in.'], ['b', 'Did it at dawn.'], ['a', '...And the hose?'], ['b', 'Coiled.'], ['a', "You're a marvel."], ['b', 'Hm.']] },
  { pair: ['bramble', 'thistle'], lines: [['a', 'Lovely out.'], ['b', 'Hm.'], ['a', "That's all? Hm?"], ['b', 'It was a warm hm.']] },
  { pair: ['bramble', 'thistle'], lines: [['a', 'Do you think our guest likes the garden?'], ['b', 'Still here.'], ['a', "That's not an answer."], ['b', "It's the only one that counts."]] },
  { pair: ['thistle', 'bramble'], lines: [['a', 'Honey in a fortnight.'], ['b', 'You said that a fortnight ago.'], ['a', 'Different fortnight.']] },
  { pair: ['thistle', 'bramble'], lines: [['a', "There's a hare in your lettuces."], ['b', "I can't hear you, dear."], ['a', 'Big one.'], ['b', 'La, la, la.']] },
  { pair: ['thistle', 'bramble'], lines: [['a', 'You left the barrow by the roses.'], ['b', 'I was showing it the roses.'], ['a', '...Did it like them?'], ['b', 'Very much.']] },
];
