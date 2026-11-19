/* AURELIA — The Golden Bloom
 * Canvas 2D / no libraries / no external assets.
 * The entire mechanical flower is drawn procedurally on each frame.
 */
(()=>{
  'use strict';
  const canvas=document.getElementById('flower');
  const ctx=canvas.getContext('2d',{alpha:true});
  if(!ctx)return;
  const button=document.getElementById('bloom');
  const text=document.getElementById('action-text');
  const status=document.getElementById('status');
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TAU=Math.PI*2;
  let width=0,height=0,dpr=1,scale=1;
  let target=0,progress=.13,velocity=0,interactionTime=-1;
  let mouse={x:0,y:0};
  let last=0,now=0,frame=0;
  const motes=Array.from({length:110},(_,i)=>({
    a:Math.random()*TAU,r:60+Math.random()*285,size:.3+Math.random()*1.15,
    seed:Math.random()*100,speed:.2+Math.random()*.65,drift:Math.random()*60,
    tint:Math.random(),twinkle:Math.random()*TAU
  }));
  const gleams=Array.from({length:25},()=>({
    a:Math.random()*TAU,r:22+Math.random()*180,size:.5+Math.random()*1.7,phase:Math.random()*TAU
  }));
  const smooth=t=>t*t*(3-2*t);
  const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
  const mix=(a,b,t)=>a+(b-a)*t;
  function resize(){
    const rect=canvas.getBoundingClientRect();
    width=Math.max(1,rect.width);height=Math.max(1,rect.height);
    dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    scale=width<560?Math.min(width/490,height/530,.92):Math.min(width/840,height/465,1.18);
  }
  function rgba(r,g,b,a){return `rgba(${r},${g},${b},${a})`}
  function ellipse(x,y,rx,ry,stroke,a=1,fill){
    ctx.save();ctx.globalAlpha=a;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);
    if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}ctx.restore();
  }
  function halo(x,y,r,alpha){
    const g=ctx.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,rgba(249,195,104,alpha));
    g.addColorStop(.25,rgba(226,155,68,alpha*.26));
    g.addColorStop(1,'rgba(192,115,46,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
  }
  function flowerPath(len,w,curve=0){
    ctx.beginPath();ctx.moveTo(0,7);
    ctx.bezierCurveTo(-w*.23+curve*.12,-len*.12,-w*.92+curve*.3,-len*.56,-w*.72+curve*.18,-len*.79);
    ctx.bezierCurveTo(-w*.58,-len*.93,-w*.28,-len*1.02,0,-len);
    ctx.bezierCurveTo(w*.25,-len*1.015,w*.62,-len*.92,w*.71-curve*.12,-len*.78);
    ctx.bezierCurveTo(w*.97-curve*.28,-len*.54,w*.2-curve*.05,-len*.12,0,7);
    ctx.closePath();
  }
  function petal(angle,length,width,openness,layer,index,t){
    ctx.save();ctx.rotate(angle);
    const fl=reduce?0:Math.sin(t*1.3+index*1.2+layer*.7)*2.7;
    const len=length*(.82+openness*.18);
    const w=width*(.65+openness*.35);
    const curve=fl+Math.sin(index*.94)*3;
    // Petal shadow makes each metallic blade appear raised above its neighbors.
    ctx.save();ctx.translate(2,3);flowerPath(len,w,curve);ctx.fillStyle='rgba(0,0,0,.42)';ctx.shadowColor='rgba(0,0,0,.42)';ctx.shadowBlur=9;ctx.fill();ctx.restore();
    const body=ctx.createLinearGradient(-w*.9,-len*.69,w*.74,-len*.34);
    const phase=(index%4)/4;
    if(layer===0){
      body.addColorStop(0,'#51371f');body.addColorStop(.16,'#926032');body.addColorStop(.35,'#e6b973');body.addColorStop(.58,'#ffe6ab');body.addColorStop(.8,'#c28a48');body.addColorStop(1,'#4e3420');
    }else if(layer===1){
      body.addColorStop(0,'#80512d');body.addColorStop(.2,'#c6904e');body.addColorStop(.48,'#ffe7ac');body.addColorStop(.63,'#e4b56c');body.addColorStop(.86,'#b2773e');body.addColorStop(1,'#69462c');
    }else{
      body.addColorStop(0,'#6b4326');body.addColorStop(.2,'#c08b48');body.addColorStop(.48,'#ffeeb9');body.addColorStop(.7,'#d49b50');body.addColorStop(1,'#603d23');
    }
    flowerPath(len,w,curve);ctx.fillStyle=body;ctx.fill();
    ctx.lineWidth=1.1;ctx.strokeStyle=rgba(255,226,174,.4+openness*.38);ctx.stroke();
    ctx.save();ctx.clip();
    const reflective=ctx.createLinearGradient(0,0,-w*.45,-len);
    reflective.addColorStop(0,'rgba(255,251,215,0)');reflective.addColorStop(.46,'rgba(255,246,185,.07)');reflective.addColorStop(.84,'rgba(255,251,222,.3)');reflective.addColorStop(1,'rgba(255,255,226,.05)');
    ctx.fillStyle=reflective;ctx.fillRect(-w-6,-len-10,w*2+12,len+16);
    // Fine petal veins, each tapering naturally toward the tip.
    ctx.lineWidth=.7;
    for(let q=-1;q<=1;q++){
      if(q===0)continue;
      ctx.beginPath();ctx.moveTo(q*w*.11,-len*.15);
      ctx.bezierCurveTo(q*w*.35,-len*.45,q*w*.4,-len*.74,q*w*.08,-len*.96);
      ctx.strokeStyle='rgba(116,71,29,.27)';ctx.stroke();
    }
    ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(-1,-len*.35,2,-len*.69,0,-len*.97);
    ctx.strokeStyle='rgba(255,248,204,.45)';ctx.lineWidth=.95;ctx.stroke();
    // Liquid metal tip: warm left edge and reflected cold white light.
    ctx.beginPath();ctx.moveTo(-w*.47,-len*.86);ctx.quadraticCurveTo(0,-len*1.035,w*.48,-len*.85);
    ctx.strokeStyle='rgba(255,242,195,.7)';ctx.lineWidth=1.4;ctx.stroke();
    ctx.restore();ctx.restore();
  }
  function petals(layer,count,open,t,seed){
    for(let i=0;i<count;i++){
      const a=(i/count)*TAU+seed;
      // Closed bud = petals overlap near vertical with barely any spread.
      // Open flower = dramatic radial expansion with staggered spring motion.
      const stagger=clamp((open*1.14-i/count*.15),0,1);
      const p=smooth(stagger);
      const radius=layer===0?8:layer===1?6:2;
      const closedAngle=Math.sin(a)*.34+Math.cos(a*2)*.07;
      const rot=layer===0?.08:layer===1?.2:.35;
      const spreadAngle=mix(closedAngle,a+rot,p);
      const petalLen=(layer===0?178:layer===1?129:78)*(1-p*.1);
      const petalWidth=(layer===0?57:layer===1?44:33)*(1+p*.3);
      ctx.save();ctx.translate(Math.cos(a)*radius,Math.sin(a)*radius);
      ctx.rotate((layer===0?.03:layer===1?.11:.16)*Math.sin(t*.65+i));
      petal(spreadAngle,petalLen,petalWidth,p,layer,i,t);
      ctx.restore();
    }
  }
  function drawOrnament(t,open){
    ctx.save();
    // Mechanical gold crown and center mandala.
    ellipse(0,0,33,33,'rgba(255,216,151,.5)',1,'rgba(35,24,17,.83)');
    for(let i=0;i<20;i++){
      const a=i*TAU/20+t*.05;
      const r=25+Math.sin(i*2.7)*3;
      ctx.beginPath();ctx.moveTo(Math.cos(a)*17,Math.sin(a)*17);ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);
      ctx.strokeStyle=`rgba(243,185,95,${.35+open*.52})`;ctx.lineWidth=1.5;ctx.stroke();
      ellipse(Math.cos(a)*r,Math.sin(a)*r,1.7,1.7,null,1,'#e6b669');
    }
    const g=ctx.createRadialGradient(-8,-10,1,0,0,26);
    g.addColorStop(0,'#fff3bf');g.addColorStop(.18,'#ffd684');g.addColorStop(.62,'#bc8244');g.addColorStop(1,'#54331e');
    ellipse(0,0,19,19,'rgba(255,232,174,.7)',1,g);
    ctx.save();ctx.rotate(t*.1);for(let i=0;i<7;i++){
      const a=i*TAU/7;ellipse(Math.cos(a)*9,Math.sin(a)*9,2.3,2.3,null,1,'#ffeaba');
    }ctx.restore();
    ctx.restore();
  }
  function drawLeaves(t,open){
    // Sleek bronze stem, suspended from the flower like a sculptural object.
    ctx.save();
    const stem=ctx.createLinearGradient(-11,0,10,0);
    stem.addColorStop(0,'#47311e');stem.addColorStop(.36,'#bc8750');stem.addColorStop(.5,'#f6d99b');stem.addColorStop(.72,'#b37b3f');stem.addColorStop(1,'#32271d');
    ctx.beginPath();ctx.moveTo(-5,0);ctx.bezierCurveTo(-5,85,-7,146,0,185);ctx.bezierCurveTo(7,146,5,85,5,0);ctx.closePath();ctx.fillStyle=stem;ctx.fill();
    for(const [side,y,ang] of [[-1,98,-.64],[1,131,.69]]){
      ctx.save();ctx.translate(side*1,y);ctx.rotate(ang*side);
      const l=74+(reduce?0:Math.sin(t*.8+y)*3);
      ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(side*12,-l*.26,side*38,-l*.65,side*49,-l);
      ctx.bezierCurveTo(side*21,-l*.79,side*4,-l*.4,0,0);
      const gradient=ctx.createLinearGradient(0,0,side*49,-l);
      gradient.addColorStop(0,'#73502f');gradient.addColorStop(.5,'#d5a160');gradient.addColorStop(1,'#f3d39c');
      ctx.fillStyle=gradient;ctx.fill();ctx.lineWidth=1;ctx.strokeStyle='rgba(255,221,167,.4)';ctx.stroke();
      ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(side*24,-l*.4,side*49,-l);ctx.strokeStyle='rgba(255,236,190,.58)';ctx.lineWidth=.8;ctx.stroke();ctx.restore();
    }
    ctx.restore();
  }
  function ground(t,open){
    const y=209;
    let gr=ctx.createRadialGradient(0,y,0,0,y,125);
    gr.addColorStop(0,`rgba(236,177,91,${.15+open*.05})`);gr.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=gr;ctx.beginPath();ctx.ellipse(0,y,170,28,0,0,TAU);ctx.fill();
    ctx.lineWidth=1;ellipse(0,y,150,11,'rgba(212,156,75,.32)');
    ellipse(0,y,110,6,'rgba(226,171,89,.16)');
    for(let i=0;i<32;i++){
      let a=i*TAU/32+t*.12;let r=151;
      const xx=Math.cos(a)*r,yy=y+Math.sin(a)*11;
      ellipse(xx,yy,.75,.75,null,.1+.12*(1+Math.sin(t*2+i)),'#f4d49a');
    }
  }
  function drawMotes(t,open){
    for(const m of motes){
      const a=m.a+t*.035*m.speed;
      const r=m.r+Math.sin(t*.4+m.seed)*m.drift*.26;
      const x=Math.cos(a)*r,y=Math.sin(a)*r*.77-12+Math.sin(t*m.speed+m.seed)*19;
      const alpha=clamp(.08+(Math.sin(t*m.speed*2+m.twinkle)+1)*.16+open*.11,0,.5);
      ellipse(x,y,m.size,m.size,null,alpha,m.tint>.77?'#fff1ce':'#c89250');
      if(m.tint>.96){ctx.save();ctx.strokeStyle=`rgba(255,214,154,${alpha*.4})`;ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(x-3,y);ctx.lineTo(x+3,y);ctx.moveTo(x,y-3);ctx.lineTo(x,y+3);ctx.stroke();ctx.restore()}
    }
  }
  function drawBurst(t,open){
    if(interactionTime<0)return;
    const elapsed=t-interactionTime;
    if(elapsed>2.5)return;
    const q=clamp(elapsed/1.7,0,1);
    ctx.save();ctx.lineWidth=1.35;ctx.strokeStyle=`rgba(255,201,126,${(1-q)*.35})`;
    ctx.beginPath();ctx.arc(0,0,mix(40,246,smooth(q)),0,TAU);ctx.stroke();
    for(let i=0;i<65;i++){
      const a=i*2.39996;const speed=65+(i%9)*17;
      const r=q*speed*1.35+40;
      const xx=Math.cos(a)*r,yy=Math.sin(a)*r;
      ellipse(xx,yy,(1-q)*1.8+.2,(1-q)*1.8+.2,null,(1-q)*.72,'#ffe1a5');
    }
    ctx.restore();
  }
  function draw(t){
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
    const cx=width/2,cy=height*(width<580?.405:.435);
    ctx.save();ctx.translate(cx,cy);ctx.scale(scale,scale);
    // Gentle mouse parallax never obscures the primary flower.
    ctx.translate(mouse.x*7,mouse.y*5);
    drawMotes(t,progress);
    halo(0,0,310,.08+progress*.15);
    ground(t,progress);
    drawLeaves(t,progress);
    ctx.save();ctx.rotate(Math.sin(t*.22)*.035);
    // Outer ring, inner ring, heart, all overlapping in a controlled Z-order.
    petals(0,13,progress,t,-.18);
    petals(1,10,progress,t,.16);
    petals(2,7,progress,t,.36);
    halo(0,0,76,.07+progress*.07);
    drawOrnament(t,progress);
    ctx.restore();
    drawBurst(t,progress);
    ctx.restore();
  }
  function tick(timestamp){
    now=timestamp*.001;
    const dt=last?Math.min(.05,now-last):.016;last=now;
    if(reduce){progress=target;}else{
      // Damped spring gives petals a pleasing weighted mechanical motion.
      let force=(target-progress)*13;
      velocity=(velocity+force*dt)*Math.exp(-7.5*dt);
      progress=clamp(progress+velocity*dt,0,1);
      if(Math.abs(target-progress)<.001&&Math.abs(velocity)<.002){progress=target;velocity=0}
    }
    draw(now);
    requestAnimationFrame(tick);
  }
  function toggle(){
    target=target>.5?0:1;
    interactionTime=now;
    button.setAttribute('aria-pressed',String(target===1));
    text.textContent=target===1?'CLOSE THE BLOOM':'BLOOM THE FLOWER';
    status.textContent=target===1?'IN FULL BLOOM':'WAITING TO BLOOM';
  }
  button.addEventListener('click',toggle);
  canvas.addEventListener('click',toggle);
  canvas.addEventListener('pointermove',e=>{
    const r=canvas.getBoundingClientRect();mouse.x=clamp(((e.clientX-r.left)/r.width-.5)*2,-1,1);
    mouse.y=clamp(((e.clientY-r.top)/r.height-.5)*2,-1,1);
  });
  canvas.addEventListener('pointerleave',()=>{mouse.x=0;mouse.y=0});
  new ResizeObserver(resize).observe(canvas);resize();
  // First render is visible before the first animation frame.
  draw(0);requestAnimationFrame(tick);
})();
