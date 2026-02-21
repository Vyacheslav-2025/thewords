import { useState, useEffect, useCallback, useRef } from "react";

const LP=[{from:"ru",to:"kk",label:"Русский → Казахский"},{from:"kk",to:"ru",label:"Казахский → Русский"},{from:"ru",to:"en",label:"Русский → Английский"},{from:"en",to:"ru",label:"Английский → Русский"},{from:"kk",to:"en",label:"Казахский → Английский"},{from:"en",to:"kk",label:"Английский → Казахский"}];
const DT=[{id:"legal",label:"Юридический",icon:"⚖️"},{id:"medical",label:"Медицинский",icon:"🏥"},{id:"technical",label:"Технический",icon:"⚙️"},{id:"financial",label:"Финансовый",icon:"📊"},{id:"personal",label:"Личный документ",icon:"📋"},{id:"marketing",label:"Маркетинг",icon:"📢"}];
const CX=[{id:"phys_template",label:"Физлицо — шаблонные документы",s:"Физ/Шабл"},{id:"phys_template_new",label:"Физлицо — шаблонные + новый перевод",s:"Физ/Ш+Н"},{id:"phys_new",label:"Физлицо — новый перевод",s:"Физ/Нов"},{id:"jur_translate",label:"Юрлицо — только перевод",s:"Юр/Пер"},{id:"jur_ai_edit",label:"Юрлицо — перевод + ред. ИИ",s:"Юр/+РИИ"},{id:"jur_ai_edit_plus",label:"Юрлицо — перевод + ред. ИИ + доп.",s:"Юр/РИИ+"},{id:"jur_smartcat",label:"Юрлицо — перевод + ред. ИИ + Smartcat",s:"Юр/SC"}];
const SM={intake:{l:"Принят",i:"📥"},classify:{l:"Классификация",i:"🔍"},translate:{l:"AI Перевод",i:"🤖"},ai_edit:{l:"Ред. ИИ",i:"🔧"},review:{l:"Ревью",i:"✏️"},deliver:{l:"Готов",i:"✅"}};
const TR=[{id:1,name:"Переводчик 1",langs:["ru-kk","kk-ru"],spec:["legal","personal"]},{id:2,name:"Переводчик 2",langs:["ru-en","en-ru"],spec:["technical","financial"]}];
const PR={legal:"Ты профессиональный юридический переводчик. Переводи точно, сохраняя терминологию.",medical:"Ты медицинский переводчик. Латинские термины оставляй.",technical:"Ты технический переводчик. Аббревиатуры с расшифровкой.",financial:"Ты финансовый переводчик. Числа без изменений.",personal:"Ты переводчик шаблонных документов. Имена транслитерируй.",marketing:"Ты маркетинговый переводчик. Слоганы адаптируй."};
const DEF_AE="Ты редактор переводов. Проверь грамматику, терминологию, естественность, смысл, стиль. Верни ТОЛЬКО исправленный текст.";
const GL={legal:{"ru-kk":{"договор":"шарт","ответственность":"жауапкершілік","обязательство":"міндеттеме","истец":"талапкер","ответчик":"жауапкер"},"ru-en":{"договор":"agreement","доверенность":"power of attorney"}},medical:{"ru-kk":{"диагноз":"диагноз","назначение":"тағайындау","пациент":"науқас"},"ru-en":{"направление":"referral","выписка":"discharge summary"}},financial:{"ru-en":{"выручка":"revenue","прибыль":"profit"},"ru-kk":{"выручка":"түсім","прибыль":"пайда"}},personal:{"ru-kk":{"свидетельство о рождении":"туу туралы куәлік"},"ru-en":{"свидетельство о рождении":"birth certificate"}},technical:{},marketing:{}};

