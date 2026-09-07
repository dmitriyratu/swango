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
  private heroWalk:HTMLCanvasElement[]=[];
  private crowdWalk:HTMLCanvasElement[][]=[];
  private residentIdles:HTMLCanvasElement[][]=[];
  private puff:HTMLCanvasElement|null=null;
  private residentMotion=new Map<string,{walk:boolean;flip:number}>();
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
      result.push(frames);
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
    for(const [i,n] of RESIDENTS.entries()){
      const busy=this.conversation?.resident.id===n.id||Math.hypot(this.player.x-n.x,this.player.y-n.y)<112;
      const phase=(this.time+i*13)%40,walk=!busy&&(i===2||i===3)&&phase<12;
      const direction=Math.floor((this.time+i*13)/40)%2===0?1:-1;
      if(walk){n.x=Math.max(i===2?340:755,Math.min(i===2?510:920,n.x+direction*dt*12));}
      this.residentMotion.set(n.id,{walk,flip:busy?(this.player.x<n.x?-1:1):direction});
    }
    if(!this.playing||this.conversation)return;
    let dx=Number(this.keys.has('right'))-Number(this.keys.has('left')),dy=Number(this.keys.has('down'))-Number(this.keys.has('up'));
    if(this.target&&!dx&&!dy){const x=this.target.x-this.player.x,y=this.target.y-this.player.y;if(Math.hypot(x,y)<4){this.target=null;if(this.autoTalk){this.autoTalk=null;this.interact();}}else{dx=x/155;dy=y/82;}}
    if(dx||dy){const p=movePoint(this.player,dx,dy,dt);this.moving=Math.hypot(p.x-this.player.x,p.y-this.player.y)>.01;if(dx)this.facing=dx<0?-1:1;this.player=p;}
    const n=closest(this.player,RESIDENTS);if(n?.id!==this.near?.id){this.near=n;this.cb.nearby(n);}
    if(this.clearAside&&this.time>this.clearAside){this.cb.aside(null);this.clearAside=0;}
    if(this.time>this.nextAside){const n=RESIDENTS[Math.floor(Math.random()*RESIDENTS.length)];this.cb.aside({name:n.name,line:n.asides[Math.floor(Math.random()*n.asides.length)]});this.clearAside=this.time+6;this.nextAside=this.time+16+Math.random()*6;}
  }
  private person(index:number,x:number,y:number,walk=false,flip=1,hero=false,crowd=-1,offset=0){
    const c=this.ctx,clock=this.reduced?0:this.time;
    const sequence=hero&&walk?this.heroWalk:crowd>=0?this.crowdWalk[crowd]:!hero?this.residentIdles[index-1]:undefined;
    const animated=sequence&&sequence.length>0;
    const idleSequence=[0,0,0,0,1,2,3,3,2,1,0,0];
    const fi=walk?Math.floor(clock*8+offset)%Math.max(1,sequence?.length??1):idleSequence[Math.floor(clock*2.5+offset)%idleSequence.length];
    const im=animated?sequence[fi%sequence.length]:this.sprites[index];if(!im)return;
    const depth=.83+(y-600)/450,h=139*depth,w=im.width/im.height*h;
    const phase=clock*10+offset,bob=walk?Math.abs(Math.sin(phase))*2:Math.sin(clock*1.6+index)*.7;
    c.fillStyle='#020c0bac';c.beginPath();c.ellipse(x,y+2,w*.65,6*depth,0,0,Math.PI*2);c.fill();
    if(hero&&this.playing){c.strokeStyle='#dfb96a88';c.lineWidth=1.2;c.beginPath();c.ellipse(x,y+3,w*.62,7,0,0,Math.PI*2);c.stroke();}
    c.save();c.translate(x,y);c.scale(flip,1);
    c.save();c.scale(1,-.28);c.globalAlpha=.19;
    for(let sy=0;sy<im.height;sy+=12){const sh=Math.min(12,im.height-sy),ripple=Math.sin(sy*.09+clock*3)*2;c.drawImage(im,0,sy,im.width,sh,-w/2+ripple,-h+sy/im.height*h,w,sh/im.height*h+1);}
    c.restore();
    c.translate(0,-bob);
    if(walk&&!animated){const split=.62,upper=h*split,leg=h-upper,sway=Math.sin(phase)*2.3;
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
    const flicker=Math.sin(t*2.1)>.95?.03:.12;
    glow(933,304,180,`rgba(15,165,122,${flicker+.04*Math.sin(t*3)})`);glow(180,419,180,`rgba(208,105,29,${.12+.035*Math.sin(t*1.7)})`);
    glow(700+Math.sin(t*.13)*460,730,200,`rgba(39,145,148,${.04+.04*Math.sin(t*.7)})`);
    c.globalAlpha=.08+.07*Math.abs(Math.sin(t*.6));c.drawImage(this.background,1120,344,226,84,875,269,176.5,65.6);c.globalAlpha=1;
    c.restore();
    // Rotate only the fan interiors; the surrounding housings stay fixed in the set.
    for(const [x,y,r,speed] of [[272,100,17,2.4],[861,217,18,-3.1],[1178,203,14,4]]){
      c.save();c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.clip();c.translate(x,y);c.rotate(t*speed);c.drawImage(this.background,(x-r)*1.28,(y-r)*1.28,r*2*1.28,r*2*1.28,-r,-r,r*2,r*2);c.restore();
    }
    this.steam(177,493,100,t,1);this.steam(1035,577,75,t,2);
    const people=RESIDENTS.map(n=>({index:n.sprite,x:n.x,y:n.y,walk:this.residentMotion.get(n.id)?.walk??false,flip:this.residentMotion.get(n.id)?.flip??1,hero:false,crowd:-1,offset:n.sprite*2.4}));
    for(let i=0;i<7;i++){
      const direction=i%2?1:-1,progress=(t*(.017+i*.0015)+i*.173)%1;
      const x=direction===1?-100+progress*1400:1300-progress*1400,y=606+(i%4)*35;
      people.push({index:5,x,y,walk:!this.reduced,flip:direction,hero:false,crowd:i%2,offset:i*1.71});
    }
    // Smaller figures drift through the far passage, behind the walkable foreground.
    for(let i=0;i<3;i++){const f=(t*.02+i*.34)%1;people.push({index:5,x:565+Math.sin(i*3+f)*22,y:505+f*96,walk:!this.reduced,flip:i%2?1:-1,hero:false,crowd:i%2,offset:i*3});}
    people.push({index:0,x:this.player.x,y:this.player.y,walk:this.moving,flip:this.facing,hero:true,crowd:-1,offset:0});
    people.sort((a,b)=>a.y-b.y).forEach(p=>this.person(p.index,p.x,p.y,p.walk,p.flip,p.hero,p.crowd,p.offset));
    this.steam(695,756,125,t,3);
    c.save();c.lineWidth=1;
    for(let i=0;i<130;i++){const x=(i*139.31+t*20)%1200,y=(i*83.61+t*(230+(i%4)*20))%800;c.strokeStyle=`rgba(153,191,175,${.08+(i%3)*.025})`;c.beginPath();c.moveTo(x,y);c.lineTo(x-2,y+9);c.stroke();}
    for(let i=0;i<18;i++){const x=(i*67+35)%1200,y=600+(i*43)%175,f=(t*.8+i*.37)%1;c.strokeStyle=`rgba(158,200,172,${(1-f)*.12})`;c.beginPath();c.ellipse(x,y,2+f*10,1+f*2,0,0,Math.PI*2);c.stroke();}
    c.restore();
    if(this.target&&this.playing){c.strokeStyle='#e9c88288';c.beginPath();c.ellipse(this.target.x,this.target.y,8,3,0,0,Math.PI*2);c.stroke();}
    if(this.near&&this.playing&&!this.conversation){const n=this.near,h=139*(.83+(n.y-600)/450);c.font='12px monospace';c.textAlign='center';const w=c.measureText(n.name).width+20;c.fillStyle='#0a1d18e0';c.fillRect(n.x-w/2,n.y-h-28,w,21);c.fillStyle='#e9cf94';c.fillText(n.name,n.x,n.y-h-13);}
  }
  private steam(x:number,y:number,height:number,t:number,seed:number){
    if(!this.puff){const p=document.createElement('canvas');p.width=96;p.height=96;const pc=p.getContext('2d')!,g=pc.createRadialGradient(48,48,0,48,48,48);g.addColorStop(0,'#bdc8b4');g.addColorStop(.35,'#bdc8b49a');g.addColorStop(1,'#bdc8b400');pc.fillStyle=g;pc.fillRect(0,0,96,96);this.puff=p;}
    const c=this.ctx;c.save();
    for(let i=0;i<13;i++){const f=(t*.13+i/13+seed*.24)%1,s=20+f*58,drift=Math.sin(i*2.13+f*4+seed)*12+f*28;c.globalAlpha=Math.sin(f*Math.PI)*.13;c.drawImage(this.puff,x+drift-s/2,y-f*height-s/2,s,s*1.2);}
    c.restore();
  }
  destroy(){this.destroyed=true;cancelAnimationFrame(this.frame);window.removeEventListener('keydown',this.keydown);window.removeEventListener('keyup',this.keyup);window.removeEventListener('blur',this.blur);this.canvas.removeEventListener('pointerdown',this.pointer);}
}
