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
// They know the garden is the real heart of the place, and say so, kindly, often.
Object.assign(VOICE, {
  bramble: {
    greetFirst: ["Oh, hello, love. I'm Bramble. I do the growing. The house is lovely, but this is where the heart is.", "Come out, come out. Mind the lavender. I'm Bramble; I keep the garden, or it keeps me."],
    greet: ['Back in the fresh air. Good for you.', "Hello again, love. The roses asked after you."],
    talkHint: ["If you want anything from the garden, look my way and press E.", 'Press E if you fancy a strawberry. Or a chat. Mostly strawberries.'],
    hello: ["Hello, love. Mind your step, the bees have right of way.", "Hello. You've a bit of sky on you. It suits you."],
    job: ["I grow things. Beans, roses, patience. Thistle does the heavy work and the grumbling.", "Gardener. The indoor lot polish things. I make things that need polishing off. With a fork."],
    mood: ["Muddy and content. Same as always.", "Like a tomato in August. Ripe for anything."],
    offer: ["Course you can. Back in a tick.", "Lovely. Hold on, I know just the one."],
    making: ['*rummages in the leaves*', 'There we are. The best one was hiding.'],
    deliver: ['Here you are, love. Your {drink}.', "One {drink}, straight from the garden. Well. Via the kitchen, if it's lemonade."],
    waiting: ['Your {drink}, love. Whenever you like.'],
    selfDrink: ["I'll give it to the blackbirds. They're not fussy."],
    thanks: ["You're welcome. Grown with love and a bit of manure.", 'Enjoy it in the sun.'],
    enjoying: ['That\'s the sun you\'re tasting. And a bit of me.'],
    already: ["You've your hands full already, love."],
    busy: ['Coming, coming. Gardens don\'t hurry and neither do I.'],
    refill: ['Another {drink}? Plenty more where that came from.'],
    clear: ["I'll take that back. It'll go in the sink, not the compost. Probably."],
    dark: ["Dark out here, love. F lights your lantern. The paths go uneven by the pond.", "Night garden. Press F for your lantern, and listen; the frogs are on."],
    lantern: ["Good, you've your lantern lit. Watch the frogs, they're everywhere after dark."],
    door: ['After you.'], pardon: ['Sorry, love.', 'Squeeze by.'],
    hostEnd: ["I'll leave you to wander. The garden's best on your own, sometimes."],
    walkedOff: ["Off you go, then. Smell the roses on your way.", 'Bye, love.'],
    bye: ['Go on, then. Mind the bees.', 'Enjoy the garden.'],
    water: ['There you go, my lovelies. Drink up.', '*waters, humming*', "A good soak at the roots. That's the secret. That and talking to them."],
    deadhead: ['Off with the old, on with the new.', '*snip, snip*', "Deadheading. They'll flower all summer if you keep at it."],
    hives: ['Morning, ladies. Busy, busy.', "Don't mind me. I'm only admiring."],
    koi: ['Here, you greedy things. One each. Well. Several each.', '*scatters a little food* The orange one always gets there first.'],
    bench: ['Five minutes. A gardener has to look at the garden too, sometimes.', '*sits back and listens to the bees*'],
    rim: ["Look at that. Nothing but sky. Keeps you humble, living on an island in the air.", 'Clouds below us today. Good for the lettuces, I expect.'],
    tuck: ['Night night, garden.', "I'll be by the glasshouse if you need me. Snoozing."],
    stairs: ['Up the path we go.'],
  },
  thistle: {
    greetFirst: ["Thistle. Gardener. The other one. You'll be wanting the garden; it's all around you. That's the trick of it.", "Hm. A visitor. Good. Wipe your boots on the way in, not on the way out."],
    greet: ['You again. Garden suits you.', 'Hm. Hello.'],
    talkHint: ['Press E if you want me. I might answer.', 'Ask, if you want something. I know where everything is buried. Bulbs, mostly.'],
    hello: ['Hm. Hello.', "Hello. Don't step on the thyme. You can, actually. It likes it."],
    job: ['Heavy work. Compost, wheelbarrow, bees, fish. Bramble does the pretty bits.', "Weatherproof gardener. Rain doesn't bother me. Slugs do."],
    mood: ['Fine. The compost is cooking nicely.', "Content. The bees are content. That's what matters."],
    offer: ['Fine. Back shortly.', 'Hm. Good choice.'],
    making: ['*picks, inspects, picks a better one*'],
    deliver: ['Your {drink}. Picked properly.', 'Here. {Drink}. Mind it.'],
    waiting: ['Your {drink}.'],
    selfDrink: ["I'll put it on the compost. Circle of life."],
    thanks: ['Hm. Good.', 'You\'re welcome.'],
    enjoying: ['Course it is.'],
    already: ['One at a time.'],
    busy: ['Going.'],
    refill: ['Another {drink}? Hm. Fine.'],
    clear: ['I\'ll have that.'],
    dark: ['Dark. F lights your lantern. Use it, the pond is where it always is.'],
    lantern: ['Lantern. Good. Sensible.'],
    door: ['There.'], pardon: ['Coming through.', 'Mind.'],
    hostEnd: ["Right. Wheelbarrow won't push itself. Well. It does, a bit. Downhill."],
    walkedOff: ['Hm. Gone.'],
    bye: ['Hm. Off you go.'],
    water: ['*waters thoroughly, disapprovingly*', 'Dry as a biscuit. Again.'],
    deadhead: ['*snip* Better.', 'Leggy. Needs a firm hand.'],
    barrow: ['Compost run.', '*trundles*', 'Black gold, this. Smells like it, too.'],
    hives: ['Easy, girls. Only me.', '*listens at the hive* Queen\'s happy. Good.', 'Honey in a fortnight. Don\'t tell Barty, he\'ll want a jar for his tray.'],
    koi: ['Breakfast. Don\'t push.', '*sprinkles food; the koi boil up gold and white*'],
    bench: ['*sits. creaks. sighs.*', 'Resting the joints. I haven\'t got joints. Resting anyway.'],
    rim: ['Edge of the world. Nice view. Don\'t lean.', '*looks out at the sky for a long time*'],
    tuck: ['Back porch. Night.', '*settles by the porch steps, dims*'],
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
// Places she might ask about: where they are, and what to say
export const PLACES = [
  { id: 'pond', ask: "Where's the koi pond?", x: -68, z: 4, say: 'The pond is south of the terrace, past the willow. Cross the plank bridge and say hello to the koi.' },
  { id: 'potager', ask: "Where's the kitchen garden?", x: 46, z: -80, say: 'Kitchen garden is round the north side, past the kitchen door. Picket fence, raised beds, glasshouse. Can\'t miss it.' },
  { id: 'hives', ask: 'Where are the bees?', x: 101, z: -134, say: 'Through the potager gate and up through the orchard. Three hives. Walk slowly and they won\'t mind you.' },
  { id: 'meadow', ask: "What's out the back?", x: -62, z: -80, say: 'The meadow, out west. Mown paths, a fire pit, a hammock between two maples. Fireflies after dark.' },
  { id: 'summer', ask: 'Is there somewhere quiet?', x: -8, z: -157, say: 'Follow the long border right to the end. Summerhouse, a bench, a day bed. Quiet as anything.' },
];