async function callAI(key,mod,prompt,imgs){
  const parts=[];
  if(imgs)for(const im of imgs)parts.push({inline_data:{mime_type:im.mime,data:im.b64}});
  parts.push({text:prompt});
  const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${mod}:generateContent?key=${key}`,{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({contents:[{parts}],generationConfig:{temperature:0.2,maxOutputTokens:8192}})
  });
  const d=await r.json();
  return d?.candidates?.[0]?.content?.parts?.[0]?.text||"";
}
function f2b(f){return new Promise((r,j)=>{const x=new FileReader();x.onload=()=>r(x.result.split(",")[1]);x.onerror=j;x.readAsDataURL(f)})}
function f2t(f){return new Promise((r,j)=>{const x=new FileReader();x.onload=()=>r(x.result);x.onerror=j;x.readAsText(f)})}
function isVis(f){const n=(f.name||"").toLowerCase();return(f.type||"").startsWith("image/")||n.endsWith(".pdf")||n.endsWith(".png")||n.endsWith(".jpg")||n.endsWith(".jpeg")}
function isTxt(f){const n=(f.name||"").toLowerCase();return n.endsWith(".txt")||n.endsWith(".csv")||n.endsWith(".md")||n.endsWith(".html")}

class GAS{
  constructor(u){this.u=u}
  async c(p){const r=await fetch(this.u+"?"+new URLSearchParams(p),{redirect:"follow"});const d=await r.json();if(!d.success)throw new Error(d.error);return d.data}
  co(o){return this.c({action:"createOrder",orderId:o.orderId,clientName:o.clientName,clientType:o.clientType,langPair:o.langPair,docType:o.docType,wordCount:String(o.wordCount||0),translator:o.translator,comment:o.comment||""})}
  sf(id,st,ct,lp,fn){return this.c({action:"saveFile",orderId:id,stage:st,content:ct.substring(0,6000),langPair:lp,fileName:fn})}
  us(id,s,cm){return this.c({action:"updateStatus",orderId:id,status:s,comment:cm||""})}
  go(){return this.c({action:"getOrders"})}
  gc(){return this.c({action:"getConfig"})}
}

const LS={g(k,d){try{const v=localStorage.getItem("tw_"+k);return v?JSON.parse(v):d??null}catch{return d??null}},s(k,v){try{localStorage.setItem("tw_"+k,JSON.stringify(v))}catch{}}};

const CSS=`@import url("https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap");
:root{--b0:#08080D;--b1:#0F0F17;--b2:rgba(22,22,32,.8);--b3:#1C1C2A;--bd:#252538;--bh:#3A3A55;--t1:#EDEDF4;--t2:#9494AD;--t3:#5C5C75;--ac:#E8C547;--ad:#E8C54725;--ok:#3DDC84;--od:#3DDC8418;--er:#F44;--in:#4A9EF5;--pu:#A66BF5;--or:#F5943A}
*{margin:0;padding:0;box-sizing:border-box}body{font-family:"Outfit",sans-serif;background:var(--b0);color:var(--t1);min-height:100vh}
.R{display:flex;height:100vh;overflow:hidden}
.S{width:240px;min-width:240px;background:var(--b1);border-right:1px solid var(--bd);display:flex;flex-direction:column}
.Sh{padding:18px 14px;border-bottom:1px solid var(--bd)}.Sh h1{font-size:17px;font-weight:700;color:var(--ac)}.Sh p{font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:2px;margin-top:2px}
.Sn{padding:6px;flex:1;overflow-y:auto}
.ni{display:flex;align-items:center;gap:9px;padding:8px 11px;border-radius:7px;cursor:pointer;font-size:13px;color:var(--t2);border:none;background:none;width:100%;text-align:left;font-family:inherit;transition:all .12s}
.ni:hover{background:var(--b3);color:var(--t1)}.ni.on{background:var(--ad);color:var(--ac);font-weight:500}
.ni-i{font-size:15px;width:20px;text-align:center}.ni-b{margin-left:auto;background:var(--ac);color:var(--b0);font-size:9px;font-weight:600;padding:1px 6px;border-radius:10px}
.Sf{padding:10px 14px;border-top:1px solid var(--bd);font-size:10px}
.sfr{display:flex;justify-content:space-between;padding:2px 0}.sfr .l{color:var(--t3)}.sfr .v{color:var(--t2);font-family:"JetBrains Mono",monospace;font-size:9px}
.M{flex:1;display:flex;flex-direction:column;overflow:hidden}
.TB{height:46px;border-bottom:1px solid var(--bd);display:flex;align-items:center;padding:0 18px;gap:10px;background:var(--b1);flex-shrink:0}.TB h2{font-size:14px;font-weight:600}
.dot{width:5px;height:5px;border-radius:50%;background:var(--er)}.dot.on{background:var(--ok)}
.ist{display:flex;align-items:center;gap:5px;font-size:10px;color:var(--t3);margin-left:auto}.ist2{display:flex;align-items:center;gap:5px;font-size:10px;color:var(--t3);margin-left:10px}
.PP{display:flex;gap:3px;padding:10px 18px;background:var(--b1);border-bottom:1px solid var(--bd);flex-shrink:0;overflow-x:auto}
.ps{flex:1;display:flex;align-items:center;gap:4px;padding:5px 7px;border-radius:5px;font-size:10px;background:var(--b3);border:1px solid var(--bd);color:var(--t3);white-space:nowrap}
.ps.on{background:var(--ad);border-color:var(--ac);color:var(--ac);font-weight:500}.ps.ok{background:var(--od);border-color:transparent;color:var(--ok)}
.CT{flex:1;overflow-y:auto;padding:18px}
.cd{background:var(--b2);border:1px solid var(--bd);border-radius:10px;padding:16px;margin-bottom:12px;backdrop-filter:blur(8px)}
.hd{display:flex;align-items:center;gap:7px;margin-bottom:12px;flex-wrap:wrap}.hd h3{font-size:13px;font-weight:600}
.bg{font-size:9px;padding:2px 8px;border-radius:14px;background:var(--ad);color:var(--ac);font-weight:500}
.ds{display:flex;align-items:center;gap:5px;padding:5px 9px;border-radius:5px;font-size:11px;margin-bottom:7px}
.ds.ok{background:var(--od);color:var(--ok)}.ds.er{background:#F4444418;color:var(--er)}.ds.in{background:#4A9EF518;color:var(--in)}
.fg{margin-bottom:10px}.fl{display:block;font-size:10px;font-weight:500;color:var(--t2);margin-bottom:4px;text-transform:uppercase;letter-spacing:.4px}
.fi,.fsl{width:100%;padding:8px 11px;background:var(--b1);border:1px solid var(--bd);border-radius:6px;color:var(--t1);font-family:inherit;font-size:12px;outline:none}.fi:focus,.fsl:focus{border-color:var(--ac)}.fsl option{background:var(--b1)}
.rw{display:grid;gap:10px}.r2{grid-template-columns:1fr 1fr}.r3{grid-template-columns:1fr 1fr 1fr}
.uz{border:2px dashed var(--bd);border-radius:9px;padding:20px;text-align:center;cursor:pointer;background:var(--b1)}.uz:hover,.uz.dg{border-color:var(--ac);background:var(--ad)}
.fp{display:flex;align-items:center;gap:7px;padding:7px 9px;background:var(--b1);border-radius:6px;margin-top:5px;font-size:11px}
.fp .fn{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.fp .fz{font-size:9px;color:var(--t3);font-family:"JetBrains Mono",monospace}
.fp .fr{background:none;border:none;color:var(--er);cursor:pointer;font-size:13px}
.bt{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:6px;font-family:inherit;font-size:12px;font-weight:500;cursor:pointer;border:none;transition:all .12s}
.bp{background:var(--ac);color:var(--b0)}.bp:hover{filter:brightness(1.1)}.bp:disabled{opacity:.35;cursor:not-allowed}
.bs{background:var(--b3);border:1px solid var(--bd);color:var(--t1)}.bs:hover{border-color:var(--bh)}
.bo{background:var(--ok);color:var(--b0)}.bv{background:var(--pu);color:#fff}.bm{padding:4px 10px;font-size:11px}
.bts{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}
.dtg{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}
.dtc{padding:7px;border-radius:6px;border:1px solid var(--bd);background:var(--b1);cursor:pointer;text-align:center;font-family:inherit;color:var(--t2);font-size:10px}
.dtc:hover{border-color:var(--bh)}.dtc.sl{border-color:var(--ac);background:var(--ad);color:var(--ac)}
.dti{font-size:17px;display:block;margin-bottom:1px}
.cxg{display:grid;grid-template-columns:1fr 1fr;gap:4px}
.cxc{padding:6px 8px;border-radius:5px;border:1px solid var(--bd);background:var(--b1);cursor:pointer;font-family:inherit;color:var(--t2);font-size:10px;text-align:left;line-height:1.3}
.cxc:hover{border-color:var(--bh)}.cxc.sl{border-color:var(--pu);background:#A66BF518;color:var(--pu)}
.tc{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.tp{background:var(--b1);border:1px solid var(--bd);border-radius:7px;overflow:hidden}
.tph{padding:7px 11px;border-bottom:1px solid var(--bd);font-size:10px;text-transform:uppercase;letter-spacing:.4px;color:var(--t3);display:flex;justify-content:space-between}
.tpb{padding:12px;min-height:150px;font-size:12px;line-height:1.6;white-space:pre-wrap}
.tpb textarea{width:100%;min-height:150px;background:transparent;border:none;color:var(--t1);font-family:inherit;font-size:12px;line-height:1.6;resize:vertical;outline:none}
.gp{background:var(--b3);border:1px solid var(--bd);border-radius:7px;padding:10px;margin-top:10px}
.gp h4{font-size:10px;text-transform:uppercase;letter-spacing:.4px;color:var(--t3);margin-bottom:6px}
.grw{display:flex;gap:5px;font-size:11px;padding:2px 0;border-bottom:1px solid var(--bd);font-family:"JetBrains Mono",monospace}.grw:last-child{border-bottom:none}
.grs{color:var(--t3);flex:1}.gra{color:var(--t3)}.grt{color:var(--ac);flex:1}
.ot{width:100%;border-collapse:separate;border-spacing:0}
.ot th{text-align:left;padding:6px 8px;font-size:9px;text-transform:uppercase;color:var(--t3);border-bottom:1px solid var(--bd)}
.ot td{padding:6px 8px;font-size:11px;border-bottom:1px solid var(--bd)}.ot tr:hover td{background:var(--b3)}
.stg{display:inline-flex;padding:2px 7px;border-radius:12px;font-size:9px;font-weight:500}
.stg.si{background:#4A9EF518;color:var(--in)}.stg.st_{background:var(--ad);color:var(--ac)}.stg.str{background:#A66BF518;color:var(--pu)}.stg.sae{background:#F5943A18;color:var(--or)}.stg.srv{background:#E8474718;color:var(--er)}.stg.sdl{background:var(--od);color:var(--ok)}
.spn{display:inline-block;width:13px;height:13px;border:2px solid var(--bd);border-top-color:var(--ac);border-radius:50%;animation:sp .7s linear infinite}@keyframes sp{to{transform:rotate(360deg)}}
.lbr{height:3px;background:var(--bd);border-radius:2px;overflow:hidden;margin:8px 0}.lbi{height:100%;background:linear-gradient(90deg,var(--ac),var(--ok));border-radius:2px;transition:width .4s}
.toasts{position:fixed;top:12px;right:12px;z-index:1000;display:flex;flex-direction:column;gap:5px}
.tst{padding:9px 13px;border-radius:6px;font-size:11px;animation:tI .25s ease;max-width:320px;font-family:"Outfit",sans-serif}
.tst.su{background:var(--ok);color:var(--b0)}.tst.er{background:var(--er);color:#fff}.tst.inf{background:var(--in);color:#fff}
@keyframes tI{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
.em{text-align:center;padding:36px;color:var(--t3)}.ei{font-size:36px;margin-bottom:8px}
.SG{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.SC{background:var(--b2);border:1px solid var(--bd);border-radius:7px;padding:12px;backdrop-filter:blur(8px)}.SC h4{font-size:11px;font-weight:600;margin-bottom:8px}.SF{grid-column:1/-1}
.thu{display:flex;gap:5px;flex-wrap:wrap;margin-top:6px}.thm{width:52px;height:52px;object-fit:cover;border-radius:5px;border:1px solid var(--bd);cursor:pointer}
a{color:var(--ac)}
@media(max-width:860px){.S{width:50px;min-width:50px}.Sh h1,.Sh p,.ni span:not(.ni-i),.ni-b,.Sf{display:none}.ni{justify-content:center;padding:9px}.tc,.SG{grid-template-columns:1fr}.dtg,.cxg,.r2,.r3{grid-template-columns:1fr 1fr}.ps span{display:none}}`;

export default function App(){
  const[pg,sPg]=useState("new");
  const[ord,sOrd]=useState(()=>LS.g("ord",[]));
  const[cur,sCur]=useState(null);
  const[ak,sAk]=useState(()=>LS.g("ak",""));
  const[gu,sGu]=useState(()=>LS.g("gu",""));
  const[md,sMd]=useState(()=>LS.g("md","gemini-2.0-flash"));
  const[aep,sAep]=useState(()=>LS.g("aep",DEF_AE));
  const[tts,sTts]=useState([]);
  const[gok,sGok]=useState(false);
  const[gcf,sGcf]=useState(null);
  const gas=useRef(null);
  const toast=useCallback((m,t="info")=>{const id=Date.now();sTts(v=>[...v,{id,m,t}]);setTimeout(()=>sTts(v=>v.filter(x=>x.id!==id)),3500);},[]);
  useEffect(()=>{LS.s("ord",ord);},[ord]);
  const sv=(k,v)=>LS.s(k,v);
  useEffect(()=>{if(!gu){sGok(false);gas.current=null;return;}const g=new GAS(gu);gas.current=g;g.gc().then(c=>{sGok(true);sGcf(c)}).catch(()=>sGok(false));},[gu]);
  const aok=ak.length>10;
  const bs=s=>ord.filter(o=>o.stage===s).length;
  const nav=[{id:"new",ic:"📥",lb:"Новый заказ"},{id:"ord",ic:"📋",lb:"Заказы",bd:ord.length||null},{id:"rev",ic:"✏️",lb:"Ревью",bd:(bs("review")+bs("ai_edit"))||null},{id:"set",ic:"⚙️",lb:"Настройки",bd:(!aok||!gok)?"!":null}];

  return(<><style>{CSS}</style><div className="R">
    <div className="toasts">{tts.map(t=><div key={t.id} className={`tst ${t.t==="success"?"su":t.t==="error"?"er":"inf"}`}>{t.m}</div>)}</div>
    <aside className="S">
      <div className="Sh"><h1>The Words</h1><p>Translation Bureau</p></div>
      <nav className="Sn">{nav.map(n=><button key={n.id} className={`ni ${pg===n.id?"on":""}`} onClick={()=>sPg(n.id)}><span className="ni-i">{n.ic}</span><span>{n.lb}</span>{n.bd&&<span className="ni-b">{n.bd}</span>}</button>)}</nav>
      <div className="Sf"><div className="sfr"><span className="l">Заказов</span><span className="v">{ord.length}</span></div><div className="sfr"><span className="l">Sheets</span><span className="v">{gok?"✓":"✗"}</span></div><div className="sfr"><span className="l">Gemini</span><span className="v">{aok?"✓":"✗"}</span></div></div>
    </aside>
    <main className="M">
      <div className="TB"><h2>{nav.find(n=>n.id===pg)?.ic} {nav.find(n=>n.id===pg)?.lb}</h2><div className="ist"><div className={`dot ${aok?"on":""}`}/>{aok?"Gemini":"Нет API"}</div><div className="ist2"><div className={`dot ${gok?"on":""}`}/>{gok?"Sheets✓":"Sheets✗"}</div></div>
      {cur&&pg==="new"&&<PipeV stage={cur.stage} ae={cur.useAiEdit}/>}
      <div className="CT">
        {pg==="new"&&<NewOrd {...{cur,sCur,ord,sOrd,ak,aok,md,gas:gas.current,gok,aep,toast}}/>}
        {pg==="ord"&&<OrdPage {...{ord,gas:gas.current,gok,toast}}/>}
        {pg==="rev"&&<RevPage {...{ord,sOrd,gas:gas.current,gok,ak,aok,md,aep,toast}}/>}
        {pg==="set"&&<SetPage {...{ak,sAk:v=>{sAk(v);sv("ak",v)},gu,sGu:v=>{sGu(v);sv("gu",v)},md,sMd:v=>{sMd(v);sv("md",v)},aep,sAep:v=>{sAep(v);sv("aep",v)},gok,gcf,toast}}/>}
      </div>
    </main>
  </div></>);
}

function PipeV({stage,ae}){
  const s=["intake","classify","translate"];if(ae)s.push("ai_edit");s.push("review","deliver");
  const ci=s.indexOf(stage);
  return<div className="PP">{s.map((x,i)=><div key={x} className={`ps ${i<ci?"ok":i===ci?"on":""}`}>{SM[x].i} <span>{SM[x].l}</span></div>)}</div>;
}

function NewOrd({cur,sCur,ord,sOrd,ak,aok,md,gas,gok,aep,toast}){
  const[cl,sCl]=useState("");const[ct,sCt]=useState("Физлицо");const[lp,sLp]=useState("ru-kk");
  const[dt,sDt]=useState(null);const[cx,sCx]=useState(null);const[pr,sPr]=useState("");const[nt,sNt]=useState("");const[ae,sAe]=useState(false);
  const[ss,sSS]=useState([]);const[df,sDF]=useState([]);const[st,sSt]=useState("");const[mn,sMn]=useState("");
  const[scn,sScn]=useState(false);const[adt,sAdt]=useState(null);const[clf,sClf]=useState(false);const[trl,sTrl]=useState(false);
  const[res,sRes]=useState("");const[ed,sEd]=useState("");const[prg,sPrg]=useState(0);const[dg,sDg]=useState(false);
  const ssr=useRef(null);const dr=useRef(null);
  const src=st||mn;const lf=lp.split("-")[0];const lt=lp.split("-")[1];

  const reset=()=>{sCur(null);sCl("");sCt("Физлицо");sLp("ru-kk");sDt(null);sCx(null);sPr("");sNt("");sAe(false);sSS([]);sDF([]);sSt("");sMn("");sAdt(null);sRes("");sEd("");sPrg(0);};

  const addSS=async(files)=>{const a=[];for(const f of files){a.push({file:f,b64:await f2b(f),mime:f.type||"image/png",prev:URL.createObjectURL(f)});}sSS(p=>[...p,...a]);toast(a.length+" скрин(ов)","success");};
  const addDF=async(files)=>{const a=[];for(const f of files){const e={file:f,text:"",b64:"",mime:f.type||"application/octet-stream"};if(isVis(f))e.b64=await f2b(f);else if(isTxt(f))e.text=(await f2t(f)).substring(0,50000);else e.b64=await f2b(f);a.push(e);}sDF(p=>[...p,...a]);toast(a.length+" файл(ов)","success");};

  const scanSS=async()=>{if(!aok||!ss.length)return;sScn(true);
    try{const t=await callAI(ak,md,`Проанализируй скриншот(ы) заявки на перевод. Извлеки ВСЕ данные.\nJSON без markdown: {"clientName":"","clientType":"Физлицо/Юрлицо","langFrom":"ru/kk/en","langTo":"ru/kk/en","docType":"legal/medical/technical/financial/personal/marketing","price":"","notes":"","documentText":"","complexity":"phys_template/phys_template_new/phys_new/jur_translate/jur_ai_edit/jur_ai_edit_plus/jur_smartcat"}`,ss.map(s=>({mime:s.mime,b64:s.b64})));
    const m=t.match(/\{[\s\S]*\}/);if(m){const d=JSON.parse(m[0]);if(d.clientName)sCl(d.clientName);if(d.clientType)sCt(d.clientType);if(d.langFrom&&d.langTo)sLp(d.langFrom+"-"+d.langTo);if(d.docType&&DT.find(x=>x.id===d.docType))sDt(d.docType);if(d.price)sPr(d.price);if(d.notes)sNt(d.notes);if(d.documentText)sSt(d.documentText);if(d.complexity&&CX.find(x=>x.id===d.complexity)){sCx(d.complexity);if(d.complexity.includes("ai_edit"))sAe(true);}toast("📋 Данные из скринов!","success");}
    }catch(e){toast(e.message,"error");}sScn(false);};

  const extractText=async()=>{if(!aok||!df.length)return;let all="";for(const doc of df){if(doc.text)all+=doc.text+"\n\n";else if(doc.b64){try{all+=(await callAI(ak,md,"Извлеки ВЕСЬ текст из документа. Только текст.",[{mime:doc.mime,b64:doc.b64}]))+"\n\n";}catch{}}}if(all.trim()){sSt(all.trim().substring(0,50000));toast("Текст извлечён","success");}};

  const classify=async()=>{if(!src.trim())return;sClf(true);sPrg(25);
    try{const t=await callAI(ak,md,`Классифицируй: legal,medical,technical,financial,personal,marketing.\nJSON: {"type":"...","confidence":0.0-1.0,"reason":"..."}\n\n${src.substring(0,3000)}`);
    const m=t.match(/\{[\s\S]*?\}/);if(m){const p=JSON.parse(m[0]);const f=DT.find(x=>x.id===p.type);if(f){sAdt({...p,...f});sDt(p.type);sPrg(50);toast(f.icon+" "+f.label,"success");}}
    }catch(e){toast(e.message,"error");}sClf(false);};

  const translate=async()=>{if(!dt)return;sTrl(true);sPrg(60);
    const gl=GL[dt]?.[lp]||{};const gs=Object.entries(gl).length?"\nГлоссарий:\n"+Object.entries(gl).map(([k,v])=>`"${k}"→"${v}"`).join("\n"):"";
    const ln={ru:"русский",kk:"казахский",en:"английский"};
    try{const t=await callAI(ak,md,`${PR[dt]}\n${ln[lf]}→${ln[lt]}${gs}\nПереведи, ТОЛЬКО перевод:\n\n${src.substring(0,30000)}`);
    if(!t){toast("Пустой ответ","error");sTrl(false);return;}
    sRes(t);sEd(t);sPrg(ae?70:80);
    const tr=TR.find(x=>x.spec.includes(dt))?.name||"Не назначен";
    const oid=`TW-${String(ord.length+1).padStart(4,"0")}`;const stage=ae?"ai_edit":"review";
    const order={id:oid,clientName:cl||"Без имени",clientType:ct,fileName:df.map(f=>f.file.name).join(", ")||"Ручной ввод",langPair:lp,docType:dt,complexity:cx,sourceText:src.substring(0,5000),aiTranslation:t,editedTranslation:t,stage,useAiEdit:ae,price:pr,notes:nt,createdAt:new Date().toISOString(),wordCount:src.split(/\s+/).length,assignedTo:tr};
    sCur(order);sOrd(p=>[...p,order]);
    if(gok&&gas){try{const cxL=CX.find(x=>x.id===cx)?.s||"";await gas.co({orderId:oid,clientName:cl||"Без имени",clientType:ct,langPair:lp.toUpperCase().replace("-"," → "),docType:DT.find(x=>x.id===dt)?.label,wordCount:src.split(/\s+/).length,translator:tr,comment:`${cxL}|${pr?pr+"₸":"—"}|${nt}`});await gas.us(oid,"AI Перевод");await gas.sf(oid,"original",src,lp,oid+"_ORIG_"+lp+".txt");await gas.sf(oid,"ai_translation",t,lp,oid+"_AI_"+lp+".txt");await gas.us(oid,ae?"Ред. ИИ":"На ревью");toast("📊 Sheets ✓","success");}catch(e){toast("Sheets: "+e.message,"error");}}
    toast(ae?"→ Ред. ИИ":"→ Ревью","success");
    }catch(e){toast(e.message,"error");}sTrl(false);};

  const runAE=async()=>{if(!cur||!res)return;sPrg(80);
    try{const t=await callAI(ak,md,`${aep}\n\nОригинал:\n${src.substring(0,5000)}\n\nЧерновой:\n${res}`);
    if(t){sEd(t);sPrg(90);const u={...cur,stage:"review",editedTranslation:t};sCur(u);sOrd(p=>p.map(o=>o.id===u.id?u:o));
    if(gok&&gas){try{await gas.sf(cur.id,"review",t,lp,cur.id+"_AIEDIT_"+lp+".txt");await gas.us(cur.id,"На ревью","Ред. ИИ");}catch{}}
    toast("🔧 → ревью","success");}}catch(e){toast(e.message,"error");}};

  const approve=async()=>{if(!cur)return;const u={...cur,stage:"deliver",editedTranslation:ed};sCur(u);sOrd(p=>p.map(o=>o.id===u.id?u:o));sPrg(100);
    if(gok&&gas){try{await gas.sf(cur.id,"review",ed,lp,cur.id+"_REV_"+lp+".txt");await gas.sf(cur.id,"final",ed,lp,cur.id+"_FINAL_"+lp+".txt");await gas.us(cur.id,"Готов","Одобрено");}catch{}}toast("✅ Готов!","success");};

  const dl=()=>{const b=new Blob([ed||res],{type:"text/plain;charset=utf-8"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=(cur?.id||"tr")+"_FINAL_"+lp+".txt";a.click();URL.revokeObjectURL(u);};

  const Gl=()=>{const g=GL[dt]?.[lp];if(!g||!Object.keys(g).length)return null;return<div className="gp"><h4>📚 Глоссарий</h4>{Object.entries(g).map(([s,t])=><div key={s} className="grw"><span className="grs">{s}</span><span className="gra">→</span><span className="grt">{t}</span></div>)}</div>;};

  if(!res) return(<>
    {cur&&<button className="bt bs bm" onClick={reset} style={{marginBottom:10}}>← Новый</button>}
    <div className="cd"><div className="hd"><h3>📸 Скриншоты заявки</h3><span className="bg">OCR</span></div>
      <p style={{fontSize:11,color:"var(--t3)",marginBottom:8}}>Загрузите скрин(ы) — AI заполнит форму</p>
      <div className={`uz ${dg?"dg":""}`} onClick={()=>ssr.current?.click()} onDragOver={e=>{e.preventDefault();sDg(true)}} onDragLeave={()=>sDg(false)} onDrop={e=>{e.preventDefault();sDg(false);addSS(Array.from(e.dataTransfer.files))}}>
        <div style={{fontSize:22}}>📸</div><div style={{fontSize:12,color:"var(--t2)"}}>PNG, JPG, PDF</div>
        <input ref={ssr} type="file" accept="image/*,.pdf" multiple style={{display:"none"}} onChange={e=>addSS(Array.from(e.target.files))}/></div>
      {ss.length>0&&<><div className="thu">{ss.map((s,i)=><img key={i} src={s.prev} alt="" className="thm" onClick={()=>sSS(p=>p.filter((_,j)=>j!==i))} title="Удалить"/>)}</div>
      <div className="bts"><button className="bt bp" onClick={scanSS} disabled={scn}>{scn?<><span className="spn"/> Анализ...</>:`🔍 Распознать ${ss.length} скрин(ов)`}</button></div></>}
    </div>
    <div className="cd"><div className="hd"><h3>📥 Данные</h3><span className="bg">Шаг 1</span></div>
      {!gok&&<div className="ds er">⚠ Sheets не подключён</div>}
      <div className="rw r3"><div className="fg"><label className="fl">Клиент</label><input className="fi" placeholder="Имя" value={cl} onChange={e=>sCl(e.target.value)}/></div><div className="fg"><label className="fl">Тип</label><select className="fsl" value={ct} onChange={e=>sCt(e.target.value)}><option>Физлицо</option><option>Юрлицо</option></select></div><div className="fg"><label className="fl">Стоимость ₸</label><input className="fi" placeholder="0" value={pr} onChange={e=>sPr(e.target.value)}/></div></div>
      <div className="rw r2"><div className="fg"><label className="fl">Языки</label><select className="fsl" value={lp} onChange={e=>sLp(e.target.value)}>{LP.map(l=><option key={l.from+"-"+l.to} value={l.from+"-"+l.to}>{l.label}</option>)}</select></div><div className="fg"><label className="fl">Тип документа</label><select className="fsl" value={dt||""} onChange={e=>sDt(e.target.value||null)}><option value="">— AI определит —</option>{DT.map(d=><option key={d.id} value={d.id}>{d.icon} {d.label}</option>)}</select></div></div>
      <div className="fg"><label className="fl">Сложность</label><div className="cxg">{CX.map(c=><button key={c.id} className={`cxc ${cx===c.id?"sl":""}`} onClick={()=>{sCx(c.id);if(c.id.includes("ai_edit")||c.id.includes("smartcat"))sAe(true)}}>{c.label}</button>)}</div></div>
      <div className="fg" style={{display:"flex",alignItems:"center",gap:7}}><input type="checkbox" checked={ae} onChange={e=>sAe(e.target.checked)} style={{accentColor:"var(--pu)"}}/><label style={{fontSize:12,color:"var(--t2)",cursor:"pointer"}} onClick={()=>sAe(!ae)}>🔧 Этап «Ред. ИИ»</label></div>
      <div className="fg"><label className="fl">Примечания</label><textarea className="fi" rows={2} placeholder="Комментарии..." value={nt} onChange={e=>sNt(e.target.value)} style={{resize:"vertical"}}/></div>
    </div>
    <div className="cd"><div className="hd"><h3>📄 Файлы</h3><span className="bg">Шаг 2</span></div>
      <div className="uz" onClick={()=>dr.current?.click()}><div style={{fontSize:22}}>📄</div><div style={{fontSize:12,color:"var(--t2)"}}>PDF, Word, Excel, PNG, JPG, CSV, TXT</div>
        <input ref={dr} type="file" accept=".pdf,.doc,.docx,.xlsx,.xls,.csv,.txt,.md,.html,.png,.jpg,.jpeg,.webp" multiple style={{display:"none"}} onChange={e=>addDF(Array.from(e.target.files))}/></div>
      {df.map((d,i)=><div key={i} className="fp"><span>📄</span><span className="fn">{d.file.name}</span><span className="fz">{(d.file.size/1024).toFixed(1)}КБ</span><button className="fr" onClick={()=>sDF(p=>p.filter((_,j)=>j!==i))}>✕</button></div>)}
      {df.length>0&&!st&&<div className="bts"><button className="bt bs bm" onClick={extractText}>📖 Извлечь текст</button></div>}
      {!df.length&&<div className="fg" style={{marginTop:8}}><label className="fl">Или текст</label><textarea className="fi" rows={3} placeholder="Вставьте..." value={mn} onChange={e=>sMn(e.target.value)} style={{resize:"vertical"}}/></div>}
      {st&&<div className="ds in">✓ {st.split(/\s+/).length} слов</div>}
      <div className="bts"><button className="bt bp" disabled={!src.trim()||clf} onClick={classify}>{clf?<><span className="spn"/> Кл-ция...</>:"🔍 Классифицировать"}</button>{dt&&<button className="bt bv" disabled={!src.trim()||trl} onClick={translate}>{trl?<><span className="spn"/> Перевод...</>:"🤖 Перевести"}</button>}</div>
      {trl&&<div className="lbr"><div className="lbi" style={{width:prg+"%"}}/></div>}
    </div>
    {adt&&!res&&<div className="cd"><div className="hd"><h3>🔍 Тип</h3></div>
      <div style={{display:"flex",alignItems:"center",gap:8,padding:9,background:"var(--b1)",borderRadius:6,border:"1px solid var(--bd)"}}><span style={{fontSize:22}}>{adt.icon}</span><div><div style={{fontSize:13,fontWeight:600}}>{adt.label}</div><div style={{fontSize:10,color:"var(--t3)"}}>{Math.round(adt.confidence*100)}% — {adt.reason}</div></div></div>
      <div className="fg" style={{marginTop:10}}><label className="fl">Изменить</label><div className="dtg">{DT.map(d=><button key={d.id} className={`dtc ${dt===d.id?"sl":""}`} onClick={()=>sDt(d.id)}><span className="dti">{d.icon}</span>{d.label}</button>)}</div></div>
      <div className="bts"><button className="bt bv" disabled={!dt||trl} onClick={translate}>🤖 Перевести</button></div>
    </div>}
  </>);

  if(cur?.stage==="ai_edit") return(<div className="cd"><div className="hd"><h3>🔧 Ред. ИИ — {cur.id}</h3><span className="bg" style={{background:"#A66BF518",color:"var(--pu)"}}>Ред. ИИ</span></div>
    <div className="tc"><div className="tp"><div className="tph">AI Перевод</div><div className="tpb">{res}</div></div><div className="tp"><div className="tph">После ред. ИИ</div><div className="tpb">{ed!==res?ed:<span style={{color:"var(--t3)"}}>Нажмите кнопку...</span>}</div></div></div>
    <div className="bts"><button className="bt bv" onClick={runAE}>🔧 Ред. ИИ</button><button className="bt bs" onClick={()=>{const u={...cur,stage:"review"};sCur(u);sOrd(p=>p.map(o=>o.id===u.id?u:o))}}>⏭ Пропустить</button></div>
  </div>);

  if(cur?.stage==="review") return(<div className="cd"><div className="hd"><h3>✏️ Ревью — {cur.id}</h3></div>
    {cur.price&&<div className="ds in">💰 {cur.price} ₸</div>}{cur.notes&&<div className="ds in">📝 {cur.notes}</div>}{cur.complexity&&<div className="ds in">📊 {CX.find(c=>c.id===cur.complexity)?.label}</div>}
    <div className="tc"><div className="tp"><div className="tph"><span>Оригинал ({lf.toUpperCase()})</span><span>{src.split(/\s+/).length} сл.</span></div><div className="tpb">{src}</div></div><div className="tp"><div className="tph"><span>Перевод ({lt.toUpperCase()})</span><span>{ed.split(/\s+/).length} сл.</span></div><div className="tpb"><textarea value={ed} onChange={e=>sEd(e.target.value)}/></div></div></div>
    <Gl/><div className="bts"><button className="bt bo" onClick={approve}>✅ Одобрить</button><button className="bt bs" onClick={dl}>⬇️ Скачать</button></div>
  </div>);

  if(cur?.stage==="deliver") return(<div className="cd" style={{borderColor:"var(--ok)"}}><div className="hd"><h3>✅ {cur.id}</h3><span className="bg" style={{background:"var(--ok)",color:"var(--b0)"}}>Готов</span></div>
    <p style={{fontSize:12,color:"var(--t2)",marginBottom:8}}>Готов{cur.clientName!=="Без имени"?` для ${cur.clientName}`:""}.{cur.price?` ${cur.price}₸.`:""}{gok?" Drive ✓":""}</p>
    <div className="bts"><button className="bt bo" onClick={dl}>⬇️ Скачать</button><button className="bt bp" onClick={reset}>📥 Новый</button></div>
  </div>);
  return null;
}

function OrdPage({ord,gas,gok,toast}){
  const[rm,sRm]=useState(null);const[sy,sSy]=useState(false);
  const sync=async()=>{if(!gok||!gas)return;sSy(true);try{const d=await gas.go();sRm(d);toast(d.length+" из Sheets","success");}catch(e){toast(e.message,"error");}sSy(false);};
  const d=rm||ord;const isR=!!rm;
  if(!d.length)return<div className="em"><div className="ei">📋</div><p>Нет заказов</p></div>;
  const stCls=s=>s==="Принят"?"si":s==="AI Перевод"?"str":s==="Ред. ИИ"?"sae":s==="На ревью"?"srv":s==="Готов"?"sdl":"st_";
  return(<><div className="bts" style={{marginTop:0,marginBottom:12}}>{gok&&<button className="bt bs bm" onClick={sync} disabled={sy}>{sy?<span className="spn"/>:"🔄 Sheets"}</button>}{isR&&<button className="bt bs bm" onClick={()=>sRm(null)}>Лок.</button>}</div>
    <div className="cd" style={{padding:0,overflow:"auto"}}><table className="ot"><thead><tr><th>ID</th><th>Клиент</th><th>Языки</th><th>Тип</th><th>Слож.</th><th>₸</th><th>Слов</th><th>Статус</th><th>Дата</th></tr></thead>
    <tbody>{(isR?d:[...d].reverse()).map((o,i)=>{
      const id=isR?o["ID заказа"]:o.id,cl=isR?o["Клиент"]:o.clientName,lg=isR?o["Языковая пара"]:o.langPair?.toUpperCase().replace("-"," → ");
      const tp=isR?o["Тип документа"]:DT.find(x=>x.id===o.docType)?.label;const wc=isR?o["Кол-во слов"]:o.wordCount;
      const s=isR?o["Статус"]:SM[o.stage]?.l;const dt=isR?o["Дата создания"]:new Date(o.createdAt).toLocaleDateString("ru-RU");
      const cxL=isR?"":CX.find(c=>c.id===o.complexity)?.s||"—";const p=isR?"":o.price?o.price+"₸":"—";
      const sc=isR?stCls(s):(o.stage==="intake"?"si":o.stage==="translate"?"str":o.stage==="ai_edit"?"sae":o.stage==="review"?"srv":o.stage==="deliver"?"sdl":"st_");
      return<tr key={id||i}><td style={{fontFamily:"'JetBrains Mono',monospace",color:"var(--ac)"}}>{id}</td><td>{cl}</td><td>{lg}</td><td>{tp}</td><td style={{fontSize:9}}>{cxL}</td><td style={{fontSize:10}}>{p}</td><td>{wc}</td><td><span className={`stg ${sc}`}>{s}</span></td><td style={{color:"var(--t3)",fontSize:10}}>{dt}</td></tr>;
    })}</tbody></table></div></>);
}

function RevPage({ord,sOrd,gas,gok,ak,aok,md,aep,toast}){
  const rv=ord.filter(o=>o.stage==="review"||o.stage==="ai_edit");
  const[aid,sAid]=useState(null);const[txt,sTxt]=useState("");const[edg,sEdg]=useState(false);
  const a=rv.find(o=>o.id===aid);

  const runAE=async()=>{if(!a)return;sEdg(true);try{const r=await callAI(ak,md,`${aep}\n\nОригинал:\n${a.sourceText}\n\nЧерновой:\n${a.aiTranslation}`);if(r){sTxt(r);sOrd(p=>p.map(o=>o.id===a.id?{...o,stage:"review",editedTranslation:r}:o));if(gok&&gas){try{await gas.us(a.id,"На ревью","Ред. ИИ");}catch{}}toast("🔧 ✓","success");}}catch(e){toast(e.message,"error");}sEdg(false);};

  const ok=async()=>{if(!aid||!a)return;sOrd(p=>p.map(o=>o.id===aid?{...o,stage:"deliver",editedTranslation:txt}:o));
    if(gok&&gas){try{await gas.sf(aid,"review",txt,a.langPair,aid+"_REV.txt");await gas.sf(aid,"final",txt,a.langPair,aid+"_FINAL.txt");await gas.us(aid,"Готов","Одобрено");}catch(e){toast(e.message,"error");}}
    toast(aid+" ✓","success");sAid(null);};

  if(!rv.length&&!aid)return<div className="em"><div className="ei">✏️</div><p>Пусто</p></div>;
  if(a){const[f,t]=a.langPair.split("-");const isAE=a.stage==="ai_edit";
    return<><button className="bt bs bm" onClick={()=>sAid(null)} style={{marginBottom:10}}>← Назад</button>
    <div className="cd"><div className="hd"><h3>{isAE?"🔧":"✏️"} {a.id}</h3><span className="bg">{a.clientName} · {a.langPair.toUpperCase().replace("-"," → ")}</span></div>
    <div style={{fontSize:11,color:"var(--t3)",marginBottom:7}}>{DT.find(d=>d.id===a.docType)?.icon} {DT.find(d=>d.id===a.docType)?.label} · {a.wordCount} сл.{a.price&&<> · 💰{a.price}₸</>}{a.complexity&&<> · {CX.find(c=>c.id===a.complexity)?.s}</>}</div>
    {a.notes&&<div className="ds in">📝 {a.notes}</div>}
    {isAE&&<div className="bts" style={{marginBottom:10,marginTop:0}}><button className="bt bv" onClick={runAE} disabled={edg||!aok}>{edg?<><span className="spn"/> Ред...</>:"🔧 Ред. ИИ"}</button><button className="bt bs bm" onClick={()=>sOrd(p=>p.map(o=>o.id===a.id?{...o,stage:"review"}:o))}>⏭</button></div>}
    <div className="tc"><div className="tp"><div className="tph">Оригинал ({f.toUpperCase()})</div><div className="tpb">{a.sourceText}</div></div><div className="tp"><div className="tph">Перевод ({t.toUpperCase()})</div><div className="tpb"><textarea value={txt} onChange={e=>sTxt(e.target.value)}/></div></div></div>
    {!isAE&&<div className="bts"><button className="bt bo" onClick={ok}>✅ Одобрить</button></div>}
    </div></>;
  }
  return rv.map(o=><div key={o.id} className="cd" style={{cursor:"pointer"}} onClick={()=>{sAid(o.id);sTxt(o.editedTranslation||o.aiTranslation)}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div><div style={{fontSize:13,fontWeight:600}}>{o.stage==="ai_edit"?"🔧":"✏️"} {o.id} — {o.clientName}</div><div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>{DT.find(d=>d.id===o.docType)?.icon} {o.langPair.toUpperCase().replace("-"," → ")} · {o.wordCount} сл.{o.price&&<> · 💰{o.price}₸</>}</div></div>
      <button className={`bt bm ${o.stage==="ai_edit"?"bv":"bp"}`}>{o.stage==="ai_edit"?"Ред.ИИ":"Ревью"} →</button>
    </div></div>);
}

function SetPage({ak,sAk,gu,sGu,md,sMd,aep,sAep,gok,gcf,toast}){
  const[k,sK]=useState(ak);const[u,sU]=useState(gu);const[tst,sTst]=useState(false);const[rs,sRs]=useState("");
  const test=async()=>{sTst(true);sRs("...");try{const r=await fetch(u+"?action=getConfig",{redirect:"follow"});const d=await r.json();if(d.success){sRs("✅ OK!");sGu(u);toast("✓","success");}else sRs("❌ "+d.error);}catch(e){sRs("❌ "+e.message);}sTst(false);};
  return(<div className="SG">
    <div className="SC"><h4>🔗 Google Apps Script</h4><div className={`ds ${gok?"ok":"er"}`}>{gok?"✓ Sheets+Drive":"✗ Нет"}</div>
      <div className="fg"><label className="fl">URL</label><input className="fi" placeholder="https://script.google.com/macros/s/.../exec" value={u} onChange={e=>sU(e.target.value)}/></div>
      <div className="bts" style={{marginTop:6}}><button className="bt bp bm" onClick={()=>{sGu(u);toast("OK","info")}}>💾</button><button className="bt bs bm" onClick={test} disabled={tst||!u}>{tst?<span className="spn"/>:"🔍 Тест"}</button></div>
      {rs&&<div style={{marginTop:8,fontSize:11,color:"var(--t2)",padding:7,background:"var(--b1)",borderRadius:5,border:"1px solid var(--bd)"}}>{rs}</div>}
      {gok&&gcf&&<div style={{marginTop:10,fontSize:11}}>📊 <a href={gcf.spreadsheetUrl} target="_blank" rel="noopener">Sheets</a> · 📁 <a href={gcf.driveFolderUrl} target="_blank" rel="noopener">Drive</a></div>}</div>
    <div className="SC"><h4>🔑 Gemini API</h4>
      <div className="fg"><label className="fl">Ключ</label><input className="fi" type="password" placeholder="AIza..." value={k} onChange={e=>sK(e.target.value)}/></div>
      <div className="fg"><label className="fl">Модель</label><select className="fsl" value={md} onChange={e=>sMd(e.target.value)}><option value="gemini-2.0-flash">2.0 Flash</option><option value="gemini-2.0-flash-lite">Flash Lite</option><option value="gemini-1.5-pro">1.5 Pro</option></select></div>
      <button className="bt bp bm" onClick={()=>{sAk(k);toast("✓","success")}}>💾</button></div>
    <div className="SC SF"><h4>🔧 Промпт «Ред. ИИ»</h4>
      <textarea className="fi" rows={5} value={aep} onChange={e=>sAep(e.target.value)} style={{resize:"vertical",fontFamily:"'JetBrains Mono',monospace",fontSize:11}}/>
      <div className="bts"><button className="bt bs bm" onClick={()=>{sAep(DEF_AE);toast("Сброшен","info")}}>↩ Сбросить</button></div></div>
    <div className="SC"><h4>👥 Переводчики</h4>{TR.map(t=><div key={t.id} style={{padding:"5px 0",borderBottom:"1px solid var(--bd)"}}><div style={{fontSize:12,fontWeight:500}}>{t.name}</div><div style={{fontSize:10,color:"var(--t3)"}}>{t.langs.map(l=>l.toUpperCase().replace("-","→")).join(", ")} · {t.spec.map(s=>DT.find(d=>d.id===s)?.label).join(", ")}</div></div>)}</div>
    <div className="SC"><h4>📚 Глоссарии</h4>{Object.entries(GL).filter(([_,v])=>Object.keys(v).length>0).map(([type,langs])=><div key={type} style={{marginBottom:5}}><div style={{fontSize:11,fontWeight:500}}>{DT.find(d=>d.id===type)?.icon} {DT.find(d=>d.id===type)?.label}</div>{Object.entries(langs).map(([lp,terms])=><div key={lp} style={{fontSize:10,color:"var(--t3)",paddingLeft:5}}>{lp.toUpperCase().replace("-"," → ")}: {Object.keys(terms).length}</div>)}</div>)}</div>
  </div>);
}
