import * as THREE from './three.module.js';
const DURATION=42, $=s=>document.querySelector(s), clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v)), mix=(a,b,t)=>a+(b-a)*t, ease=t=>{t=clamp(t);return t*t*(3-2*t)}, phase=(t,a,b)=>clamp((t-a)/(b-a));
const film=$('#film'),stage=$('#stage'),timeline=$('#timeline'),play=$('#play'),header=$('#header'),controls=$('#controls'),blackPanel=$('#black-panel'),marquee=$('#marquee'),track=$('#method-track');
const scenes=Object.fromEntries([...document.querySelectorAll('[data-scene]')].map(el=>[el.dataset.scene,el]));
const chapter=$('#chapter-label'), labels=['01 — CONSTRUIRE','02 — TOUT AU MÊME ENDROIT','03 — LA MÉTHODE','04 — CHAQUE ÉTAPE','05 — SE DISTINGUER','06 — PRENDRE SA PLACE','07 — L’EXPÉRIENCE','08 — ON EN PARLE'];
let W=innerWidth,H=stage.clientHeight,mobile=W<701,t=0,playing=false,lastTime=0,autoT=0,lastScene='',initialized=false,webgl=true,software=false,motionClock=0,motionPaused=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer,scene,camera,assembly,human,crane,roadGroup,roadHuman,gridGroup,goldHuman,flyHuman,arrivalGroup,spotlightGroup,path,materialBlack,materialGold,materialGray,materialWhite;
const boxGeometry=new THREE.BoxGeometry(1,1,1),up=new THREE.Vector3(0,1,0);
const groups=[];
function mat(color){return new THREE.MeshStandardMaterial({color,roughness:.34,metalness:.16,flatShading:false});}
function box(parent,size,pos,material){const o=new THREE.Mesh(boxGeometry,material);o.scale.set(...size);o.position.set(...pos);parent.add(o);return o;}
const bodyGeometries=new Map();
function roundedGeometry(type,radius,length,detail){
 const key=[type,radius,length,detail].join(':');if(!bodyGeometries.has(key))bodyGeometries.set(key,type==='sphere'?new THREE.SphereGeometry(1,detail?32:10,detail?24:8):new THREE.CapsuleGeometry(radius,length,detail?10:3,detail?24:9));return bodyGeometries.get(key);
}
function person(material,detail=true){
 const g=new THREE.Group(),parts=[],knees=[],elbows=[];
 function root(x,y,z){const part=new THREE.Group();part.position.set(x,y,z);part.userData.target=part.position.clone();g.add(part);parts.push(part);return part;}
 function ball(parent,scale,pos){const o=new THREE.Mesh(roundedGeometry('sphere',1,0,detail),material);o.scale.set(...scale);o.position.set(...pos);parent.add(o);return o;}
 function limb(parent,radius,length,y){const o=new THREE.Mesh(roundedGeometry('capsule',radius,length,detail),material);o.position.y=y;parent.add(o);return o;}
 for(const side of [-1,1]){const leg=root(side*.205,1.03,0);limb(leg,.145,.30,-.22);const knee=new THREE.Group();knee.position.y=-.46;leg.add(knee);ball(knee,[.135,.135,.135],[0,0,0]);limb(knee,.126,.28,-.22);ball(knee,[.137,.13,.22],[0,-.43,.075]);knees.push(knee);}
 const hips=root(0,1.07,0);ball(hips,[.345,.27,.22],[0,0,0]);
 const torso=root(0,1.62,0);const chest=limb(torso,.30,.40,0);chest.scale.set(1.26,1,.75);
 for(const side of [-1,1]){const arm=root(side*.43,1.96,0);limb(arm,.137,.27,-.235);const elbow=new THREE.Group();elbow.position.y=-.44;arm.add(elbow);ball(elbow,[.13,.13,.13],[0,0,0]);limb(elbow,.12,.29,-.235);ball(elbow,[.125,.15,.13],[0,-.43,0]);elbows.push(elbow);}
 const head=root(0,2.56,0);ball(head,[.325,.335,.325],[0,0,0]);
 g.userData={parts,knees,elbows,torso,hips,head};return g;
}
function posePerson(g,clock,strength=1,wave=0){
 const rig=g.userData,cycle=clock*4.6,swing=Math.sin(cycle),opposite=-swing;
 rig.parts.forEach(part=>{part.visible=true;part.position.copy(part.userData.target);part.rotation.set(0,0,0);});
 rig.knees.forEach(j=>j.rotation.set(0,0,0));rig.elbows.forEach(j=>j.rotation.set(0,0,0));
 rig.parts[0].rotation.x=swing*.35*strength;rig.parts[1].rotation.x=opposite*.35*strength;
 rig.knees[0].rotation.x=(.07+Math.max(0,swing)*.65)*strength;rig.knees[1].rotation.x=(.07+Math.max(0,-swing)*.65)*strength;
 rig.parts[4].rotation.x=opposite*.25*strength;rig.parts[5].rotation.x=swing*.25*strength;
 rig.parts[4].rotation.z=-.10;rig.parts[5].rotation.z=.10;
 rig.elbows[0].rotation.x=-.12-Math.max(0,swing)*.12*strength;rig.elbows[1].rotation.x=-.12-Math.max(0,opposite)*.12*strength;
 rig.torso.rotation.y=Math.sin(cycle)*.055*strength;rig.hips.rotation.y=-Math.sin(cycle)*.035*strength;
 rig.head.rotation.z=Math.sin(cycle*.5)*.025;rig.head.position.y+=Math.abs(Math.sin(cycle))*.025*strength;
 // A restrained greeting: shoulder stays below head level; only the forearm moves.
 if(wave>0){const w=clamp(wave);rig.parts[5].rotation.z=mix(.10,.72,w);rig.parts[5].rotation.x*=1-w;rig.elbows[1].rotation.z=(.58+Math.sin(clock*2.8)*.10)*w;rig.elbows[1].rotation.x=-.12;}

}
function segment(parent,a,b,width,material){const m=new THREE.Mesh(boxGeometry,material);parent.add(m);updateSegment(m,a,b,width);return m;}
function updateSegment(m,a,b,width){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),d=bv.clone().sub(av);m.position.copy(av.add(bv).multiplyScalar(.5));m.scale.set(width,d.length(),width);m.quaternion.setFromUnitVectors(up,d.normalize());}
// Orthographic software rendering keeps the complete animation available without WebGL.
function softwareRenderer(canvas){
 software=true;const ctx=canvas.getContext('2d');let ratio=1;
 const a=new THREE.Vector3(),matrix=new THREE.Matrix4(),center=new THREE.Vector3();
 return {setPixelRatio(v){ratio=Math.min(v,1.5)},setSize(w,h){canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);canvas.style.width=w+'px';canvas.style.height=h+'px'},setClearColor(){},render(world,cam){
  world.updateMatrixWorld(true);cam.updateMatrixWorld(true);cam.matrixWorldInverse.copy(cam.matrixWorld).invert();const projection=new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix,cam.matrixWorldInverse),objects=[];
  world.traverseVisible(obj=>{if(!obj.isMesh)return;const geometry=obj.geometry,pos=geometry.attributes.position,idx=geometry.index,material=obj.material;if(!pos)return;
   matrix.multiplyMatrices(projection,obj.matrixWorld);const points=[],triangles=[];let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
   for(let k=0;k<pos.count;k++){a.fromBufferAttribute(pos,k).applyMatrix4(matrix);const x=(a.x+1)*W/2,y=(1-a.y)*H/2;points.push([x,y,a.z]);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
   if(right<0||left>W||bottom<0||top>H)return;
   const count=idx?idx.count:pos.count;for(let k=0;k<count;k+=3){const ia=idx?idx.getX(k):k,ib=idx?idx.getX(k+1):k+1,ic=idx?idx.getX(k+2):k+2,A=points[ia],B=points[ib],C=points[ic];const area=(B[0]-A[0])*(C[1]-A[1])-(B[1]-A[1])*(C[0]-A[0]);if(material.side!==THREE.DoubleSide&&area>=0)continue;triangles.push([A,B,C]);}
   center.setFromMatrixPosition(obj.matrixWorld).applyMatrix4(projection);const color=material.color.clone().convertLinearToSRGB();objects.push({triangles,left,right,top,bottom,z:geometry.type==='PlaneGeometry'?9:center.z,color,flat:material.isMeshBasicMaterial,alpha:material.opacity});
  });
  objects.sort((a,b)=>b.z-a.z);ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,W,H);
  for(const obj of objects){ctx.globalAlpha=obj.alpha;ctx.beginPath();for(const [A,B,C] of obj.triangles){ctx.moveTo(A[0],A[1]);ctx.lineTo(B[0],B[1]);ctx.lineTo(C[0],C[1]);ctx.closePath();}
   const rgb=k=>`rgb(${Math.min(255,Math.round(obj.color.r*255*k))},${Math.min(255,Math.round(obj.color.g*255*k))},${Math.min(255,Math.round(obj.color.b*255*k))})`;
   if(obj.flat)ctx.fillStyle=rgb(1);else{const width=Math.max(1,obj.right-obj.left),height=Math.max(1,obj.bottom-obj.top),gradient=ctx.createRadialGradient(obj.left+width*.30,obj.top+height*.20,0,obj.left+width*.5,obj.top+height*.45,Math.max(width,height)*.7);gradient.addColorStop(0,rgb(1.65));gradient.addColorStop(.3,rgb(1.10));gradient.addColorStop(1,rgb(.53));ctx.fillStyle=gradient;}ctx.fill();
  }ctx.globalAlpha=1;
 }};
}
function setupWorld(){
 try{const probe=document.createElement('canvas');const supported=probe.getContext('webgl2');if(!supported)throw new Error('Use software renderer');supported.getExtension('WEBGL_lose_context')?.loseContext();renderer=new THREE.WebGLRenderer({canvas:$('#world'),antialias:true,alpha:true,powerPreference:'high-performance'});}catch(error){renderer=softwareRenderer($('#world'));}
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(W,H);renderer.setClearColor(0xffffff,0);renderer.outputColorSpace=THREE.SRGBColorSpace;if(!software){renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;}
 scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-8,8,5,-5,.1,120);
 const ambient=new THREE.AmbientLight(0xffffff,1.65);scene.add(ambient);const sun=new THREE.DirectionalLight(0xfff5df,3.4);sun.position.set(-6,12,8);scene.add(sun);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:.5,far:40});sun.shadow.normalBias=.035;const rim=new THREE.DirectionalLight(0xffffff,1.2);rim.position.set(5,5,-5);scene.add(rim);
 materialBlack=mat('#292727');materialGray=mat('#403a37');materialGold=mat('#C9A15A');materialWhite=mat('#F5F1EA');const blue=mat('#5C1A1A'),dark=mat('#242424');
 assembly=new THREE.Group();scene.add(assembly);groups.push(assembly);human=person(materialBlack);human.position.x=1.3;assembly.add(human);
 crane=new THREE.Group();assembly.add(crane);
 const steel=mat('#77716a');steel.metalness=.7;steel.roughness=.27;
 box(crane,[1.65,.25,1.5],[-3.5,.14,0],dark);
 for(const z of [-.65,.65]){box(crane,[2,.12,.20],[-3.5,.10,z],steel);for(const x of [-4.25,-2.75])box(crane,[.35,.12,.35],[x,.04,z],dark);}
 // Braced tower and fixed lattice jib: the trolley moves along a rigid structure.
 for(const x of [-3.76,-3.24])for(const z of [-.26,.26])segment(crane,[x,.27,z],[x,5.25,z],.075,blue);
 for(let i=0;i<8;i++){const y=.3+i*.61;for(const z of [-.26,.26]){segment(crane,[-3.76,y,z],[-3.24,y+.61,z],.045,steel);segment(crane,[-3.76,y+.61,z],[-3.24,y,z],.045,steel);}box(crane,[.62,.065,.62],[-3.5,y,0],blue);}
 box(crane,[.85,.25,.85],[-3.5,5.25,0],blue);
 for(const z of [-.22,.22]){segment(crane,[-4.8,5.4,z],[3.85,5.4,z],.085,blue);segment(crane,[-4.8,5.92,z],[3.85,5.92,z],.075,blue);for(let i=0;i<14;i++){const x=-4.8+i*.615;segment(crane,[x,5.4,z],[x+.615,5.92,z],.04,steel);segment(crane,[x,5.92,z],[x+.615,5.4,z],.04,steel);}}
 box(crane,[1.0,.55,.8],[-4.45,5.12,0],dark);
 box(crane,[.72,.65,.72],[-3.05,4.85,0],blue);box(crane,[.025,.43,.50],[-2.68,4.89,0],mat('#35454a'));
 segment(crane,[-3.5,5.7,0],[-3.5,6.55,0],.08,steel);segment(crane,[-3.5,6.55,0],[2.9,5.92,0],.025,steel);segment(crane,[-3.5,6.55,0],[-4.8,5.92,0],.025,steel);
 crane.userData.trolley=box(crane,[.44,.18,.65],[1.3,5.32,0],dark);
 crane.userData.cable=segment(crane,[1.3,5.25,0],[1.3,3.3,0],.025,steel);
 crane.userData.grip=new THREE.Group();crane.add(crane.userData.grip);
 box(crane.userData.grip,[.68,.15,.45],[0,0,0],blue);
 crane.userData.jaws=[-1,1].map(side=>{const jaw=new THREE.Group();crane.userData.grip.add(jaw);box(jaw,[.065,.30,.30],[0,-.13,0],steel);box(jaw,[.14,.06,.30],[-side*.04,-.27,0],steel);return jaw;});
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(11,7),new THREE.MeshBasicMaterial({color:0xeee9e1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.025;ground.receiveShadow=true;assembly.add(ground);
 roadGroup=new THREE.Group();scene.add(roadGroup);groups.push(roadGroup);
 path=new THREE.CatmullRomCurve3([new THREE.Vector3(-10,0,-5),new THREE.Vector3(-4,0,-5),new THREE.Vector3(0,0,-4.7),new THREE.Vector3(1.8,0,-2.5),new THREE.Vector3(1.8,0,4),new THREE.Vector3(1.8,0,11),new THREE.Vector3(1.8,0,20)],false,'centripetal');
 const vertices=[],indices=[];const N=250,width=1.6;
 for(let i=0;i<=N;i++){const q=path.getPoint(i/N),d=path.getTangent(i/N),n=new THREE.Vector3(-d.z,0,d.x).normalize().multiplyScalar(width/2);vertices.push(q.x+n.x,0,q.z+n.z,q.x-n.x,0,q.z-n.z);if(i<N){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();const road=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:0x111111,side:THREE.DoubleSide}));roadGroup.add(road);
 for(let i=0;i<65;i++){const a=i/65,q=path.getPoint(a),d=path.getTangent(a);const dash=box(roadGroup,[.025,.012,.16],[q.x,.01,q.z],new THREE.MeshBasicMaterial({color:0x565656}));dash.rotation.y=Math.atan2(d.x,d.z);}
 roadHuman=person(materialWhite,false);roadHuman.scale.setScalar(.34);roadGroup.add(roadHuman);
 gridGroup=new THREE.Group();scene.add(gridGroup);groups.push(gridGroup);gridGroup.userData.people=[];
 for(let row=-3;row<=3;row++)for(let col=-2;col<=2;col++){const gold=row===0&&col===0;const g=person(gold?materialGold:materialGray,gold);g.position.set(col*1.8,0,row*2.45);g.scale.setScalar(gold?1.05:.9);g.userData.base=g.position.clone();gridGroup.add(g);gridGroup.userData.people.push(g);if(gold)goldHuman=g;}
 // Crown follows the articulated head, so it never floats away from the character.
 const crown=new THREE.Group();goldHuman.userData.head.add(crown);crown.position.y=.30;
 const crownMat=mat('#edc66b');crownMat.metalness=.72;crownMat.roughness=.22;
 const band=new THREE.Mesh(new THREE.CylinderGeometry(.34,.31,.14,32,1,true),crownMat);crown.add(band);
 for(let i=0;i<5;i++){const angle=i*Math.PI*2/5;const peak=new THREE.Mesh(new THREE.ConeGeometry(.115,.32,4),crownMat);peak.position.set(Math.sin(angle)*.27,.20,Math.cos(angle)*.27);crown.add(peak);const jewel=new THREE.Mesh(new THREE.SphereGeometry(.04,10,8),materialWhite);jewel.position.set(Math.sin(angle)*.31,.02,Math.cos(angle)*.31);crown.add(jewel);}
 spotlightGroup=new THREE.Group();scene.add(spotlightGroup);groups.push(spotlightGroup);
 for(const side of [-1,1]){
  const origin=new THREE.Vector3(side*2.4,5.3,1),target=new THREE.Vector3(0,.8,0),direction=target.clone().sub(origin),length=direction.length();
  const beamMaterial=new THREE.MeshBasicMaterial({color:0xffe6ac,transparent:true,opacity:.075,side:THREE.DoubleSide,depthWrite:false});
  const beam=new THREE.Mesh(new THREE.ConeGeometry(1.25,length,32,1,true).translate(0,-length/2,0),beamMaterial);beam.position.copy(origin);beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),direction.normalize());spotlightGroup.add(beam);
  const lamp=new THREE.Mesh(new THREE.CylinderGeometry(.18,.22,.42,20),mat('#242020'));lamp.position.copy(origin);lamp.quaternion.copy(beam.quaternion);spotlightGroup.add(lamp);
  const light=new THREE.SpotLight(0xffe4a4,65,16,.40,.72,1.2);light.position.copy(origin);light.target.position.copy(target);spotlightGroup.add(light,light.target);
 }
 const pool=new THREE.Mesh(new THREE.CircleGeometry(1.6,48),new THREE.MeshBasicMaterial({color:0xf7d792,transparent:true,opacity:.18,depthWrite:false}));pool.rotation.x=-Math.PI/2;pool.position.y=-.01;spotlightGroup.add(pool);
 flyHuman=person(materialGold);scene.add(flyHuman);groups.push(flyHuman);
 arrivalGroup=new THREE.Group();scene.add(arrivalGroup);groups.push(arrivalGroup);
 const ringMat=new THREE.MeshBasicMaterial({color:0xc9a15a,transparent:true,opacity:.32,side:THREE.DoubleSide});
 for(let i=0;i<3;i++){const ring=new THREE.Mesh(new THREE.RingGeometry(1.3+i*.8,1.315+i*.8,64),ringMat.clone());ring.rotation.x=-Math.PI/2;ring.position.y=-.025-i*.002;arrivalGroup.add(ring);}

 scene.traverse(o=>{if(o.isMesh&&o.material.isMeshStandardMaterial){o.castShadow=true;o.receiveShadow=true;}});
}
function framing(size,x,y,z,tx,ty,tz){const aspect=W/H;camera.left=-size*aspect/2;camera.right=size*aspect/2;camera.top=size/2;camera.bottom=-size/2;camera.position.set(x,y,z);camera.lookAt(tx,ty,tz);camera.updateProjectionMatrix();}
function materialForPerson(p,m){p.traverse(o=>{if(o.isMesh)o.material=m;});}
function renderWorld(time){if(!webgl)return;groups.forEach(g=>g.visible=false);const tt=time;
 if(tt<6){
  assembly.visible=true;assembly.scale.setScalar(mobile?.48:1);crane.visible=true;human.scale.setScalar(1);human.position.set(mobile?1:1.3,0,0);human.rotation.set(0,0,0);materialForPerson(human,materialBlack);
  const yaw=.12+Math.sin(tt*.7)*.19,size=mobile?9.9:8.7;
  framing(size,Math.sin(yaw)*16,6.4+Math.sin(tt*.5)*.2,Math.cos(yaw)*16,mobile?-.25:-.4,1.75,0);
  posePerson(human,motionClock,0,0);
  // Two rigid loads: legs + pelvis, then chest + arms + head.
  const rig=human.userData.parts,step=tt<2.6?0:1,u=phase(tt,step?2.6:0,step?5.2:2.6);
  const anchor=step?2.96:1.43,dropX=human.position.x,pickX=3.35,carryY=4.8;
  let gripX=pickX,gripY=carryY;
  if(u<.22){gripY=mix(5.12,carryY,ease(u/.22));}
  else if(u<.56){gripX=mix(pickX,dropX,ease((u-.22)/.34));}
  else if(u<.88){gripX=dropX;gripY=mix(carryY,anchor,ease((u-.56)/.32));}
  else{const retreat=ease((u-.88)/.12);gripX=mix(dropX,pickX,retreat);gripY=mix(anchor,5.12,retreat);}
  if(tt>=5.2){gripX=pickX;gripY=5.12;}
  rig.forEach((part,i)=>{
   const batch=i<3?0:1;part.visible=batch<step||(batch===step&&u>=.22);
   if(batch===step&&u>=.22&&u<.88){part.position.x+=gripX-dropX;part.position.y+=gripY-anchor;}
  });

  crane.userData.trolley.position.x=gripX;
  crane.userData.grip.position.set(gripX,gripY,0);
  updateSegment(crane.userData.cable,[gripX,5.25,0],[gripX,gripY+.08,0],.025);
  const opening=.30+.15*(1-ease(phase(u,.16,.22))+ease(phase(u,.88,.95)));
  crane.userData.jaws.forEach((jaw,i)=>jaw.position.x=(i?1:-1)*opening);

 } else if(tt<18){
  assembly.visible=true;assembly.scale.setScalar(1);crane.visible=false;assembly.children.forEach(g=>{if(g!==human&&g!==crane)g.visible=false});
  const q=ease(phase(tt,6,8)),size=9;framing(size,0,3.5,16,0,2,0);
  const halfW=size*W/H/2;human.scale.setScalar(mix(1,.39,q));human.position.set(mix(1.3,-halfW*.45,q)+(tt>9?(tt-9)*halfW*.07:0),mix(0,4.15,q),0);human.rotation.set(0,Math.PI/2-.12,0);materialForPerson(human,materialBlack);
  posePerson(human,motionClock,1);human.position.y+=Math.abs(Math.sin(motionClock*5.4))*.017;human.position.x+=Math.sin(motionClock*.32)*.20;
 } else if(tt<26){
  roadGroup.visible=true;const q=phase(tt,18,26),turn=ease(phase(tt,18,20.5)),follow=mix(-4,9,ease(phase(tt,19,26)));
  framing(mobile?14:15,mix(-5,0,turn),mix(6,24,turn),mix(10,follow+.02,turn),0,0,follow);
  const r=path.getPoint(mix(.2,.76,q)),direction=path.getTangent(mix(.2,.76,q));roadHuman.position.copy(r);roadHuman.position.y=.03;roadHuman.rotation.y=Math.atan2(direction.x,direction.z);posePerson(roadHuman,motionClock,1);
 } else if(tt<33){
  gridGroup.visible=true;spotlightGroup.visible=true;materialGray.color.set('#352026');
  const reveal=ease(phase(tt,26,28));
  framing(mobile?12:10.5,0,5.2,18,0,1.7,0);
  gridGroup.userData.people.forEach((g,i)=>{g.position.copy(g.userData.base);g.rotation.y=0;if(g!==goldHuman){g.position.x*=1.3;g.position.z-=3;g.scale.setScalar(.62);posePerson(g,motionClock+i*.31,.04,0);}else posePerson(g,motionClock,.08,0);});
  goldHuman.scale.setScalar(mobile?1.05:1.2);goldHuman.position.set(0,0,1);
  spotlightGroup.scale.setScalar(1);spotlightGroup.position.z=1;
  spotlightGroup.children.forEach(o=>{if(o.isSpotLight)o.intensity=65*reveal;else if(o.material?.transparent)o.material.opacity=(o.geometry.type==='CircleGeometry'?.18:.075)*reveal;});

 } else if(tt<36){
  flyHuman.visible=true;arrivalGroup.visible=true;const q=phase(tt,33,36),s=ease(q),arrival=ease(phase(tt,33.25,35.25));
  framing(mobile?10.5:9,mix(-1.4,0,s),mix(5.5,3.8,s),16,0,1.35,0);
  const x=mobile?mix(1.1,.8,arrival):mix(7,3.9,arrival),z=mix(mobile?-4:-13,0,arrival);
  flyHuman.position.set(x,Math.abs(Math.sin(motionClock*5.4))*.025,z);flyHuman.scale.setScalar(mobile?mix(.45,1,arrival):1.35);flyHuman.rotation.set(0,mix(-.65,-.12,arrival),0);
  posePerson(flyHuman,motionClock,mix(1,.18,arrival),ease(phase(tt,34,35.3)));
  arrivalGroup.position.set(x,0,z);arrivalGroup.children.forEach((ring,i)=>{const pulse=(motionClock*.35+i/3)%1;ring.scale.setScalar(1+pulse*.25);ring.material.opacity=(1-pulse)*.22;});
 } else if(tt<40){
  flyHuman.visible=true;framing(11,0,6,16,0,1,0);flyHuman.scale.setScalar(.35);flyHuman.position.set(mix(10,7,phase(tt,36,40)),-1,0);flyHuman.rotation.set(0,.5,0);posePerson(flyHuman,motionClock,.4,0);
 }
 if(tt<6){assembly.children.forEach(g=>{if(g!==human&&g!==crane)g.visible=true});}
 renderer.render(scene,camera);
}
function show(name,opacity=1){const el=scenes[name];el.classList.add('active');el.style.opacity=String(opacity);el.inert=false;}
function updateDOM(time){
 const tt=time;Object.values(scenes).forEach(el=>{el.classList.remove('active');el.style.opacity='0';el.inert=true;});
 let index=0;stage.style.background=tt>=26&&tt<33?'#5C1A1A':tt>=40?'#0C0A08':'#F5F1EA';blackPanel.style.height='0';marquee.style.opacity='0';
 if(tt<6){show('intro',1-ease(phase(tt,5.3,6)));scenes.intro.querySelector('.intro-caption').style.transform=`translateY(${mix(0,-25,ease(phase(tt,5.3,6)))}px)`;}
 else if(tt<9){index=1;blackPanel.style.height=`${mix(0,68,ease(phase(tt,6,7)))}%`;show('promise',ease(phase(tt,6.6,7.4)));scenes.promise.style.transform=`translateX(${mix(80,0,ease(phase(tt,6.6,7.6)))}px)`;}
 else if(tt<18){index=2;blackPanel.style.height='68%';marquee.style.opacity='1';marquee.style.transform=`translateX(${-phase(tt,9,18)*W*.72}px)`;show('method');const distance=Math.max(0,track.scrollWidth-track.parentElement.clientWidth);track.style.transform=`translateX(${-ease(phase(tt,9.4,17.7))*distance}px)`;}
 else if(tt<26){index=3;show('route',ease(phase(tt,18.6,20)));const cards=[...$('#route-cards').children];if(mobile){$('#route-cards').style.transform='none';const active=Math.min(2,Math.floor(phase(tt,18.8,25.8)*3));cards.forEach((card,i)=>{card.style.opacity=i===active?'1':'0';card.style.visibility=i===active?'visible':'hidden';});}else{$('#route-cards').style.transform=`translateY(${-phase(tt,20,25.6)*H*.94}px)`;cards.forEach(card=>{card.style.opacity='1';card.style.visibility='visible';});}}
 else if(tt<33){index=4;show('distinction',ease(phase(tt,26.4,27.2)));const shift=ease(phase(tt,29.4,31));const title=$('.distinction-title');title.style.transform=`translate(${mobile?0:mix(24,0,shift)}vw,${0}vh) scale(${mobile?mix(1,.75,shift):mix(1,.72,shift)})`;title.style.transformOrigin='left top';$('.values').style.opacity=String(shift);$('.values').style.transform=`translateY(${mix(45,0,shift)}px)`;}
 else if(tt<36){index=5;show('flight',ease(phase(tt,33.1,33.65))*(1-ease(phase(tt,35.75,36))));scenes.flight.style.transform=`translateY(${mix(26,0,ease(phase(tt,33.1,34)))}px)`;}
 else if(tt<40){index=6;show('proof',ease(phase(tt,36,36.5)));}
 else {index=7;show('finale',ease(phase(tt,40,40.5)));}
 const reading=scrollY>film.offsetHeight-innerHeight+H*.2;document.body.classList.toggle('reading',reading);chapter.textContent=labels[index];timeline.value=String(tt);timeline.setAttribute('aria-valuetext',`${labels[index]}, ${Math.round(tt)} secondes sur 42`);
 header.classList.toggle('on-dark',(tt>=26&&tt<33)||tt>=40);header.style.color=(tt>=26&&tt<33)||tt>=40?'#fff':'#0a0a0a';controls.style.color=(tt>=7&&tt<18)||(tt>=26&&tt<33)||tt>=40?'#fff':'#0a0a0a';lastScene=Object.keys(scenes)[index];
}
function endY(){return Math.max(1,film.offsetHeight-innerHeight);}
function seek(seconds){t=clamp(seconds,0,DURATION);window.scrollTo({top:t/DURATION*endY(),behavior:'instant'});renderWorld(t);updateDOM(t);}
function stop(){motionPaused=false;playing=false;play.innerHTML='▶ <span>Lecture auto</span>';play.setAttribute('aria-label','Lancer la lecture automatique');}
play.addEventListener('click',()=>{if(playing){stop();motionPaused=true;return;}playing=true;motionPaused=false;autoT=t>=41.99?0:t;lastTime=performance.now();play.innerHTML='Ⅱ <span>Pause</span>';play.setAttribute('aria-label','Mettre la lecture en pause');});
$('#restart').addEventListener('click',()=>{stop();seek(0);});
timeline.addEventListener('input',()=>{stop();seek(Number(timeline.value));});
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>{stop();seek(Number(b.dataset.go));}));
$('.logo').addEventListener('click',e=>{e.preventDefault();stop();seek(0);});
for(const event of ['wheel','touchstart'])window.addEventListener(event,()=>{if(playing)stop();},{passive:true});
window.addEventListener('keydown',event=>{if(event.key==='Escape')stop();if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key)&&!['INPUT','BUTTON'].includes(document.activeElement.tagName)&&!$('#booking').open){stop();}});
const BOOKING_URL='';const dialog=$('#booking');document.querySelectorAll('[data-book]').forEach(button=>button.addEventListener('click',()=>{stop();if(BOOKING_URL){location.assign(BOOKING_URL);return;}dialog.showModal();}));$('#close-booking').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
let previous=-1,previousFrame=0,previousRender=0;
function frame(now){
 requestAnimationFrame(frame);const dt=Math.min((now-previousFrame)/1000,.06)||.016;previousFrame=now;
 if(document.hidden){lastTime=now;return;}if(!motionPaused&&!reduced)motionClock+=dt;
 if(playing){autoT+=Math.min((now-lastTime)/1000,.1);lastTime=now;t=clamp(autoT,0,DURATION);window.scrollTo({top:t/DURATION*endY(),behavior:'instant'});if(autoT>=DURATION)stop();}
 else {const target=clamp(scrollY/endY())*DURATION;t=reduced?target:mix(t,target,1-Math.exp(-dt*13));if(Math.abs(t-target)<.002)t=target;}
 const interval=software?(t>=26&&t<33?100:40):16;
 const changed=Math.abs(previous-t)>.0001||!initialized,ambient=!reduced&&!motionPaused&&t<40;
 if(now-previousRender>=interval&&(changed||ambient)){renderWorld(t);if(changed)updateDOM(t);previous=t;previousRender=now;initialized=true;}
}
window.addEventListener('resize',()=>{W=innerWidth;H=stage.clientHeight;mobile=W<701;if(renderer){renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(W,H);}initialized=false;});
setupWorld();seek(clamp(scrollY/endY())*DURATION);requestAnimationFrame(frame);
if(reduced){$('#scroll-hint').textContent='DÉFILER OU LIRE LE TEXTE ↓';}
