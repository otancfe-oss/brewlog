"use strict";
/* db.js を先に読み込んでいる前提 */

const GRINDERS_BUILTIN={"fellow_opus":{name:"Fellow Opus",min:1,max:11,step:0.25,default:5},"timemore_xlite":{name:"Timemore X Lite",min:3,max:24,step:0.5,default:14},"comandante_c40":{name:"Comandante C40",min:0,max:45,step:1,default:25}};
function getGRINDERS(){const custom=db.getCustomGrinders();const obj={...GRINDERS_BUILTIN};custom.forEach(g=>{obj["custom_"+g.id]={name:g.name,min:g.min,max:g.max,step:g.step||1,default:Math.round((g.min+g.max)/2),custom:true,id:g.id};});obj["other"]={name:"その他",min:1,max:40,step:1,default:15};return obj;}
const DRIPPERS=["Hario V60","Origami","OREA","Kalita Wave","Chemex","AeroPress","French Press","Clever","その他"];
const TEMPS=[80,82,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,100];
const DOSES=[10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30];
const WATERS=[150,180,200,220,225,230,240,250,260,270,280,300,350,400,450,500];
const ICE_WEIGHTS=[50,60,70,80,90,100,110,120,130,140,150,160,180,200,220,250];
const PROCS=["Washed","Natural","Honey","Anaerobic","Carbonic Maceration","Wet Hulled","Other"];
const TASTE=[{k:"acidity",l:"酸味",e:"🍋"},{k:"sweetness",l:"甘味",e:"🍯"},{k:"bitterness",l:"苦味",e:"🫘"},{k:"body",l:"濃度感",e:"☕"}];
const RADAR=[{k:"overall",l:"おいしさ"},...TASTE.map(t=>({k:t.k,l:t.l}))];
const FLAGS={"エチオピア":"🇪🇹","ケニア":"🇰🇪","コロンビア":"🇨🇴","ブラジル":"🇧🇷","グアテマラ":"🇬🇹","コスタリカ":"🇨🇷","パナマ":"🇵🇦","インドネシア":"🇮🇩","ルワンダ":"🇷🇼","タンザニア":"🇹🇿","ホンジュラス":"🇭🇳","ペルー":"🇵🇪","メキシコ":"🇲🇽","イエメン":"🇾🇪","ニカラグア":"🇳🇮","ボリビア":"🇧🇴","エルサルバドル":"🇸🇻","中国":"🇨🇳","インド":"🇮🇳","ベトナム":"🇻🇳"};
const POUR_WATERS=[10,15,20,25,30,35,40,45,50,60,70,80,90,100,110,120,130,140,150,160,170,180,200,220,250];
const POUR_TIMES=[5,10,15,20,25,30,35,40,45,50,55,60,70,80,90,100,110,120];
const ROAST_LEVELS=["浅煎り","中煎り","中深煎り","深煎り"];

/* フレーバーカテゴリ */
const FLAVORS=[
  {cat:"フルーティ",tags:["ベリー","柑橘","りんご","ドライフルーツ","トロピカル"]},
  {cat:"甘味",tags:["チョコレート","キャラメル","蜂蜜","ブラウンシュガー"]},
  {cat:"ナッツ・穀物",tags:["ナッツ","アーモンド","シリアル"]},
  {cat:"花・ハーブ",tags:["フローラル","ジャスミン","紅茶"]},
  {cat:"スパイス",tags:["シナモン","スパイシー"]},
  {cat:"その他",tags:["ワイン","スモーキー","アーシー"]}
];

function beanName(b){const p=[];if(b.country)p.push(b.country);if(b.name?.trim()){p.push(b.name);return p.join(" / ");}if(b.farm)p.push(b.farm);if(b.process)p.push(`(${b.process})`);return p.length?p.join(" / "):"（名称未設定）";}
function beanFlag(b){return FLAGS[b.country]||(b.country?"🌍":"");}
function fmtDate(iso){const d=new Date(iso);return`${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;}
function h(tag,props,...ch){const el=document.createElement(tag);if(props)Object.entries(props).forEach(([k,v])=>{if(k==="style"&&typeof v==="object")Object.assign(el.style,v);else if(k.startsWith("on"))el.addEventListener(k.slice(2).toLowerCase(),v);else if(k==="className")el.className=v;else if(k==="innerHTML")el.innerHTML=v;else el.setAttribute(k,v);});ch.flat(9).forEach(c=>{if(c==null||c===false)return;el.appendChild(typeof c==="string"||typeof c==="number"?document.createTextNode(c):c);});return el;}
function sel(opts,val,onChange,cls="sel"){const w=h("div",{className:"sel-wrap"},h("select",{className:cls,value:val,onChange:e=>onChange(e.target.value)},...opts.map(o=>Object.assign(h("option",{value:o},o==""?"—":o),{selected:String(o)===String(val)}))),h("span",{className:"sel-arr"},"▼"));return w;}

/* ── State ── */
const FONT_SIZES={S:{label:"小",base:13},M:{label:"中",base:15},L:{label:"大",base:17}};
let state={
  /* 永続データ（db経由で読み書き） */
  records: db.getRecords(),
  beans: db.getBeans(),
  equip: db.getEquip(),
  fontSize: db.getFontSize(),
  /* UI状態 */
  view:"list", brew:null,
  showTaste:false, showPours:false, showFlavors:false,
  addingBean:false, addingGrinder:false,
  showBeanList:false, showBeanDetail:false, showBeanName:false,
  viewingBean:null, editingBean:null, editingRecord:null,
  aiOpen:false, aiCopied:null, aiPaste:"", aiResult:null,
  expandedCard:null, trendBeanId:null, trendTooltip:null, trendOpen:false
};
function initBrew(){const e=state.equip;const G=getGRINDERS();let gid=e.grinderId;if(!G[gid])gid="fellow_opus";const g=G[gid];return{beanId:"",brewType:"hot",iceWeight:0,grinderId:gid,dripper:e.dripper,grind:g.default,temp:93,dose:15,water:250,brewTimeMin:3,brewTimeSec:0,pours:[],overall:3,acidity:0,sweetness:0,bitterness:0,body:0,flavors:[],flavorNote:"",note:""};}
state.brew=initBrew();
function save(){
  db.saveRecords(state.records);
  db.saveBeans(state.beans);
  db.saveEquip(state.equip);
}

/* ── Radar SVG ── */
function radarSVG(data,size=180){const cx=size/2,cy=size/2,r=size/2-28,lv=5,n=RADAR.length,st=2*Math.PI/n,sa=-Math.PI/2;const pt=(i,v)=>{const a=sa+i*st,d=v/lv*r;return[cx+d*Math.cos(a),cy+d*Math.sin(a)];};let svg=`<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;for(let l=1;l<=lv;l++){const ps=Array.from({length:n},(_,i)=>pt(i,l));svg+=`<path d="${ps.map((p,i)=>`${i?'L':'M'}${p[0]} ${p[1]}`).join(' ')} Z" fill="none" stroke="rgba(200,149,108,0.12)" stroke-width="${l===lv?1:0.5}"/>`;}for(let i=0;i<n;i++){const p=pt(i,lv);svg+=`<line x1="${cx}" y1="${cy}" x2="${p[0]}" y2="${p[1]}" stroke="rgba(200,149,108,0.1)" stroke-width="0.5"/>`;}const dp=RADAR.map((a,i)=>pt(i,data[a.k]||0));svg+=`<path d="${dp.map((p,i)=>`${i?'L':'M'}${p[0]} ${p[1]}`).join(' ')} Z" fill="rgba(200,149,108,0.2)" stroke="#c8956c" stroke-width="1.5"/>`;dp.forEach(p=>{svg+=`<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="#c8956c"/>`;});RADAR.forEach((a,i)=>{const an=sa+i*st,d=r+18;svg+=`<text x="${cx+d*Math.cos(an)}" y="${cy+d*Math.sin(an)}" text-anchor="middle" dominant-baseline="middle" style="font-size:10px;fill:#8a7b6e">${a.l}</text>`;});svg+=`</svg>`;return svg;}

/* ── Voice ── */
function startVoice(cb){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){alert("音声入力非対応");return null;}const r=new SR();r.lang="ja-JP";r.continuous=false;r.interimResults=false;r.onresult=e=>{cb(e.results[0][0].transcript);};return r;}

/* ── AI Parse ── */
function parseAI(text){const res={name:"",country:"",farm:"",altitude:"",process:"",shop:"",roast:"",roastDate:""};const PM=PROCS;const RL=ROAST_LEVELS;text.split("\n").map(l=>l.replace(/^[・\-*•]\s*/,"").trim()).filter(Boolean).forEach(line=>{const lo=line.toLowerCase(),val=line.replace(/^[^:：]+[:：]\s*/,"").trim();if(!val||"—-不明なしN/A".includes(val))return;if(lo.match(/豆の名前|豆名|名前|name/))res.name=val;else if(lo.match(/生産国|国|country|origin/))res.country=val;else if(lo.match(/農園|ファーム|farm|estate|農協|ステーション/))res.farm=val;else if(lo.match(/標高|altitude|elevation|masl/)){
  /* ハイフン範囲（2100-2250m）は最初の数値だけ取る */
  const rng=val.match(/(\d{3,5})\s*[-~〜]\s*\d{3,5}/);
  if(rng){res.altitude=rng[1];}else{const n=val.match(/\d{3,5}/);if(n)res.altitude=n[0];}
}else if(lo.match(/精製|プロセス|process|processing/)){const m=PM.find(p=>val.toLowerCase().includes(p.toLowerCase()));res.process=m||val;}else if(lo.match(/購入店|販売元|店|ロースター|roaster|shop/))res.shop=val;else if(lo.match(/焙煎度|roast level|roast degree/)){const m=RL.find(r=>val.includes(r));res.roast=m||val;}else if(lo.match(/焙煎日|roast date/)){
  /* 日本語形式: 2025年11月24日 */
  const jp=val.match(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/);
  if(jp){res.roastDate=`${jp[1]}-${jp[2].padStart(2,"0")}-${jp[3].padStart(2,"0")}`;return;}
  /* スラッシュ・ハイフン形式: 2025/11/24 or 2025-11-24 */
  const dm=val.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if(dm)res.roastDate=`${dm[1]}-${dm[2].padStart(2,"0")}-${dm[3].padStart(2,"0")}`;
}});return res;}

