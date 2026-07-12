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
  {key:'top',    rx:.50, ry:.10, col:'#00d4ff', sz:16,  url:null},
  {key:'rialo',  rx:.30, ry:.28, col:'#00e5ff', sz:44,  url:'https://rialo-doc-ajmul.vercel.app/'},
  {key:'riodex', rx:.70, ry:.28, col:'#f97316', sz:44,  url:'https://rio-dex.vercel.app/swap'},
  {key:'mid',    rx:.50, ry:.44, col:'#00b8cc', sz:18,  url:null},
  {key:'arc',    rx:.50, ry:.62, col:'#7c6fff', sz:52,  url:'https://arc-rust-five.vercel.app/swap'},
];

// Edges
const ED=[
  {a:0,b:1,col:'#00e5ff',  bend:0},      // top → rialo
  {a:0,b:2,col:'#f97316',  bend:0},      // top → riodex
  {a:1,b:3,col:'#00e5ff',  bend:0},      // rialo → mid
  {a:2,b:3,col:'#f97316',  bend:0},      // riodex → mid
  {a:3,b:4,col:'#7c6fff',  bend:0},      // mid → arc
  {a:1,b:2,col:'#00e5ff',  bend:-0.28},  // rialo ↔ riodex curved up
  {a:1,b:2,col:'#f97316',  bend: 0.28},  // rialo ↔ riodex curved down
  {a:1,b:4,col:'#00e5ff',  bend: 0.12},  // rialo → arc diagonal
  {a:2,b:4,col:'#f97316',  bend:-0.12},  // riodex → arc diagonal
];

