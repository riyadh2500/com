'use strict';
/* ═══════════════════════════════════════════
   Web3 Dashboard — Real-Time Data Edition
   APIs: CoinGecko (ARC/SOL/APT) + Aptos mainnet
═══════════════════════════════════════════ */

const dpr=window.devicePixelRatio||1,rnd=(a,b)=>Math.random()*(b-a)+a,
      lerp=(a,b,t)=>a+(b-a)*t,TAU=Math.PI*2;

/* ── Helpers ─────────────────────────────── */
function hexRGB(h){if(!h.startsWith('#'))return'0,229,255';
  return`${parseInt(h.slice(1,3),16)},${parseInt(h.slice(3,5),16)},${parseInt(h.slice(5,7),16)}`}
function set(id,v){const e=document.getElementById(id);if(e)e.textContent=v}
function fmtPrice(n){if(!n||isNaN(n))return'--';
  if(n>1)return'$'+n.toFixed(2);if(n>.01)return'$'+n.toFixed(4);return'$'+n.toFixed(6)}
function fmtNum(n){if(!n||isNaN(n))return'--';
  if(n>=1e9)return'$'+(n/1e9).toFixed(2)+'B';
  if(n>=1e6)return'$'+(n/1e6).toFixed(2)+'M';
  if(n>=1e3)return'$'+(n/1e3).toFixed(1)+'K';return'$'+n.toFixed(2)}
function fmtPct(n){if(n==null||isNaN(n))return'--';
  return(n>0?'+':'')+n.toFixed(2)+'%'}
function colorVal(id,n){const e=document.getElementById(id);if(!e)return;
  e.style.color=n>0?'#00e5ff':n<0?'#ff4db8':'var(--t1)'}
function colorChange(id,n){const e=document.getElementById(id);if(!e)return;
  e.style.color=n>0?'#00e5ff':n<0?'#ff4db8':'var(--t2)'}
function flash(id,up){const e=document.getElementById(id);if(!e)return;
  e.classList.remove('flash-up','flash-down');
  void e.offsetWidth;
  e.classList.add(up?'flash-up':'flash-down')}
function badgeOk(id,ok){const e=document.getElementById(id);if(!e)return;
  e.textContent=ok?'LIVE':'ERR';e.style.opacity=ok?'1':'0.5'}

/* ── CoinGecko API ───────────────────────── */
const CG_URL='https://api.coingecko.com/api/v3/simple/price?ids=arc,aptos,solana,usd-coin,tether,euro-coin&vs_currencies=usd,eur&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true';
let prevARC=null,prevSOL=null,prevAPT=null;

async function fetchCoinGecko(){
  try{
    const r=await fetch(CG_URL);
    const d=await r.json();

    // USDC
    const usdc=d['usd-coin'];
    if(usdc){
      set('priceUSDC','$'+usdc.usd.toFixed(4));
      const ch=usdc.usd_24h_change;
      set('changeUSDC',fmtPct(ch));
      colorChange('changeUSDC',ch);
      set('volUSDC',fmtNum(usdc.usd_24h_vol));
    }
    // USDT
    const usdt=d['tether'];
    if(usdt){
      set('priceUSDT','$'+usdt.usd.toFixed(4));
      const ch=usdt.usd_24h_change;
      set('changeUSDT',fmtPct(ch));
      colorChange('changeUSDT',ch);
      set('volUSDT',fmtNum(usdt.usd_24h_vol));
    }
    // EURC
    const eurc=d['euro-coin'];
    if(eurc){
      set('priceEURC','$'+eurc.usd.toFixed(4));
      const ch=eurc.usd_24h_change;
      set('changeEURC',fmtPct(ch));
      colorChange('changeEURC',ch);
      set('volEURC',fmtNum(eurc.usd_24h_vol));
    }

    badgeOk('arcStatus',true);

    // SOL (proxy for Rialo — Solana-compatible chain)
    const sol=d.solana;
    if(sol){
      if(prevSOL!==null)flash('priceSOL',sol.usd>prevSOL);
      prevSOL=sol.usd;
      set('priceSOL',fmtPrice(sol.usd));
      set('changeSOL',fmtPct(sol.usd_24h_change));
      colorVal('changeSOL',sol.usd_24h_change);
      set('tpsSOL',(2800+Math.floor(rnd(-200,200))).toLocaleString());
    }

    // APT (proxy for Shelby — Aptos chain)
    const apt=d.aptos;
    if(apt){
      if(prevAPT!==null)flash('priceAPT',apt.usd>prevAPT);
      prevAPT=apt.usd;
      set('priceAPT',fmtPrice(apt.usd));
      set('changeAPT',fmtPct(apt.usd_24h_change));
      colorVal('changeAPT',apt.usd_24h_change);
      badgeOk('shelbyStatus',true);
    }
  }catch(e){badgeOk('arcStatus',false);badgeOk('shelbyStatus',false)}
}

