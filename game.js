(() => {
  "use strict";
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const W = 960, H = 540, TILE = 40;
  const $ = id => document.getElementById(id);
  const overlay = $("overlay"), startBtn = $("startBtn");
  const keys = {left:false,right:false,jump:false};
  let state = "menu", deaths = 0, cameraX = 0, last = 0, soundOn = true;
  let toastTimer = 0, particles = [], level = 1, checkpoint = 0;
  let audioCtx = null;

  const player = {x:72,y:390,w:25,h:31,vx:0,vy:0,onGround:false,dead:false,face:1,coyote:0,jumpBuffer:0,spawnX:72,spawnY:390};
  const platforms = [
    {x:0,y:460,w:240,h:80},{x:285,y:460,w:170,h:80},{x:500,y:420,w:130,h:120},
    {x:680,y:460,w:160,h:80},{x:890,y:420,w:150,h:120},{x:1090,y:460,w:180,h:80},
    {x:1330,y:420,w:150,h:120},{x:1540,y:460,w:220,h:80},{x:1810,y:420,w:180,h:120}
  ];
  const traps = [
    {type:"spikes",x:175,y:436,w:65,h:24,hidden:false,active:true},
    {type:"fall",x:285,y:460,w:170,h:16,triggered:false,t:0},
    {type:"spikes",x:535,y:396,w:58,h:24,hidden:true,active:false},
    {type:"crusher",x:730,y:310,w:42,h:150,base:310,phase:0},
    {type:"spikes",x:950,y:396,w:65,h:24,hidden:false,active:true},
    {type:"fall",x:1150,y:460,w:100,h:16,triggered:false,t:0},
    {type:"spikes",x:1370,y:396,w:65,h:24,hidden:true,active:false},
    {type:"crusher",x:1635,y:285,w:45,h:175,base:285,phase:1.5}
  ];
  const goal = {x:1900,y:350,w:35,h:70};
  const worldWidth = 2050;

  function beep(freq=240,duration=.07,type="square",volume=.025){
    if(!soundOn)return;
    try{audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.value=volume;o.connect(g);g.connect(audioCtx.destination);o.start();g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.stop(audioCtx.currentTime+duration)}catch(e){}
  }
  function showToast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),1300)}
  function updateHud(){$("deathValue").textContent=String(deaths).padStart(2,"0");$("checkpointValue").textContent=checkpoint?"ACTIVE":"—";$("progressText").textContent=Math.min(100,Math.floor((player.x/worldWidth)*100))+"% COMPLETE";$("progressBar").style.width=Math.min(100,(player.x/worldWidth)*100)+"%"}
  function resetPlayer(fromCheckpoint=true){platforms.forEach(p=>{if(p.x===285||p.x===1090)p.y=460});traps.forEach(t=>{if(t.type==="fall"){t.triggered=false;t.t=0}});player.x=fromCheckpoint?player.spawnX:72;player.y=fromCheckpoint?player.spawnY:390;player.vx=0;player.vy=0;player.dead=false;player.onGround=false;player.coyote=0;player.jumpBuffer=0;cameraX=0}
  function startGame(){platforms.forEach(p=>{p.y= p.x===500||p.x===890||p.x===1330||p.x===1810 ? 420 : 460});traps.forEach(t=>{if(t.type==="crusher"){t.y=t.base;t.phase=t.base===310?0:1.5}});state="playing";overlay.classList.add("hidden");resetPlayer(false);deaths=0;checkpoint=0;player.spawnX=72;player.spawnY=390;traps.forEach(t=>{if(t.type==="fall"){t.triggered=false;t.t=0}if(t.type==="spikes"&&t.hidden)t.active=false});updateHud();beep(440,.08)}
  function die(){if(player.dead)return;player.dead=true;deaths++;beep(100,.22,"sawtooth",.05);for(let i=0;i<16;i++)particles.push({x:player.x+player.w/2,y:player.y+player.h/2,vx:(Math.random()-.5)*260,vy:(Math.random()-.5)*260,life:.5,color:i%2?"#c8ff4d":"#ff5364"});updateHud();setTimeout(()=>{resetPlayer(true);if(state==="playing")showToast("DEATH #"+deaths+" — TRY AGAIN");},450)}
  function complete(){state="won";overlay.classList.remove("hidden");$("overlayEyebrow").textContent="SOMEHOW, YOU SURVIVED";$("overlayTitle").innerHTML="LEVEL <span>CLEARED.</span>";$("overlayCopy").textContent=`You made it through the first lie with ${deaths} ${deaths===1?"death":"deaths"}. The next world will be worse.`;startBtn.textContent="PLAY AGAIN ↗";beep(660,.12);setTimeout(()=>beep(880,.18),130)}
  function rects(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
  function update(dt){
    if(state!=="playing"||player.dead)return;
    const accel=1700, max=260, friction=1900;
    if(keys.left){player.vx-=accel*dt;player.face=-1}else if(keys.right){player.vx+=accel*dt;player.face=1}else{player.vx-=Math.sign(player.vx)*Math.min(Math.abs(player.vx),friction*dt)}
    player.vx=Math.max(-max,Math.min(max,player.vx));
    if(keys.jump)player.jumpBuffer=.13;else player.jumpBuffer=Math.max(0,player.jumpBuffer-dt);
    if(player.onGround)player.coyote=.10;else player.coyote=Math.max(0,player.coyote-dt);
    if(player.jumpBuffer>0&&player.coyote>0){player.vy=-570;player.onGround=false;player.coyote=0;player.jumpBuffer=0;beep(330,.045)}
    player.vy+=1550*dt;player.vy=Math.min(player.vy,800);
    player.x+=player.vx*dt;
    if(player.x<0){player.x=0;player.vx=0}
    // Horizontal collision with solid platforms.
    for(const p of platforms)if(rects(player,p)){if(player.vx>0)player.x=p.x-player.w;else if(player.vx<0)player.x=p.x+p.w;player.vx=0}
    player.y+=player.vy*dt;player.onGround=false;
    for(const p of platforms)if(rects(player,p)){if(player.vy>0){player.y=p.y-player.h;player.vy=0;player.onGround=true}else if(player.vy<0){player.y=p.y+p.h;player.vy=0}}
    // Trap behavior.
    for(const t of traps){
      if(t.type==="spikes"&&t.hidden&&!t.active&&player.x+player.w>t.x-28&&player.x<t.x+t.w+28){t.active=true;showToast("YOU THOUGHT THAT WAS SAFE?");beep(180,.12,"sawtooth")}
      if(t.type==="fall"){
        if(!t.triggered&&player.onGround&&player.x+player.w>t.x&&player.x<t.x+t.w){t.triggered=true;t.t=0;showToast("THE FLOOR IS A LIAR");beep(130,.1,"square")}
        if(t.triggered){t.t+=dt;if(t.t>.16){const p=platforms.find(p=>p.x===t.x);if(p)p.y=1000}}
      }
      if(t.type==="crusher"){t.phase+=dt*1.5;t.y=t.base+Math.max(0,Math.sin(t.phase))*105;if(rects(player,t))die()}
      if(t.type==="spikes"&&t.active&&rects(player,{x:t.x,y:t.y+5,w:t.w,h:t.h-5}))die();
    }
    if(player.y>H+100)die();
    if(player.x>760&&checkpoint===0){checkpoint=1;player.spawnX=820;player.spawnY=380;showToast("CHECKPOINT REACHED");beep(520,.1);updateHud()}
    if(rects(player,goal))complete();
    cameraX=Math.max(0,Math.min(worldWidth-W,player.x-W*.34));
    updateHud();
  }

  function drawBackground(){
    const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,"#111a2a");g.addColorStop(1,"#1c2637");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    // distant pixel mountains
    ctx.fillStyle="#192438";for(let i=0;i<15;i++){let x=((i*170-cameraX*.18)%1250+1250)%1250-100;ctx.beginPath();ctx.moveTo(x,420);ctx.lineTo(x+75,260+(i%3)*28);ctx.lineTo(x+170,420);ctx.fill()}
    ctx.fillStyle="#ffffff08";for(let x=0;x<W;x+=40)ctx.fillRect(x,0,1,H);for(let y=0;y<H;y+=40)ctx.fillRect(0,y,W,1);
    for(let i=0;i<36;i++){const x=((i*97-cameraX*.35)%W+W)%W,y=50+(i*53)%300;ctx.fillStyle=i%4===0?"#c8ff4d55":"#a9bad322";ctx.fillRect(x,y,2,2)}
  }
  function drawPlatform(p){ctx.fillStyle="#303d53";ctx.fillRect(p.x-cameraX,p.y,p.w,p.h);ctx.fillStyle="#586982";ctx.fillRect(p.x-cameraX,p.y,p.w,6);ctx.fillStyle="#202a3b";for(let x=p.x+10;x<p.x+p.w-5;x+=24)ctx.fillRect(x-cameraX,p.y+17,12,3);ctx.fillStyle="#c8ff4d";ctx.fillRect(p.x-cameraX,p.y,p.w,3)}
  function drawSpikes(t){ctx.fillStyle="#ff5364";for(let x=t.x;x<t.x+t.w;x+=13){ctx.beginPath();ctx.moveTo(x-cameraX,t.y+t.h);ctx.lineTo(x+6-cameraX,t.y);ctx.lineTo(x+13-cameraX,t.y+t.h);ctx.fill()}ctx.fillStyle="#ff9aa4";ctx.fillRect(t.x-cameraX,t.y+t.h-3,t.w,3)}
  function drawPlayer(){const x=Math.round(player.x-cameraX),y=Math.round(player.y);ctx.fillStyle="#0008";ctx.fillRect(x-3,y+player.h+2,player.w+6,5);ctx.fillStyle="#c8ff4d";ctx.fillRect(x+3,y+8,19,19);ctx.fillStyle="#e7ffad";ctx.fillRect(x+5,y+2,15,11);ctx.fillStyle="#18202c";ctx.fillRect(x+(player.face>0?14:7),y+6,3,3);ctx.fillRect(x+4,y+26,6,5);ctx.fillRect(x+16,y+26,6,5);ctx.fillStyle="#fff";ctx.fillRect(x+6,y+3,3,3)}
  function draw(){
    drawBackground();ctx.save();ctx.translate(0,0);
    // Goal marker
    ctx.fillStyle="#c8ff4d";ctx.fillRect(goal.x-cameraX,goal.y,4,goal.h);ctx.fillStyle="#c8ff4d";ctx.beginPath();ctx.moveTo(goal.x-cameraX+4,goal.y);ctx.lineTo(goal.x-cameraX+39,goal.y+12);ctx.lineTo(goal.x-cameraX+4,goal.y+24);ctx.fill();
    platforms.forEach(p=>{if(p.y<600)drawPlatform(p)});
    traps.forEach(t=>{if(t.type==="spikes"&&t.active)drawSpikes(t);if(t.type==="fall"&&!t.triggered){ctx.fillStyle="#596982";ctx.fillRect(t.x-cameraX,t.y,t.w,5);ctx.fillStyle="#c8ff4d";ctx.fillRect(t.x-cameraX,t.y,t.w,2)}if(t.type==="crusher"){ctx.fillStyle="#ff5364";ctx.fillRect(t.x-cameraX,t.y,t.w,t.h);ctx.fillStyle="#ffc0c6";ctx.fillRect(t.x-cameraX,t.y,t.w,5);ctx.fillStyle="#7b2635";for(let y=t.y+14;y<t.y+t.h;y+=18)ctx.fillRect(t.x-cameraX+7,y,t.w-14,4)}});
    // Checkpoint flag
    if(checkpoint){ctx.fillStyle="#c8ff4d";ctx.fillRect(820-cameraX,375,3,85);ctx.fillRect(823-cameraX,375,28,17)}
    if(!player.dead)drawPlayer();
    particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life*2);ctx.fillStyle=p.color;ctx.fillRect(p.x-cameraX,p.y,4,4);ctx.globalAlpha=1});
    ctx.restore();
    // Vignette
    const vg=ctx.createRadialGradient(W/2,H/2,120,W/2,H/2,560);vg.addColorStop(0,"transparent");vg.addColorStop(1,"#05091288");ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
  }
  function loop(ts){const dt=Math.min((ts-last)/1000||0,.033);last=ts;update(dt);particles=particles.filter(p=>p.life>0);particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=400*dt;p.life-=dt});draw();requestAnimationFrame(loop)}
  function setKey(k,v){if(k==="left")keys.left=v;if(k==="right")keys.right=v;if(k==="jump")keys.jump=v}
  window.addEventListener("keydown",e=>{if(["ArrowLeft","ArrowRight","ArrowUp"," ","a","A","d","D","w","W","r","R"].includes(e.key))e.preventDefault();if(e.key==="ArrowLeft"||e.key.toLowerCase()==="a")setKey("left",true);if(e.key==="ArrowRight"||e.key.toLowerCase()==="d")setKey("right",true);if(e.key===" "||e.key==="ArrowUp"||e.key.toLowerCase()==="w")setKey("jump",true);if(e.key.toLowerCase()==="r"&&state==="playing"){resetPlayer(true);showToast("RUN RESTARTED")}});
  window.addEventListener("keyup",e=>{if(e.key==="ArrowLeft"||e.key.toLowerCase()==="a")setKey("left",false);if(e.key==="ArrowRight"||e.key.toLowerCase()==="d")setKey("right",false);if(e.key===" "||e.key==="ArrowUp"||e.key.toLowerCase()==="w")setKey("jump",false)});
  document.querySelectorAll("[data-key]").forEach(btn=>{const k=btn.dataset.key;btn.addEventListener("pointerdown",e=>{e.preventDefault();btn.setPointerCapture(e.pointerId);setKey(k,true)});["pointerup","pointercancel","lostpointercapture"].forEach(ev=>btn.addEventListener(ev,e=>{e.preventDefault();setKey(k,false)}))});
  startBtn.addEventListener("click",startGame);
  $("soundBtn").addEventListener("click",()=>{soundOn=!soundOn;$("soundBtn").textContent=soundOn?"♫":"×";showToast(soundOn?"SOUND ON":"SOUND OFF")});
  requestAnimationFrame(loop);
})();
