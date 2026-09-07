export type Point={x:number;y:number};
export const BOUNDS={left:65,right:1135,back:600,front:746};
export function movePoint(p:Point,dx:number,dy:number,seconds:number):Point {
  const length=Math.hypot(dx,dy);if(!length)return p;
  const dt=Math.min(Math.max(seconds,0),.05);
  return {x:Math.max(BOUNDS.left,Math.min(BOUNDS.right,p.x+dx/length*112*dt)),y:Math.max(BOUNDS.back,Math.min(BOUNDS.front,p.y+dy/length*58*dt))};
}
export function closest<T extends Point>(p:Point,people:T[],range=95):T|null {
  let nearest:T|null=null,best=range;
  for(const person of people){const d=Math.hypot(p.x-person.x,(p.y-person.y)*1.25);if(d<best){best=d;nearest=person;}}
  return nearest;
}
export function avoidPeople(from:Point,to:Point,people:Point[]):Point {
  const blocked=(p:Point)=>people.some(other=>Math.hypot((p.x-other.x)/25,(p.y-other.y)/13)<1);
  if(!blocked(to))return to;
  const alongX={x:to.x,y:from.y};if(!blocked(alongX))return alongX;
  const alongY={x:from.x,y:to.y};return blocked(alongY)?from:alongY;
}
export function nextIndex(length:number,previous:number,random=Math.random):number {
  if(length<2)return 0;if(previous<0)return Math.floor(random()*length);const n=Math.floor(random()*(length-1));return n>=previous?n+1:n;
}