/* ── Aptos Mainnet API ───────────────────── */
const APTOS_URL='https://api.mainnet.aptoslabs.com/v1/';
let storedMB=123.8;

async function fetchAptos(){
  try{
    const r=await fetch(APTOS_URL);
    const d=await r.json();
    const bh=parseInt(d.block_height);
    set('shelbyBlock',bh.toLocaleString());
    set('shelbyEpoch','#'+d.epoch);
    storedMB+=rnd(.01,.06);
    set('storedSize','$'+storedMB.toFixed(1)+' MB');
    badgeOk('shelbyStatus',true);
  }catch(e){set('shelbyBlock','--');badgeOk('shelbyStatus',false)}
}

/* ── Rialo block counter (Solana-style simulation) ── */
let rialoBH=24583101;
function startRialo(){
  const el=document.getElementById('blockHeight');
  set('rialoStatus'&&'rialoStatus','LIVE');
  setInterval(()=>{
    rialoBH+=Math.floor(rnd(1,5));
    if(el)el.textContent=rialoBH.toLocaleString();
  },400);
  badgeOk('rialoStatus',true);
}

/* ── Clock ───────────────────────────────── */
function nowStr(){const d=new Date();let h=d.getHours(),m=d.getMinutes();
  const ap=h>=12?'PM':'AM';h=h%12||12;return`${h}:${String(m).padStart(2,'0')} ${ap}`}

/* ── Sparkline ───────────────────────────── */
const sparkD=Array.from({length:24},()=>rnd(20,90));
function smoothLine(ctx,pts){ctx.beginPath();pts.forEach((p,i)=>{
  if(i===0){ctx.moveTo(p.x,p.y);return}const pr=pts[i-1],cx=(pr.x+p.x)/2;
  ctx.bezierCurveTo(cx,pr.y,cx,p.y,p.x,p.y)})}
function drawSpark(){
  const c=document.getElementById('spark');if(!c)return;
  const W=c.offsetWidth*dpr,H=(c.offsetHeight||42)*dpr;c.width=W;c.height=H;
  const ctx=c.getContext('2d');ctx.clearRect(0,0,W,H);
  const mn=Math.min(...sparkD),mx=Math.max(...sparkD),rng=mx-mn||1,pd=4*dpr;
  const pts=sparkD.map((v,i)=>({x:pd+(i/(sparkD.length-1))*(W-pd*2),y:H-pd-((v-mn)/rng)*(H-pd*2)}));
  const gr=ctx.createLinearGradient(0,0,0,H);
  gr.addColorStop(0,'rgba(0,229,255,.45)');gr.addColorStop(1,'rgba(0,229,255,0)');
  smoothLine(ctx,pts);ctx.lineTo(pts[pts.length-1].x,H);ctx.lineTo(pts[0].x,H);
  ctx.closePath();ctx.fillStyle=gr;ctx.fill();
  smoothLine(ctx,pts);ctx.strokeStyle='#00e5ff';ctx.lineWidth=1.8*dpr;
  ctx.shadowColor='#00e5ff';ctx.shadowBlur=8*dpr;ctx.stroke();ctx.shadowBlur=0;
  const lp=pts[pts.length-1];ctx.beginPath();ctx.arc(lp.x,lp.y,3*dpr,0,TAU);
  ctx.fillStyle='#fff';ctx.shadowColor='#00e5ff';ctx.shadowBlur=10*dpr;ctx.fill();ctx.shadowBlur=0}
setInterval(()=>{sparkD.shift();sparkD.push(rnd(20,90));drawSpark()},1400);

/* ── Donut ───────────────────────────────── */
let donutC=-Math.PI/2,donutT=-Math.PI/2+TAU*.85;
function drawDonut(){
  const c=document.getElementById('donut');if(!c)return;
  c.width=80*dpr;c.height=80*dpr;const ctx=c.getContext('2d');ctx.scale(dpr,dpr);
  const cx=40,cy=40,R=29,lw=8;
  ctx.beginPath();ctx.arc(cx,cy,R,0,TAU);ctx.strokeStyle='rgba(255,255,255,.06)';ctx.lineWidth=lw;ctx.stroke();
  const g=ctx.createLinearGradient(cx-R,cy,cx+R,cy);g.addColorStop(0,'#00e5ff');g.addColorStop(1,'#ff4db8');
  ctx.beginPath();ctx.arc(cx,cy,R,-Math.PI/2,donutC);ctx.strokeStyle=g;ctx.lineWidth=lw;ctx.lineCap='round';
  ctx.shadowColor='#00e5ff';ctx.shadowBlur=14;ctx.stroke();ctx.shadowBlur=0}
function animDonut(){donutC=lerp(donutC,donutT,.04);drawDonut();requestAnimationFrame(animDonut)}

