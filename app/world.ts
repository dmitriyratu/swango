import { BOUNDS, movePoint, closest, nextIndex, type Point } from './mechanics';
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
  private sprites:HTMLCanvasElement[]=[];
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
    const get=(src:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src;});
    const [bg,sheet]=await Promise.all([get('/night-alley.png'),get('/residents-sheet.png')]);
    if(this.destroyed)return;this.background=bg;
    // Chroma key is applied when loading the sprite sheet into the game renderer.
    for(let i=0;i<6;i++){
      const c=document.createElement('canvas');c.width=256;c.height=1024;const x=c.getContext('2d')!;x.drawImage(sheet,i*256,0,256,1024,0,0,256,1024);
      const data=x.getImageData(0,0,256,1024);let left=256,right=0,top=1024,bottom=0;
      for(let y=0;y<1024;y++)for(let px=0;px<256;px++){
        const k=(y*256+px)*4,r=data.data[k],g=data.data[k+1],b=data.data[k+2];
        if(r>g*1.5&&b>g*1.5&&r>120&&b>100)data.data[k+3]=0;
        else{left=Math.min(left,px);right=Math.max(right,px);top=Math.min(top,y);bottom=Math.max(bottom,y);}
      }
      x.putImageData(data,0,0);const trimmed=document.createElement('canvas');trimmed.width=right-left+1;trimmed.height=bottom-top+1;trimmed.getContext('2d')!.drawImage(c,left,top,trimmed.width,trimmed.height,0,0,trimmed.width,trimmed.height);this.sprites.push(trimmed);
    }
    this.frame=requestAnimationFrame(this.tick);
  }
  start(){this.playing=true;this.paused=false;this.keys.clear();this.target=null;this.nextAside=this.time+7;}
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
    this.moving=false;if(!this.playing||this.conversation)return;
    let dx=Number(this.keys.has('right'))-Number(this.keys.has('left')),dy=Number(this.keys.has('down'))-Number(this.keys.has('up'));
    if(this.target&&!dx&&!dy){const x=this.target.x-this.player.x,y=this.target.y-this.player.y;if(Math.hypot(x,y)<4){this.target=null;if(this.autoTalk){this.autoTalk=null;this.interact();}}else{dx=x/155;dy=y/82;}}
    if(dx||dy){const p=movePoint(this.player,dx,dy,dt);this.moving=Math.hypot(p.x-this.player.x,p.y-this.player.y)>.01;if(dx)this.facing=dx<0?-1:1;this.player=p;}
    const n=closest(this.player,RESIDENTS);if(n?.id!==this.near?.id){this.near=n;this.cb.nearby(n);}
    if(this.clearAside&&this.time>this.clearAside){this.cb.aside(null);this.clearAside=0;}
    if(this.time>this.nextAside){const n=RESIDENTS[Math.floor(Math.random()*RESIDENTS.length)];this.cb.aside({name:n.name,line:n.asides[Math.floor(Math.random()*n.asides.length)]});this.clearAside=this.time+6;this.nextAside=this.time+16+Math.random()*6;}
  }
  private person(index:number,x:number,y:number,walk=false,flip=1,hero=false){
    const c=this.ctx,im=this.sprites[index];if(!im)return;
    const depth=.83+(y-600)/450,h=139*depth,w=im.width/im.height*h;
    const phase=this.time*10,bob=walk?Math.abs(Math.sin(phase))*2:Math.sin(this.time*1.6+index)*.35;
    c.fillStyle='#020c0bac';c.beginPath();c.ellipse(x,y+2,w*.65,6*depth,0,0,Math.PI*2);c.fill();
    if(hero&&this.playing){c.strokeStyle='#dfb96a88';c.lineWidth=1.2;c.beginPath();c.ellipse(x,y+3,w*.62,7,0,0,Math.PI*2);c.stroke();}
    c.save();c.translate(x,y);c.scale(flip,1);
    c.save();c.scale(1,-.25);c.globalAlpha=.10;c.drawImage(im,-w/2,-h,w,h);c.restore();
    c.translate(0,-bob);
    if(walk){const split=.62,upper=h*split,leg=h-upper,sway=Math.sin(phase)*2.3;
      c.drawImage(im,0,0,im.width,im.height*split,-w/2,-h+sway*.12,w,upper);
      c.drawImage(im,0,im.height*split,im.width/2,im.height*(1-split),-w/2-1,-leg+Math.max(0,sway),w/2+1,leg-Math.max(0,sway));
      c.drawImage(im,im.width/2,im.height*split,im.width/2,im.height*(1-split),0,-leg+Math.max(0,-sway),w/2+1,leg-Math.max(0,-sway));
    }else c.drawImage(im,-w/2,-h,w,h);
    c.restore();
    if(hero&&this.playing&&!this.conversation){c.font='10px monospace';c.textAlign='center';c.fillStyle='#ecd49c';c.fillText('SWANGO',x,y-h-15);}
  }
  private draw(){
    const c=this.ctx,t=this.reduced?0:this.time;c.imageSmoothingEnabled=false;
    if(!this.background)return;c.drawImage(this.background,0,0,1200,800);
    // Animated light spill, rain, reflections and rising vapor sit over the painted set.
    c.save();c.globalCompositeOperation='screen';
    const glow=(x:number,y:number,r:number,color:string)=>{const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);};
    glow(933,304,160,`rgba(15,132,104,${.07+.02*Math.sin(t*2)})`);glow(180,419,170,`rgba(172,87,20,${.07+.015*Math.sin(t)})`);
    for(let i=0;i<14;i++){const f=(t*.095+i/14)%1,x=177+Math.sin(i*3.1+f*3)*16,y=490-f*115;glow(x,y,15+f*25,`rgba(178,198,163,${.045*(1-f)})`);}
    c.restore();
    const people=RESIDENTS.map(n=>({index:n.sprite,x:n.x,y:n.y,walk:false,flip:n.id==='nell'?-1:1,hero:false}));
    people.push({index:5,x:410+(Math.sin(t*.075)+1)*174,y:610,walk:!this.reduced,flip:Math.cos(t*.075)>0?1:-1,hero:false});
    people.push({index:0,x:this.player.x,y:this.player.y,walk:this.moving,flip:this.facing,hero:true});
    people.sort((a,b)=>a.y-b.y).forEach(p=>this.person(p.index,p.x,p.y,p.walk,p.flip,p.hero));
    c.save();c.lineWidth=1;
    for(let i=0;i<85;i++){const x=(i*139.31+t*20)%1200,y=(i*83.61+t*270)%800;c.strokeStyle=`rgba(153,191,175,${.07+(i%3)*.025})`;c.beginPath();c.moveTo(x,y);c.lineTo(x-2,y+9);c.stroke();}
    for(let i=0;i<18;i++){const x=(i*67+35)%1200,y=600+(i*43)%175,f=(t*.8+i*.37)%1;c.strokeStyle=`rgba(158,200,172,${(1-f)*.12})`;c.beginPath();c.ellipse(x,y,2+f*10,1+f*2,0,0,Math.PI*2);c.stroke();}
    c.restore();
    if(this.target&&this.playing){c.strokeStyle='#e9c88288';c.beginPath();c.ellipse(this.target.x,this.target.y,8,3,0,0,Math.PI*2);c.stroke();}
    if(this.near&&this.playing&&!this.conversation){const n=this.near,h=139*(.83+(n.y-600)/450);c.font='12px monospace';c.textAlign='center';const w=c.measureText(n.name).width+20;c.fillStyle='#0a1d18e0';c.fillRect(n.x-w/2,n.y-h-28,w,21);c.fillStyle='#e9cf94';c.fillText(n.name,n.x,n.y-h-13);}
  }
  destroy(){this.destroyed=true;cancelAnimationFrame(this.frame);window.removeEventListener('keydown',this.keydown);window.removeEventListener('keyup',this.keyup);window.removeEventListener('blur',this.blur);this.canvas.removeEventListener('pointerdown',this.pointer);}
}
