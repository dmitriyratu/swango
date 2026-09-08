import {Euler,Object3D,Quaternion} from 'three';
const offset=new Quaternion(),angles=new Euler(0,0,0,'YXZ');
export function setHeadPose(head:Object3D,neutral:Quaternion,time:number,phase:number,engaged:boolean){
 // Always pose from neutral. AnimationMixer can skip rewriting a constant
 // track, so adding rotations to the previous frame makes them accumulate.
 const yaw=Math.sin(time*.6+phase)*(engaged?.065:.018);
 const pitch=Math.sin(time*.9+phase*.3)*(engaged?.025:.008);
 offset.setFromEuler(angles.set(pitch,yaw,0,'YXZ'));
 head.quaternion.copy(neutral).multiply(offset).normalize();
}