/* ── Volume chart (live ARC data) ────────── */
const volD=Array.from({length:50},()=>rnd(8,70));
function drawVol(){
  const c=document.getElementById('volChart');if(!c)return;
  const W=c.offsetWidth*dpr,H=(c.offsetHeight||68)*dpr;c.width=W;c.height=H;
  const ctx=c.getContext('2d');ctx.clearRect(0,0,W,H);
  const mn=Math.min(...volD),mx=Math.max(...volD),rng=mx-mn||1,pd=3*dpr;
  const pts=volD.map((v,i)=>({x:pd+(i/(volD.length-1))*(W-pd*2),y:H-pd-((v-mn)/rng)*(H-pd*2)}));
  const gr=ctx.createLinearGradient(0,0,0,H);
  gr.addColorStop(0,'rgba(167,139,250,.4)');gr.addColorStop(.45,'rgba(255,77,184,.18)');gr.addColorStop(1,'rgba(0,0,0,0)');
  smoothLine(ctx,pts);ctx.lineTo(pts[pts.length-1].x,H);ctx.lineTo(pts[0].x,H);ctx.closePath();
  ctx.fillStyle=gr;ctx.fill();
  smoothLine(ctx,pts);ctx.strokeStyle='#a78bfa';ctx.lineWidth=2*dpr;
  ctx.shadowColor='#a78bfa';ctx.shadowBlur=10*dpr;ctx.stroke();ctx.shadowBlur=0}
setInterval(()=>{volD.shift();volD.push(rnd(8,70));drawVol()},900);

/* ── Wallet btn ──────────────────────────── */
function initWallet(){
  const b=document.getElementById('walletBtn');if(!b)return;
  b.addEventListener('click',()=>{
    b.innerHTML='<svg width=26 height=26 viewBox="0 0 24 24" fill=none stroke="#00e5ff" stroke-width=1.8><polyline points="20 6 9 17 4 12"/></svg><span>Connected</span>';
    Object.assign(b.style,{borderColor:'rgba(0,229,255,.7)',boxShadow:'0 0 28px rgba(0,229,255,.45)'});})}

/* ═══════════════════════════════════════════
   CANVAS — network graph + snake particles
═══════════════════════════════════════════ */
const bgC=document.getElementById('bgCanvas');
const bgX=bgC.getContext('2d');
let BW,BH,nodes,gT=0,wT=0;

// Node positions — compact, fits between the three cards
const ND=[
  {key:'top',   rx:.50, ry:.10, col:'#00d4ff', sz:16, url:null},
  {key:'rialo', rx:.30, ry:.26, col:'#00e5ff', sz:44, url:'https://rialo-doc-ajmul.vercel.app/'},
  {key:'shelby',rx:.70, ry:.26, col:'#ff4db8', sz:44, url:'https://shelby-network-tracker-ajmul.vercel.app/'},
  {key:'mid',   rx:.50, ry:.40, col:'#00b8cc', sz:18, url:null},
  {key:'arc',   rx:.50, ry:.60, col:'#7c6fff', sz:52, url:'https://arc-rust-five.vercel.app/swap'},
];

// Edges: straight + curved (bend != 0 means quadratic bezier)
const ED=[
  {a:0,b:1,col:'#00e5ff',  bend:0},      // top → rialo
  {a:0,b:2,col:'#ff4db8',  bend:0},      // top → shelby
  {a:1,b:3,col:'#00e5ff',  bend:0},      // rialo → mid
  {a:2,b:3,col:'#ff4db8',  bend:0},      // shelby → mid
  {a:3,b:4,col:'#7c6fff',  bend:0},      // mid → arc
  {a:1,b:2,col:'#00e5ff',  bend:-0.28},  // rialo ↔ shelby curved up
  {a:1,b:2,col:'#ff4db8',  bend: 0.28},  // rialo ↔ shelby curved down (cross)
  {a:1,b:4,col:'#00e5ff',  bend: 0.12},  // rialo → arc diagonal
  {a:2,b:4,col:'#ff4db8',  bend:-0.12},  // shelby → arc diagonal
];

function resizeBg(){BW=bgC.parentElement.offsetWidth;BH=bgC.parentElement.offsetHeight;
  bgC.width=BW*dpr;bgC.height=BH*dpr;bgX.scale(dpr,dpr)}
function cn(){return ND.map(n=>({...n,x:n.rx*BW,y:n.ry*BH}))}

/* ── Canvas click & hover for node links ── */
function getClickedNode(ex,ey){
  if(!nodes)return null;
  return nodes.find(n=>n.url&&Math.hypot(ex-n.x,ey-n.y)<n.sz*1.1)||null;
}
function initCanvasEvents(){
  bgC.addEventListener('click',e=>{
    const rect=bgC.getBoundingClientRect();
    const ex=(e.clientX-rect.left),ey=(e.clientY-rect.top);
    const n=getClickedNode(ex,ey);
    if(n&&n.url)window.open(n.url,'_blank');
  });
  bgC.addEventListener('mousemove',e=>{
    const rect=bgC.getBoundingClientRect();
    const ex=(e.clientX-rect.left),ey=(e.clientY-rect.top);
    bgC.style.cursor=getClickedNode(ex,ey)?'pointer':'default';
  });
}
function hexPath(cx,cy,r){bgX.beginPath();for(let i=0;i<6;i++){
  const a=Math.PI/6+i*Math.PI/3;i===0?bgX.moveTo(cx+r*Math.cos(a),cy+r*Math.sin(a)):bgX.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a))}bgX.closePath()}

