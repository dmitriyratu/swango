import { BOUNDS, closest, nextIndex, type Point } from './mechanics';
import { PeopleScene, type ActorPose } from './people-scene';
import { streetCast, updateCitizen, movePlayer } from './street-life';
export type Choice={text:string;reply:string};
type Exchange={line:string;choices?:Choice[]};
export type Resident=Point&{id:string;name:string;role:string;sprite:number;lines:Exchange[];asides:string[]};
export type Conversation=Exchange&{resident:Resident};
const RESIDENTS:Resident[]=[
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
type Callbacks={nearby:(r:Resident|null)=>void;conversation:(c:Conversation|null)=>void;aside:(a:{name:string;line:string}|null)=>void;pause:()=>void};
export class Game {
  private ctx:CanvasRenderingContext2D;
  private background:HTMLImageElement|null=null;
  private people:PeopleScene|null=null;
  private citizens=streetCast();
  private velocity={x:0,y:0};
  private heading=0;
  private puff:HTMLCanvasElement|null=null;
  private frame=0;private destroyed=false;private last=0;private time=0;
  private keys=new Set<string>();private target:Point|null=null;private autoTalk:string|null=null;
  private player={x:594,y:683};private facing=1;private moving=false;
  private near:Resident|null=null;private conversation:Conversation|null=null;
  private previous:Record<string,number>={};private nextAside=7;private clearAside=0;
  private reduced=typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  playing=false;paused=false;
  constructor(private canvas:HTMLCanvasElement,private cb:Callbacks){
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');this.ctx=ctx;
    window.addEventListener('keydown',this.keydown);window.addEventListener('keyup',this.keyup);window.addEventListener('blur',this.blur);canvas.addEventListener('pointerdown',this.pointer);
  }
  async load(){
    const background=new Image();
    await new Promise<void>((resolve,reject)=>{background.onload=()=>resolve();background.onerror=()=>reject(new Error('Alley artwork unavailable'));background.src='/night-alley.png';});
    if(this.destroyed)return;
    this.background=background;this.people=new PeopleScene();await this.people.load();
    if(this.destroyed){this.people.destroy();return;}
    this.frame=requestAnimationFrame(this.tick);
  }
  start(){this.playing=true;this.paused=false;this.keys.clear();this.target=null;this.nextAside=this.time+7;}
  setPaused(value:boolean){this.paused=value;this.keys.clear();this.target=null;}
  home(){this.playing=false;this.keys.clear();this.target=null;this.conversation=null;this.near=null;this.cb.conversation(null);this.cb.nearby(null);this.cb.aside(null);}
  setDirection(dir:string,on:boolean){if(on){this.keys.add(dir);this.target=null;this.autoTalk=null;}else this.keys.delete(dir);}
  interact(){if(this.paused||!this.playing||this.conversation)return;const n=closest(this.player,RESIDENTS);if(!n)return;const i=nextIndex(n.lines.length,this.previous[n.id]??-1);this.previous[n.id]=i;this.conversation={...n.lines[i],resident:n};this.keys.clear();this.target=null;this.cb.conversation(this.conversation);this.cb.aside(null);}
  choose(i:number){if(!this.conversation)return;const choice=this.conversation.choices?.[i];if(!choice)return;this.conversation={resident:this.conversation.resident,line:choice.reply};this.cb.conversation(this.conversation);}
  endConversation(){this.conversation=null;this.keys.clear();this.target=null;this.cb.conversation(null);this.nextAside=this.time+10;}
  private keydown=(e:KeyboardEvent)=>{
    if(!this.playing)return;
    const k=e.key.toLowerCase();
    if(k==='escape'){if(this.paused)return;e.preventDefault();if(this.conversation)this.endConversation();else{this.keys.clear();this.cb.pause();}return;}
    if(this.paused)return;
    if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d','e','1','2'].includes(k))e.preventDefault();
    if(this.conversation){if(k==='1'||k==='2')this.choose(Number(k)-1);if(k==='e'&&!e.repeat&&!this.conversation.choices)this.endConversation();return;}
    if(k==='e'&&!e.repeat)this.interact();
    const map:Record<string,string>={w:'up',arrowup:'up',s:'down',arrowdown:'down',a:'left',arrowleft:'left',d:'right',arrowright:'right'};
    if(map[k])this.setDirection(map[k],true);
  };
  private keyup=(e:KeyboardEvent)=>{const map:Record<string,string>={w:'up',arrowup:'up',s:'down',arrowdown:'down',a:'left',arrowleft:'left',d:'right',arrowright:'right'};if(map[e.key.toLowerCase()])this.keys.delete(map[e.key.toLowerCase()]);};
  private blur=()=>{this.keys.clear();this.target=null;};
  private pointer=(e:PointerEvent)=>{
    if(!this.playing||this.paused||this.conversation)return;this.canvas.focus();
    const r=this.canvas.getBoundingClientRect(),scale=Math.min(r.width/1200,r.height/800),offsetX=(r.width-1200*scale)/2,offsetY=(r.height-800*scale)/2;
    const p={x:(e.clientX-r.left-offsetX)/scale,y:(e.clientY-r.top-offsetY)/scale};
    const person=RESIDENTS.find(n=>Math.abs(n.x-p.x)<35&&p.y<=n.y+12&&p.y>n.y-140);
    if(person){this.target={x:person.x+(this.player.x>person.x?52:-52),y:person.y+12};this.autoTalk=person.id;}
    else if(p.x>=BOUNDS.left&&p.x<=BOUNDS.right&&p.y>=BOUNDS.back-18&&p.y<=BOUNDS.front+18){this.target={x:p.x,y:Math.max(BOUNDS.back,Math.min(BOUNDS.front,p.y))};this.autoTalk=null;}
  };
  private tick=(now:number)=>{
    if(this.destroyed)return;const dt=this.last?Math.min((now-this.last)/1000,.05):0;this.last=now;
    if(!this.paused){this.time+=dt;this.update(dt);}this.draw();this.frame=requestAnimationFrame(this.tick);
  };
  private update(dt:number){
    this.moving=false;this.velocity={x:0,y:0};
    if(!this.reduced)for(const citizen of this.citizens)updateCitizen(citizen,dt,this.citizens.filter(other=>other!==citizen),this.playing?this.player:null);
    if(!this.playing||this.conversation)return;
    let dx=Number(this.keys.has('right'))-Number(this.keys.has('left')),dy=Number(this.keys.has('down'))-Number(this.keys.has('up'));
    if(this.target&&!dx&&!dy){const x=this.target.x-this.player.x,y=this.target.y-this.player.y;if(Math.hypot(x,y)<4){this.target=null;if(this.autoTalk){this.autoTalk=null;this.interact();}}else{dx=x/106;dy=y/59;}}
    if(dx||dy){const next=movePlayer(this.player,dx,dy,dt,[...RESIDENTS,...this.citizens]);this.velocity={x:(next.x-this.player.x)/Math.max(dt,.001),y:(next.y-this.player.y)/Math.max(dt,.001)};this.moving=Math.hypot(this.velocity.x,this.velocity.y)>.5;if(this.moving)this.heading=Math.atan2(this.velocity.x,this.velocity.y*1.6);this.player=next;}
    const n=closest(this.player,RESIDENTS);if(n?.id!==this.near?.id){this.near=n;this.cb.nearby(n);}
    if(this.clearAside&&this.time>this.clearAside){this.cb.aside(null);this.clearAside=0;}
    if(this.time>this.nextAside){const n=RESIDENTS[Math.floor(Math.random()*RESIDENTS.length)];this.cb.aside({name:n.name,line:n.asides[Math.floor(Math.random()*n.asides.length)]});this.clearAside=this.time+6;this.nextAside=this.time+16+Math.random()*6;}
  }
  private poses():ActorPose[]{
    const models=['worker','mechanic','suit','neighbor'];
    const poses:ActorPose[]=RESIDENTS.map((n,i)=>({id:n.id,model:models[i],x:n.x,y:n.y,height:[125,122,140,122][i],vx:0,vy:0,face:this.conversation?.resident.id===n.id?Math.atan2(this.player.x-n.x,(this.player.y-n.y)*1.6):[0,-.5,.25,-.3][i],activity:this.conversation?.resident.id===n.id?'talk':i===0?'serve':i===1?'repair':'idle',skin:i%3}));
    for(const c of this.citizens)poses.push({...c,height:c.height*(.88+(c.y-631)/650),carrying:c.id==='delivery'&&c.stop>=2});
    poses.push({id:'swango',model:'hoodie',...this.player,height:137*(.9+(this.player.y-600)/650),vx:this.velocity.x,vy:this.velocity.y,face:this.heading,activity:this.moving?'walk':this.conversation?'talk':'idle',skin:1,coat:'#b08839'});
    return poses;
  }
  private draw(){
    const c=this.ctx,t=this.reduced?0:this.time;c.imageSmoothingEnabled=false;
    if(!this.background)return;c.drawImage(this.background,0,0,1200,800);
    // Animated light spill, rain, reflections and rising vapor sit over the painted set.
    c.save();c.globalCompositeOperation='screen';
    const glow=(x:number,y:number,r:number,color:string)=>{const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);};
    const neon=.045+.006*Math.sin(t*.81)+.003*Math.sin(t*2.7);
    glow(933,304,145,`rgba(15,165,122,${neon})`);glow(180,419,155,`rgba(208,105,29,${.045+.004*Math.sin(t*.63)})`);
    glow(939,706,120,`rgba(39,145,148,${neon*.5})`);
    // Soft light drifts through the distant cross street and across the wet stones.
    const passing=(t%23)/23,spill=Math.pow(Math.max(0,Math.sin(passing*Math.PI*2)),8)*.065;
    glow(545+passing*155,511,95,`rgba(209,216,168,${spill})`);
    glow(593+passing*72,683,85,`rgba(190,199,142,${spill*.35})`);
    c.restore();
    this.steam(177,493,90,t,1);this.steam(1035,577,60,t,2);
    const poses=this.poses();
    for(const p of poses){c.fillStyle='#02121065';c.beginPath();c.ellipse(p.x,p.y+2,p.height*.15,4,0,0,Math.PI*2);c.fill();}
    if(this.people){this.people.render(poses,t,this.paused||this.reduced);c.drawImage(this.people.canvas,0,0,1200,800);}
    if(this.playing){c.strokeStyle='#d0b56d66';c.beginPath();c.ellipse(this.player.x,this.player.y+3,20,5,0,0,Math.PI*2);c.stroke();c.font='10px monospace';c.fillStyle='#e2ce98';c.textAlign='center';c.fillText('SWANGO',this.player.x,this.player.y-154);}
    c.save();c.lineWidth=1;
    for(let i=0;i<68;i++){const x=(i*139.31+t*8)%1200,y=(i*83.61+t*(230+(i%4)*20))%800;c.strokeStyle=`rgba(153,191,175,${.04+(i%3)*.015})`;c.beginPath();c.moveTo(x,y);c.lineTo(x-.6,y+6);c.stroke();}
    for(let i=0;i<12;i++){const x=(i*97+35)%1200,y=625+(i*43)%140,f=(t*.55+i*.37)%1;c.strokeStyle=`rgba(158,200,172,${Math.sin(f*Math.PI)*.075})`;c.beginPath();c.ellipse(x,y,1+f*7,.5+f*1.5,0,0,Math.PI*2);c.stroke();}
    c.restore();
    if(this.target&&this.playing){c.strokeStyle='#e9c88288';c.beginPath();c.ellipse(this.target.x,this.target.y,8,3,0,0,Math.PI*2);c.stroke();}
    if(this.near&&this.playing&&!this.conversation){const n=this.near,h=139*(.83+(n.y-600)/450);c.font='12px monospace';c.textAlign='center';const w=c.measureText(n.name).width+20;c.fillStyle='#0a1d18e0';c.fillRect(n.x-w/2,n.y-h-28,w,21);c.fillStyle='#e9cf94';c.fillText(n.name,n.x,n.y-h-13);}
  }
  private steam(x:number,y:number,height:number,t:number,seed:number){
    if(!this.puff){const p=document.createElement('canvas');p.width=96;p.height=96;const pc=p.getContext('2d')!,g=pc.createRadialGradient(48,48,0,48,48,48);g.addColorStop(0,'#bdc8b4');g.addColorStop(.35,'#bdc8b49a');g.addColorStop(1,'#bdc8b400');pc.fillStyle=g;pc.fillRect(0,0,96,96);this.puff=p;}
    const c=this.ctx;c.save();
    for(let i=0;i<19;i++){const f=(t*.065+i/19+seed*.24)%1,s=12+f*37,drift=Math.sin(seed+f*2)*9+f*17;c.globalAlpha=Math.sin(f*Math.PI)*.075;c.drawImage(this.puff,x+drift-s/2,y-f*height-s/2,s,s*1.4);}
    c.restore();
  }
  destroy(){this.destroyed=true;this.people?.destroy();cancelAnimationFrame(this.frame);window.removeEventListener('keydown',this.keydown);window.removeEventListener('keyup',this.keyup);window.removeEventListener('blur',this.blur);this.canvas.removeEventListener('pointerdown',this.pointer);}
}