/* ── Flavor UI helper ── */
function renderFlavorSection(flavors, flavorNote, onToggle, onNoteChange) {
  const selected = [...flavors]; // ローカルで管理
  const wrap = h("div", {className:"flavor-section"});

  /* 選択済みサマリーエリア */
  const summary = h("div", {style:{
    minHeight:"32px", display:"flex", flexWrap:"wrap", gap:"5px",
    padding:"8px 10px", background:"rgba(200,149,108,0.06)",
    border:"1px solid rgba(200,149,108,0.12)", borderRadius:"10px",
    marginBottom:"8px", alignItems:"center"
  }});
  const emptyHint = h("span", {style:{fontSize:"0.75em",color:"#6b5a4e"}}, "タグを選ぶと表示されます");
  const updateSummary = () => {
    summary.innerHTML = "";
    if(selected.length === 0){
      summary.appendChild(emptyHint);
    } else {
      selected.forEach(tag => {
        summary.appendChild(h("span", {className:"flavor-badge"}, tag));
      });
    }
  };
  updateSummary();
  wrap.appendChild(summary);

  /* カテゴリ別タグ */
  FLAVORS.forEach(cat => {
    wrap.appendChild(h("div", {className:"flavor-cat-label"}, cat.cat));
    const row = h("div", {className:"flavor-chips-row"});
    cat.tags.forEach(tag => {
      const isOn = selected.includes(tag);
      const btn = h("button", {type:"button", className:"flavor-chip"+(isOn?" on":"")}, tag);
      btn.addEventListener("click", ()=>{
        const nowOn = btn.classList.contains("on");
        btn.classList.toggle("on", !nowOn);
        if(nowOn) {
          const i = selected.indexOf(tag);
          if(i >= 0) selected.splice(i, 1);
        } else {
          selected.push(tag);
        }
        updateSummary();
        onToggle(tag, !nowOn);
      });
      row.appendChild(btn);
    });
    wrap.appendChild(row);
  });

  /* 自由記述欄 */
  const noteWrap = h("div", {style:{marginTop:"6px",display:"flex",flexDirection:"column",gap:3}});
  noteWrap.appendChild(h("span", {className:"flavor-cat-label"}, "補足メモ（任意）"));
  const ta = h("textarea", {
    placeholder:"例：後味にほんのりバニラ感",
    rows:2,
    style:{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(200,149,108,0.15)",borderRadius:"8px",padding:"8px 10px",color:"#ede4da",fontSize:"0.87em",outline:"none",resize:"vertical",fontFamily:"inherit",lineHeight:1.5},
    onInput: e => onNoteChange(e.target.value)
  });
  ta.value = flavorNote || "";
  noteWrap.appendChild(ta);
  wrap.appendChild(noteWrap);
  return wrap;
}

/* ── Render ── */
function render(){const app=document.getElementById("app");app.innerHTML="";
const fs=FONT_SIZES[state.fontSize]||FONT_SIZES.M;
app.style.fontSize=fs.base+"px";
const header=h("div",{className:"header"});
header.appendChild(h("h1",null,"BrewLog"));
header.appendChild(h("p",null,"POUR OVER JOURNAL"));
const sizeToggle=h("div",{style:{display:"flex",justifyContent:"center",gap:4,marginTop:"8px"}});
Object.keys(FONT_SIZES).forEach(k=>{sizeToggle.appendChild(h("button",{style:{background:state.fontSize===k?"rgba(200,149,108,0.25)":"rgba(200,149,108,0.08)",border:`1px solid ${state.fontSize===k?"rgba(200,149,108,0.4)":"rgba(200,149,108,0.1)"}`,borderRadius:6,padding:"3px 10px",color:state.fontSize===k?"#ede4da":"#6b5a4e",fontSize:"12px",cursor:"pointer",fontFamily:"inherit"},onClick:()=>{state.fontSize=k;db.saveFontSize(k);render();}},FONT_SIZES[k].label));});
header.appendChild(sizeToggle);
app.appendChild(header);
const tabs=h("div",{className:"tabs"},h("button",{className:"tab"+(state.view==="list"?" active":""),onClick:()=>{state.view="list";render();}},"履歴"),h("button",{className:"tab"+(state.view==="add"?" active":""),onClick:()=>{state.view="add";render();}},"＋ 記録する"));
app.appendChild(tabs);

if(state.view==="add")renderForm(app);
else renderList(app);
}

function renderForm(app){
const GRINDERS=getGRINDERS();
const b=state.brew,g=GRINDERS[b.grinderId]||GRINDERS["fellow_opus"];
const form=h("div",{className:"form"});

/* Bean selector */
form.appendChild(renderBeanSelector());

/* Brew type (hot / ice) */
const btTabs=h("div",{className:"tabs",style:{marginBottom:0}},
  h("button",{type:"button",className:"tab"+(b.brewType!=="ice"?" active":""),onClick:()=>{b.brewType="hot";render();}},"Hot"),
  h("button",{type:"button",className:"tab"+(b.brewType==="ice"?" active":""),onClick:()=>{b.brewType="ice";if(!b.iceWeight)b.iceWeight=100;render();}},"Ice")
);
form.appendChild(btTabs);

/* Grinder */
const gDiv=h("div",{style:{display:"flex",flexDirection:"column",gap:4}});
gDiv.appendChild(h("span",{className:"lbl"},"ミル"));
const gChips=h("div",{style:{display:"flex",flexWrap:"wrap",gap:4}});
Object.keys(GRINDERS).forEach(k=>{
  const gi=GRINDERS[k];
  const isOn=b.grinderId===k;
  const selectThis=()=>{state.equip.grinderId=k;b.grinderId=k;b.grind=gi.default;save();render();};
  if(gi.custom){
    /* カスタムミルは削除ボタン付き */
    const wrap=h("div",{style:{display:"flex",gap:0}});
    wrap.appendChild(h("button",{type:"button",className:"chip"+(isOn?" on":""),style:{borderRadius:"8px 0 0 8px"},onClick:selectThis},gi.name));
    wrap.appendChild(h("button",{type:"button",style:{background:isOn?"rgba(200,149,108,0.2)":"rgba(200,149,108,0.06)",border:"1px solid rgba(200,149,108,0.12)",borderLeft:"none",borderRadius:"0 8px 8px 0",padding:"6px 8px",color:"#8a7b6e",fontSize:"10px",cursor:"pointer",fontFamily:"inherit"},onClick:()=>{if(!confirm("「"+gi.name+"」を削除しますか？"))return;db.deleteCustomGrinder(gi.id);if(b.grinderId===k){b.grinderId="fellow_opus";b.grind=GRINDERS_BUILTIN.fellow_opus.default;}save();render();}},"✕"));
    gChips.appendChild(wrap);
  } else {
    gChips.appendChild(h("button",{type:"button",className:"chip"+(isOn?" on":""),onClick:selectThis},gi.name));
  }
});
/* カスタムミル追加ボタン */
if(!state.addingGrinder){
  gChips.appendChild(h("button",{type:"button",className:"chip",style:{borderStyle:"dashed",borderColor:"rgba(200,149,108,0.25)",color:"#6b5a4e"},onClick:()=>{state.addingGrinder=true;state._newGrinder={name:"",min:1,max:40,step:1};render();}},"＋ 追加"));
}
gDiv.appendChild(gChips);
/* カスタムミル入力フォーム */
if(state.addingGrinder){
  const ng=state._newGrinder;
  const agDiv=h("div",{style:{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(200,149,108,0.2)",borderRadius:"10px",padding:"12px",display:"flex",flexDirection:"column",gap:8,animation:"fadeIn 0.2s ease"}});
  agDiv.appendChild(h("span",{style:{fontSize:"0.73em",color:"#c8956c",fontWeight:600}},"カスタムミルを追加"));
  const nameInp=h("input",{className:"inp",placeholder:"ミル名（例: Kinu M47）",value:ng.name,onInput:e=>{ng.name=e.target.value;}});
  agDiv.appendChild(nameInp);
  const numGrid=h("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}});
  [["最小値","min"],["最大値","max"],["刻み","step"]].forEach(pair=>{
    const lbl=pair[0],key=pair[1];
    const fd=h("div",{style:{display:"flex",flexDirection:"column",gap:3}});
    fd.appendChild(h("span",{style:{fontSize:"0.67em",color:"#6b5a4e"}},lbl));
    const inp=h("input",{className:"inp",type:"number",inputMode:"decimal",style:{textAlign:"center"},onInput:e=>{const v=parseFloat(e.target.value);ng[key]=isNaN(v)?(key==="step"?1:0):v;}});
    inp.value=String(ng[key]);
    fd.appendChild(inp);
    numGrid.appendChild(fd);
  });
  agDiv.appendChild(numGrid);
  const agBtns=h("div",{style:{display:"flex",gap:6}});
  agBtns.appendChild(h("button",{type:"button",style:{flex:1,background:"rgba(200,149,108,0.2)",border:"none",borderRadius:8,padding:"8px",color:"#ede4da",fontSize:"0.87em",cursor:"pointer",fontFamily:"inherit"},onClick:()=>{
    if(!ng.name.trim())return;
    if(ng.max<=ng.min){alert("最大値は最小値より大きくしてください");return;}
    if(ng.step<=0){alert("刻みは0より大きい値にしてください");return;}
    const id=Date.now().toString();
    db.addCustomGrinder({id,name:ng.name.trim(),min:ng.min,max:ng.max,step:ng.step});
    state.addingGrinder=false;
    b.grinderId="custom_"+id;
    b.grind=Math.round((ng.min+ng.max)/2);
    state.equip.grinderId=b.grinderId;
    save();render();
  }},"追加"));
  agBtns.appendChild(h("button",{type:"button",style:{background:"none",border:"1px solid rgba(200,149,108,0.15)",borderRadius:8,padding:"8px 12px",color:"#8a7b6e",fontSize:"0.87em",cursor:"pointer",fontFamily:"inherit"},onClick:()=>{state.addingGrinder=false;render();}},"キャンセル"));
  agDiv.appendChild(agBtns);
  gDiv.appendChild(agDiv);
}
form.appendChild(gDiv);

/* Grind slider */
const gsDiv=h("div",{style:{display:"flex",flexDirection:"column",gap:4}});
gsDiv.appendChild(h("span",{className:"lbl"},`挽き目（${g.name}）`));
const gsRow=h("div",{style:{display:"flex",alignItems:"center",gap:12}});
const displayVal=g.step<1?b.grind.toFixed(g.step===0.25?2:1):b.grind.toString();
const grindNum=h("span",{id:"grind-num",style:{fontSize:"22px",fontWeight:700,color:"#c8956c",minWidth:"48px",textAlign:"center",fontFamily:"'Cormorant Garamond',Georgia,serif"}},displayVal);
gsRow.appendChild(grindNum);
const sliderWrap=h("div",{style:{flex:1,position:"relative",padding:"8px 0"}});
const pct=((b.grind-g.min)/(g.max-g.min))*100;
sliderWrap.appendChild(h("div",{style:{position:"absolute",top:"50%",left:0,right:0,height:"4px",background:"rgba(200,149,108,0.15)",borderRadius:"2px",transform:"translateY(-50%)"}}));
const fillBar=h("div",{id:"grind-fill",style:{position:"absolute",top:"50%",left:0,width:pct+"%",height:"4px",background:"linear-gradient(90deg,#c8956c,#a07050)",borderRadius:"2px",transform:"translateY(-50%)"}});
sliderWrap.appendChild(fillBar);
const slider=h("input",{type:"range",min:g.min,max:g.max,step:g.step,value:b.grind,style:{width:"100%",position:"relative",zIndex:2},onInput:e=>{const v=parseFloat(e.target.value);b.grind=v;const num=document.getElementById("grind-num");if(num)num.textContent=g.step<1?v.toFixed(g.step===0.25?2:1):v.toString();const fill=document.getElementById("grind-fill");if(fill)fill.style.width=((v-g.min)/(g.max-g.min)*100)+"%";}});
sliderWrap.appendChild(slider);gsRow.appendChild(sliderWrap);gsDiv.appendChild(gsRow);
gsDiv.appendChild(h("div",{style:{display:"flex",justifyContent:"space-between",fontSize:"10px",color:"#6b5a4e",padding:"0 4px"}},h("span",null,`細 ← ${g.min}`),h("span",null,`${g.max} → 粗`)));
form.appendChild(gsDiv);

/* Dripper */
const dDiv=h("div",{style:{display:"flex",flexDirection:"column",gap:4}});
dDiv.appendChild(h("span",{className:"lbl"},"ドリッパー"));
const dChips=h("div",{style:{display:"flex",flexWrap:"wrap",gap:4}});
DRIPPERS.forEach(d=>{dChips.appendChild(h("button",{className:"chip"+(b.dripper===d||(d==="その他"&&!DRIPPERS.includes(b.dripper)&&b.dripper)?" on":""),onClick:()=>{if(d==="その他"){b.dripper="その他";state.equip.dripper="その他";}else{b.dripper=d;state.equip.dripper=d;}save();render();}},d));});
dDiv.appendChild(dChips);
/* その他のテキスト入力 */
const isCustomDripper = b.dripper && !DRIPPERS.slice(0,-1).includes(b.dripper);
if(b.dripper==="その他"||isCustomDripper){
  const dtInp=h("input",{className:"inp",placeholder:"ドリッパー名を入力",value:isCustomDripper&&b.dripper!=="その他"?b.dripper:"",style:{marginTop:"4px"},onInput:e=>{b.dripper=e.target.value||"その他";state.equip.dripper=b.dripper;save();}});
  dDiv.appendChild(dtInp);
}
form.appendChild(dDiv);

/* Temp, Dose, Water */
const grid=h("div",{className:"grid3"});
[["湯温","℃","temp",TEMPS],["粉量","g","dose",DOSES],["湯量","g","water",WATERS]].forEach(([lbl,u,k,opts])=>{
const d=h("div",{style:{display:"flex",flexDirection:"column",gap:4}});
d.appendChild(h("span",{className:"lbl"},lbl));
d.appendChild(sel(opts.map(o=>o+u),b[k]+u,v=>{b[k]=parseInt(v);render();}));
grid.appendChild(d);
});
form.appendChild(grid);

/* Ice weight (アイスのみ) */
if(b.brewType==="ice"){
const iwDiv=h("div",{style:{display:"flex",flexDirection:"column",gap:4}});
iwDiv.appendChild(h("span",{className:"lbl"},"氷量"));
iwDiv.appendChild(sel(ICE_WEIGHTS.map(o=>o+"g"),b.iceWeight+"g",v=>{b.iceWeight=parseInt(v);render();}));
form.appendChild(iwDiv);
}

/* Ratio */
const isIce=b.brewType==="ice";
const totalWater=b.water+(isIce?(b.iceWeight||0):0);
if(b.dose>0&&totalWater>0){form.appendChild(h("div",{className:"ratio-box"},h("span",{style:{fontSize:"12px",color:"#8a7b6e"}},isIce?"Ratio（氷込み）":"Ratio"),h("span",{className:"ratio-val"},`1 : ${(totalWater/b.dose).toFixed(1)}`)));}

/* Brew time */
const btDiv=h("div",{style:{display:"flex",flexDirection:"column",gap:4}});
btDiv.appendChild(h("span",{className:"lbl"},"抽出時間"));
const btRow=h("div",{style:{display:"flex",alignItems:"center",gap:6}});
const mins=[0,1,2,3,4,5,6,7,8,9,10];
const secs=[0,5,10,15,20,25,30,35,40,45,50,55];
btRow.appendChild(sel(mins,b.brewTimeMin,v=>{b.brewTimeMin=parseInt(v);render();}));
btRow.firstChild.querySelector(".sel-arr").textContent="分";
btRow.appendChild(sel(secs.map(s=>String(s).padStart(2,"0")),String(b.brewTimeSec).padStart(2,"0"),v=>{b.brewTimeSec=parseInt(v);render();}));
btRow.lastChild.querySelector(".sel-arr").textContent="秒";
btDiv.appendChild(btRow);form.appendChild(btDiv);

/* Pour details */
form.appendChild(h("button",{className:"btn-toggle",onClick:()=>{state.showPours=!state.showPours;render();}},state.showPours?"▾ 注湯の詳細を閉じる":"▸ 注湯の詳細を記録する（任意）"));
if(state.showPours){
const pDiv=h("div",{style:{display:"flex",flexDirection:"column",gap:8,animation:"fadeIn 0.2s ease"}});
b.pours.forEach((pour,idx)=>{
const row=h("div",{style:{display:"flex",gap:6,alignItems:"center"}});
row.appendChild(h("span",{style:{fontSize:"12px",color:"#8a7b6e",minWidth:"52px",flexShrink:0}},idx===0?"蒸らし":`${idx}投目`));
row.appendChild(sel(POUR_WATERS.map(w=>w+"g"),pour.water+"g",v=>{pour.water=parseInt(v);render();}));
row.appendChild(sel(POUR_TIMES.map(s=>s+"秒"),pour.timeSec+"秒",v=>{pour.timeSec=parseInt(v);render();}));
row.appendChild(h("button",{style:{background:"none",border:"none",color:"#8a7b6e",fontSize:"16px",cursor:"pointer",padding:"4px",flexShrink:0},onClick:()=>{b.pours.splice(idx,1);render();}},"✕"));
pDiv.appendChild(row);
});
pDiv.appendChild(h("button",{className:"btn-add",onClick:()=>{b.pours.push({water:b.pours.length===0?40:60,timeSec:b.pours.length===0?30:10});render();}},`＋ ${b.pours.length===0?"蒸らしを追加":"注湯を追加"}`));
if(b.pours.length>0){
const totalW=b.pours.reduce((s,p)=>s+p.water,0);
const totalS=b.pours.reduce((s,p)=>s+p.timeSec,0);
const tDiv=h("div",{className:"pour-total"},
h("div",{className:"pour-total-item"},h("span",{className:"pour-total-label"},"合計湯量"),h("span",{className:"pour-total-val",innerHTML:`${totalW}<span style="font-size:13px;font-weight:400">g</span>`})),
h("div",{style:{width:"1px",background:"rgba(200,149,108,0.15)"}}),
h("div",{className:"pour-total-item"},h("span",{className:"pour-total-label"},"合計時間"),h("span",{className:"pour-total-val"},`${Math.floor(totalS/60)}:${String(totalS%60).padStart(2,"0")}`))
);pDiv.appendChild(tDiv);
}
form.appendChild(pDiv);
}

/* Overall */
const oDiv=h("div",{style:{display:"flex",flexDirection:"column",gap:6}});
oDiv.appendChild(h("span",{className:"lbl"},"おいしさ"));
const buildFormStars=(rating)=>{const r=Math.round(rating*2)/2;const d="M10 1 L12.6 7.3 L19.5 7.8 L14.2 12.3 L15.8 19 L10 15.3 L4.2 19 L5.8 12.3 L0.5 7.8 L7.4 7.3 Z";let html="";for(let i=1;i<=5;i++){if(r>=i)html+=`<svg width="26" height="26" viewBox="0 0 20 20"><path d="${d}" fill="#c8956c"/></svg>`;else if(r>=i-0.5)html+=`<svg width="26" height="26" viewBox="0 0 20 20"><defs><linearGradient id="fhs${i}"><stop offset="50%" stop-color="#c8956c"/><stop offset="50%" stop-color="rgba(200,149,108,0.2)"/></linearGradient></defs><path d="${d}" fill="url(#fhs${i})"/></svg>`;else html+=`<svg width="26" height="26" viewBox="0 0 20 20"><path d="${d}" fill="rgba(200,149,108,0.2)"/></svg>`;}return html;};
const oStars=h("div",{style:{display:"flex",gap:2,justifyContent:"center",marginBottom:4},innerHTML:buildFormStars(b.overall||3)});
oDiv.appendChild(oStars);
const oRow=h("div",{style:{display:"flex",alignItems:"center",gap:12}});
const oVal=h("span",{style:{fontSize:"1.6em",fontWeight:700,color:"#c8956c",minWidth:"56px",textAlign:"center",fontFamily:"'Cormorant Garamond',Georgia,serif"}},(b.overall||3).toFixed(1));
oRow.appendChild(oVal);
const oSliderWrap=h("div",{style:{flex:1,position:"relative",padding:"8px 0"}});
const oPct=((b.overall||3)/5)*100;
oSliderWrap.appendChild(h("div",{style:{position:"absolute",top:"50%",left:0,right:0,height:"4px",background:"rgba(200,149,108,0.15)",borderRadius:"2px",transform:"translateY(-50%)"}}));
const oFill=h("div",{style:{position:"absolute",top:"50%",left:0,width:oPct+"%",height:"4px",background:"linear-gradient(90deg,#c8956c,#a07050)",borderRadius:"2px",transform:"translateY(-50%)"}});
oSliderWrap.appendChild(oFill);
const oSlider=h("input",{type:"range",min:0,max:5,step:0.1,value:b.overall||3,style:{width:"100%",position:"relative",zIndex:2},onInput:e=>{const v=parseFloat(e.target.value);b.overall=v;oVal.textContent=v.toFixed(1);oFill.style.width=(v/5*100)+"%";oStars.innerHTML=buildFormStars(v);}});
oSliderWrap.appendChild(oSlider);
oRow.appendChild(oSliderWrap);
oDiv.appendChild(oRow);
form.appendChild(oDiv);

/* Taste */
form.appendChild(h("button",{className:"btn-toggle",onClick:()=>{state.showTaste=!state.showTaste;render();}},state.showTaste?"▾ 味の詳細を閉じる":"▸ 味の詳細を記録する（任意）"));
if(state.showTaste){
const tDiv=h("div",{style:{display:"flex",flexDirection:"column",gap:10,animation:"fadeIn 0.2s ease"}});
TASTE.forEach(t=>{
const row=h("div",{className:"taste-row"});
row.appendChild(h("span",{className:"taste-lbl"},`${t.e} ${t.l}`));
const btns=h("div",{style:{display:"flex",gap:3,flex:1}});
const buildBtns=()=>{btns.innerHTML="";for(let v=1;v<=5;v++){btns.appendChild(h("button",{className:"taste-btn",style:{background:v<=b[t.k]?"#c8956c":"rgba(200,149,108,0.15)",color:v<=b[t.k]?"#1a1410":"#6b5a4e",fontWeight:v<=b[t.k]?700:400},onClick:()=>{b[t.k]=b[t.k]===v?0:v;buildBtns();}},v));}};
buildBtns();
row.appendChild(btns);tDiv.appendChild(row);
});form.appendChild(tDiv);
}

/* Flavors */
form.appendChild(h("button",{className:"btn-toggle",onClick:()=>{state.showFlavors=!state.showFlavors;render();}},state.showFlavors?"▾ 感じたフレーバーを閉じる":"▸ 感じたフレーバーを記録する（任意）"));
if(state.showFlavors){
  const flDiv = h("div",{style:{display:"flex",flexDirection:"column",gap:6,animation:"fadeIn 0.2s ease"}});
  flDiv.appendChild(renderFlavorSection(
    b.flavors,
    b.flavorNote,
    (tag, on)=>{
      const cur=state.brew.flavors||[];
      state.brew.flavors=on?[...cur,tag]:cur.filter(t=>t!==tag);
    },
    (val)=>{state.brew.flavorNote=val;}
  ));
  form.appendChild(flDiv);
}

/* Memo */
const mDiv=h("div",{style:{display:"flex",flexDirection:"column",gap:4}});
mDiv.appendChild(h("span",{className:"lbl"},"メモ"));
const mRow=h("div",{style:{display:"flex",gap:6}});
const ta=h("textarea",{placeholder:"気づいたこと、次回試したいこと…",rows:2,style:{flex:1,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(200,149,108,0.2)",borderRadius:"10px",padding:"10px 12px",color:"#ede4da",fontSize:"14px",outline:"none",resize:"vertical",fontFamily:"inherit",lineHeight:1.6},onInput:e=>{b.note=e.target.value;}});
ta.value=b.note;mRow.appendChild(ta);
const vb=h("button",{className:"voice-btn",onClick:()=>{const r=startVoice(t=>{b.note=b.note?b.note+" "+t:t;render();});if(r)r.start();}},"🎙");
mRow.appendChild(vb);mDiv.appendChild(mRow);form.appendChild(mDiv);

/* Save */
form.appendChild(h("button",{className:"btn-save",onClick:()=>{if(!b.beanId)return;const rec={...b,id:Date.now().toString(),createdAt:new Date().toISOString()};state.records.unshift(rec);state.brew=initBrew();state.brew.beanId=b.beanId;state.showTaste=false;state.showPours=false;state.showFlavors=false;state.view="list";save();render();}},"記録する"));

app.appendChild(form);
}

function renderBeanSelector(){
const b=state.brew;
/* 最終使用日順ソート */
const lastUsed={};
state.records.forEach(r=>{if(!lastUsed[r.beanId]||r.createdAt>lastUsed[r.beanId])lastUsed[r.beanId]=r.createdAt;});
const beans=[...state.beans].sort((a,b)=>{const ta=lastUsed[a.id]||"";const tb=lastUsed[b.id]||"";return tb.localeCompare(ta);});
const wrap=h("div",{style:{display:"flex",flexDirection:"column",gap:8}});
wrap.appendChild(h("span",{className:"lbl"},"豆"));

/* Selected bean display */
const selBean=beans.find(x=>x.id===b.beanId);
if(selBean&&!state.addingBean){
const info=h("div",{style:{background:"rgba(200,149,108,0.08)",borderRadius:"10px",padding:"10px 14px",border:"1px solid rgba(200,149,108,0.15)"}});
info.appendChild(h("div",{style:{display:"flex",alignItems:"center",gap:6}},h("span",{style:{fontSize:"14px"}},beanFlag(selBean)),h("span",{style:{fontSize:"15px",fontWeight:600,color:"#ede4da"}},beanName(selBean))));
const metaParts=[];
if(selBean.roast)metaParts.push(selBean.roast);
if(selBean.shop)metaParts.push(selBean.shop);
if(selBean.altitude)metaParts.push(selBean.altitude+"m");
if(selBean.roastDate){const days=Math.floor((Date.now()-new Date(selBean.roastDate).getTime())/(1000*60*60*24));if(days>=0)metaParts.push(`焙煎${days}日目`);}
if(metaParts.length)info.appendChild(h("div",{style:{fontSize:"12px",color:"#8a7b6e",marginTop:"2px"}},metaParts.join(" · ")));
wrap.appendChild(info);
}else if(!state.addingBean){
wrap.appendChild(h("div",{style:{fontSize:"13px",color:"#6b5a4e",padding:"8px 0"}},"豆を選択してください"));
}

if(!state.addingBean){
/* Collapsible bean list */
if(beans.length>0){
wrap.appendChild(h("button",{className:"btn-toggle",onClick:()=>{state.showBeanList=!state.showBeanList;render();}},state.showBeanList?`▾ これまで淹れた豆（${beans.length}）`:`▸ これまで淹れた豆（${beans.length}）`));

  if(state.showBeanList){
    const listDiv=h("div",{style:{display:"flex",flexDirection:"column",gap:6,animation:"fadeIn 0.2s ease"}});
    const chips=h("div",{style:{display:"flex",flexWrap:"wrap",gap:6}});
    beans.forEach(bn=>{
      const bw=h("div",{style:{display:"flex",gap:0}});
      bw.appendChild(h("button",{style:{background:b.beanId===bn.id?"rgba(200,149,108,0.3)":"rgba(200,149,108,0.1)",border:`1px solid ${b.beanId===bn.id?"rgba(200,149,108,0.5)":"rgba(200,149,108,0.15)"}`,borderRadius:"10px 0 0 10px",padding:"8px 10px 8px 14px",color:b.beanId===bn.id?"#ede4da":"#b8a590",fontSize:"14px",cursor:"pointer",fontFamily:"inherit"},onClick:()=>{b.beanId=bn.id;state.showBeanList=false;render();}},`${beanFlag(bn)} ${beanName(bn)}`));
      bw.appendChild(h("button",{style:{background:b.beanId===bn.id?"rgba(200,149,108,0.2)":"rgba(200,149,108,0.06)",border:`1px solid ${b.beanId===bn.id?"rgba(200,149,108,0.5)":"rgba(200,149,108,0.15)"}`,borderLeft:"none",borderRadius:"0 10px 10px 0",padding:"8px 10px",color:"#8a7b6e",fontSize:"11px",cursor:"pointer",fontFamily:"inherit"},onClick:e=>{e.stopPropagation();state.viewingBean=state.viewingBean?.id===bn.id?null:bn;render();}},"ℹ"));
      chips.appendChild(bw);
    });
    listDiv.appendChild(chips);

    /* Viewing bean detail */
    if(state.viewingBean&&!state.editingBean){
      const vb=state.viewingBean;
      const vDiv=h("div",{style:{background:"rgba(30,24,18,0.95)",borderRadius:"12px",padding:"16px",border:"1px solid rgba(200,149,108,0.2)",animation:"fadeIn 0.2s ease"}});
      const vHead=h("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}});
      vHead.appendChild(h("span",{style:{fontSize:"16px",fontWeight:600,color:"#ede4da"}},`${beanFlag(vb)} ${beanName(vb)}`));
      vHead.appendChild(h("button",{style:{background:"none",border:"none",color:"#8a7b6e",fontSize:"18px",cursor:"pointer"},onClick:()=>{state.viewingBean=null;render();}},"✕"));
      vDiv.appendChild(vHead);
      const details=h("div",{style:{display:"flex",flexDirection:"column",gap:"6px",fontSize:"13px",color:"#b8a590"}});
      if(vb.country)details.appendChild(h("div",null,"🌍 国: "+vb.country));
      if(vb.farm)details.appendChild(h("div",null,"🏔 農園: "+vb.farm));
      if(vb.altitude)details.appendChild(h("div",null,"📐 標高: "+vb.altitude+"m"));
      if(vb.process)details.appendChild(h("div",null,"⚙️ 精製: "+vb.process));
      if(vb.shop)details.appendChild(h("div",null,"🏪 店: "+vb.shop));
      if(vb.roast)details.appendChild(h("div",null,"🔥 焙煎度: "+vb.roast));
      if(vb.roastDate)details.appendChild(h("div",null,"📅 焙煎日: "+vb.roastDate));
      if(vb.name)details.appendChild(h("div",null,"📝 カスタム名: "+vb.name));
      vDiv.appendChild(details);
      /* Edit & Delete buttons */
      const actBtns=h("div",{style:{display:"flex",gap:8,marginTop:"12px"}});
      actBtns.appendChild(h("button",{style:{flex:1,background:"rgba(200,149,108,0.15)",border:"1px solid rgba(200,149,108,0.25)",borderRadius:8,padding:"8px",color:"#ede4da",fontSize:"0.8em",cursor:"pointer",fontFamily:"inherit"},onClick:()=>{state.editingBean={...vb};render();}},"✏️ 編集"));
      actBtns.appendChild(h("button",{style:{flex:1,background:"none",border:"1px solid rgba(200,100,100,0.3)",borderRadius:8,padding:"8px",color:"#c87070",fontSize:"0.8em",cursor:"pointer",fontFamily:"inherit"},onClick:()=>{const name=beanName(vb);if(!confirm(`「${name}」を削除しますか？\nこの豆に紐づく抽出記録は残ります。`))return;state.beans=state.beans.filter(x=>x.id!==vb.id);if(b.beanId===vb.id)b.beanId="";state.viewingBean=null;save();render();}},"🗑 削除"));
      vDiv.appendChild(actBtns);
      listDiv.appendChild(vDiv);
    }

    /* Editing bean */
    if(state.editingBean){
      const eb=state.editingBean;
      const eDiv=h("div",{style:{background:"rgba(30,24,18,0.95)",borderRadius:"12px",padding:"16px",border:"1px solid rgba(200,149,108,0.35)",animation:"fadeIn 0.2s ease"}});
      eDiv.appendChild(h("div",{style:{fontSize:"0.8em",color:"#c8956c",fontWeight:600,marginBottom:"10px"}},"豆を編集"));
      const fields=[
        {key:"country",label:"国"},
        {key:"farm",label:"農園"},
        {key:"shop",label:"購入店"},
        {key:"altitude",label:"標高（m）",inputMode:"numeric"},
        {key:"name",label:"カスタム名"},
        {key:"roastDate",label:"焙煎日",type:"date"},
      ];
      fields.forEach(f=>{
        const fDiv=h("div",{style:{display:"flex",flexDirection:"column",gap:3,marginBottom:8}});
        fDiv.appendChild(h("span",{style:{fontSize:"0.73em",color:"#6b5a4e"}},f.label));
        const inp=h("input",{className:"inp",type:f.type||"text",inputMode:f.inputMode,value:eb[f.key]||"",onInput:e=>{eb[f.key]=e.target.value;}});
        if(f.type==="date")inp.style.colorScheme="dark";
        fDiv.appendChild(inp);eDiv.appendChild(fDiv);
      });
      /* Process chips */
      const pDiv=h("div",{style:{display:"flex",flexDirection:"column",gap:3,marginBottom:8}});
      pDiv.appendChild(h("span",{style:{fontSize:"0.73em",color:"#6b5a4e"}},"精製方法"));
      const pChips=h("div",{style:{display:"flex",flexWrap:"wrap",gap:4}});
      PROCS.forEach(p=>{pChips.appendChild(h("button",{className:"chip"+(eb.process===p?" on":""),onClick:()=>{eb.process=eb.process===p?"":p;render();}},p));});
      pDiv.appendChild(pChips);eDiv.appendChild(pDiv);
      /* Roast level chips */
      const rDiv=h("div",{style:{display:"flex",flexDirection:"column",gap:3,marginBottom:8}});
      rDiv.appendChild(h("span",{style:{fontSize:"0.73em",color:"#6b5a4e"}},"焙煎度"));
      const rChips=h("div",{style:{display:"flex",flexWrap:"wrap",gap:4}});
      ROAST_LEVELS.forEach(r=>{rChips.appendChild(h("button",{className:"chip"+(eb.roast===r?" on":""),onClick:()=>{eb.roast=eb.roast===r?"":r;render();}},r));});
      rDiv.appendChild(rChips);eDiv.appendChild(rDiv);
      /* Save / Cancel */
      const eBtns=h("div",{style:{display:"flex",gap:8,marginTop:4}});
      eBtns.appendChild(h("button",{style:{flex:1,background:"rgba(200,149,108,0.2)",border:"none",borderRadius:8,padding:"8px",color:"#ede4da",fontSize:"0.87em",cursor:"pointer",fontFamily:"inherit"},onClick:()=>{const idx=state.beans.findIndex(x=>x.id===eb.id);if(idx>=0){state.beans[idx]={...eb};save();}state.editingBean=null;state.viewingBean=eb;render();}},"保存"));
      eBtns.appendChild(h("button",{style:{background:"none",border:"1px solid rgba(200,149,108,0.15)",borderRadius:8,padding:"8px 12px",color:"#8a7b6e",fontSize:"0.87em",cursor:"pointer",fontFamily:"inherit"},onClick:()=>{state.editingBean=null;render();}},"キャンセル"));
      eDiv.appendChild(eBtns);
      listDiv.appendChild(eDiv);
    }

    wrap.appendChild(listDiv);
  }
}
/* Add new bean button - always visible */
wrap.appendChild(h("button",{className:"btn-add",onClick:()=>{state.addingBean=true;state.showBeanList=false;state._newBean={country:"",farm:"",process:"",altitude:"",name:"",shop:"",roast:"",roastDate:""};render();}},"＋ 新しい豆を追加"));

}else{
const nb=state._newBean;
const panel=h("div",{className:"bean-panel"});
/* Country */
const cDiv=h("div",{style:{display:"flex",flexDirection:"column",gap:4}});
cDiv.appendChild(h("span",{className:"slbl"},"国 *"));
const cInp=h("input",{className:"inp",placeholder:"例: エチオピア",value:nb.country,onInput:e=>{nb.country=e.target.value;updateBeanPreview();}});
cDiv.appendChild(cInp);panel.appendChild(cDiv);
/* Farm */
const fDiv=h("div",{style:{display:"flex",flexDirection:"column",gap:4}});
fDiv.appendChild(h("span",{className:"slbl"},"農園"));
fDiv.appendChild(h("input",{className:"inp",placeholder:"例: Finca La Esperanza",value:nb.farm,onInput:e=>{nb.farm=e.target.value;updateBeanPreview();}}));
panel.appendChild(fDiv);
/* Process */
const pDiv=h("div",{style:{display:"flex",flexDirection:"column",gap:4}});
pDiv.appendChild(h("span",{className:"slbl"},"精製方法"));
const pChips=h("div",{style:{display:"flex",flexWrap:"wrap",gap:4}});
PROCS.forEach(p=>{pChips.appendChild(h("button",{className:"chip"+(nb.process===p?" on":""),onClick:()=>{nb.process=nb.process===p?"":p;updateBeanPreview();}},p));});
pDiv.appendChild(pChips);panel.appendChild(pDiv);
/* Shop */
const sDiv=h("div",{style:{display:"flex",flexDirection:"column",gap:4}});
sDiv.appendChild(h("span",{className:"slbl"},"購入店"));
sDiv.appendChild(h("input",{className:"inp",placeholder:"例: LIGHT UP COFFEE",value:nb.shop||"",onInput:e=>{nb.shop=e.target.value;}}));
panel.appendChild(sDiv);
/* Roast level */
const rlDiv=h("div",{style:{display:"flex",flexDirection:"column",gap:4}});
rlDiv.appendChild(h("span",{className:"slbl"},"焙煎度"));
const rlChips=h("div",{style:{display:"flex",flexWrap:"wrap",gap:4}});
ROAST_LEVELS.forEach(r=>{rlChips.appendChild(h("button",{className:"chip"+(nb.roast===r?" on":""),onClick:()=>{nb.roast=nb.roast===r?"":r;render();}},r));});
rlDiv.appendChild(rlChips);panel.appendChild(rlDiv);
/* Roast date */
const rdDiv=h("div",{style:{display:"flex",flexDirection:"column",gap:4}});
rdDiv.appendChild(h("span",{className:"slbl"},"焙煎日"));
const rdInp=h("input",{type:"date",className:"inp",value:nb.roastDate||"",onInput:e=>{nb.roastDate=e.target.value;}});
rdInp.style.colorScheme="dark";
rdDiv.appendChild(rdInp);panel.appendChild(rdDiv);
/* Altitude toggle */
panel.appendChild(h("button",{style:{background:"none",border:"none",padding:0,color:"#6b5a4e",fontSize:"12px",cursor:"pointer",textAlign:"left"},onClick:()=>{state.showBeanDetail=!state.showBeanDetail;render();}},state.showBeanDetail?"▾ 標高を閉じる":"▸ 標高を追加（任意）"));
if(state.showBeanDetail){
const aDiv=h("div",{style:{display:"flex",flexDirection:"column",gap:4}});
aDiv.appendChild(h("span",{className:"slbl"},"標高（m）"));
aDiv.appendChild(h("input",{className:"inp",placeholder:"例: 1800",inputMode:"numeric",value:nb.altitude,onInput:e=>{nb.altitude=e.target.value;}}));
panel.appendChild(aDiv);
}
/* Custom name toggle */
panel.appendChild(h("button",{style:{background:"none",border:"none",padding:0,color:"#6b5a4e",fontSize:"12px",cursor:"pointer",textAlign:"left"},onClick:()=>{state.showBeanName=!state.showBeanName;render();}},state.showBeanName?"▾ カスタム名を閉じる":"▸ カスタム名をつける（任意）"));
if(state.showBeanName){
const nRow=h("div",{style:{display:"flex",gap:6}});
nRow.appendChild(h("input",{className:"inp",placeholder:"例: いつものエチオピア",value:nb.name,onInput:e=>{nb.name=e.target.value;updateBeanPreview();}}));
const vb=h("button",{className:"voice-btn",style:{width:"38px",height:"38px"},onClick:()=>{const r=startVoice(t=>{nb.name+=t;render();});if(r)r.start();}},"🎙");
nRow.appendChild(vb);panel.appendChild(nRow);
}
/* Preview */
const prev=h("div",{className:"preview-box",id:"bean-preview"});
prev.appendChild(h("span",{style:{fontSize:"10px",color:"#6b5a4e"}},"表示名:"));
prev.appendChild(h("span",{style:{fontSize:"13px",color:"#b8a590",fontWeight:600}},`${beanFlag(nb)} ${beanName(nb)}`));
panel.appendChild(prev);
/* AI helper */
panel.appendChild(renderAIHelper(nb));
/* Buttons */
const btns=h("div",{style:{display:"flex",gap:6}});
btns.appendChild(h("button",{style:{flex:1,background:"rgba(200,149,108,0.2)",border:"none",borderRadius:"10px",padding:"8px",color:"#ede4da",fontSize:"14px",cursor:"pointer",fontFamily:"inherit"},onClick:()=>{if(!nb.country.trim()&&!nb.name.trim())return;const bean={...nb,id:Date.now().toString()};state.beans.push(bean);b.beanId=bean.id;state.addingBean=false;state.showBeanDetail=false;state.showBeanName=false;save();render();}},"追加"));
btns.appendChild(h("button",{style:{background:"none",border:"1px solid rgba(200,149,108,0.15)",borderRadius:"10px",padding:"8px 14px",color:"#8a7b6e",fontSize:"14px",cursor:"pointer",fontFamily:"inherit"},onClick:()=>{state.addingBean=false;state.showBeanDetail=false;state.showBeanName=false;render();}},"キャンセル"));
panel.appendChild(btns);
wrap.appendChild(panel);
}
return wrap;
}

function updateBeanPreview(){const p=document.getElementById("bean-preview");if(p){const nb=state._newBean;p.innerHTML="";p.appendChild(h("span",{style:{fontSize:"10px",color:"#6b5a4e"}},"表示名:"));p.appendChild(h("span",{style:{fontSize:"13px",color:"#b8a590",fontWeight:600}},`${beanFlag(nb)} ${beanName(nb)}`));}}

function renderAIHelper(nb){
const wrap=h("div",{style:{display:"flex",flexDirection:"column",gap:6}});
const prompts=[{id:"photo",label:"📸 パッケージ写真から",text:"この画像はコーヒー豆のパッケージです。以下の情報を読み取って、それぞれ改行して教えてください。\n\n・豆の名前\n・生産国\n・農園名\n・標高\n・精製方法（Washed / Natural / Honey / Anaerobic / Carbonic Maceration / Wet Hulled / Other）\n・購入店（販売元やロースター名）\n・焙煎度（浅煎り / 中煎り / 中深煎り / 深煎り）\n・焙煎日（記載があれば）"},{id:"url",label:"🔗 商品URLから",text:"以下のURLのコーヒー豆の情報を読み取って、それぞれ改行して教えてください。\n\nURL: （ここにURLを貼る）\n\n・豆の名前\n・生産国\n・農園名\n・標高\n・精製方法（Washed / Natural / Honey / Anaerobic / Carbonic Maceration / Wet Hulled / Other）\n・購入店（販売元やロースター名）\n・焙煎度（浅煎り / 中煎り / 中深煎り / 深煎り）"},{id:"name",label:"☕ 豆の名前から",text:"以下のコーヒー豆について、わかる範囲で情報を教えてください。\n\n豆の名前: （ここに豆の名前を入力）\n\n・生産国\n・農園名\n・標高\n・精製方法（Washed / Natural / Honey / Anaerobic / Carbonic Maceration / Wet Hulled / Other）\n・焙煎度（浅煎り / 中煎り / 中深煎り / 深煎り）"}];
wrap.appendChild(h("button",{className:"ai-btn",onClick:()=>{state.aiOpen=!state.aiOpen;render();}},h("span",{style:{fontSize:"14px"}},"✨"),state.aiOpen?"AIで入力を楽にする ▾":"AIで入力を楽にする ▸"));
if(state.aiOpen){
const box=h("div",{className:"ai-box"});
box.appendChild(h("p",{style:{fontSize:"12px",color:"#8a9bc0",margin:0,fontWeight:600}},"① プロンプトをコピー"));
prompts.forEach(p=>{box.appendChild(h("button",{className:"ai-prompt"+(state.aiCopied===p.id?" copied":""),onClick:async()=>{try{await navigator.clipboard.writeText(p.text)}catch{const t=document.createElement("textarea");t.value=p.text;document.body.appendChild(t);t.select();document.execCommand("copy");document.body.removeChild(t);}state.aiCopied=p.id;render();setTimeout(()=>{state.aiCopied=null;render();},2000);}},h("span",null,p.label),h("span",{style:{fontSize:"11px",opacity:0.7}},state.aiCopied===p.id?"✓ コピー済":"コピー")));});
const pasteDiv=h("div",{style:{display:"flex",flexDirection:"column",gap:6,borderTop:"1px solid rgba(120,140,200,0.1)",paddingTop:"10px"}});
pasteDiv.appendChild(h("p",{style:{fontSize:"12px",color:"#8a9bc0",margin:0,fontWeight:600}},"② AIの回答を貼り付け"));
const ta=h("textarea",{placeholder:"AIの回答をそのまま貼り付け",rows:4,style:{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(120,140,200,0.2)",borderRadius:"8px",padding:"10px 12px",color:"#ede4da",fontSize:"13px",outline:"none",resize:"vertical",fontFamily:"inherit",lineHeight:1.6},onInput:e=>{state.aiPaste=e.target.value;state.aiResult=null;const btn=document.getElementById("ai-parse-btn");if(btn)btn.style.display=e.target.value.trim()?"block":"none";}});
ta.value=state.aiPaste;pasteDiv.appendChild(ta);
const parseBtn=h("button",{id:"ai-parse-btn",style:{background:"rgba(120,140,200,0.15)",border:"1px solid rgba(120,140,200,0.3)",borderRadius:"8px",padding:"8px 14px",color:"#a0b0d0",fontSize:"13px",cursor:"pointer",fontFamily:"inherit",display:state.aiPaste.trim()&&!state.aiResult?"block":"none"},onClick:()=>{state.aiResult=parseAI(state.aiPaste);render();}},"読み取る");
pasteDiv.appendChild(parseBtn);
box.appendChild(pasteDiv);
if(state.aiResult){
const r=state.aiResult;
const rDiv=h("div",{style:{display:"flex",flexDirection:"column",gap:6,borderTop:"1px solid rgba(120,140,200,0.1)",paddingTop:"10px",animation:"fadeIn 0.2s ease"}});
rDiv.appendChild(h("p",{style:{fontSize:"12px",color:"#8a9bc0",margin:0,fontWeight:600}},"③ 確認して反映"));
const rBox=h("div",{style:{background:"rgba(200,149,108,0.06)",borderRadius:"8px",padding:"10px 12px",display:"flex",flexDirection:"column",gap:"4px"}});
if(r.name)rBox.appendChild(h("div",{style:{fontSize:"13px",color:"#b8a590"},innerHTML:`📝 名前: <span style="color:#ede4da">${r.name}</span>`}));
if(r.country)rBox.appendChild(h("div",{style:{fontSize:"13px",color:"#b8a590"},innerHTML:`🌍 国: <span style="color:#ede4da">${r.country}</span>`}));
if(r.farm)rBox.appendChild(h("div",{style:{fontSize:"13px",color:"#b8a590"},innerHTML:`🏔 農園: <span style="color:#ede4da">${r.farm}</span>`}));
if(r.altitude)rBox.appendChild(h("div",{style:{fontSize:"13px",color:"#b8a590"},innerHTML:`📐 標高: <span style="color:#ede4da">${r.altitude}m</span>`}));
if(r.process)rBox.appendChild(h("div",{style:{fontSize:"13px",color:"#b8a590"},innerHTML:`⚙️ 精製: <span style="color:#ede4da">${r.process}</span>`}));
if(r.shop)rBox.appendChild(h("div",{style:{fontSize:"13px",color:"#b8a590"},innerHTML:`🏪 店: <span style="color:#ede4da">${r.shop}</span>`}));
if(r.roast)rBox.appendChild(h("div",{style:{fontSize:"13px",color:"#b8a590"},innerHTML:`🔥 焙煎度: <span style="color:#ede4da">${r.roast}</span>`}));
if(r.roastDate)rBox.appendChild(h("div",{style:{fontSize:"13px",color:"#b8a590"},innerHTML:`📅 焙煎日: <span style="color:#ede4da">${r.roastDate}</span>`}));
rDiv.appendChild(rBox);
const rBtns=h("div",{style:{display:"flex",gap:6}});
rBtns.appendChild(h("button",{style:{flex:1,background:"rgba(100,180,120,0.2)",border:"1px solid rgba(100,180,120,0.3)",borderRadius:"8px",padding:"8px",color:"#8ac090",fontSize:"13px",cursor:"pointer",fontFamily:"inherit"},onClick:()=>{if(r.name){nb.name=r.name;state.showBeanName=true;}if(r.country)nb.country=r.country;if(r.farm)nb.farm=r.farm;if(r.altitude){nb.altitude=r.altitude;state.showBeanDetail=true;}if(r.process)nb.process=r.process;if(r.shop)nb.shop=r.shop;if(r.roast)nb.roast=r.roast;if(r.roastDate)nb.roastDate=r.roastDate;state.aiPaste="";state.aiResult=null;render();}},"フォームに反映"));
rBtns.appendChild(h("button",{style:{background:"none",border:"1px solid rgba(120,140,200,0.15)",borderRadius:"8px",padding:"8px 12px",color:"#7a8aaa",fontSize:"13px",cursor:"pointer",fontFamily:"inherit"},onClick:()=>{state.aiResult=null;state.aiPaste="";render();}},"やり直す"));
rDiv.appendChild(rBtns);box.appendChild(rDiv);
}
wrap.appendChild(box);
}
return wrap;
}

/* ── Trend ── */
const TREND_LINES=[
  {k:"overall",   l:"おいしさ", color:"#c8956c"},
  {k:"acidity",   l:"酸味",     color:"#e8d44d"},
  {k:"sweetness", l:"甘味",     color:"#e8a0b4"},
  {k:"bitterness",l:"苦味",     color:"#8ec4a0"},
  {k:"body",      l:"濃度感",   color:"#7a5c3c"}
];

function trendSVG(recs, tooltipIdx){
  const W=320, H=180, PL=28, PR=12, PT=16, PB=28;
  const iW=W-PL-PR, iH=H-PT-PB;
  const n=recs.length;
  const xPos=i=>n===1?PL+iW/2:PL+i*(iW/(n-1));
  const yPos=v=>PT+iH-(v/5)*iH;

  let svg=`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block;overflow:visible">`;

  /* グリッド */
  for(let v=0;v<=5;v++){
    const y=yPos(v);
    svg+=`<line x1="${PL}" y1="${y}" x2="${W-PR}" y2="${y}" stroke="rgba(200,149,108,0.1)" stroke-width="0.5"/>`;
    if(v>0&&v<5)svg+=`<text x="${PL-4}" y="${y}" text-anchor="end" dominant-baseline="middle" style="font-size:8px;fill:#6b5a4e">${v}</text>`;
  }
  /* X軸ラベル */
  recs.forEach((_,i)=>{
    svg+=`<text x="${xPos(i)}" y="${H-PB+12}" text-anchor="middle" style="font-size:8px;fill:#6b5a4e">${i+1}</text>`;
  });

  /* 各指標の折れ線（おいしさを最後に描いて最前面へ） */
  const drawOrder=[...TREND_LINES.filter(t=>t.k!=="overall"), TREND_LINES.find(t=>t.k==="overall")];
  drawOrder.forEach(({k,color})=>{
    const isOverall=k==="overall";
    const pts=recs.map((r,i)=>({x:xPos(i),y:yPos(r[k]||0),v:r[k]||0}));
    const hasData=pts.some(p=>p.v>0);
    if(!hasData)return;
    if(pts.length>1){
      const d=pts.map((p,i)=>`${i===0?"M":"L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
      svg+=`<path d="${d}" fill="none" stroke="${color}" stroke-width="${isOverall?2:1.5}" stroke-linejoin="round" stroke-linecap="round" opacity="${isOverall?1:0.75}"/>`;
    }
    pts.forEach((p,i)=>{
      const isActive=tooltipIdx===i;
      const r=isOverall?(isActive?6:5):(isActive?3.5:3);
      svg+=`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r}" fill="${color}" stroke="${isActive?"#ede4da":"#1a1410"}" stroke-width="${isActive?1.5:1}"/>`;
    });
  });

  svg+="</svg>";
  return svg;
}

function renderTrendSection(){
  /* 2杯以上記録がある豆を抽出 */
  const beanCounts={};
  state.records.forEach(r=>{if(r.beanId)beanCounts[r.beanId]=(beanCounts[r.beanId]||0)+1;});
  const eligibleBeans=state.beans.filter(b=>beanCounts[b.id]>=2);
  if(eligibleBeans.length===0)return h("div",{});

  const isOpen=state.trendOpen;
  const wrap=h("div",{style:{marginBottom:"8px",display:"flex",flexDirection:"column",gap:0}});

  /* 折りたたみヘッダー */
  wrap.appendChild(h("button",{
    type:"button",className:"btn-toggle",
    style:{marginBottom: isOpen?"8px":"0"},
    onClick:()=>{state.trendOpen=!state.trendOpen;state.trendBeanId=null;state.trendTooltip=null;render();}
  }, isOpen?"▾ 同じ豆の抽出結果の推移":"▸ 同じ豆の抽出結果の推移"));

  if(!isOpen)return wrap;

  /* 豆セレクター */
  const chipRow=h("div",{style:{display:"flex",flexWrap:"wrap",gap:5,marginBottom:"8px"}});
  eligibleBeans.forEach(b=>{
    const isOn=state.trendBeanId===b.id;
    chipRow.appendChild(h("button",{
      type:"button",className:"chip"+(isOn?" on":""),
      style:{fontSize:"0.8em"},
      onClick:()=>{state.trendBeanId=isOn?null:b.id;state.trendTooltip=null;render();}
    },`${beanFlag(b)} ${beanName(b)}`));
  });
  wrap.appendChild(chipRow);

  if(!state.trendBeanId)return wrap;

  /* 選択豆の記録（古い順） */
  const beanRecs=[...state.records.filter(r=>r.beanId===state.trendBeanId)].reverse();
  const GRINDERS=getGRINDERS();

  const graphWrap=h("div",{style:{
    background:"rgba(255,255,255,0.03)",border:"1px solid rgba(200,149,108,0.12)",
    borderRadius:"12px",padding:"12px",display:"flex",flexDirection:"column",gap:8
  }});

  /* 凡例 */
  const legend=h("div",{style:{display:"flex",flexWrap:"wrap",gap:"6px 12px"}});
  TREND_LINES.forEach(({l,color})=>{
    legend.appendChild(h("div",{style:{display:"flex",alignItems:"center",gap:4}},
      h("div",{style:{width:"14px",height:"2px",background:color,borderRadius:"1px",flexShrink:0}}),
      h("span",{style:{fontSize:"10px",color:"#8a7b6e"}},l)
    ));
  });
  graphWrap.appendChild(legend);

  /* グラフ＋タップ領域を重ねるコンテナ */
  const graphContainer=h("div",{style:{position:"relative",width:"100%"}});

  /* SVGグラフ */
  const svgEl=h("div",{innerHTML:trendSVG(beanRecs,state.trendTooltip),style:{pointerEvents:"none"}});
  graphContainer.appendChild(svgEl);

  /* タップ領域をSVGの外にdivで作る（iOS対応） */
  const hitLayer=h("div",{style:{
    position:"absolute",top:0,left:0,right:0,bottom:0,
    display:"flex",alignItems:"stretch"
  }});
  /* 左右のパディング分だけ空白を確保して均等分割 */
  const PAD_L_PCT=(28/320*100).toFixed(2)+"%";
  const PAD_R_PCT=(12/320*100).toFixed(2)+"%";
  hitLayer.appendChild(h("div",{style:{width:PAD_L_PCT,flexShrink:0}}));
  const hitInner=h("div",{style:{flex:1,display:"flex"}});
  beanRecs.forEach((_,i)=>{
    const hitEl=h("div",{
      type:"button",
      style:{flex:1,cursor:"pointer",WebkitTapHighlightColor:"transparent"}
    });
    hitEl.addEventListener("click",()=>{
      state.trendTooltip=state.trendTooltip===i?null:i;
      svgEl.innerHTML=trendSVG(beanRecs,state.trendTooltip);
      updateTooltip();
    });
    hitInner.appendChild(hitEl);
  });
  hitLayer.appendChild(hitInner);
  hitLayer.appendChild(h("div",{style:{width:PAD_R_PCT,flexShrink:0}}));
  graphContainer.appendChild(hitLayer);
  graphWrap.appendChild(graphContainer);

  /* ツールチップ */
  const tooltipEl=h("div",{});
  const updateTooltip=()=>{
    tooltipEl.innerHTML="";
    if(state.trendTooltip==null)return;
    const rec=beanRecs[state.trendTooltip];
    if(!rec)return;
    const gr=GRINDERS[rec.grinderId];
    const gn=gr?gr.name:rec.grinderId;
    const inner=h("div",{style:{
      background:"rgba(30,24,18,0.95)",border:"1px solid rgba(200,149,108,0.25)",
      borderRadius:"8px",padding:"8px 12px",display:"flex",flexDirection:"column",gap:4,
      animation:"fadeIn 0.15s ease"
    }});
    inner.appendChild(h("div",{style:{fontSize:"11px",color:"#8a7b6e"}},
      `${state.trendTooltip+1}杯目 · ${fmtDate(rec.createdAt)}`));
    /* 挽き目・湯温 */
    const params=[];
    if(rec.grind!=null&&gr)params.push(`${gn} ${gr.step<1?rec.grind.toFixed(gr.step===0.25?2:1):rec.grind}`);
    if(rec.temp)params.push(`${rec.temp}℃`);
    if(params.length)inner.appendChild(h("div",{style:{fontSize:"12px",color:"#ede4da"}},params.join(" · ")));
    /* スコア */
    const scores=TREND_LINES.filter(t=>(rec[t.k]||0)>0);
    if(scores.length){
      const scoreRow=h("div",{style:{display:"flex",flexWrap:"wrap",gap:"4px 10px",marginTop:"2px"}});
      scores.forEach(t=>{
        scoreRow.appendChild(h("span",{style:{fontSize:"11px",color:t.color}},`${t.l} ${rec[t.k]}`));
      });
      inner.appendChild(scoreRow);
    }
    tooltipEl.appendChild(inner);
  };
  updateTooltip();
  graphWrap.appendChild(tooltipEl);
  wrap.appendChild(graphWrap);
  return wrap;
}

function renderList(app){
const list=h("div",{style:{animation:"fadeIn 0.3s ease"}});
if(state.records.length===0){
list.appendChild(h("div",{className:"empty"},h("div",{style:{fontSize:"40px",marginBottom:"16px"}},"☕"),h("p",{style:{fontSize:"14px",lineHeight:1.8}},"まだ記録がありません。"),h("p",{style:{fontSize:"14px",lineHeight:1.8}},"最初の一杯を記録してみましょう。")));
}else{
/* 振り返りセクション */
list.appendChild(renderTrendSection());
list.appendChild(h("div",{style:{fontSize:"12px",color:"#6b5a4e",marginBottom:"4px",marginTop:"16px"}},`${state.records.length} 件の記録`));
state.records.forEach(rec=>{list.appendChild(renderCard(rec));});
}
/* Data management */
const dataDiv=h("div",{style:{marginTop:"24px",paddingTop:"16px",borderTop:"1px solid rgba(200,149,108,0.08)",display:"flex",flexDirection:"column",gap:8}});
dataDiv.appendChild(h("span",{style:{fontSize:"11px",color:"#6b5a4e"}},"データ管理"));
const dataBtns=h("div",{style:{display:"flex",gap:8}});
/* Export */
dataBtns.appendChild(h("button",{style:{flex:1,background:"none",border:"1px solid rgba(200,149,108,0.15)",borderRadius:8,padding:"8px",color:"#8a7b6e",fontSize:12,cursor:"pointer",fontFamily:"inherit"},onClick:()=>{const data=db.exportAll();const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`brewlog_backup_${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);}},"📤 エクスポート"));
/* Import */
dataBtns.appendChild(h("button",{style:{flex:1,background:"none",border:"1px solid rgba(200,149,108,0.15)",borderRadius:8,padding:"8px",color:"#8a7b6e",fontSize:12,cursor:"pointer",fontFamily:"inherit"},onClick:()=>{const inp=document.createElement("input");inp.type="file";inp.accept=".json";inp.onchange=e=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=ev=>{try{const data=JSON.parse(ev.target.result);if(!data.records||!data.beans){alert("無効なバックアップファイルです");return;}if(!confirm(`${data.records.length}件の記録と${data.beans.length}件の豆データをインポートします。現在のデータは上書きされます。よろしいですか？`))return;db.importAll(data);state.records=db.getRecords();state.beans=db.getBeans();state.equip=db.getEquip();render();}catch{alert("ファイルの読み込みに失敗しました");}};reader.readAsText(file);};inp.click();}},"📥 インポート"));
dataDiv.appendChild(dataBtns);
list.appendChild(dataDiv);
app.appendChild(list);
}

function renderCard(rec){
const GRINDERS=getGRINDERS();
const bean=state.beans.find(b=>b.id===rec.beanId);
const bn=bean?beanName(bean):"（豆名なし）";
const fl=bean?beanFlag(bean):"";
const gr=GRINDERS[rec.grinderId];
const gn=gr?gr.name:rec.grinderId;
const exp=state.expandedCard===rec.id;

const card=h("div",{className:"card",style:{marginBottom:"10px"},onClick:()=>{state.expandedCard=exp?null:rec.id;render();}});
/* Row 1: flag + bean name (full width) */
const nameRow=h("div",{style:{display:"flex",alignItems:"flex-start",gap:"8px",marginBottom:"6px"}});
if(fl)nameRow.appendChild(h("span",{style:{fontSize:"1em",flexShrink:0,lineHeight:1.4}},fl));
nameRow.appendChild(h("span",{style:{fontSize:"1em",fontWeight:600,color:"#ede4da",lineHeight:1.4,flex:1}},bn));
card.appendChild(nameRow);
/* Row 2: rating */
const ratingVal=rec.overall||0;
const rounded=Math.round(ratingVal*2)/2;
const starSVG=(fill)=>{const d="M10 1 L12.6 7.3 L19.5 7.8 L14.2 12.3 L15.8 19 L10 15.3 L4.2 19 L5.8 12.3 L0.5 7.8 L7.4 7.3 Z";if(fill===1)return `<svg width="16" height="16" viewBox="0 0 20 20" style="display:inline-block;vertical-align:middle"><path d="${d}" fill="#c8956c"/></svg>`;if(fill===0.5)return `<svg width="16" height="16" viewBox="0 0 20 20" style="display:inline-block;vertical-align:middle"><defs><linearGradient id="hs${rec.id}"><stop offset="50%" stop-color="#c8956c"/><stop offset="50%" stop-color="rgba(200,149,108,0.2)"/></linearGradient></defs><path d="${d}" fill="url(#hs${rec.id})"/></svg>`;return `<svg width="16" height="16" viewBox="0 0 20 20" style="display:inline-block;vertical-align:middle"><path d="${d}" fill="rgba(200,149,108,0.2)"/></svg>`;};
let starHTML="";
for(let i=1;i<=5;i++){if(rounded>=i)starHTML+=starSVG(1);else if(rounded>=i-0.5)starHTML+=starSVG(0.5);else starHTML+=starSVG(0);}
card.appendChild(h("div",{style:{fontSize:"0.93em",color:"#c8956c",marginBottom:"8px",display:"flex",alignItems:"center",gap:"8px"}},h("span",{style:{fontFamily:"'Cormorant Garamond',Georgia,serif",fontWeight:700,fontSize:"1.1em"}},ratingVal.toFixed(1)),h("span",{innerHTML:starHTML})));
/* Row 3: date · dripper */
const recIsIce=rec.brewType==="ice";
const metaParts=[fmtDate(rec.createdAt)];
if(rec.dripper)metaParts.push(rec.dripper);
if(recIsIce)metaParts.push("Ice");
card.appendChild(h("div",{style:{fontSize:"0.8em",color:"#8a7b6e",marginBottom:"4px"}},metaParts.join(" · ")));
/* Row 4: grinder · temp · ratio */
const paramParts=[];
if(rec.grind!=null)paramParts.push(`${gn} ${rec.grind}`);
if(rec.temp)paramParts.push(rec.temp+"℃");
const paramRow=h("div",{style:{fontSize:"0.8em",color:"#b8a590",display:"flex",gap:"6px",flexWrap:"wrap",alignItems:"center"}});
if(paramParts.length)paramRow.appendChild(h("span",null,paramParts.join(" · ")));
if(rec.dose&&rec.water){
const recTotalWater=rec.water+(recIsIce?(rec.iceWeight||0):0);
if(paramParts.length)paramRow.appendChild(h("span",{style:{color:"#6b5a4e"}},"·"));
paramRow.appendChild(h("span",{style:{color:"#c8956c",fontWeight:600}},`1:${(recTotalWater/rec.dose).toFixed(1)}`));
}
card.appendChild(paramRow);

/* フレーバーバッジをカード折りたたみ時にも表示 */
if(!exp && rec.flavors && rec.flavors.length > 0) {
  const flavorRow = h("div", {className:"flavor-display", style:{marginTop:"6px"}});
  rec.flavors.forEach(tag => flavorRow.appendChild(h("span", {className:"flavor-badge"}, tag)));
  card.appendChild(flavorRow);
}

if(exp){
/* Check if editing this record */
if(state.editingRecord&&state.editingRecord.id===rec.id){
const er=state.editingRecord;
const eDiv=h("div",{style:{marginTop:"12px",paddingTop:"12px",borderTop:"1px solid rgba(200,149,108,0.1)"},onClick:e=>e.stopPropagation()});
eDiv.appendChild(h("div",{style:{fontSize:"0.8em",color:"#c8956c",fontWeight:600,marginBottom:"10px"}},"記録を編集"));
/* Brew type (hot / ice) */
const btDiv2=h("div",{style:{display:"flex",flexDirection:"column",gap:3,marginBottom:8}});
btDiv2.appendChild(h("span",{style:{fontSize:"0.73em",color:"#6b5a4e"}},"抽出方式"));
const btChips=h("div",{style:{display:"flex",flexWrap:"wrap",gap:4}});
btChips.appendChild(h("button",{className:"chip"+(er.brewType!=="ice"?" on":""),onClick:()=>{er.brewType="hot";render();}},"Hot"));
btChips.appendChild(h("button",{className:"chip"+(er.brewType==="ice"?" on":""),onClick:()=>{er.brewType="ice";if(!er.iceWeight)er.iceWeight=100;render();}},"Ice"));
btDiv2.appendChild(btChips);eDiv.appendChild(btDiv2);
if(er.brewType==="ice"){
const iwDiv2=h("div",{style:{display:"flex",flexDirection:"column",gap:3,marginBottom:8}});
iwDiv2.appendChild(h("span",{style:{fontSize:"0.73em",color:"#6b5a4e"}},"氷量"));
iwDiv2.appendChild(sel(ICE_WEIGHTS.map(o=>o+"g"),er.iceWeight+"g",v=>{er.iceWeight=parseInt(v);render();}));
eDiv.appendChild(iwDiv2);
}
const erg=GRINDERS[er.grinderId]||GRINDERS["fellow_opus"];
/* Grinder select */
const grDiv=h("div",{style:{display:"flex",flexDirection:"column",gap:3,marginBottom:8}});
grDiv.appendChild(h("span",{style:{fontSize:"0.73em",color:"#6b5a4e"}},"ミル"));
const grChips=h("div",{style:{display:"flex",flexWrap:"wrap",gap:4}});
Object.keys(GRINDERS).forEach(k=>{const gi=GRINDERS[k];grChips.appendChild(h("button",{className:"chip"+(er.grinderId===k?" on":""),onClick:()=>{er.grinderId=k;er.grind=gi.default;render();}},gi.name));});
grDiv.appendChild(grChips);eDiv.appendChild(grDiv);
/* Grind */
const gdDiv=h("div",{style:{display:"flex",flexDirection:"column",gap:3,marginBottom:8}});
gdDiv.appendChild(h("span",{style:{fontSize:"0.73em",color:"#6b5a4e"}},`挽き目（${erg.name}）`));
const gdRow=h("div",{style:{display:"flex",alignItems:"center",gap:8}});
const gdVal=h("span",{style:{fontSize:"1.1em",fontWeight:700,color:"#c8956c",minWidth:"40px",textAlign:"center"}},erg.step<1?er.grind.toFixed(erg.step===0.25?2:1):er.grind.toString());
gdRow.appendChild(gdVal);
const gdSlider=h("input",{type:"range",min:erg.min,max:erg.max,step:erg.step,value:er.grind,style:{flex:1},onInput:e=>{er.grind=parseFloat(e.target.value);gdVal.textContent=erg.step<1?er.grind.toFixed(erg.step===0.25?2:1):er.grind.toString();}});
gdRow.appendChild(gdSlider);gdDiv.appendChild(gdRow);eDiv.appendChild(gdDiv);
/* Dripper */
const drDiv=h("div",{style:{display:"flex",flexDirection:"column",gap:3,marginBottom:8}});
drDiv.appendChild(h("span",{style:{fontSize:"0.73em",color:"#6b5a4e"}},"ドリッパー"));
const drChips=h("div",{style:{display:"flex",flexWrap:"wrap",gap:4}});
DRIPPERS.forEach(d=>{drChips.appendChild(h("button",{className:"chip"+(er.dripper===d?" on":""),onClick:()=>{er.dripper=d;render();}},d));});
drDiv.appendChild(drChips);eDiv.appendChild(drDiv);
/* Temp, Dose, Water */
const numFields=[["湯温","temp",TEMPS,"℃"],["粉量","dose",DOSES,"g"],["湯量","water",WATERS,"g"]];
const numGrid=h("div",{className:"grid3",style:{marginBottom:8}});
numFields.forEach(([lbl,k,opts,u])=>{const fd=h("div",{style:{display:"flex",flexDirection:"column",gap:3}});fd.appendChild(h("span",{style:{fontSize:"0.73em",color:"#6b5a4e"}},lbl));fd.appendChild(sel(opts.map(o=>o+u),er[k]+u,v=>{er[k]=parseInt(v);render();}));numGrid.appendChild(fd);});
eDiv.appendChild(numGrid);
/* Brew time */
const btDiv=h("div",{style:{display:"flex",flexDirection:"column",gap:3,marginBottom:8}});
btDiv.appendChild(h("span",{style:{fontSize:"0.73em",color:"#6b5a4e"}},"抽出時間"));
const btRow=h("div",{style:{display:"flex",gap:6}});
btRow.appendChild(sel([0,1,2,3,4,5,6,7,8,9,10],er.brewTimeMin,v=>{er.brewTimeMin=parseInt(v);}));
btRow.firstChild.querySelector(".sel-arr").textContent="分";
btRow.appendChild(sel([0,5,10,15,20,25,30,35,40,45,50,55].map(s=>String(s).padStart(2,"0")),String(er.brewTimeSec).padStart(2,"0"),v=>{er.brewTimeSec=parseInt(v);}));
btRow.lastChild.querySelector(".sel-arr").textContent="秒";
btDiv.appendChild(btRow);eDiv.appendChild(btDiv);
/* Overall */
const oDiv=h("div",{style:{display:"flex",flexDirection:"column",gap:3,marginBottom:8}});
oDiv.appendChild(h("span",{style:{fontSize:"0.73em",color:"#6b5a4e"}},"おいしさ"));
const buildEditStars=(rating)=>{const r=Math.round(rating*2)/2;const d="M10 1 L12.6 7.3 L19.5 7.8 L14.2 12.3 L15.8 19 L10 15.3 L4.2 19 L5.8 12.3 L0.5 7.8 L7.4 7.3 Z";let html="";for(let i=1;i<=5;i++){if(r>=i)html+=`<svg width="22" height="22" viewBox="0 0 20 20"><path d="${d}" fill="#c8956c"/></svg>`;else if(r>=i-0.5)html+=`<svg width="22" height="22" viewBox="0 0 20 20"><defs><linearGradient id="ehs${i}"><stop offset="50%" stop-color="#c8956c"/><stop offset="50%" stop-color="rgba(200,149,108,0.2)"/></linearGradient></defs><path d="${d}" fill="url(#ehs${i})"/></svg>`;else html+=`<svg width="22" height="22" viewBox="0 0 20 20"><path d="${d}" fill="rgba(200,149,108,0.2)"/></svg>`;}return html;};
const eStars=h("div",{style:{display:"flex",gap:2,justifyContent:"center",marginBottom:4},innerHTML:buildEditStars(er.overall||0)});
oDiv.appendChild(eStars);
const oRow2=h("div",{style:{display:"flex",alignItems:"center",gap:10}});
const oVal2=h("span",{style:{fontSize:"1.3em",fontWeight:700,color:"#c8956c",minWidth:"44px",textAlign:"center",fontFamily:"'Cormorant Garamond',Georgia,serif"}},(er.overall||0).toFixed(1));
oRow2.appendChild(oVal2);
const oSliderWrap2=h("div",{style:{flex:1,position:"relative",padding:"8px 0"}});
oSliderWrap2.appendChild(h("div",{style:{position:"absolute",top:"50%",left:0,right:0,height:"4px",background:"rgba(200,149,108,0.15)",borderRadius:"2px",transform:"translateY(-50%)"}}));
const oFill2=h("div",{style:{position:"absolute",top:"50%",left:0,width:((er.overall||0)/5*100)+"%",height:"4px",background:"linear-gradient(90deg,#c8956c,#a07050)",borderRadius:"2px",transform:"translateY(-50%)"}});
oSliderWrap2.appendChild(oFill2);
const oSlider2=h("input",{type:"range",min:0,max:5,step:0.1,value:er.overall||0,style:{width:"100%",position:"relative",zIndex:2},onInput:e=>{const v=parseFloat(e.target.value);er.overall=v;oVal2.textContent=v.toFixed(1);oFill2.style.width=(v/5*100)+"%";eStars.innerHTML=buildEditStars(v);}});
oSliderWrap2.appendChild(oSlider2);
oRow2.appendChild(oSliderWrap2);
oDiv.appendChild(oRow2);eDiv.appendChild(oDiv);
/* Taste */
TASTE.forEach(t=>{
const tRow=h("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:4}});
tRow.appendChild(h("span",{style:{fontSize:"0.8em",color:"#b8a590",width:"65px"}},`${t.e} ${t.l}`));
const tBtns=h("div",{style:{display:"flex",gap:3,flex:1},id:"edit-taste-"+t.k});
const buildTasteBtns=(container,key)=>{container.innerHTML="";for(let v=1;v<=5;v++){const btn=h("button",{className:"taste-btn",style:{background:v<=er[key]?"#c8956c":"rgba(200,149,108,0.15)",color:v<=er[key]?"#1a1410":"#6b5a4e",fontWeight:v<=er[key]?700:400},onClick:()=>{er[key]=er[key]===v?0:v;buildTasteBtns(container,key);}},v);container.appendChild(btn);}};
buildTasteBtns(tBtns,t.k);
tRow.appendChild(tBtns);eDiv.appendChild(tRow);
});
/* Flavors in edit mode */
const flEditDiv=h("div",{style:{display:"flex",flexDirection:"column",gap:3,marginTop:8,marginBottom:8}});
flEditDiv.appendChild(h("span",{style:{fontSize:"0.73em",color:"#6b5a4e"}},"感じたフレーバー"));
if(!er.flavors)er.flavors=[];
flEditDiv.appendChild(renderFlavorSection(
  er.flavors,
  er.flavorNote||"",
  (tag, on)=>{
    er.flavors=on?[...er.flavors,tag]:er.flavors.filter(t=>t!==tag);
  },
  (val)=>{er.flavorNote=val;}
));
eDiv.appendChild(flEditDiv);
/* Note */
const nDiv=h("div",{style:{display:"flex",flexDirection:"column",gap:3,marginTop:4,marginBottom:8}});
nDiv.appendChild(h("span",{style:{fontSize:"0.73em",color:"#6b5a4e"}},"メモ"));
const nTa=h("textarea",{rows:2,style:{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(200,149,108,0.2)",borderRadius:"8px",padding:"8px 10px",color:"#ede4da",fontSize:"0.87em",outline:"none",resize:"vertical",fontFamily:"inherit",lineHeight:1.5},onInput:e=>{er.note=e.target.value;}});
nTa.value=er.note||"";nDiv.appendChild(nTa);eDiv.appendChild(nDiv);
/* Save / Cancel */
const eBtns=h("div",{style:{display:"flex",gap:8}});
eBtns.appendChild(h("button",{style:{flex:1,background:"rgba(200,149,108,0.2)",border:"none",borderRadius:8,padding:"8px",color:"#ede4da",fontSize:"0.87em",cursor:"pointer",fontFamily:"inherit"},onClick:()=>{const idx=state.records.findIndex(r=>r.id===er.id);if(idx>=0){state.records[idx]={...er};save();}state.editingRecord=null;render();}},"保存"));
eBtns.appendChild(h("button",{style:{background:"none",border:"1px solid rgba(200,149,108,0.15)",borderRadius:8,padding:"8px 12px",color:"#8a7b6e",fontSize:"0.87em",cursor:"pointer",fontFamily:"inherit"},onClick:()=>{state.editingRecord=null;render();}},"キャンセル"));
eDiv.appendChild(eBtns);
card.appendChild(eDiv);
}else{
const det=h("div",{style:{marginTop:"12px",paddingTop:"12px",borderTop:"1px solid rgba(200,149,108,0.1)"}});
const info=h("div",{style:{fontSize:"12px",color:"#8a7b6e",marginBottom:"8px",display:"flex",flexDirection:"column",gap:"4px"}});
if(rec.dose)info.appendChild(h("div",null,"粉量: "+rec.dose+"g"));
if(rec.water)info.appendChild(h("div",null,"湯量: "+rec.water+"g"));
if(rec.brewType==="ice"&&rec.iceWeight)info.appendChild(h("div",null,"氷量: "+rec.iceWeight+"g"));
if(rec.dose&&rec.water){
const detTotalWater=rec.water+(rec.brewType==="ice"?(rec.iceWeight||0):0);
info.appendChild(h("div",null,rec.brewType==="ice"?"比率（氷込み）: ":"比率: ",h("span",{style:{color:"#c8956c",fontWeight:600}},"1:"+(detTotalWater/rec.dose).toFixed(1))));
}
if(rec.brewTimeMin>0||rec.brewTimeSec>0)info.appendChild(h("div",null,"抽出時間: "+rec.brewTimeMin+":"+String(rec.brewTimeSec||0).padStart(2,"0")));
if(bean?.country)info.appendChild(h("div",null,"国: "+bean.country));
if(bean?.farm)info.appendChild(h("div",null,"農園: "+bean.farm));
if(bean?.altitude)info.appendChild(h("div",null,"標高: "+bean.altitude+"m"));
if(bean?.process)info.appendChild(h("div",null,"精製: "+bean.process));
if(bean?.shop)info.appendChild(h("div",null,"購入店: "+bean.shop));
if(bean?.roast)info.appendChild(h("div",null,"焙煎度: "+bean.roast));
if(bean?.roastDate){const days=Math.floor((new Date(rec.createdAt).getTime()-new Date(bean.roastDate).getTime())/(1000*60*60*24));if(days>=0)info.appendChild(h("div",null,"焙煎日: "+bean.roastDate+" （"+days+"日目）"));}
det.appendChild(info);
if(rec.pours?.length>0){
const pDiv=h("div",{style:{marginBottom:"8px"}});
pDiv.appendChild(h("div",{style:{fontSize:"11px",color:"#6b5a4e",marginBottom:"4px"}},"注湯"));
const pList=h("div",{style:{display:"flex",flexDirection:"column",gap:"3px"}});
rec.pours.forEach((p,i)=>{pList.appendChild(h("div",{style:{display:"flex",gap:"8px",fontSize:"12px",color:"#b8a590"}},h("span",{style:{color:"#8a7b6e",minWidth:"44px"}},i===0?"蒸らし":`${i}投目`),h("span",null,p.water+"g"),h("span",null,p.timeSec+"秒")));});
pDiv.appendChild(pList);det.appendChild(pDiv);
}
const hasTaste=TASTE.some(t=>rec[t.k]>0)||rec.overall>0;
if(hasTaste){det.appendChild(h("div",{innerHTML:radarSVG(rec)}));}
/* フレーバー表示（展開時） */
if(rec.flavors&&rec.flavors.length>0){
  const flShowDiv=h("div",{style:{marginBottom:"8px"}});
  flShowDiv.appendChild(h("div",{style:{fontSize:"11px",color:"#6b5a4e",marginBottom:"6px"}},"フレーバー"));
  const flBadges=h("div",{className:"flavor-display"});
  rec.flavors.forEach(tag=>flBadges.appendChild(h("span",{className:"flavor-badge"},tag)));
  flShowDiv.appendChild(flBadges);
  if(rec.flavorNote){
    flShowDiv.appendChild(h("p",{style:{fontSize:"12px",color:"#9a8b7e",marginTop:"4px",lineHeight:1.5}},rec.flavorNote));
  }
  det.appendChild(flShowDiv);
}
if(rec.note)det.appendChild(h("p",{style:{fontSize:"13px",color:"#9a8b7e",margin:0,lineHeight:1.5}},rec.note));
/* Edit & Delete buttons */
const actBtns=h("div",{style:{display:"flex",gap:8,marginTop:"10px"}});
actBtns.appendChild(h("button",{style:{flex:1,background:"rgba(200,149,108,0.15)",border:"1px solid rgba(200,149,108,0.25)",borderRadius:8,padding:"8px",color:"#ede4da",fontSize:"0.8em",cursor:"pointer",fontFamily:"inherit"},onClick:e=>{e.stopPropagation();state.editingRecord={...rec,pours:rec.pours?rec.pours.map(p=>({...p})):[], flavors:rec.flavors?[...rec.flavors]:[], flavorNote:rec.flavorNote||"", brewType:rec.brewType||"hot", iceWeight:rec.iceWeight||0};render();}},"✏️ 編集"));
actBtns.appendChild(h("button",{style:{flex:1,background:"none",border:"1px solid rgba(200,100,100,0.3)",borderRadius:8,padding:"8px",color:"#c87070",fontSize:"0.8em",cursor:"pointer",fontFamily:"inherit"},onClick:e=>{e.stopPropagation();if(!confirm("この記録を削除しますか？"))return;state.records=state.records.filter(r=>r.id!==rec.id);save();render();}},"🗑 削除"));
det.appendChild(actBtns);
card.appendChild(det);
}
}
return card;
}

/* ── Init ── */
render();
/* 古いServiceWorkerのキャッシュをクリアするため登録を維持 */
if("serviceWorker" in navigator){
  navigator.serviceWorker.register("./sw.js").catch(()=>{});
}