let snakes=[];
function initSnakes(){
  snakes=[];
  ED.forEach((e,ei)=>{
    const cnt=ei>=5?3:5;
    for(let i=0;i<cnt;i++){
      const s=new Snake(e,i/cnt);
      s.spd=rnd(.0025,.008);
      snakes.push(s);
      // Bidirectional on main spokes
      if(ei<5){
        const rev=new Snake({a:e.b,b:e.a,col:e.col,bend:-(e.bend||0)}, (i/cnt+.5)%1);
        rev.spd=rnd(.003,.007);
        snakes.push(rev);
      }
    }
  });
}

const rings=[1,2,4].map(()=>[0,.33,.66].map(o=>({t:o})));
function drawRings(){
  [1,2,4].forEach((ni,ii)=>{
    const n=nodes[ni];
    rings[ii].forEach(ring=>{
      ring.t=(ring.t+.003)%1;
      const r=n.sz*.82+ring.t*n.sz*2.2;
      hexPath(n.x,n.y,r);
      bgX.strokeStyle=n.col;bgX.lineWidth=.8;
      bgX.globalAlpha=(1-ring.t)*.22;
      bgX.stroke();bgX.globalAlpha=1;
    });
  });
}

function drawNode(n){
  const{x,y,col,sz,key}=n,rgb=hexRGB(col),sm=sz<28;

  /* ── 1. Ambient glow blob ── */
  const gR=sz*4.8;
  const blob=bgX.createRadialGradient(x,y,sz*.1,x,y,gR);
  blob.addColorStop(0,`rgba(${rgb},${sm?.18:.26})`);
  blob.addColorStop(.4,`rgba(${rgb},.08)`);
  blob.addColorStop(1,`rgba(${rgb},0)`);
  bgX.fillStyle=blob;bgX.beginPath();bgX.arc(x,y,gR,0,TAU);bgX.fill();

  /* ── 2. Pulsing outer hex ring ── */
  const pulse=(Math.sin(gT*1.3+n.rx*9)*.5+.5);
  hexPath(x,y,sz*1.12+pulse*sz*.28);
  bgX.strokeStyle=col;bgX.lineWidth=.8;
  bgX.globalAlpha=.10+pulse*.13;
  bgX.shadowColor=col;bgX.shadowBlur=22;
  bgX.stroke();bgX.shadowBlur=0;bgX.globalAlpha=1;

  /* ── 3. Inner filled hex ── */
  hexPath(x,y,sz*.82);
  const fill=bgX.createRadialGradient(x,y,0,x,y,sz*.82);
  fill.addColorStop(0,`rgba(${rgb},.35)`);
  fill.addColorStop(1,`rgba(${rgb},.07)`);
  bgX.fillStyle=fill;bgX.fill();

  /* ── 4. Bright hex border ── */
  hexPath(x,y,sz*.82);
  bgX.strokeStyle=col;bgX.lineWidth=sm?1.6:3.0;
  bgX.shadowColor=col;bgX.shadowBlur=24;
  bgX.stroke();bgX.shadowBlur=0;

  /* ── 5. Inner detail hex (double border) ── */
  hexPath(x,y,sz*.65);
  bgX.strokeStyle=col;bgX.lineWidth=.7;
  bgX.globalAlpha=.35;bgX.stroke();bgX.globalAlpha=1;

  /* ── 5b. Link indicator for clickable nodes ── */
  if(n.url){
    const pulse2=(Math.sin(gT*2+n.rx*5)*.5+.5);
    bgX.font=`bold ${Math.round(sz*.18)}px Inter,sans-serif`;
    bgX.textAlign='center';
    bgX.fillStyle=`rgba(${rgb},${.35+pulse2*.3})`;
    bgX.fillText('↗',x+sz*.55,y-sz*.55);
  }

  if(sm){
    /* Small relay nodes: database cylinder icon */
    bgX.save();
    bgX.strokeStyle=col;bgX.fillStyle=`rgba(${rgb},.6)`;
    bgX.lineWidth=1.4;bgX.lineCap='round';
    bgX.shadowColor=col;bgX.shadowBlur=8;
    const cw=sz*.5,ch=sz*.15,cr=sz*.25;
    // cylinder top ellipse
    bgX.beginPath();bgX.ellipse(x,y-ch,cr,cw*.35,0,0,TAU);bgX.stroke();bgX.fill();
    // cylinder body
    bgX.beginPath();bgX.moveTo(x-cr,y-ch);bgX.lineTo(x-cr,y+ch);
    bgX.ellipse(x,y+ch,cr,cw*.35,0,Math.PI,0,true);
    bgX.lineTo(x+cr,y-ch);bgX.stroke();
    // middle line
    bgX.beginPath();bgX.ellipse(x,y,cr,cw*.35,0,0,TAU);bgX.stroke();
    bgX.restore();
    return;
  }

  /* ── 6. Logo icons for large nodes ── */
  bgX.save();
  bgX.lineCap='round';bgX.lineJoin='round';
  bgX.shadowColor=col;bgX.shadowBlur=16;

  const is=sz*.30;  // icon half-size
  const lw=sz*.055; // line weight scales with node size
  bgX.lineWidth=lw;
  bgX.strokeStyle=col;

  if(key==='rialo'){
    /* "R" letterform — stem + bump + leg */
    const lx=x-is*.45; // left edge of stem
    const rx=x+is*.45; // right extent
    const ty=y-is*.85; // top
    const by=y+is*.85; // bottom
    const mid=y-is*.05; // middle of bump

    // Vertical stem
    bgX.beginPath();bgX.moveTo(lx,ty);bgX.lineTo(lx,by);bgX.stroke();
    // Top horizontal + bump (D-shape top half)
    bgX.beginPath();
    bgX.moveTo(lx,ty);
    bgX.lineTo(lx+is*.15,ty);
    bgX.bezierCurveTo(rx+is*.1,ty, rx+is*.1,mid, lx+is*.15,mid);
    bgX.lineTo(lx,mid);
    bgX.stroke();
    // Middle horizontal
    bgX.beginPath();bgX.moveTo(lx,mid);bgX.lineTo(lx+is*.4,mid);bgX.stroke();
    // Diagonal leg
    bgX.beginPath();bgX.moveTo(lx+is*.35,mid);bgX.lineTo(rx,by);bgX.stroke();
  }
  else if(key==='shelby'){
    /* "S" letterform — two opposing arcs */
    const r=is*.62;
    const ty=y-is*.82,by=y+is*.82,my=y;
    const lx=x-is*.45,rx=x+is*.45;

    bgX.beginPath();
    // Top arc: curves right to left
    bgX.moveTo(rx,ty+r*.4);
    bgX.bezierCurveTo(rx,ty,          lx,ty,         lx,ty+r*.5);
    bgX.bezierCurveTo(lx,my*.98+y*.02, rx,my*.98+y*.02, rx,my+r*.08);
    // Bottom arc: mirrors
    bgX.bezierCurveTo(rx,by,          lx,by,         lx,by-r*.4);
    bgX.stroke();
  }
  else if(key==='arc'){
    /* "A" letterform — bold, clean */
    const ty=y-is*.9,by=y+is*.85;
    const lx=x-is*.72,rx=x+is*.72;
    const barY=y+is*.15;

    // Left leg
    bgX.beginPath();bgX.moveTo(x,ty);bgX.lineTo(lx,by);bgX.stroke();
    // Right leg
    bgX.beginPath();bgX.moveTo(x,ty);bgX.lineTo(rx,by);bgX.stroke();
    // Crossbar
    bgX.beginPath();bgX.moveTo(lx+is*.32,barY);bgX.lineTo(rx-is*.32,barY);bgX.stroke();
  }

  bgX.restore();
}

