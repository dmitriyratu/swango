import * as T from 'three';
export const civilianNames=['eric','carla','claudia','manuel','nathan','sophia'];
export const individuality:Record<string,{width:number;skin:[number,number,number]}>=Object.fromEntries([
 ['swango',1.02,[1.03,.98,.94]],['jun',1,[.95,.89,.81]],['mara',.98,[1.07,1.01,.96]],
 ['ivo',1.06,[1.04,1.02,.98]],['nell',1.03,[.96,.91,.86]],['commuter',.94,[.84,.77,.69]],
 ['student',.95,[1.1,1.04,.98]],['shopper',1.08,[.93,.85,.77]],['delivery',.96,[.87,.79,.71]],
 ['friend-a',1.1,[1.08,1.01,.93]],['friend-b',1.04,[.93,.86,.79]],['late-shift',1.12,[1.12,1.05,.98]],
 ['visitor',.95,[1.04,.96,.88]],
].map(([id,width,skin])=>[id,{width,skin}])) as Record<string,{width:number;skin:[number,number,number]}>;
export const wardrobe:Record<string,[string,string]>={
 swango:['#b58c42','#5e6765'],jun:['#657578','#343f42'],mara:['#458382','#555f62'],
 ivo:['#7a929a','#546e80'],nell:['#98526a','#747077'],commuter:['#73898a','#687177'],
 student:['#899579','#696d76'],shopper:['#bdad8e','#757d8c'],delivery:['#778ba0','#677b84'],
 'friend-a':['#9b7c6b','#5d6d74'],'friend-b':['#c3b39d','#72797d'],'late-shift':['#969886','#686a72'],visitor:['#7c627a','#62666f'],
};
// Round the torso in bind space; preserve the skeleton, hands, and limb lengths.
export function shapeCivilian(model:T.Object3D,id:string,height:number){
 if(id!=='jun')return;
 model.updateMatrixWorld(true);
 model.traverse(o=>{if(!(o instanceof T.SkinnedMesh))return;
  o.geometry=o.geometry.clone();const positions=o.geometry.attributes.position;
  const inverse=o.matrixWorld.clone().invert(),v=new T.Vector3();
  for(let i=0;i<positions.count;i++){
   v.fromBufferAttribute(positions,i).applyMatrix4(o.matrixWorld);
   const waist=Math.exp(-Math.pow((v.y-height*.64)/(height*.13),2));
   const central=1-T.MathUtils.smoothstep(Math.abs(v.x),23,36);
   const fullness=waist*central;v.x*=1+fullness*.26;
   v.z+=fullness*(v.z>0?8: -2.5);
   v.applyMatrix4(inverse);positions.setXYZ(i,v.x,v.y,v.z);
  }
  positions.needsUpdate=true;o.geometry.computeVertexNormals();o.geometry.computeBoundingBox();o.geometry.computeBoundingSphere();
 });
}
export function dressCivilian(model:T.Object3D,id:string,height:number){
 model.userData.civilianHeight=height;
 model.updateMatrixWorld(true);
 const attach=(boneName:string,geometry:T.BufferGeometry,color:string,x:number,y:number,z:number)=>{
  const bone=model.getObjectByName(boneName);if(!bone)return;
  const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({color,roughness:.93,side:T.DoubleSide}));
  // Costume anchors are authored in the scanned body's bind pose, then fitted to its bone.
  const local=bone.matrixWorld.clone().invert().multiply(new T.Matrix4().makeTranslation(x,y,z));
  local.decompose(mesh.position,mesh.quaternion,mesh.scale);bone.add(mesh);return mesh;
 };
 if(id==='jun'){
  const apron=new T.PlaneGeometry(46,70,12,16),position=apron.attributes.position;
  for(let i=0;i<position.count;i++){const x=position.getX(i),y=position.getY(i);position.setZ(i,Math.sin(x*.28)*.35-Math.pow(x/23,2)*9);position.setX(i,x*(1-y/220));}apron.computeVertexNormals();
  attach('spine_02',apron,'#c8bda3',0,height*.59,24);
  attach('spine_02',new T.PlaneGeometry(13,10),'#aa9e82',4,height*.58,25);
  for(const x of [-11,11])attach('spine_03',new T.PlaneGeometry(2.1,24),'#c8bda3',x,height*.78,12);
  const cap=attach('head',new T.SphereGeometry(10,20,10,0,Math.PI*2,0,Math.PI/2),'#344b4b',0,height-2,0);if(cap)cap.scale.y*=.6;
  const bowl=new T.Group();bowl.name='RamenBowl';bowl.position.set(12,height*.65,34);
  const ceramic=new T.Mesh(new T.SphereGeometry(9,24,12,0,Math.PI*2,0,Math.PI/2),new T.MeshStandardMaterial({color:0xd5ccb3,roughness:.45,side:T.DoubleSide}));ceramic.rotation.x=Math.PI;bowl.add(ceramic);
  const broth=new T.Mesh(new T.CircleGeometry(8,24),new T.MeshStandardMaterial({color:0xac7b35,roughness:.38}));broth.rotation.x=-Math.PI/2;broth.position.y=-1;bowl.add(broth);model.add(bowl);
 }
 if(id==='mara')attach('spine_03',new T.PlaneGeometry(7,3.8),'#d6c19b',-11,height*.76,13);
 if(id==='ivo')for(const x of [-12,12])attach('spine_03',new T.PlaneGeometry(2,28),'#bdbea8',x,height*.74,14);
 if(id==='nell'){
  const scarf=new T.TorusGeometry(8,2.4,8,24);scarf.rotateX(Math.PI/2);
  attach('neck',scarf,'#b89976',0,height*.855,0);
  attach('spine_03',new T.PlaneGeometry(5.5,27),'#b89976',8,height*.75,13);
 }
 if(id==='swango'){
  attach('spine_02',new T.BoxGeometry(17,22,7),'#6e624e',-20,height*.52,4);
  const strap=new T.PlaneGeometry(2.6,height*.3);strap.rotateZ(-.38);attach('spine_03',strap,'#655b47',0,height*.72,14);
 }
 const bag=(color:string,back=false)=>{
  attach('spine_02',new T.BoxGeometry(back?26:18,back?34:24,back?11:6),color,back?0:-22,height*(back?.69:.52),back?-14:3);
  if(back)for(const x of [-12,12])attach('spine_03',new T.PlaneGeometry(3,35),color,x,height*.74,12);
  else {const strap=new T.PlaneGeometry(2.5,height*.3);strap.rotateZ(-.38);attach('spine_03',strap,color,0,height*.72,14);}
 };
 const glasses=()=>{
  for(const x of [-4.5,4.5]){const lens=new T.TorusGeometry(3.4,.45,6,18);lens.scale(1.15,.8,1);attach('head',lens,'#514839',x,height*.942,9.5);}
  attach('head',new T.BoxGeometry(2.4,.55,.6),'#514839',0,height*.943,9.5);
 };
 const beanie=(color:string)=>{const cap=attach('head',new T.SphereGeometry(10.5,20,12,0,Math.PI*2,0,Math.PI/2),color,0,height-3,0);if(cap)cap.scale.y*=.72;};
 const scarf=(color:string)=>{const loop=new T.TorusGeometry(8.5,2.8,8,20);loop.rotateX(Math.PI/2);attach('neck',loop,color,0,height*.855,0);attach('spine_03',new T.PlaneGeometry(7,29),color,6,height*.76,14);};
 if(id==='commuter'){glasses();bag('#51483e');}
 if(id==='student'){
  bag('#737956',true);
  const band=new T.TorusGeometry(11,1.1,8,24,Math.PI);attach('head',band,'#333d42',0,height*.954,0);
  for(const x of [-10.5,10.5])attach('head',new T.SphereGeometry(3.1,12,8),'#b09a6b',x,height*.94,0);
 }
 if(id==='shopper')bag('#b5a187');
 if(id==='delivery'){bag('#496471',true);beanie('#a38c62');}
 if(id==='friend-a')scarf('#a77f57');
 if(id==='friend-b'){
  bag('#7b554f');
  for(const x of [-9,9])attach('head',new T.TorusGeometry(1.4,.38,6,14),'#c0a667',x,height*.925,1);
 }
 if(id==='late-shift'){beanie('#6b7370');bag('#68765b');}
 if(id==='visitor'){glasses();scarf('#ad9f8d');}
 if(id==='nell')glasses();
}
// Position hands using the full scanned skeleton; the geometry and clothing
// follow the joints, with no sprite warping or frozen interaction frame.
export function poseCivilian(model:T.Object3D,id:string,activity:string,time:number){
 const h=model.userData.civilianHeight as number;
 if(id==='jun'){
  reach(model,'l',new T.Vector3(17,h*.65-5,34));
  reach(model,'r',new T.Vector3(5+Math.sin(time*1.15)*2,h*.69,34+Math.cos(time*1.15)*2));
 }else if(activity==='repair')reach(model,'r',new T.Vector3(-13,h*.63+Math.sin(time*1.2)*2,32));
 else if(activity==='talk')reach(model,'r',new T.Vector3(-22,h*.60+Math.sin(time*.8)*3,17));
}
function reach(model:T.Object3D,side:string,target:T.Vector3){
 const upper=model.getObjectByName('upperarm_'+side),lower=model.getObjectByName('lowerarm_'+side),hand=model.getObjectByName('hand_'+side);if(!upper||!lower||!hand)return;
 model.updateWorldMatrix(true,true);target=model.localToWorld(target);
 const a=upper.getWorldPosition(new T.Vector3()),b=lower.getWorldPosition(new T.Vector3()),c=hand.getWorldPosition(new T.Vector3());
 const l1=a.distanceTo(b),l2=b.distanceTo(c),direction=target.clone().sub(a),distance=Math.min(direction.length(),(l1+l2)*.98);direction.normalize();
 const pole=new T.Vector3(side==='l'?.35:-.35,-1,-.15).transformDirection(model.matrixWorld);pole.addScaledVector(direction,-pole.dot(direction)).normalize();
 const cosine=T.MathUtils.clamp((l1*l1+distance*distance-l2*l2)/(2*l1*distance),-1,1);
 const elbow=a.clone().addScaledVector(direction,l1*cosine).addScaledVector(pole,l1*Math.sqrt(1-cosine*cosine));
 const aim=(bone:T.Object3D,child:T.Object3D,point:T.Vector3)=>{const start=bone.getWorldPosition(new T.Vector3()),from=child.getWorldPosition(new T.Vector3()).sub(start).normalize(),to=point.clone().sub(start).normalize();const q=new T.Quaternion().setFromUnitVectors(from,to).multiply(bone.getWorldQuaternion(new T.Quaternion()));bone.quaternion.copy(bone.parent!.getWorldQuaternion(new T.Quaternion()).invert().multiply(q)).normalize();bone.updateWorldMatrix(false,true);};
 aim(upper,lower,elbow);aim(lower,hand,target);
}
