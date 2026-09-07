import { BOUNDS, type Point } from './mechanics';
export type Activity='idle'|'walk'|'talk'|'serve'|'repair'|'carry'|'shop'|'wave';
export type Stop=Point&{activity?:Activity;seconds?:number;face?:number};
export type Citizen=Point&{id:string;model:string;speed:number;height:number;route:Stop[];stop:number;remaining:number;activity:Activity;vx:number;vy:number;face:number;stalled:number;skin:number;coat?:string};
export const citizen=(id:string,model:string,speed:number,height:number,route:Stop[],skin=0,coat?:string):Citizen=>({id,model,speed,height,route,x:route[0].x,y:route[0].y,stop:1,remaining:0,activity:'idle',vx:0,vy:0,face:0,stalled:0,skin,coat});
export function streetCast():Citizen[]{return [
 citizen('commuter','suit',59,143,[{x:-90,y:734},{x:1290,y:734}],1),
 citizen('student','casual',65,133,[{x:1270,y:661},{x:-90,y:661}],2,'#596e78'),
 citizen('shopper','shopper',48,128,[{x:-180,y:646},{x:324,y:646,activity:'shop',seconds:8,face:2.8},{x:400,y:669},{x:1290,y:678}],0),
 citizen('delivery','shopper',55,137,[{x:1270,y:722},{x:1073,y:646,activity:'carry',seconds:5,face:2.8},{x:735,y:720},{x:-100,y:727}],2),
 citizen('friend-a','casual',52,137,[{x:-270,y:720},{x:638,y:660,activity:'talk',seconds:13,face:1.57},{x:1280,y:714}],1,'#566962'),
 citizen('friend-b','neighbor',46,126,[{x:1330,y:710},{x:697,y:660,activity:'talk',seconds:15,face:-1.57},{x:-120,y:710}],0),
 citizen('late-shift','suit',41,149,[{x:-510,y:688},{x:905,y:643,activity:'idle',seconds:9,face:2.8},{x:1300,y:685}],3),
 citizen('visitor','hoodie',64,132,[{x:1550,y:741},{x:360,y:741,activity:'idle',seconds:4,face:0},{x:-150,y:741}],0,'#61434c'),
 ];}
export function updateCitizen(c:Citizen,dt:number,others:Point[],player:Point|null){
  c.vx=0;c.vy=0;
  if(dt<=0)return;
  if(c.remaining>0){c.remaining=Math.max(0,c.remaining-dt);return;}
  const target=c.route[c.stop];const dx=target.x-c.x,dy=target.y-c.y,d=Math.hypot(dx,dy*1.6);
  if(d<4){
    c.x=target.x;c.y=target.y;c.activity=target.activity??'idle';c.face=target.face??c.face;c.remaining=target.seconds??0;c.stop=(c.stop+1)%c.route.length;
    // Only wrap off screen; a new trip is never visible as a teleport.
    if(c.stop===0&&(c.x< -75||c.x>1275)){c.x=c.route[0].x;c.y=c.route[0].y;c.stop=1;}
    return;
  }
  let ux=dx/d,uy=dy/d;
  for(const p of [...others,...(player?[player]:[])]){
    const ox=c.x-p.x,oy=(c.y-p.y)*1.7,dist=Math.hypot(ox,oy);
    if(dist>0&&dist<53){const force=(53-dist)/53;ux+=ox/dist*force*.9;uy+=oy/dist*force*.8;}
  }
  const n=Math.max(.5,Math.hypot(ux,uy)),step=c.speed*dt;
  const nx=c.x+ux/n*step,ny=Math.max(631,Math.min(746,c.y+uy/n*step*.62));
  const tooClose=player&&Math.hypot((nx-player.x)/25,(ny-player.y)/15)<1;
  if(tooClose){c.activity='idle';c.stalled+=dt;
    // Give the player room by choosing a side, rather than keeping a blocked walk.
    if(c.stalled>.5){c.y=Math.max(631,Math.min(746,c.y+(c.y<690?-1:1)*dt*17));}return;}
  c.stalled=0;c.vx=(nx-c.x)/dt;c.vy=(ny-c.y)/dt;c.x=nx;c.y=ny;c.activity='walk';c.face=Math.atan2(c.vx,c.vy*1.6);
}
export function movePlayer(p:Point,dx:number,dy:number,dt:number,obstacles:Point[]):Point{
 const n=Math.hypot(dx,dy);if(!n)return p;
 const candidate={x:Math.max(BOUNDS.left,Math.min(BOUNDS.right,p.x+dx/n*106*dt)),y:Math.max(BOUNDS.back,Math.min(BOUNDS.front,p.y+dy/n*59*dt))};
 const clear=(q:Point)=>!obstacles.some(o=>Math.hypot((q.x-o.x)/23,(q.y-o.y)/12)<1);
 if(clear(candidate))return candidate;const x={x:candidate.x,y:p.y};if(clear(x))return x;const y={x:p.x,y:candidate.y};return clear(y)?y:p;
}