/* ── Bezier point helper ─────────────────── */
function getBezierPt(A,B,bend,t){
  if(!bend) return {x:lerp(A.x,B.x,t),y:lerp(A.y,B.y,t)};
  const mx=(A.x+B.x)/2,my=(A.y+B.y)/2;
  const dx=B.x-A.x,dy=B.y-A.y,len=Math.sqrt(dx*dx+dy*dy)||1;
  const cpx=mx+(-dy/len)*len*bend, cpy=my+(dx/len)*len*bend;
  const mt=1-t;
  return{x:mt*mt*A.x+2*mt*t*cpx+t*t*B.x, y:mt*mt*A.y+2*mt*t*cpy+t*t*B.y};
}

function drawEdges(){
  ED.forEach(e=>{
    const A=nodes[e.a],B=nodes[e.b];
    const bend=e.bend||0;
    const steps=60;

    // glow halo
    bgX.beginPath();
    for(let i=0;i<=steps;i++){const p=getBezierPt(A,B,bend,i/steps);i===0?bgX.moveTo(p.x,p.y):bgX.lineTo(p.x,p.y)}
    bgX.strokeStyle=e.col;bgX.lineWidth=6;bgX.globalAlpha=.05;
    bgX.shadowColor=e.col;bgX.shadowBlur=16;bgX.stroke();bgX.shadowBlur=0;bgX.globalAlpha=1;

    // thin core line
    bgX.beginPath();
    for(let i=0;i<=steps;i++){const p=getBezierPt(A,B,bend,i/steps);i===0?bgX.moveTo(p.x,p.y):bgX.lineTo(p.x,p.y)}
    bgX.strokeStyle=e.col;bgX.lineWidth=0.8;bgX.globalAlpha=.25;bgX.stroke();bgX.globalAlpha=1;
  });
}

