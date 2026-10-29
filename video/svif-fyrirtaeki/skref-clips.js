/* ---------- step clips for svif.is/fyrirtaeki ----------
   Four short builds in the same world as the film. Each one starts from nothing, builds up and ends on a held frame
   (the page plays them once and stays on the last frame).  ?clip=1 ný fyrirtæki · 2 bæklingurinn · 3 dreifingin · 4 kerfið
   This file is spliced into a copy of svif-fyrirtaeki.html by make_skref.py, so everything above is in scope. */
const CLIP = +(new URLSearchParams(location.search).get('clip')||1);
const CLIP_DUR = 8, HOLD = .5;                       // the last half second of every clip is a still
function camPath(keys){ return { keys, pc:new THREE.CatmullRomCurve3(keys.map(k=>k[1]),false,'centripetal'), tc:new THREE.CatmullRomCurve3(keys.map(k=>k[2]),false,'centripetal') }; }
function camAt(s,t,fov=32){
  const K=s.keys, n=K.length; let pos, tgt;
  if(n===2){ const u=esine(prog(t,K[0][0],K[1][0])); pos=K[0][1].clone().lerp(K[1][1],u); tgt=K[0][2].clone().lerp(K[1][2],u); }
  else { let kp; if(t<=K[0][0]) kp=0; else if(t>=K[n-1][0]) kp=1; else { let i=0; while(i<n-2&&t>K[i+1][0]) i++; const u=(t-K[i][0])/(K[i+1][0]-K[i][0]); kp=(i+esine(u))/(n-1); }
    pos=s.pc.getPoint(kp); tgt=s.tc.getPoint(kp); }
  camera.position.copy(pos); camera.fov=fov; camera.updateProjectionMatrix(); camera.lookAt(tgt); camera.updateMatrixWorld();
}
function cityAt(ct){
  for(const o of risers){ const k=eback(prog(ct,o.userData.delay,o.userData.delay+.75)); o.scale.set(1,Math.max(1e-4,k),1); o.visible=k>0.002; }
  const sk = ct<4.4 ? ct.toFixed(3) : 'final';
  if(sk!==shadowKey){ updateTrees(ct); renderer.shadowMap.needsUpdate=true; shadowKey=sk; }
}
const litAt=(bb,k)=>{ if(bb.lit) for(const m of bb.lit) m.color.copy(GREY).lerp(BLUE_LIT,k); };
function clearFilm(){
  slabs.forEach(s=>s.m.visible=false); pileBlob.material.opacity=0; owner.visible=false; bro.visible=false; van.visible=false; node.visible=false;
  lines.forEach(l=>{ l.mesh.visible=false; l.dot.visible=false; }); minis.forEach(mi=>mi.m.visible=false);
  [heroPing,...detPings,...finPings].forEach(p=>{ p.g.visible=false; litAt(p.b,0); });
  tileGlow.visible=false; glowA.visible=false; glowB.visible=false; halo.material.opacity=0;
  officeSign.visible=true; officeSign.scale.setScalar(1);
  nodeTag.style.opacity=0;
}
const C={}; let clipReady=false;
function clipSetup(){
  if(clipReady) return; clipReady=true;
  const chk=canvasTex(160,160,(g)=>{ check(g,80,80,56); });
  // 1: the companies that open, near the middle of the frame and well apart
  const near=homes.filter(bb=>!bb.hero).map(bb=>({bb,d:Math.hypot(bb.x-44,bb.z-24)})).filter(o=>o.d<46).sort((a,c)=>a.d-c.d);
  C.shops=[]; for(const o of near){ if(C.shops.every(s=>Math.hypot(s.bb.x-o.bb.x,s.bb.z-o.bb.z)>13)) C.shops.push({bb:o.bb,ping:makePing(o.bb)}); if(C.shops.length>=7) break; }
  C.shops.forEach((s,i)=>{ s.t=4.7+i*.4; });
  C.cam1=camPath([[0,V(-150,190,215),V(0,0,0)],[5.6,V(-14,84,118),V(40,0,22)],[CLIP_DUR,V(-8,76,106),V(41,0,23)]]);
  // 2: the brochure above the street, facing the camera
  const T2=B2.clone().addScaledVector(UP,-.6);
  C.cam2=camPath([[0,B2.clone().addScaledVector(N6,30),T2],[CLIP_DUR,B2.clone().addScaledVector(N6,27),T2]]);
  C.checks=[0,1,2,3,4,5,6,7].map(i=>{ const {x,y}=tileRect(i); const m=new THREE.Sprite(new THREE.SpriteMaterial({map:chk,transparent:true,depthWrite:false,toneMapped:false}));
    m.position.set((x+TILE.cw-62)/CW*PW, PH/2-(y+62)/CH*PH, .09); m.visible=false; m.renderOrder=5; broInner.add(m); return m; });
  // 3: the delivery run, on the clip's own clock
  C.vanU = t=>1-Math.pow(1-prog(t,.4,7.0),1.7);
  C.tForU = u=>{ let a=.4,bb=7.0; for(let k=0;k<40;k++){ const m=(a+bb)/2; if(C.vanU(m)<u) a=m; else bb=m; } return (a+bb)/2; };
  const cands=homes.filter(bb=>!bb.hero&&bb.rd<13&&bb.ru>.05&&bb.ru<.95).sort((a,c)=>a.ru-c.ru);
  C.drops=[]; for(const c of cands){ const land=C.tForU(c.ru)+.25; if(land>6.9||C.drops.some(d=>Math.abs(d.land-land)<.7)) continue; C.drops.push({bb:c,land,ping:makePing(c)}); if(C.drops.length>=6) break; }
  const miniGeo=new THREE.BoxGeometry(.85,1.0,.1), miniMat=[M.pages,M.pages,M.pages,M.pages,new THREE.MeshBasicMaterial({map:pageTex.cover,toneMapped:false}),M.pages];
  C.drops.forEach(d=>{ const t0=d.land-DROP_DUR; const vp=route.getPointAt(clamp(C.vanU(t0),0,.999)); d.from=vp.clone().add(V(0,2.2,0));
    const dir=V(vp.x-d.bb.x,0,vp.z-d.bb.z).normalize(); d.to=V(d.bb.x,.9,d.bb.z).addScaledVector(dir,Math.min(d.bb.w,d.bb.d)/2+.4); d.yaw=Math.atan2(dir.x,dir.z);
    d.m=new THREE.Mesh(miniGeo,miniMat); d.m.visible=false; scene.add(d.m); });
  // 4: who the system finds, and in what order
  C.found=lines.map((l,k)=>({l,start:1.5+k*.5})); C.found.forEach(f=>{ f.l.p.act=f.start+LINE_GROW; });
  C.extra=finPings.slice(0,4).map((p,k)=>{ p.act=6.0+k*.3; return p; });
  C.cam4=camPath([[0,V(16,128,182),V(4,14,0)],[CLIP_DUR,V(12,108,152),V(6,14,2)]]);
}
function vanAt(t){ const u=clamp(C.vanU(t),0,.99999); const p=route.getPointAt(u); const a=route.getPointAt(Math.max(0,u-.004)), c=route.getPointAt(Math.min(1,u+.004)); return {p,ang:Math.atan2(-(c.z-a.z),c.x-a.x)}; }
function renderClip(t){
  clipSetup(); clearFilm();
  const tA=Math.min(t,CLIP_DUR-HOLD);
  if(CLIP===1){
    const ct=tA*.82;                                   // the city rises a touch slower than in the film
    cityAt(ct); camAt(C.cam1,tA);
    const sg=eback(prog(tA,4.3,4.75)); officeSign.scale.setScalar(Math.max(1e-3,sg)); officeSign.visible=tA>4.3;
    { const walk=eio(prog(tA,4.5,6.1)); const pA=V(HV.x-13,.4,HV.z+2.2), pB=V(HV.x-6.6,.4,HV.z+3.4);
      const pos=pA.clone().lerp(pB,walk); pos.y+=Math.abs(Math.sin(walk*26))*.07*(walk<1?1:0);
      owner.position.copy(pos); owner.rotation.y = walk<1 ? Math.atan2(-(pB.z-pA.z),pB.x-pA.x) : -Math.PI*.42;
      owner.scale.setScalar(Math.max(1e-3,eout(prog(tA,4.3,4.75)))); owner.visible=tA>4.3; }
    const hk=clamp(prog(tA,4.4,4.8)); updatePing(heroPing,tA,hk,{spread:1.3,markerOn:hk,burstT:4.4});
    C.shops.forEach(s=>{ const k=clamp(prog(tA,s.t,s.t+.3)); litAt(s.bb,k); updatePing(s.ping,tA,k,{spread:1.1,markerOn:k,scale:.85,burstT:s.t}); });
  } else if(CLIP===2){
    cityAt(10); camAt(C.cam2,tA);
    const appear=eback(prog(tA,.4,1.0)), open=eio(prog(tA,1.7,2.5));
    bro.visible=appear>0.002; const bp=B2.clone(); bp.y+=Math.sin(tA*1.1)*.06; bro.position.copy(bp); bro.quaternion.copy(faceCam(B2)); bro.scale.setScalar(Math.max(1e-3,appear));
    leftFront.material.map=pageTex.left; rightFront.material.map=pageTex.right;
    leftPivot.rotation.y=Math.PI*(1-open); broInner.position.x=-PW/2*(1-open); leftFront.visible=open>.03; rightFront.visible=open>.03;
    halo.material.opacity=.3*open;
    const T0=2.9, STEP=.5; const cyc=(tA-T0)/STEP, i=Math.floor(cyc);
    tileGlow.visible = tA>T0 && i<8; if(tileGlow.visible){ const {x,y}=tileRect(i); atPage(tileGlow,x,y,TILE.cw,TILE.ch,1); tileGlow.material.opacity=Math.pow(1-(cyc-i),1.2)*.95; }
    C.checks.forEach((m,k)=>{ const s=eback(prog(tA,T0+k*STEP+.2,T0+k*STEP+.55)); m.visible=s>0.002; m.scale.setScalar(Math.max(1e-3,.6*s)); });
  } else if(CLIP===3){
    cityAt(10);
    const vs=vanAt(tA); van.visible=tA>=.4; van.position.copy(vs.p); van.position.y=Math.abs(Math.sin(tA*Math.PI*4))*.03*(tA<7?1:0); van.rotation.y=vs.ang;
    const OFFC=V(-32,58,46); camera.position.copy(vs.p).add(OFFC); camera.fov=30; camera.updateProjectionMatrix(); camera.lookAt(vs.p); camera.updateMatrixWorld();
    C.drops.forEach(d=>{ const u=prog(tA,d.land-DROP_DUR,d.land);
      if(u<=0) d.m.visible=false;
      else { d.m.visible=true;
        if(u<1){ const e=esine(u); _p.copy(d.from).lerp(d.to,e); _p.y+=Math.sin(Math.PI*u)*4; d.m.position.copy(_p); d.m.rotation.set(-.4+u*.6,u*Math.PI*1.2,u*.4); d.m.scale.setScalar(Math.max(1e-3,Math.min(1,u*5))); }
        else { d.m.position.copy(d.to); d.m.rotation.set(0,d.yaw,0); d.m.scale.setScalar(1); } }
      const k=clamp(prog(tA,d.land,d.land+.3)); litAt(d.bb,k); updatePing(d.ping,tA,0,{markerOn:k,burstT:d.land,scale:.8,spread:.9}); });
  } else {
    cityAt(10); camAt(C.cam4,tA);
    const nIn=eback(prog(tA,.5,1.0)); node.visible=nIn>0.001; node.scale.setScalar(Math.max(1e-3,nIn));
    node.position.y=NODE.y+Math.sin(tA*Math.PI*2/b(4))*.5; nodeRings[0].rotation.set(Math.PI/2+.3*Math.sin(tA*.7),tA*.9,0); nodeRings[1].rotation.set(Math.PI/2.4,-tA*.6,.4);
    nodeRings.forEach(r=>r.material.opacity=.8*nIn); nodeGlow.material.opacity=.9*nIn+.8*Math.exp(-Math.max(0,tA-.5)*4)*(tA>.5?1:0);
    let found=0;
    C.found.forEach(f=>{ const l=f.l; const g=eout(prog(tA,f.start,f.start+LINE_GROW)); l.mesh.visible=g>0; l.mesh.geometry.setDrawRange(0,Math.floor(l.count*g/6)*6); l.mesh.material.opacity=.85;
      const fr=(((tA-f.start-LINE_GROW)/b(2))%1+1)%1; l.dot.visible=tA>f.start+LINE_GROW; if(l.dot.visible){ l.dot.position.copy(l.curve.getPoint(fr)); l.dot.scale.setScalar(1); }
      const k=clamp(prog(tA,l.p.act,l.p.act+.3)); if(tA>l.p.act) found++; litAt(l.p.b,k); updatePing(l.p,tA,k*.9,{markerOn:k,burstT:l.p.act,scale:l.p===heroPing?1:.8,spread:1}); });
    C.extra.forEach(p=>{ const k=clamp(prog(tA,p.act,p.act+.3)); if(tA>p.act) found++; litAt(p.b,k); updatePing(p,tA,k*.9,{markerOn:k,burstT:p.act,scale:.8,spread:1}); });
    nodeCore.scale.setScalar(1+.12*hit(tA,1.0,7.2,b(1),8));
    const ns=toScreen(node.position); const nOn=clamp(prog(tA,1.1,1.5)); nodeTag.style.opacity=ns.ok?nOn.toFixed(3):0;
    nodeTag.style.transform=`translate3d(${(ns.x+54).toFixed(1)}px,${(ns.y-54).toFixed(1)}px,0)`; nodeNum.textContent=fmt(Math.max(found,nOn>0?1:0));
  }
  renderer.render(scene,camera);
}
