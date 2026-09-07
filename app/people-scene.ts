import * as T from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import type { Activity } from './street-life';
import {civilianNames,wardrobe,dressCivilian,poseCivilian} from './civilian-style';
export type ActorPose={id:string;model:string;x:number;y:number;height:number;vx:number;vy:number;face:number;activity:Activity;skin?:number;coat?:string;carrying?:boolean};
type Rig={group:T.Group;model:T.Object3D;mixer:T.AnimationMixer;walk:T.AnimationAction;idle:T.AnimationAction;face:number;height:number;head?:T.Object3D};
type Surface={map:T.Texture;normal:T.Texture;mask1:T.Texture;mask2:T.Texture};
export class PeopleScene{
 readonly canvas:HTMLCanvasElement;
 private renderer:T.WebGLRenderer;
 private scene=new T.Scene();private camera=new T.OrthographicCamera(-600,600,400,-400,.1,3000);
 private templates=new Map<string,GLTF>();private surfaces=new Map<string,Surface>();private actors=new Map<string,Rig>();
 private animatedProps:{object:T.Object3D;kind:string;seed:number}[]=[];
 private lastTime=0;private checkedPixels=false;
 constructor(){
  this.renderer=new T.WebGLRenderer({alpha:true,antialias:true,premultipliedAlpha:true});
  this.renderer.setPixelRatio(1);this.renderer.setSize(1800,1200,false);this.renderer.setClearColor(0x000000,0);
  this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;
  this.canvas=this.renderer.domElement;this.camera.position.set(0,0,1200);this.camera.lookAt(0,0,0);
  this.scene.add(new T.HemisphereLight(0xb7c7bf,0x34312c,1.35));
  const front=new T.DirectionalLight(0xf2e5ce,1.1);front.position.set(0,250,800);this.scene.add(front);
  const warm=new T.DirectionalLight(0xffc783,1.75);warm.position.set(-500,650,300);this.scene.add(warm);
  const cool=new T.DirectionalLight(0x76cabe,1.55);cool.position.set(550,250,-100);this.scene.add(cool);
  this.makeProps();
 }
 async load(){
  const loader=new GLTFLoader(),textures=new T.TextureLoader();
  await Promise.all(civilianNames.map(async name=>{
   const [gltf,map,normal,mask1,mask2]=await Promise.all([loader.loadAsync(`/civilians/${name}.glb`),textures.loadAsync(`/civilians/${name}-dif.jpg`),textures.loadAsync(`/civilians/${name}-norm.jpg`),textures.loadAsync(`/civilians/${name}-mask01.jpg`),textures.loadAsync(`/civilians/${name}-mask02.jpg`)]);
   // These are the original FBX atlases, not image data flipped by a GLB exporter.
   for(const t of [map,normal,mask1,mask2]){t.flipY=true;t.anisotropy=Math.min(4,this.renderer.capabilities.getMaxAnisotropy());}
   map.colorSpace=T.SRGBColorSpace;this.templates.set(name,gltf);this.surfaces.set(name,{map,normal,mask1,mask2});
  }));
 }
 private build(p:ActorPose):Rig{
  const source=this.templates.get(p.model),surface=this.surfaces.get(p.model);if(!source||!surface)throw new Error(`Missing civilian ${p.model}`);
  const model=clone(source.scene),group=new T.Group();group.add(model);
  const bounds=new T.Box3().setFromObject(model),height=bounds.max.y-bounds.min.y;
  const colors=wardrobe[p.id]??['#a5a69c','#787f83'];
  model.traverse(o=>{if(o instanceof T.Mesh){o.frustumCulled=false;
   const material=new T.MeshStandardMaterial({map:surface.map,normalMap:surface.normal,normalScale:new T.Vector2(.55,.55),roughness:.88,metalness:0});
   material.onBeforeCompile=shader=>{
    shader.uniforms.garmentOne={value:surface.mask1};shader.uniforms.garmentTwo={value:surface.mask2};shader.uniforms.tintOne={value:new T.Color(colors[0])};shader.uniforms.tintTwo={value:new T.Color(colors[1])};
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D garmentOne;uniform sampler2D garmentTwo;uniform vec3 tintOne;uniform vec3 tintTwo;')
     .replace('#include <map_fragment>',`#include <map_fragment>
      float clothOne=texture2D(garmentOne,vMapUv).r;
      float clothTwo=texture2D(garmentTwo,vMapUv).r;
      diffuseColor.rgb*=mix(vec3(1.),tintOne,clothOne*.8);
      diffuseColor.rgb*=mix(vec3(1.),tintTwo,clothTwo*.7);
     `);
   };material.customProgramCacheKey=()=>`civilian-${p.id}`;o.material=material;
  }});
  dressCivilian(model,p.id,height);
  model.scale.multiplyScalar(p.height/height);model.position.y-=bounds.min.y*(p.height/height);
  const mixer=new T.AnimationMixer(model),walk=mixer.clipAction(source.animations.find(a=>a.name==='Walk')!),idle=mixer.clipAction(source.animations.find(a=>a.name==='Idle')!);
  walk.play().setEffectiveWeight(0);idle.play().setEffectiveWeight(1);idle.time=(p.x*.031)%idle.getClip().duration;walk.time=(Math.abs(p.x)*.017)%walk.getClip().duration;mixer.update(0);
  const rig={group,model,mixer,walk,idle,face:p.face,height:p.height,head:model.getObjectByName('head')};this.actors.set(p.id,rig);this.scene.add(group);return rig;
 }
 render(poses:ActorPose[],time:number,paused:boolean){
  const dt=paused?0:Math.min(.05,Math.max(0,time-this.lastTime));this.lastTime=time;
  const ids=new Set(poses.map(p=>p.id));for(const [id,r]of this.actors)r.group.visible=ids.has(id);
  for(const p of poses){const r=this.actors.get(p.id)??this.build(p);r.group.visible=true;r.group.position.set(p.x-600,400-p.y,(p.y-600)*.2);r.group.scale.setScalar(p.height/r.height);
   const turn=Math.atan2(Math.sin(p.face-r.face),Math.cos(p.face-r.face));r.face+=turn*(1-Math.exp(-dt*7));r.group.rotation.y=r.face;
   const speed=Math.hypot(p.vx,p.vy*1.6),moving=p.activity==='walk'&&speed>.5;
   const weight=T.MathUtils.lerp(r.walk.getEffectiveWeight(),moving?1:0,1-Math.exp(-dt*9));r.walk.setEffectiveWeight(weight);r.idle.setEffectiveWeight(1-weight);
   r.walk.timeScale=T.MathUtils.clamp(speed/(p.height*.53),.35,1.6);r.idle.timeScale=.72+(p.x%7)*.035;r.mixer.update(dt);
   poseCivilian(r.model,p.id,p.activity,time);
   if(['talk','serve','repair','shop'].includes(p.activity)&&r.head){r.head.rotateY(Math.sin(time*.6+p.x)*.06);r.head.rotateX(Math.sin(time*.9)*.025);}
  }
  for(const p of this.animatedProps){if(p.kind==='cloth'){const mesh=p.object as T.Mesh<T.PlaneGeometry>,positions=mesh.geometry.attributes.position;
   for(let i=0;i<positions.count;i++){const y=positions.getY(i);positions.setZ(i,Math.sin(time*1.25+positions.getX(i)*.05+p.seed)*(12-y)/24*3.5);}positions.needsUpdate=true;mesh.geometry.computeVertexNormals();}
   else if(p.kind==='lantern')p.object.rotation.z=Math.sin(time*.7+p.seed)*.025;
   else if(p.kind==='fan')p.object.rotation.z=time*(p.seed%2?2.3:-1.8);
  }
  this.renderer.render(this.scene,this.camera);
  if(process.env.NODE_ENV==='development'&&!this.checkedPixels&&poses.length){this.checkedPixels=true;const pixels=new Uint8Array(1800*1200*4),gl=this.renderer.getContext();gl.readPixels(0,0,1800,1200,gl.RGBA,gl.UNSIGNED_BYTE,pixels);let visible=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i])visible++;console.info('Scanned civilian render '+JSON.stringify({models:this.templates.size,actors:poses.length,visiblePixels:visible}));}
 }
 private makeProps(){
  const material=(color:number)=>new T.MeshStandardMaterial({color,roughness:1,side:T.DoubleSide});
  // Real articulated objects occupy fixed anchors; no rotating background crops.
  for(const [x,y] of [[861,217],[272,100]]){const rotor=new T.Group();rotor.position.set(x-600,400-y,-20);for(let i=0;i<3;i++){const blade=new T.Mesh(new T.BoxGeometry(5,17,1),material(0x263631));blade.position.y=7;const pivot=new T.Group();pivot.rotation.z=i*Math.PI*2/3;pivot.add(blade);rotor.add(pivot);}this.scene.add(rotor);this.animatedProps.push({object:rotor,kind:'fan',seed:x});}
  for(let i=0;i<6;i++){const cloth=new T.Mesh(new T.PlaneGeometry(19,28,6,8),material([0x806940,0x44534b,0x624839][i%3]));cloth.position.set(75+i*30,183+Math.sin(i)*5,-40);cloth.rotation.y=.1;this.scene.add(cloth);this.animatedProps.push({object:cloth,kind:'cloth',seed:i*1.3});}
  for(const [x,y]of [[99,396],[221,397],[379,395]]){const group=new T.Group();group.position.set(x-600,400-y,-25);const lantern=new T.Mesh(new T.CylinderGeometry(6,7,19,8),new T.MeshStandardMaterial({color:0xc98135,emissive:0xc97d2a,emissiveIntensity:.6}));lantern.position.y=-8;group.add(lantern);this.scene.add(group);this.animatedProps.push({object:group,kind:'lantern',seed:x});}
 }
 destroy(){for(const r of this.actors.values()){r.mixer.stopAllAction();r.mixer.uncacheRoot(r.model);}this.scene.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});for(const s of this.surfaces.values())for(const t of Object.values(s))t.dispose();this.renderer.dispose();}
}