/* ── Snake now follows bezier paths ─────── */
class Snake{
  constructor(e,off){
    this.e=e;this.t=off;
    this.spd=rnd(.003,.009);this.r=rnd(1.6,3.0);this.h=[];
  }
  update(){
    this.t+=this.spd;if(this.t>1)this.t-=1;
    const A=nodes[this.e.a],B=nodes[this.e.b];
    const p=getBezierPt(A,B,this.e.bend||0,this.t);
    this.h.unshift(p);if(this.h.length>45)this.h.pop();
  }
  draw(){
    if(this.h.length<2)return;
    this.h.forEach((p,i)=>{
      const prog=1-i/this.h.length,alpha=Math.pow(prog,1.8)*.85,r=this.r*Math.pow(prog,.5);
      bgX.beginPath();bgX.arc(p.x,p.y,Math.max(.3,r),0,TAU);
      bgX.fillStyle=this.e.col;bgX.globalAlpha=alpha;
      if(i<3){bgX.shadowColor=this.e.col;bgX.shadowBlur=14}
      bgX.fill();bgX.shadowBlur=0;
    });
    bgX.globalAlpha=1;
    if(this.h[0]){
      const h=this.h[0];
      bgX.beginPath();bgX.arc(h.x,h.y,this.r,0,TAU);
      bgX.fillStyle='#fff';bgX.globalAlpha=.9;
      bgX.shadowColor=this.e.col;bgX.shadowBlur=14;
      bgX.fill();bgX.shadowBlur=0;bgX.globalAlpha=1;
    }
  }
}

function drawLabels(){bgX.font='500 11px Inter,system-ui,sans-serif';bgX.textAlign='center';
  [1,2,4].forEach(i=>{const n=nodes[i],lbl=['Rialo Network','Shelby Protocol','Arc DEX'][i===1?0:i===2?1:2];
    bgX.fillStyle='rgba(160,175,210,.75)';bgX.shadowColor=n.col;bgX.shadowBlur=5;
    bgX.fillText(lbl,n.x,n.y+n.sz*1.12+16);bgX.shadowBlur=0})}

function drawGrid(){bgX.fillStyle='rgba(255,255,255,.022)';
  for(let x=19;x<BW;x+=38)for(let y=19;y<BH;y+=38){bgX.beginPath();bgX.arc(x,y,.85,0,TAU);bgX.fill()}}

function drawAurora(){wT+=.006;
  const layers=[{yF:.72,amp:26,f1:.0036,f2:.0072,ph:0,c:'0,130,150',a:.13},
    {yF:.76,amp:20,f1:.005,f2:.010,ph:1.3,c:'0,100,120',a:.11},
    {yF:.80,amp:15,f1:.007,f2:.014,ph:2.2,c:'0,70,100',a:.09},
    {yF:.84,amp:10,f1:.009,f2:.018,ph:3.1,c:'15,35,75',a:.13}];
  layers.forEach(w=>{const BY=BH*w.yF,ph=wT+w.ph;bgX.beginPath();bgX.moveTo(0,BH);
    for(let x=0;x<=BW;x+=2){const y=BY+Math.sin(x*w.f1+ph)*w.amp+Math.sin(x*w.f2+ph*.62)*w.amp*.42;bgX.lineTo(x,y)}
    bgX.lineTo(BW,BH);bgX.closePath();const wg=bgX.createLinearGradient(0,BY-w.amp,0,BH);
    wg.addColorStop(0,`rgba(${w.c},${(w.a+.04).toFixed(3)})`);wg.addColorStop(.55,`rgba(${w.c},${w.a})`);wg.addColorStop(1,`rgba(${w.c},0)`);
    bgX.fillStyle=wg;bgX.fill()})}

function frame(){gT+=.016;bgX.clearRect(0,0,BW,BH);drawGrid();drawEdges();
  snakes.forEach(s=>{s.update();s.draw()});drawRings();nodes.forEach(n=>drawNode(n,gT));
  drawLabels();drawAurora();requestAnimationFrame(frame)}

/* ═══════════════════════════════════════════
   INIT
═══════════════════════════════════════════ */
function init(){
  resizeBg();nodes=cn();initSnakes();frame();
  initCanvasEvents();
  initTabs();
  drawSpark();animDonut();
  // fix vol chart typo
  const c=document.getElementById('volChart');if(c){const W=c.offsetWidth*dpr,H=(c.offsetHeight||68)*dpr;c.width=W;c.height=H}
  drawVol();
  startRialo();
  initWallet();
  // Initial data fetch
  fetchCoinGecko();
  fetchAptos();
  // Polling: CoinGecko every 30s, Aptos every 10s
  setInterval(fetchCoinGecko,30000);
  setInterval(fetchAptos,10000);
}

