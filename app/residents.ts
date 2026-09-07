import type { Point } from './mechanics';
export type Choice={text:string;reply:string};
type Exchange={line:string;choices?:Choice[]};
export type Resident=Point&{id:string;name:string;role:string;sprite:number;lines:Exchange[];asides:string[]};
export type Conversation=Exchange&{resident:Resident};
export const RESIDENTS:Resident[]=[
 {id:'jun',name:'Jun',role:'NOODLE STALL OWNER',sprite:1,x:250,y:615,asides:['Two bowls. One without spring onions. I still make his by mistake.','Rain means customers. Cold rain means good customers.'],lines:[
  {line:'You hungry, or just trying to stand somewhere warm? Both are respectable reasons.',choices:[{text:'What’s good tonight?',reply:'The broth. Same as yesterday. The trick is to live a slightly different day before you eat it.'},{text:'Just the warmth, for now.',reply:'Then stand on this side. The extractor’s broken. For once, a broken thing is doing somebody a favor.'}]},
  {line:'My son sends me pictures of the sky from up there. No wires in it. I always think he’s cropped something out.'},
  {line:'I used to close at ten. Then the night shift started coming. You can’t lock a door on people who remember your name.',choices:[{text:'Do you ever get a night off?',reply:'Wednesdays. I eat at the place across the canal and complain about their noodles. It’s important to have a hobby.'},{text:'They’re lucky to have you.',reply:'They pay on time. Let’s not make it sentimental.'}]},
  {line:'The woman upstairs leaves a clean bowl on her windowsill. I send it up with whoever’s going that way. That’s our delivery system.'}
 ]},
 {id:'mara',name:'Mara',role:'REPAIR SHOP MECHANIC',sprite:2,x:988,y:625,asides:['No, that rattle is new. The old rattle was fine.','Whoever keeps feeding the shop cat: she has a home. It’s my toolbox.'],lines:[
  {line:'If you’re here about the sign, it’s meant to flicker. If you’re the landlord, I’m still waiting on a part.',choices:[{text:'Which part?',reply:'The part where he pays me. You’d be amazed how many electrical problems start there.'},{text:'I like it flickering.',reply:'Good. I’ll call it an installation and double the invoice.'}]},
  {line:'My sister moved six stations away. We used to share a room. Now we share a calendar and never find the same empty square.'},
  {line:'Someone brought in a radio with no battery. Said it was their mother’s. You learn to ask what people actually want fixed.',choices:[{text:'Did you get it working?',reply:'Yes. Just static at first. Then some awful old song. He sat right there until it finished.'},{text:'Can everything be fixed?',reply:'No. But I don’t lead with that. Most things deserve a look inside.'}]},
  {line:'I’m saving for a window that faces the morning. Nothing grand. Just once, I’d like to wake up without checking the time.'}
 ]},
 {id:'ivo',name:'Ivo',role:'NIGHT SHIFT WORKER',sprite:3,x:454,y:703,asides:['Last train’s gone. First train’s practically tomorrow’s problem.','Eight hours under white lights. Still see them when I blink.'],lines:[
  {line:'Missed the last train by a minute. Third time this week. I’m beginning to think the minute has something against me.',choices:[{text:'Long walk home?',reply:'Forty minutes. Fifty if the bakery’s opening. I’ll tell my wife it was fifty.'},{text:'You could wait here.',reply:'That’s the plan. Jun pretends not to notice when I fall asleep. I pretend his coffee works.'}]},
  {line:'My little girl thinks I turn the city lights on. I told her I work nights and she filled in the rest. Haven’t corrected her yet.'},
  {line:'They moved our break room. No window now. Funny how much you miss a view you spent three years complaining about.'},
  {line:'I’ve got two days off next month. Consecutive ones. I keep saying that out loud.',choices:[{text:'Any plans?',reply:'Take my daughter to the canal. She wants to see a real boat. I want to sit down somewhere that’s not a train.'},{text:'You sound happy.',reply:'I am. Don’t tell the others. We’ve got a reputation to maintain.'}]}
 ]},
 {id:'nell',name:'Nell',role:'UPSTAIRS NEIGHBOR',sprite:4,x:807,y:706,asides:['That used to be a dance hall. Before everyone needed storage.','Third floor. The one with the plants. Yes, they’re real.'],lines:[
  {line:'You’re new to this bit of the street. I know because you’re still looking up.',choices:[{text:'There’s a lot to look at.',reply:'There used to be a little patch of sky between those roofs. Now there’s a laundry service. Progress is very well dressed.'},{text:'You know everyone here?',reply:'Everyone’s curtains. You learn the people more slowly.'}]},
  {line:'My husband hated this street. Too loud, he said. After he died, I kept the window open. Turned out I needed the noise.'},
  {line:'I grow basil under a sun lamp. The electricity costs more than the basil. It’s not an investment. It’s a plant.'},
  {line:'Someone’s been leaving oranges outside my door. I suspect Jun. He suspects I’m eating properly.',choices:[{text:'Are you?',reply:'When people keep leaving oranges, yes. Don’t look so pleased with yourself.'},{text:'You could ask him.',reply:'And ruin a perfectly good mystery? At my age?'}]}
 ]},
];