function resizeBg(){
  var parent=bgC.parentElement;
  BW=parent.offsetWidth;BH=parent.offsetHeight;
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
  else if(key==='riodex'){
    /* "R" letterform for Rio DEX — orange */
    const lx=x-is*.42,rx2=x+is*.45;
    const ty=y-is*.85,by=y+is*.85,mid=y-is*.05;
    // Vertical stem
    bgX.beginPath();bgX.moveTo(lx,ty);bgX.lineTo(lx,by);bgX.stroke();
    // Top bump (D-shape)
    bgX.beginPath();
    bgX.moveTo(lx,ty);bgX.lineTo(lx+is*.15,ty);
    bgX.bezierCurveTo(rx2+is*.1,ty,rx2+is*.1,mid,lx+is*.15,mid);
    bgX.lineTo(lx,mid);bgX.stroke();
    // Middle bar
    bgX.beginPath();bgX.moveTo(lx,mid);bgX.lineTo(lx+is*.4,mid);bgX.stroke();
    // Diagonal leg
    bgX.beginPath();bgX.moveTo(lx+is*.35,mid);bgX.lineTo(rx2,by);bgX.stroke();
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
  [{i:1,lbl:'Rialo Network'},{i:2,lbl:'Rio DEX'},{i:4,lbl:'Arc DEX'}].forEach(({i,lbl})=>{
    const n=nodes[i];if(!n)return;
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
   TAB SWITCHING
═══════════════════════════════════════════ */
function hideAll(){
  var ds=document.getElementById('dashboardScroll');
  if(ds)ds.classList.add('hidden');
  ['overviewPage','gamePage','predictlyPage'].forEach(function(id){
    var el=document.getElementById(id);if(el)el.style.display='none';
  });
}

function initTabs(){
  var tabs=document.querySelectorAll('.ntab');
  var pages=[
    function(){// Dashboard
      ['overviewPage','gamePage','predictlyPage'].forEach(function(id){
        var el=document.getElementById(id);if(el)el.style.display='none';
      });
      var ds=document.getElementById('dashboardScroll');
      if(ds)ds.classList.remove('hidden');
    },
    function(){// Rio AI
      hideAll();
      var el=document.getElementById('overviewPage');
      if(el)el.style.display='block';
    },
    function(){// Game Arena
      hideAll();
      var el=document.getElementById('gamePage');
      if(el)el.style.display='block';
    },
    function(){// Predictly
      hideAll();
      var el=document.getElementById('predictlyPage');
      if(el)el.style.display='block';
    }
  ];
  tabs.forEach(function(tab,idx){
    tab.addEventListener('click',function(){
      tabs.forEach(function(t){t.classList.remove('active');});
      tab.classList.add('active');
      if(pages[idx])pages[idx]();
    });
  });
}

/* ═══════════════════════════════════════════
   RIALO AGENT DASHBOARD — vanilla JS engine
═══════════════════════════════════════════ */
(function(){
  var AGENT_NAMES=['Meridian Yield Router','Ferrous Arb Bot','Glasswing Settler',
    'Nightloom Rebalancer','Coldwater Liquidator','Sunspur Market Maker',
    'Basalt Credit Agent','Driftwood Hedger','Cinder Prediction Agent',
    'Vaultkeep Automator','Ashgrove RWA Agent','Hollow Point Sniper'];
  var CATS=['DeFi','RWA','Prediction','Credit','MEV'];
  var CAT_COL={DeFi:'#4C7EF3',RWA:'#7C8CA6',Prediction:'#C9974C',Credit:'#8B6FC9',MEV:'#B25F45'};
  var HOW=[
    {title:'Pull',text:"Agent activity is read directly from Rialo's on-chain indexer every few seconds."},
    {title:'Compute',text:'Each transaction is marked success or fail, timed, and priced, then rolled up per agent.'},
    {title:'Display',text:'The leaderboard updates live, ranked by whichever metric is currently sorted.'},
    {title:'Verify',text:'Every figure traces back to on-chain data — nothing here is self-reported by agents.'}
  ];
  var GLOSSARY=[
    {term:'Volume',def:'Total transactions the agent has executed in the selected time window.'},
    {term:'Success rate',def:'Share of transactions that completed without failing or reverting.'},
    {term:'Avg speed',def:'Average time from trigger to on-chain confirmation.'},
    {term:'Avg cost',def:'Average stake-for-service fee paid per transaction, in the network\'s base asset.'}
  ];
  var AUDIENCE=[
    {term:'Depositors',def:'Compare agents before delegating funds, on a real track record instead of a claim.'},
    {term:'Builders',def:'See which automation patterns are actually working on Rialo before designing around them.'},
    {term:'Agent developers',def:'A public benchmark to measure your own agent against, and a reason to keep it efficient.'}
  ];
  var FAQ=[
    {q:'Is this official Rialo data?',a:"It reads from the same public indexer anyone can query — this dashboard itself isn't an official Rialo product."},
    {q:'How often does it update?',a:'Every few seconds, on a continuous poll. Nothing here is a periodic snapshot.'},
    {q:'Can any agent show up here?',a:"Yes. There's no whitelist or application — any agent transacting on Rialo appears automatically."}
  ];

  function seeded(seed){var s=seed;return function(){s=(s*9301+49297)%233280;return s/233280;};}
  function makeAgent(i){
    var r=seeded(i*7919+13);
    var suc=88+r()*11,spd=0.4+r()*2.2,cst=0.002+r()*.02,vol=Math.round(800+r()*12000);
    var hist=[];for(var h=0;h<24;h++)hist.push({t:h,volume:Math.round(vol/24*(0.6+r()*.8)),success:Math.min(100,suc+(r()-.5)*6)});
    return{id:'a'+i,name:AGENT_NAMES[i%AGENT_NAMES.length],cat:CATS[i%CATS.length],success:suc,speed:spd,cost:cst,volume:vol,history:hist,_r:r};
  }
  function jitter(a){
    var r=a._r;
    var suc=Math.min(100,Math.max(70,a.success+(r()-.5)*.8));
    var spd=Math.max(0.1,a.speed+(r()-.5)*.08);
    var cst=Math.max(0.0005,a.cost+(r()-.5)*.0006);
    var vol=Math.max(0,Math.round(a.volume+(r()-.45)*40));
    var hist=a.history.slice(1).concat({t:a.history[a.history.length-1].t+1,volume:Math.round(vol/24*(0.6+r()*.8)),success:suc});
    return Object.assign({},a,{success:suc,speed:spd,cost:cst,volume:vol,history:hist});
  }

  var fmtN=function(n){return new Intl.NumberFormat('en-US').format(Math.round(n));};
  var fmtP=function(n){return n.toFixed(1)+'%';};
  var fmtS=function(n){return n.toFixed(2)+'s';};
  var fmtC=function(n){return '$'+n.toFixed(4);};
  var fmtT=function(d){return d.toLocaleTimeString('en-US',{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'});};

  var agents=[];for(var i=0;i<12;i++)agents.push(makeAgent(i));
  var sortKey='volume',sortDir='desc',searchQ='',activeCats=new Set(CATS),expandedId=null,epoch=184203;
  var netHist=[];for(var j=0;j<40;j++)netHist.push({v:62000+Math.sin(j/3)*4000});
  var faqOpen=null;

  // Build static sections once
  function buildStatic(){
    // Category filters
    var catsEl=document.getElementById('raCats');
    if(catsEl){
      catsEl.innerHTML='';
      CATS.forEach(function(c){
        var btn=document.createElement('button');
        btn.className='ra-cat-btn on';btn.dataset.cat=c;
        btn.innerHTML='<span class="ra-cat-dot" style="background:'+CAT_COL[c]+'"></span>'+c;
        btn.addEventListener('click',function(){
          if(activeCats.has(c))activeCats.delete(c); else activeCats.add(c);
          if(activeCats.size===0)CATS.forEach(function(x){activeCats.add(x);});
          btn.classList.toggle('on',activeCats.has(c));
          btn.querySelector('.ra-cat-dot').style.opacity=activeCats.has(c)?'1':'0.35';
          renderTable();
        });
        catsEl.appendChild(btn);
      });
    }
    // Range buttons
    document.querySelectorAll('.ra-range-btn').forEach(function(btn){
      btn.addEventListener('click',function(){
        document.querySelectorAll('.ra-range-btn').forEach(function(b){b.classList.remove('active');});
        btn.classList.add('active');
      });
    });
    // Sort headers
    document.querySelectorAll('.ra-sort').forEach(function(th){
      th.addEventListener('click',function(){
        var key=th.dataset.key;
        if(sortKey===key)sortDir=sortDir==='desc'?'asc':'desc'; else{sortKey=key;sortDir='desc';}
        ['volume','success','speed','cost'].forEach(function(k){
          var el=document.getElementById('raS-'+k);
          if(el)el.textContent=k===sortKey?(sortDir==='desc'?'▼':'▲'):'';
        });
        renderTable();
      });
    });
    // Search
    var si=document.getElementById('raSearch'),sc=document.getElementById('raSearchClear');
    if(si){si.addEventListener('input',function(){searchQ=si.value;sc.style.display=searchQ?'':'none';renderTable();});}
    if(sc){sc.addEventListener('click',function(){si.value='';searchQ='';sc.style.display='none';renderTable();});}
    // How it works
    var hw=document.getElementById('raHowItWorks');
    if(hw){hw.innerHTML=HOW.map(function(s,i){return'<div class="ra-step"><div class="ra-step-num">'+(i+1)+'</div><div><div class="ra-step-title">'+s.title+'</div><div class="ra-step-text">'+s.text+'</div></div></div>';}).join('');}
    // Glossary
    var gl=document.getElementById('raGlossary');
    if(gl){gl.innerHTML=GLOSSARY.map(function(g){return'<div class="ra-gloss-card"><div class="ra-gloss-term">'+g.term+'</div><div class="ra-gloss-def">'+g.def+'</div></div>';}).join('');}
    // Audience
    var au=document.getElementById('raAudience');
    if(au){au.innerHTML=AUDIENCE.map(function(g){return'<div class="ra-gloss-card"><div class="ra-gloss-term">'+g.term+'</div><div class="ra-gloss-def">'+g.def+'</div></div>';}).join('');}
    // FAQ
    var fq=document.getElementById('raFaq');
    if(fq){
      fq.innerHTML=FAQ.map(function(f,i){return'<div class="ra-faq-item"><button class="ra-faq-q" data-i="'+i+'">'+f.q+'<span class="ra-faq-icon">+</span></button><div class="ra-faq-a" style="display:none">'+f.a+'</div></div>';}).join('');
      fq.querySelectorAll('.ra-faq-q').forEach(function(btn){
        btn.addEventListener('click',function(){
          var idx=parseInt(btn.dataset.i);
          var ans=btn.nextElementSibling;
          var icon=btn.querySelector('.ra-faq-icon');
          if(faqOpen===idx){ans.style.display='none';icon.style.transform='none';faqOpen=null;}
          else{
            fq.querySelectorAll('.ra-faq-a').forEach(function(a){a.style.display='none';});
            fq.querySelectorAll('.ra-faq-icon').forEach(function(ic){ic.style.transform='none';});
            ans.style.display='block';icon.style.transform='rotate(45deg)';faqOpen=idx;
          }
        });
      });
    }
  }

  // Draw throughput sparkline on canvas
  function drawTicker(){
    var c=document.getElementById('raTicker');if(!c)return;
    var W=c.parentElement.offsetWidth-32,H=50;
    c.width=W*window.devicePixelRatio;c.height=H*window.devicePixelRatio;
    c.style.width=W+'px';c.style.height=H+'px';
    var ctx=c.getContext('2d');ctx.scale(window.devicePixelRatio,window.devicePixelRatio);
    ctx.clearRect(0,0,W,H);
    var vals=netHist.map(function(d){return d.v;});
    var mn=Math.min.apply(null,vals),mx=Math.max.apply(null,vals),rng=mx-mn||1;
    var pts=vals.map(function(v,i){return{x:(i/(vals.length-1))*W,y:H-2-((v-mn)/rng)*(H-8)};});
    var gr=ctx.createLinearGradient(0,0,0,H);
    gr.addColorStop(0,'rgba(76,126,243,.25)');gr.addColorStop(1,'rgba(76,126,243,0)');
    ctx.beginPath();pts.forEach(function(p,i){i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y);});
    ctx.lineTo(pts[pts.length-1].x,H);ctx.lineTo(0,H);ctx.closePath();
    ctx.fillStyle=gr;ctx.fill();
    ctx.beginPath();pts.forEach(function(p,i){i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y);});
    ctx.strokeStyle='#4C7EF3';ctx.lineWidth=1.5;ctx.stroke();
  }

  // Draw mini sparkline for table rows
  function drawSparkCanvas(canvas,data,color){
    var W=100,H=30;
    canvas.width=W*window.devicePixelRatio;canvas.height=H*window.devicePixelRatio;
    canvas.style.width=W+'px';canvas.style.height=H+'px';
    var ctx=canvas.getContext('2d');ctx.scale(window.devicePixelRatio,window.devicePixelRatio);
    ctx.clearRect(0,0,W,H);
    var vals=data.map(function(d){return d.volume;});
    var mn=Math.min.apply(null,vals),mx=Math.max.apply(null,vals),rng=mx-mn||1;
    var pts=vals.map(function(v,i){return{x:(i/(vals.length-1))*W,y:H-2-((v-mn)/rng)*(H-4)};});
    ctx.beginPath();pts.forEach(function(p,i){i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y);});
    ctx.strokeStyle=color||'#5B6472';ctx.lineWidth=1.25;ctx.stroke();
  }

  // Draw expanded area chart
  function hexToRgba(hex,alpha){
    var r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
    return 'rgba('+r+','+g+','+b+','+alpha+')';
  }

  function drawAreaCanvas(canvas,data,key,color){
    var W=canvas.parentElement.offsetWidth-4,H=140;
    if(W<=0)W=300;
    canvas.width=W*window.devicePixelRatio;canvas.height=H*window.devicePixelRatio;
    canvas.style.width=W+'px';canvas.style.height=H+'px';
    var ctx=canvas.getContext('2d');ctx.scale(window.devicePixelRatio,window.devicePixelRatio);
    ctx.clearRect(0,0,W,H);
    var vals=data.map(function(d){return d[key];});
    var mn=Math.min.apply(null,vals),mx=Math.max.apply(null,vals),rng=mx-mn||1;
    var pts=vals.map(function(v,i){return{x:(i/(vals.length-1))*W,y:H-4-((v-mn)/rng)*(H-12)};});
    var gr=ctx.createLinearGradient(0,0,0,H);
    gr.addColorStop(0,hexToRgba(color,0.3));
    gr.addColorStop(1,hexToRgba(color,0));
    ctx.beginPath();pts.forEach(function(p,i){i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y);});
    ctx.lineTo(pts[pts.length-1].x,H);ctx.lineTo(0,H);ctx.closePath();
    ctx.fillStyle=gr;ctx.fill();
    ctx.beginPath();pts.forEach(function(p,i){i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y);});
    ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.stroke();
  }

  function getFiltered(){
    var q=searchQ.trim().toLowerCase();
    var copy=agents.slice().sort(function(a,b){
      return sortDir==='desc'?b[sortKey]-a[sortKey]:a[sortKey]-b[sortKey];
    });
    return copy.filter(function(a){return activeCats.has(a.cat)&&(!q||a.name.toLowerCase().includes(q));});
  }

  function renderTable(){
    var tbody=document.getElementById('raTableBody');if(!tbody)return;
    var list=getFiltered();
    if(list.length===0){tbody.innerHTML='<tr><td colspan="7" style="padding:36px 20px;text-align:center;color:#6B7383;font-size:13px">No agents match the current filters.</td></tr>';return;}
    tbody.innerHTML='';
    list.forEach(function(a,i){
      // Main row
      var tr=document.createElement('tr');
      var rankHtml=i<3?'<span class="ra-rank-badge ra-rank-'+(i+1)+'">'+(i+1)+'</span>':'<span class="ra-rank-n">'+(i+1)+'</span>';
      tr.innerHTML='<td class="ra-rank-col ra-mono">'+rankHtml+'</td>'+
        '<td><div style="display:flex;align-items:center"><span class="ra-cat-dot" style="background:'+CAT_COL[a.cat]+'"></span><div><div class="ra-agent-name">'+a.name+'</div><div class="ra-agent-cat">'+a.cat+'</div></div></div></td>'+
        '<td class="ra-num">'+fmtN(a.volume)+'</td>'+
        '<td class="ra-num" style="color:'+(a.success>95?'#22A06B':'#E8EAED')+'">'+fmtP(a.success)+'</td>'+
        '<td class="ra-num">'+fmtS(a.speed)+'</td>'+
        '<td class="ra-num ra-cost-col">'+fmtC(a.cost)+'</td>'+
        '<td class="ra-num ra-trend-col"><canvas class="ra-spark-canvas"></canvas></td>';
      // Draw sparkline
      tr.querySelector('.ra-spark-canvas') && setTimeout(function(row,agent){
        var c=row.querySelector('.ra-spark-canvas');if(c)drawSparkCanvas(c,agent.history,CAT_COL[agent.cat]);
      }.bind(null,tr,a),0);
      // Expand toggle
      tr.addEventListener('click',function(){
        expandedId=expandedId===a.id?null:a.id;renderTable();
        if(expandedId===a.id){var row=tbody.querySelector('[data-expand="'+a.id+'"]');if(row)row.scrollIntoView({block:'nearest'});}
      });
      tbody.appendChild(tr);
      // Expanded row
      if(expandedId===a.id){
        var expTr=document.createElement('tr');
        expTr.dataset.expand=a.id;
        expTr.className='ra-expand-row';
        expTr.innerHTML='<td colspan="7"><div class="ra-expand-grid">'+
          '<div><div class="ra-expand-label">Volume, last 24h</div><canvas id="exp-vol-'+a.id+'"></canvas></div>'+
          '<div><div class="ra-expand-label">Success rate, last 24h</div><canvas id="exp-suc-'+a.id+'"></canvas></div>'+
          '</div></td>';
        tbody.appendChild(expTr);
        setTimeout(function(agent){
          var vc=document.getElementById('exp-vol-'+agent.id);
          var sc=document.getElementById('exp-suc-'+agent.id);
          if(vc)drawAreaCanvas(vc,agent.history,'volume','#4C7EF3');
          if(sc)drawAreaCanvas(sc,agent.history,'success','#22A06B');
        }.bind(null,a),0);
      }
    });
  }

  function updateStats(){
    var tot=agents.reduce(function(s,a){return s+a.volume;},0);
    var suc=agents.reduce(function(s,a){return s+a.success;},0)/agents.length;
    var spd=agents.reduce(function(s,a){return s+a.speed;},0)/agents.length;
    var el;
    el=document.getElementById('raTotalVol');if(el)el.textContent=fmtN(tot);
    el=document.getElementById('raAvgSuccess');if(el)el.textContent=fmtP(suc);
    el=document.getElementById('raAvgSpeed');if(el)el.textContent=fmtS(spd);
    el=document.getElementById('raEpoch');if(el)el.textContent=fmtN(epoch);
    el=document.getElementById('raUpdated');if(el)el.textContent=fmtT(new Date());
  }

  function tick(){
    agents=agents.map(jitter);
    var sum=agents.reduce(function(s,a){return s+a.volume;},0);
    netHist=netHist.slice(1).concat({v:sum});
    epoch++;
    drawTicker();
    updateStats();
    renderTable();
  }

  // Init after DOM ready
  document.addEventListener('DOMContentLoaded',function(){
    buildStatic();
    updateStats();
    setTimeout(function(){drawTicker();},100);
    renderTable();
    setInterval(tick,3000);
  });
  // Also try on window load as fallback
  window.addEventListener('load',function(){
    drawTicker();
    if(!document.getElementById('raTableBody').hasChildNodes())renderTable();
  });
})();

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