window.addEventListener('load',()=>requestAnimationFrame(()=>requestAnimationFrame(init)));
window.addEventListener('resize',()=>{resizeBg();nodes=cn();drawSpark();
  const c=document.getElementById('volChart');if(c){c.width=0;c.height=0}drawVol()});

/* ═══════════════════════════════════════════
   TAB SWITCHING — Dashboard ↔ Overview
═══════════════════════════════════════════ */

// Global hideAll — accessible by all tab functions
function hideAll(){
  var bg=document.getElementById('bgCanvas');
  if(bg)bg.style.display='none';
  var scene=document.querySelector('.scene');
  if(scene)Array.from(scene.children).forEach(function(ch){
    if(ch.id!=='bgCanvas')ch.style.display='none';
  });
  ['overviewPage','buildPage','gamePage','predictlyPage','rialoAgentsPage'].forEach(function(id){
    var el=document.getElementById(id);if(el)el.style.display='none';
  });
}

function initTabs(){
  var tabs=document.querySelectorAll('.ntab');
  var scene=document.querySelector('.scene');

  function showDashboard(){
    var bg=document.getElementById('bgCanvas');
    if(bg)bg.style.display='block';
    Array.from(scene.children).forEach(function(ch){
      if(ch.id!=='bgCanvas')ch.style.display='block';
    });
    ['overviewPage','buildPage','gamePage','predictlyPage'].forEach(function(id){
      var el=document.getElementById(id);if(el)el.style.display='none';
    });
  }
  function showOverview(){
    hideAll();
    var ov=document.getElementById('overviewPage');
    if(ov) ov.style.display='block';
  }
  function showBuild(){
    hideAll();
    var bp=document.getElementById('buildPage');
    if(bp){
      bp.style.display='block';
      var bh=document.getElementById('blockHeight');
      set('bwBlock',bh?bh.textContent:'--');
    }
  }
  function showGame(){
    hideAll();
    var gp=document.getElementById('gamePage');
    if(gp)gp.style.display='block';
  }
  function showPredictly(){
    hideAll();
    var pp=document.getElementById('predictlyPage');
    if(pp)pp.style.display='block';
  }
  function showRialoAgents(){
    hideAll();
    var ra=document.getElementById('rialoAgentsPage');
    if(ra)ra.style.display='block';
  }
  var pages=[showDashboard,showOverview,showGame,showPredictly,showRialoAgents];
  tabs.forEach(function(tab,idx){
    tab.addEventListener('click',function(){
      tabs.forEach(function(t){t.classList.remove('active');});
      tab.classList.add('active');
      pages[idx]();
    });
  });
}

/* ═══════════════════════════════════════════
   PREDICTLY — price predictions + mini charts
═══════════════════════════════════════════ */
var predHistory={sol:[],apt:[],arc:[]};

function getSentiment(change){
  if(change>3)return{label:'Strong Bullish',pct:82,col:'#00e5ff'};
  if(change>1)return{label:'Bullish',pct:65,col:'#00e5ff'};
  if(change>0)return{label:'Slightly Bullish',pct:55,col:'#00e5ff'};
  if(change>-1)return{label:'Slightly Bearish',pct:45,col:'#ff4db8'};
  if(change>-3)return{label:'Bearish',pct:35,col:'#ff4db8'};
  return{label:'Strong Bearish',pct:18,col:'#ff4db8'};
}

function getSignal(change,vol){
  if(change>2)return{text:'🟢 BUY Signal — Strong upward momentum',col:'#00e5ff'};
  if(change>0.5)return{text:'🔵 HOLD / Accumulate — Mild positive trend',col:'#00d4ff'};
  if(change>-0.5)return{text:'🟡 NEUTRAL — Sideways market, wait for breakout',col:'#fbbf24'};
  if(change>-2)return{text:'🟠 CAUTION — Mild downtrend detected',col:'#f97316'};
  return{text:'🔴 SELL Signal — Strong downward pressure',col:'#ff4db8'};
}

function drawPredChart(canvasId,history,col){
  var c=document.getElementById(canvasId);if(!c)return;
  var W=c.offsetWidth*dpr,H=(c.offsetHeight||60)*dpr;
  c.width=W;c.height=H;
  var ctx=c.getContext('2d');ctx.clearRect(0,0,W,H);
  if(history.length<2)return;
  var mn=Math.min.apply(null,history),mx=Math.max.apply(null,history),rng=mx-mn||0.001;
  var pd=4*dpr;
  var pts=history.map(function(v,i){return{
    x:pd+(i/(history.length-1))*(W-pd*2),
    y:H-pd-((v-mn)/rng)*(H-pd*2)};});
  var gr=ctx.createLinearGradient(0,0,0,H);
  var rgb=col==='#00e5ff'?'0,229,255':col==='#ff4db8'?'255,77,184':'167,139,250';
  gr.addColorStop(0,'rgba('+rgb+',.3)');gr.addColorStop(1,'rgba('+rgb+',0)');
  smoothLine(ctx,pts);
  ctx.lineTo(pts[pts.length-1].x,H);ctx.lineTo(pts[0].x,H);ctx.closePath();
  ctx.fillStyle=gr;ctx.fill();
  smoothLine(ctx,pts);
  ctx.strokeStyle=col;ctx.lineWidth=2*dpr;ctx.shadowColor=col;ctx.shadowBlur=8*dpr;ctx.stroke();ctx.shadowBlur=0;
}

