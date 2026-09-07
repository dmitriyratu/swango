import * as T from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import type { Activity } from './street-life';
export type ActorPose={id:string;model:string;x:number;y:number;height:number;vx:number;vy:number;face:number;activity:Activity;skin?:number;coat?:string;carrying?:boolean};
type Rig={group:T.Group;model:T.Object3D;mixer:T.AnimationMixer;actions:Record<string,T.AnimationAction>;current:string;face:number;props:T.Object3D[];height:number};
export class PeopleScene{
 readonly canvas:HTMLCanvasElement;
 private renderer:T.WebGLRenderer;
 private scene=new T.Scene();private camera=new T.OrthographicCamera(-600,600,400,-400,.1,3000);
 private templates=new Map<string,GLTF>();private actors=new Map<string,Rig>();
 private animatedProps:{object:T.Object3D;kind:string;seed:number}[]=[];
 private lastTime=0;
 constructor(){
  this.renderer=new T.WebGLRenderer({alpha:true,antialias:false,premultipliedAlpha:true});this.renderer.setPixelRatio(1);this.renderer.setSize(900,600,false);this.renderer.setClearColor(0x000000,0);this.renderer.outputColorSpace=T.SRGBColorSpace;
  this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.12;
  this.canvas=this.renderer.domElement;this.camera.position.set(0,0,1200);this.camera.lookAt(0,0,0);
  this.scene.add(new T.HemisphereLight(0x86aeb0,0x352e20,1.65));
  const warm=new T.DirectionalLight(0xffc87e,2.1);warm.position.set(-500,650,450);this.scene.add(warm);
  const cool=new T.DirectionalLight(0x65bfb6,1.4);cool.position.set(550,260,-200);this.scene.add(cool);
  this.makeProps();
 }
 async load(){const loader=new GLTFLoader();await Promise.all(['hoodie','worker','casual','suit','punk','mechanic','neighbor','shopper','courier'].map(async name=>this.templates.set(name,await loader.loadAsync(`/models/${name}.glb`))));}
 private build(p:ActorPose):Rig{
  const source=this.templates.get(p.model);if(!source)throw new Error(`Missing ${p.model}`);
  const model=clone(source.scene),group=new T.Group();group.add(model);
  const bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3());
  const scale=p.height/size.y;model.scale.multiplyScalar(scale);model.position.y-=bounds.min.y*scale;
  model.traverse(o=>{if(o instanceof T.Mesh){o.frustumCulled=false;const materials=Array.isArray(o.material)?o.material:[o.material];o.material=materials.map(original=>{const m=original.clone() as T.MeshStandardMaterial;m.roughness=1;m.metalness=0;
   if(m.color){if(/skin/i.test(m.name))m.color.set(['#b68b6f','#775343','#c49a7b'][p.skin??0]);else if(/purple/i.test(m.name)&&p.coat)m.color.set(p.coat);else m.color.multiplyScalar(.80);}
   return m;});if(!Array.isArray((source.scene.getObjectByName(o.name) as T.Mesh)?.material))o.material=o.material[0];}});
  const mixer=new T.AnimationMixer(model),actions:Record<string,T.AnimationAction>={};
  for(const clip of source.animations){if(['Idle','Idle_Neutral','Walk','Interact','Wave'].includes(clip.name)){const a=mixer.clipAction(clip);a.enabled=true;a.play();a.setEffectiveWeight(0);actions[clip.name]=a;}}
  const idle=actions.Idle_Neutral??actions.Idle;idle.setEffectiveWeight(1);idle.time=(p.x*.013)%idle.getClip().duration;mixer.update(0);
  const props:T.Object3D[]=[];
  if(p.id==='jun'||p.id==='delivery'){
   const hand=model.getObjectByName('Wrist.L');
   if(hand){const object=p.id==='jun'?new T.Mesh(new T.SphereGeometry(.095,12,6,0,Math.PI*2,0,Math.PI/2),new T.MeshStandardMaterial({color:0xb7aaa0,side:T.DoubleSide})):new T.Mesh(new T.BoxGeometry(.22,.18,.22),new T.MeshStandardMaterial({color:0x9a7651}));
    object.rotation.x=Math.PI;hand.add(object);props.push(object);}
  }
  this.scene.add(group);const rig={group,model,mixer,actions,current:'idle',face:p.face,props,height:p.height};this.actors.set(p.id,rig);return rig;
 }
 render(poses:ActorPose[],time:number,paused:boolean){
  const dt=paused?0:Math.min(.05,Math.max(0,time-this.lastTime));this.lastTime=time;
  const ids=new Set(poses.map(p=>p.id));for(const [id,rig]of this.actors)rig.group.visible=ids.has(id);
  for(const p of poses){const rig=this.actors.get(p.id)??this.build(p);rig.group.visible=true;rig.group.position.set(p.x-600,400-p.y,(p.y-600)*.2);rig.group.scale.setScalar(p.height/rig.height);
   let turn=p.face-rig.face;turn=Math.atan2(Math.sin(turn),Math.cos(turn));rig.face+=turn*(1-Math.exp(-dt*8));rig.group.rotation.y=rig.face;
   const moving=p.activity==='walk'&&Math.hypot(p.vx,p.vy)>.5;
   const busy=['serve','repair','shop','carry'].includes(p.activity),greeting=p.activity==='wave'||p.activity==='talk'&&Math.sin(time*.47+p.x)>.72;
   const target=moving?'Walk':busy?'Interact':greeting?'Wave':(rig.actions.Idle_Neutral?'Idle_Neutral':'Idle');
   const speed=Math.hypot(p.vx,p.vy*1.6);const blend=1-Math.exp(-dt*10);
   for(const [name,action]of Object.entries(rig.actions)){const weight=action.getEffectiveWeight();action.setEffectiveWeight(T.MathUtils.lerp(weight,name===target?1:0,blend));
    action.timeScale=name==='Walk'?T.MathUtils.clamp(speed/(p.height*.48),.4,1.7):name==='Interact'?.55:1;
   }
   // Mixers keep advancing through idle even when spatial velocity is zero.
   // Stopping therefore settles the skeleton instead of freezing a gait frame.
   rig.mixer.update(dt);for(const object of rig.props)object.visible=p.id==='jun'||p.activity==='carry'||!!p.carrying;
  }
  for(const p of this.animatedProps){if(p.kind==='cloth'){const mesh=p.object as T.Mesh<T.PlaneGeometry>,positions=mesh.geometry.attributes.position;
    for(let i=0;i<positions.count;i++){const y=positions.getY(i);positions.setZ(i,Math.sin(time*1.25+positions.getX(i)*.05+p.seed)*(12-y)/24*3.5);}positions.needsUpdate=true;mesh.geometry.computeVertexNormals();}
   else if(p.kind==='lantern')p.object.rotation.z=Math.sin(time*.7+p.seed)*.025;
   else if(p.kind==='fan')p.object.rotation.z=time*(p.seed%2?2.3:-1.8);
  }
  this.renderer.render(this.scene,this.camera);
 }
 private makeProps(){
  const material=(color:number)=>new T.MeshStandardMaterial({color,roughness:1,side:T.DoubleSide});
  // Real articulated objects occupy fixed anchors; no rotating background crops.
  for(const [x,y] of [[861,217],[272,100]]){const rotor=new T.Group();rotor.position.set(x-600,400-y,-20);for(let i=0;i<3;i++){const blade=new T.Mesh(new T.BoxGeometry(5,17,1),material(0x263631));blade.position.y=7;const pivot=new T.Group();pivot.rotation.z=i*Math.PI*2/3;pivot.add(blade);rotor.add(pivot);}this.scene.add(rotor);this.animatedProps.push({object:rotor,kind:'fan',seed:x});}
  for(let i=0;i<6;i++){const cloth=new T.Mesh(new T.PlaneGeometry(19,28,6,8),material([0x806940,0x44534b,0x624839][i%3]));cloth.position.set(75+i*30,183+Math.sin(i)*5,-40);cloth.rotation.y=.1;this.scene.add(cloth);this.animatedProps.push({object:cloth,kind:'cloth',seed:i*1.3});}
  for(const [x,y]of [[99,396],[221,397],[379,395]]){const group=new T.Group();group.position.set(x-600,400-y,-25);const lantern=new T.Mesh(new T.CylinderGeometry(6,7,19,8),new T.MeshStandardMaterial({color:0xc98135,emissive:0xc97d2a,emissiveIntensity:.6}));lantern.position.y=-8;group.add(lantern);this.scene.add(group);this.animatedProps.push({object:group,kind:'lantern',seed:x});}
 }
 destroy(){for(const rig of this.actors.values()){rig.mixer.stopAllAction();rig.mixer.uncacheRoot(rig.model);}this.scene.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});this.renderer.dispose();}
}
