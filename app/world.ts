import { BOUNDS, movePoint, avoidPeople, closest, nextIndex, type Point } from './mechanics';
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
  private heroWalk:HTMLCanvasElement[]=[];
  private crowdWalk:HTMLCanvasElement[][]=[];
  private residentIdles:HTMLCanvasElement[][]=[];
  private puff:HTMLCanvasElement|null=null;
  private travel=0;
  private walkers=[
    {x:120,y:656,direction:1,speed:49,travel:17,variant:0,scale:.94},
    {x:875,y:656,direction:1,speed:43,travel:83,variant:1,scale:.89},
    {x:1110,y:738,direction:-1,speed:57,travel:41,variant:0,scale:1.02},
    {x:380,y:738,direction:-1,speed:46,travel:109,variant:1,scale:.95},
  ].map(w=>({...w,moving:false}));
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
    // Animation atlases are separate so each person can move at an independent pace.
    const atlases=await Promise.allSettled([get('/swango-walk.png'),get('/crowd-walk.png'),get('/resident-idles.png')]);
    if(this.destroyed)return;
    if(atlases[0].status==='fulfilled')this.heroWalk=this.atlas(atlases[0].value,4,2).flat();
    if(atlases[1].status==='fulfilled')this.crowdWalk=this.atlas(atlases[1].value,4,2);
    if(atlases[2].status==='fulfilled')this.residentIdles=this.atlas(atlases[2].value,4,4);
  }
  private atlas(image:HTMLImageElement,columns:number,rows:number){
    const result:HTMLCanvasElement[][]=[],cw=image.width/columns,ch=image.height/rows;
    for(let row=0;row<rows;row++){
      const frames:HTMLCanvasElement[]=[];
      for(let col=0;col<columns;col++){
        const rowTop=rows===4?[0,255,514,763][row]:row*ch,rowBottom=rows===4?[255,514,763,1024][row]:(row+1)*ch,cellHeight=rowBottom-rowTop;
        const frame=document.createElement('canvas');frame.width=cw;frame.height=cellHeight;const c=frame.getContext('2d')!;
        c.drawImage(image,col*cw,rowTop,cw,cellHeight,0,0,cw,cellHeight);const d=c.getImageData(0,0,cw,cellHeight);
        let left=cw,right=-1,top=cellHeight,bottom=-1;
        for(let y=0;y<cellHeight;y++)for(let x=0;x<cw;x++){const k=(y*cw+x)*4,r=d.data[k],g=d.data[k+1],b=d.data[k+2];if(r>g*1.5&&b>g*1.5&&r>120&&b>100)d.data[k+3]=0;else{left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}}
        c.putImageData(d,0,0);const trim=document.createElement('canvas');trim.width=Math.max(1,right-left+1);trim.height=Math.max(1,bottom-top+1);trim.getContext('2d')!.drawImage(frame,left,top,trim.width,trim.height,0,0,trim.width,trim.height);frames.push(trim);
      }
      // Use one scale for the entire sequence and align the torso, not the
      // changing silhouette of swinging arms and feet. This prevents shrinking
      // bodies and sideways snapping at every frame change.
      const maxHeight=Math.max(...frames.map(f=>f.height)),scale=300/maxHeight;
      result.push(frames.map(frame=>{
        const fc=frame.getContext('2d')!,pixels=fc.getImageData(0,0,frame.width,frame.height).data;
        let sum=0,count=0;
        for(let y=Math.floor(frame.height*.23);y<frame.height*.48;y++)for(let x=0;x<frame.width;x++)if(pixels[(y*frame.width+x)*4+3]>128){sum+=x;count++;}
        const anchor=count?sum/count:frame.width/2;
        const aligned=document.createElement('canvas');aligned.width=240;aligned.height=320;
        const ac=aligned.getContext('2d')!;ac.imageSmoothingEnabled=false;
        ac.drawImage(frame,120-anchor*scale,320-frame.height*scale,frame.width*scale,frame.height*scale);
        return aligned;
      }));
    }return result;
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
    this.moving=false;
    // Foot paths stay on the two broad strips of paving. Residents remain at
    // their own places; no clamped patrol can run a walking loop in a doorway.
    for(const w of this.walkers){
      const ahead=(p:Point)=>Math.abs(p.y-w.y)<24&&(p.x-w.x)*w.direction>0&&(p.x-w.x)*w.direction<65;
      const blocked=(this.playing&&ahead(this.player))||this.walkers.some(other=>other!==w&&ahead(other));
      const distance=this.reduced||blocked?0:w.speed*dt;
      w.moving=distance>0;w.x+=w.direction*distance;w.travel+=distance;
      if(w.x>1310)w.x=-110;if(w.x< -110)w.x=1310;
    }
    if(!this.playing||this.conversation)return;
    let dx=Number(this.keys.has('right'))-Number(this.keys.has('left')),dy=Number(this.keys.has('down'))-Number(this.keys.has('up'));
    if(this.target&&!dx&&!dy){const x=this.target.x-this.player.x,y=this.target.y-this.player.y;if(Math.hypot(x,y)<4){this.target=null;if(this.autoTalk){this.autoTalk=null;this.interact();}}else{dx=x/112;dy=y/58;}}
    if(dx||dy){const p=avoidPeople(this.player,movePoint(this.player,dx,dy,dt),[...RESIDENTS,...this.walkers]),distance=Math.hypot(p.x-this.player.x,(p.y-this.player.y)*1.6);this.moving=distance>.01;this.travel+=distance;if(dx)this.facing=dx<0?-1:1;this.player=p;}
    const n=closest(this.player,RESIDENTS);if(n?.id!==this.near?.id){this.near=n;this.cb.nearby(n);}
    if(this.clearAside&&this.time>this.clearAside){this.cb.aside(null);this.clearAside=0;}
    if(this.time>this.nextAside){const n=RESIDENTS[Math.floor(Math.random()*RESIDENTS.length)];this.cb.aside({name:n.name,line:n.asides[Math.floor(Math.random()*n.asides.length)]});this.clearAside=this.time+6;this.nextAside=this.time+16+Math.random()*6;}
  }
  private person(index:number,x:number,y:number,walk=false,flip=1,hero=false,crowd=-1,offset=0,size=1){
    const c=this.ctx,clock=this.reduced?0:this.time;
    const sequence=hero?this.heroWalk:crowd>=0?this.crowdWalk[crowd]:this.residentIdles[index-1];
    const animated=sequence&&sequence.length>0;
    const depth=(.83+(y-600)/450)*size;
    const stride=139*depth*(crowd===1?.64:.74);
    const idleSequence=[0,1,2,3,2,1,0];
    const gestureTime=(clock+index*3.17)%(9+index*1.8);
    const fi=hero||crowd>=0?(walk?Math.floor(offset/stride*(sequence?.length??1))%Math.max(1,sequence?.length??1):0):gestureTime<1.75?idleSequence[Math.floor(gestureTime*4)]:0;
    const im=animated?sequence[fi%sequence.length]:this.sprites[index];if(!im)return;
    const h=139*depth*(animated?320/300:1),w=im.width/im.height*h;
    const shadowWidth=21*depth;
    c.fillStyle='#020c0b85';c.beginPath();c.ellipse(x,y+2,shadowWidth,4*depth,0,0,Math.PI*2);c.fill();
    if(hero&&this.playing){c.strokeStyle='#dfb96a55';c.lineWidth=1;c.beginPath();c.ellipse(x,y+3,shadowWidth,5,0,0,Math.PI*2);c.stroke();}
    c.save();c.translate(x,y);c.scale(flip,1);
    c.save();c.scale(1,-.20);c.globalAlpha=.07;c.drawImage(im,-w/2,-h,w,h);c.restore();
    c.drawImage(im,-w/2,-h,w,h);
    c.restore();
    if(hero&&this.playing&&!this.conversation){c.font='10px monospace';c.textAlign='center';c.fillStyle='#ecd49c';c.fillText('SWANGO',x,y-h-15);}
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
    c.restore();
    this.steam(177,493,90,t,1);this.steam(1035,577,60,t,2);
    const people=RESIDENTS.map(n=>({index:n.sprite,x:n.x,y:n.y,walk:false,flip:n.id==='nell'?-1:1,hero:false,crowd:-1,offset:0,size:1}));
    for(const w of this.walkers)people.push({index:5,x:w.x,y:w.y,walk:w.moving,flip:w.direction,hero:false,crowd:w.variant,offset:w.travel,size:w.scale});
    people.push({index:0,x:this.player.x,y:this.player.y,walk:this.moving,flip:this.facing,hero:true,crowd:-1,offset:this.travel,size:1});
    people.sort((a,b)=>a.y-b.y).forEach(p=>this.person(p.index,p.x,p.y,p.walk,p.flip,p.hero,p.crowd,p.offset,p.size));
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
  destroy(){this.destroyed=true;cancelAnimationFrame(this.frame);window.removeEventListener('keydown',this.keydown);window.removeEventListener('keyup',this.keyup);window.removeEventListener('blur',this.blur);this.canvas.removeEventListener('pointerdown',this.pointer);}
}