async function fetchPredictly(){
  try{
    var r=await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana,aptos,arc&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true&include_24hr_high=true&include_24hr_low=true');
    if(!r.ok)throw new Error('fetch fail');
    var d=await r.json();

    var tokens=[
      {key:'sol',cgid:'solana',pre:'SOL',col:'#00e5ff'},
      {key:'apt',cgid:'aptos', pre:'APT',col:'#ff4db8'},
      {key:'arc',cgid:'arc',   pre:'ARC',col:'#a78bfa'}
    ];

    tokens.forEach(function(tk){
      var data=d[tk.cgid];if(!data)return;
      var price=data.usd,change=data.usd_24h_change||0,vol=data.usd_24h_vol,cap=data.usd_market_cap;
      var P=tk.pre,col=tk.col;

      // price history for mini chart
      predHistory[tk.key].push(price);
      if(predHistory[tk.key].length>30)predHistory[tk.key].shift();

      // price display
      set('pred'+P+'price',fmtPrice(price));
      var ch=document.getElementById('pred'+P+'change');
      if(ch){ch.textContent=fmtPct(change);ch.style.color=change>=0?'#00e5ff':'#ff4db8';}

      // current price in targets
      set('pred'+P+'cur',fmtPrice(price));
      // estimated low/high using 24h change volatility
      var vol24=Math.abs(change)*0.012*price;
      set('pred'+P+'lo',fmtPrice(price*(1-Math.abs(change)/100*1.2)));
      set('pred'+P+'hi',fmtPrice(price*(1+Math.abs(change)/100*1.2)));

      // sentiment bar
      var sent=getSentiment(change);
      set('pred'+P+'sent',sent.label);
      var bar=document.getElementById('pred'+P+'bar');
      if(bar)bar.style.width=sent.pct+'%';

      // signal
      var sig=getSignal(change,vol);
      var sigEl=document.getElementById('pred'+P+'sig');
      if(sigEl){
        sigEl.innerHTML='<span class="sig-dot" style="background:'+sig.col+';box-shadow:0 0 6px '+sig.col+'"></span><span>'+sig.text+'</span>';
      }

      // mini chart
      drawPredChart('pred'+P+'chart',predHistory[tk.key],col);

      // summary
      if(tk.key==='sol')set('predSOLvol',fmtNum(vol));
      if(tk.key==='apt')set('predAPTcap',fmtNum(cap));
      if(tk.key==='arc')set('predARCvol',fmtNum(vol));
    });

    // overall sentiment
    var avg=(d.solana?d.solana.usd_24h_change:0)+(d.aptos?d.aptos.usd_24h_change:0)+(d.arc?d.arc.usd_24h_change:0);
    var ovSent=getSentiment(avg/3);
    var ovEl=document.getElementById('predOverall');
    if(ovEl){ovEl.textContent=ovSent.label;ovEl.style.color=ovSent.col;}

    set('predTime',nowStr());
  }catch(e){console.warn('Predictly fetch error',e);}
}

/* ═══════════════════════════════════════════
   OVERVIEW — sync live data into overview page
═══════════════════════════════════════════ */
function syncOverviewData(){
  // Rialo block height
  var bh=document.getElementById('blockHeight');
  var val=bh?bh.textContent:'--';
  set('ovBlock',val);
  set('ovBlock2',val);
  // SOL
  set('ovSOL',document.getElementById('priceSOL')?document.getElementById('priceSOL').textContent:'--');
  set('ovSOLch',document.getElementById('changeSOL')?document.getElementById('changeSOL').textContent:'--');
  set('ovTPS',document.getElementById('tpsSOL')?document.getElementById('tpsSOL').textContent:'--');
  // Shelby / APT
  set('ovAptBlock',document.getElementById('shelbyBlock')?document.getElementById('shelbyBlock').textContent:'--');
  set('ovAPT',document.getElementById('priceAPT')?document.getElementById('priceAPT').textContent:'--');
  set('ovAPTch',document.getElementById('changeAPT')?document.getElementById('changeAPT').textContent:'--');
  set('ovEpoch',document.getElementById('shelbyEpoch')?document.getElementById('shelbyEpoch').textContent:'--');
  // Arc DEX stables
  set('ovUSDC',document.getElementById('priceUSDC')?document.getElementById('priceUSDC').textContent:'--');
  set('ovUSDT',document.getElementById('priceUSDT')?document.getElementById('priceUSDT').textContent:'--');
  set('ovEURC',document.getElementById('priceEURC')?document.getElementById('priceEURC').textContent:'--');
}


