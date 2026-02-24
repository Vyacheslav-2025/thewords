import{useState,useEffect,useCallback,useRef}from"react";

// ═══ CONSTANTS ═══
const LP=[{from:"ru",to:"kk",label:"Русский → Казахский"},{from:"kk",to:"ru",label:"Казахский → Русский"},{from:"ru",to:"en",label:"Русский → Английский"},{from:"en",to:"ru",label:"Английский → Русский"},{from:"kk",to:"en",label:"Казахский → Английский"},{from:"en",to:"kk",label:"Английский → Казахский"}];
const DT=[{id:"legal",label:"Юридический",icon:"⚖️"},{id:"medical",label:"Медицинский",icon:"🏥"},{id:"technical",label:"Технический",icon:"⚙️"},{id:"financial",label:"Финансовый",icon:"📊"},{id:"personal",label:"Личный документ",icon:"📋"},{id:"marketing",label:"Маркетинг",icon:"📢"}];
const CX=[{id:"phys_template",label:"Физлицо — шаблонные",s:"Физ/Шабл"},{id:"phys_template_new",label:"Физлицо — шабл.+новый",s:"Физ/Ш+Н"},{id:"phys_new",label:"Физлицо — новый перевод",s:"Физ/Нов"},{id:"jur_translate",label:"Юрлицо — только перевод",s:"Юр/Пер"},{id:"jur_ai_edit",label:"Юрлицо — перевод+ред.ИИ",s:"Юр/+РИИ"},{id:"jur_ai_edit_plus",label:"Юрлицо — перевод+ред.ИИ+доп.",s:"Юр/РИИ+"},{id:"jur_smartcat",label:"Юрлицо — перевод+ред.ИИ+Smartcat",s:"Юр/SC"}];
const SM={intake:{l:"Принят",i:"📥"},classify:{l:"Анализ",i:"🔍"},translate:{l:"AI Перевод",i:"🤖"},ai_edit:{l:"Ред. ИИ",i:"🔧"},review:{l:"Ревью",i:"✏️"},deliver:{l:"Готов",i:"✅"}};
const PR={legal:"Ты профессиональный юридический переводчик. Переводи точно, сохраняя терминологию.",medical:"Ты медицинский переводчик. Латинские термины оставляй.",technical:"Ты технический переводчик. Аббревиатуры с расшифровкой.",financial:"Ты финансовый переводчик. Числа без изменений.",personal:"Ты переводчик шаблонных документов. Имена транслитерируй.",marketing:"Ты маркетинговый переводчик. Слоганы адаптируй."};
const DEF_AE="Проверь перевод. Сравни с оригиналом. Найди ошибки: грамматика, терминология, стиль. Верни JSON: {correctedText:\"...\",errors:[{type,original,corrected,comment}]}";
const AI_PROVIDERS=[
  {id:"gemini",name:"Gemini",icon:"🔷",models:["gemini-2.0-flash","gemini-2.0-flash-lite","gemini-1.5-pro"]},
  {id:"openai",name:"ChatGPT",icon:"🟢",models:["gpt-4o","gpt-4o-mini","gpt-4-turbo"]},
  {id:"claude",name:"Claude",icon:"🟠",models:["claude-sonnet-4-20250514","claude-haiku-4-5-20251001"]},
  {id:"grok",name:"Grok",icon:"⚡",models:["grok-3","grok-3-mini"]},
  {id:"deepseek",name:"DeepSeek",icon:"🔵",models:["deepseek-chat","deepseek-reasoner"]}
];
const DEF_EXEC=[{id:1,name:"Переводчик 1",role:"translator",email:"",telegram:"",langs:["ru-kk","kk-ru"],spec:["legal","personal"],services:[{name:"Перевод",price:800,unit:"стр."}]},{id:2,name:"Переводчик 2",role:"translator",email:"",telegram:"",langs:["ru-en","en-ru"],spec:["technical","financial"],services:[{name:"Перевод",price:1000,unit:"стр."}]}];
const DEF_SCENARIOS=[
  {id:"standard",name:"Стандартный",steps:[{stage:"translate",ai:"gemini",model:"gemini-2.0-flash"},{stage:"review",ai:"human",model:""}],complexities:["phys_template","phys_template_new","phys_new","jur_translate"]},
  {id:"ai_edit",name:"С ред. ИИ",steps:[{stage:"translate",ai:"gemini",model:"gemini-2.0-flash"},{stage:"ai_edit",ai:"gemini",model:"gemini-2.0-flash"},{stage:"review",ai:"human",model:""}],complexities:["jur_ai_edit","jur_ai_edit_plus"]},
  {id:"full",name:"Полный",steps:[{stage:"translate",ai:"gemini",model:"gemini-2.0-flash"},{stage:"ai_edit",ai:"gemini",model:"gemini-2.0-flash"},{stage:"review",ai:"human",model:""}],complexities:["jur_smartcat"]}
];
const DRIVE_SCOPES="https://www.googleapis.com/auth/drive.file";

// ═══ AI CALLER ═══
async function callAI(key,mod,prompt,imgs,provider){
  provider=provider||"gemini";
  if(provider==="gemini"){
    const parts=[];if(imgs)for(const im of imgs)parts.push({inline_data:{mime_type:im.mime,data:im.b64}});
    parts.push({text:prompt});
    const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${mod}:generateContent?key=${key}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts}],generationConfig:{temperature:0.2,maxOutputTokens:8192}})});
    const d=await r.json();return d?.candidates?.[0]?.content?.parts?.[0]?.text||"";
  }
  if(provider==="openai"){const r=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+key},body:JSON.stringify({model:mod,messages:[{role:"user",content:prompt}],max_tokens:8192})});const d=await r.json();return d?.choices?.[0]?.message?.content||"";}
  if(provider==="claude"){const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":key,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:mod,max_tokens:8192,messages:[{role:"user",content:prompt}]})});const d=await r.json();return d?.content?.[0]?.text||"";}
  if(provider==="grok"){const r=await fetch("https://api.x.ai/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+key},body:JSON.stringify({model:mod,messages:[{role:"user",content:prompt}],max_tokens:8192})});const d=await r.json();return d?.choices?.[0]?.message?.content||"";}
  if(provider==="deepseek"){const r=await fetch("https://api.deepseek.com/chat/completions",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+key},body:JSON.stringify({model:mod,messages:[{role:"user",content:prompt}],max_tokens:8192})});const d=await r.json();return d?.choices?.[0]?.message?.content||"";}
  throw new Error("Unknown provider: "+provider);
}

// ═══ FILE MANAGER — Direct Google Drive API via OAuth ═══
class FileManager{
  constructor(clientId){this.clientId=clientId;this.token=null;this.rootId=null;}
  async init(){
    if(this.token)return true;
    // Try to get token from Google Identity Services
    return new Promise((res)=>{
      if(!window.google?.accounts?.oauth2){res(false);return;}
      const client=window.google.accounts.oauth2.initTokenClient({client_id:this.clientId,scope:DRIVE_SCOPES,callback:(resp)=>{if(resp.access_token){this.token=resp.access_token;res(true);}else res(false);}});
      client.requestAccessToken();
    });
  }
  setToken(t){this.token=t;}
  async api(url,opts={}){
    if(!this.token)throw new Error("Нет Drive токена");
    const r=await fetch(url,{...opts,headers:{...opts.headers,"Authorization":"Bearer "+this.token}});
    if(!r.ok){const t=await r.text();throw new Error("Drive API: "+r.status+" "+t.substring(0,200));}
    return r.json();
  }
  async findOrCreateFolder(name,parentId){
    const q=`name='${name}' and '${parentId||"root"}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const r=await this.api("https://www.googleapis.com/drive/v3/files?q="+encodeURIComponent(q)+"&fields=files(id,name)");
    if(r.files?.length)return r.files[0].id;
    const meta={name,mimeType:"application/vnd.google-apps.folder"};
    if(parentId)meta.parents=[parentId];
    const c=await this.api("https://www.googleapis.com/drive/v3/files",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(meta)});
    return c.id;
  }
  async ensureRoot(){
    if(this.rootId)return this.rootId;
    this.rootId=await this.findOrCreateFolder("The Words Bureau");
    return this.rootId;
  }
  async ensureOrderFolder(orderName){
    const root=await this.ensureRoot();
    return this.findOrCreateFolder(orderName,root);
  }
  async ensureSubFolder(orderFolderId,subName){
    return this.findOrCreateFolder(subName,orderFolderId);
  }
  // Upload file via multipart/related (Правильный подход для Google Drive)
  async uploadFile(file, folderId, fileName) {
    const metadata = { name: fileName || file.name, parents: [folderId] };
    const boundary = "-------314159265358979323846";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const fileData = await file.arrayBuffer();

    let body = delimiter;
    body += "Content-Type: application/json; charset=UTF-8\r\n\r\n";
    body += JSON.stringify(metadata);
    body += delimiter;
    body += `Content-Type: ${file.type || "application/octet-stream"}\r\n\r\n`;

    const bodyBlob = new Blob([body, fileData, closeDelimiter], {
      type: `multipart/related; boundary=${boundary}`
    });

    const r = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,size", {
      method: "POST",
      headers: { "Authorization": "Bearer " + this.token },
      body: bodyBlob // Browser automatically uses the Blob's type (multipart/related)
    });

    if (!r.ok) {
      const err = await r.text();
      throw new Error(`Upload failed (${r.status}): ${err.substring(0, 100)}`);
    }
    const d = await r.json();
    if (!d.id) throw new Error("Upload: no file ID returned");
    return d;
  }

  // Upload text content as a file via multipart/related
  async uploadText(text, folderId, fileName, mimeType) {
    const metadata = { name: fileName, parents: [folderId] };
    const boundary = "-------314159265358979323846";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    let body = delimiter;
    body += "Content-Type: application/json; charset=UTF-8\r\n\r\n";
    body += JSON.stringify(metadata);
    body += delimiter;
    body += `Content-Type: ${mimeType || "text/plain"}; charset=UTF-8\r\n\r\n`;
    body += text;
    body += closeDelimiter;

    const r = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,size", {
      method: "POST",
      headers: { 
        "Authorization": "Bearer " + this.token,
        "Content-Type": `multipart/related; boundary=${boundary}`
      },
      body: body
    });

    if (!r.ok) {
      const err = await r.text();
      throw new Error(`Upload text failed (${r.status}): ${err.substring(0, 100)}`);
    }
    return r.json();
  }
  // List files in folder
  async listFiles(folderId){
    const r=await this.api("https://www.googleapis.com/drive/v3/files?q='"+folderId+"'+in+parents+and+trashed=false&fields=files(id,name,webViewLink,size,mimeType)");
    return r.files||[];
  }
  // Download file content for AI processing
  async downloadAsBase64(fileId){
    const r=await fetch("https://www.googleapis.com/drive/v3/files/"+fileId+"?alt=media",{headers:{"Authorization":"Bearer "+this.token}});
    const blob=await r.blob();
    return new Promise((res)=>{const fr=new FileReader();fr.onload=()=>res({b64:fr.result.split(",")[1],mime:blob.type});fr.readAsDataURL(blob);});
  }
  ok(){return !!this.token;}
}

// ═══ GAS — ONLY metadata, NO file uploads ═══
class GAS{
  constructor(u){this.u=u}
  async c(p){const r=await fetch(this.u+"?"+new URLSearchParams(p),{redirect:"follow"});const d=await r.json();if(!d.success)throw new Error(d.error);return d.data}
  co(o){return this.c({action:"createOrder",orderId:o.orderId,clientName:o.clientName,clientType:o.clientType,langPair:o.langPair,docType:o.docType,wordCount:String(o.wordCount||0),translator:o.translator,comment:o.comment||""})}
  us(id,s,cm){return this.c({action:"updateStatus",orderId:id,status:s,comment:cm||""})}
  go(){return this.c({action:"getOrders"})}
  gc(){return this.c({action:"getConfig"})}
  log(id,stage,err){return this.c({action:"logError",orderId:id||"",stage:stage||"",error:(err||"").substring(0,500)}).catch(()=>{})}
}

// ═══ HELPERS ═══
function f2b(f){return new Promise((r,j)=>{const x=new FileReader();x.onload=()=>r(x.result.split(",")[1]);x.onerror=j;x.readAsDataURL(f)})}
function getMime(f){if(f.type)return f.type;const n=(f.name||"").toLowerCase();if(n.endsWith(".pdf"))return"application/pdf";if(n.endsWith(".png"))return"image/png";if(n.endsWith(".jpg")||n.endsWith(".jpeg"))return"image/jpeg";if(n.endsWith(".docx"))return"application/vnd.openxmlformats-officedocument.wordprocessingml.document";return"application/octet-stream"}
function orderFolderName(o){const d=new Date();const ds=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")+"_"+String(d.getHours()).padStart(2,"0")+String(d.getMinutes()).padStart(2,"0");return(o.clientName||"Клиент").replace(/[^\w\sа-яА-Я-]/gi,"").substring(0,30)+"_"+(o.langPair||"xx-xx")+"_"+ds;}
const LS={g(k,d){try{const v=localStorage.getItem("tw_"+k);return v?JSON.parse(v):d??null}catch{return d??null}},s(k,v){try{localStorage.setItem("tw_"+k,JSON.stringify(v))}catch{}}};

// ═══ CSS ═══
const CSS=`@import url("https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap");
:root{--b0:#08080D;--b1:#0F0F17;--b2:rgba(22,22,32,.8);--b3:#1C1C2A;--bd:#252538;--bh:#3A3A55;--t1:#EDEDF4;--t2:#9494AD;--t3:#5C5C75;--ac:#E8C547;--ad:#E8C54725;--ok:#3DDC84;--od:#3DDC8418;--er:#F44;--in:#4A9EF5;--pu:#A66BF5;--or:#F5943A}
*{margin:0;padding:0;box-sizing:border-box}body{font-family:"Outfit",sans-serif;background:var(--b0);color:var(--t1);min-height:100vh}
.R{display:flex;height:100vh;overflow:hidden}.S{width:220px;min-width:220px;background:var(--b1);border-right:1px solid var(--bd);display:flex;flex-direction:column}
.Sh{padding:16px 12px;border-bottom:1px solid var(--bd)}.Sh h1{font-size:16px;font-weight:700;color:var(--ac)}.Sh p{font-size:8px;color:var(--t3);text-transform:uppercase;letter-spacing:2px;margin-top:2px}
.Sn{padding:5px;flex:1;overflow-y:auto}.ni{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:6px;cursor:pointer;font-size:12px;color:var(--t2);border:none;background:none;width:100%;text-align:left;font-family:inherit;transition:all .12s}
.ni:hover{background:var(--b3);color:var(--t1)}.ni.on{background:var(--ad);color:var(--ac);font-weight:500}.ni-i{font-size:14px;width:18px;text-align:center}.ni-b{margin-left:auto;background:var(--ac);color:var(--b0);font-size:8px;font-weight:600;padding:1px 5px;border-radius:8px}
.Sf{padding:8px 12px;border-top:1px solid var(--bd);font-size:9px}.sfr{display:flex;justify-content:space-between;padding:1px 0}.sfr .l{color:var(--t3)}.sfr .v{color:var(--t2);font-family:"JetBrains Mono",monospace;font-size:8px}
.M{flex:1;display:flex;flex-direction:column;overflow:hidden}.TB{height:42px;border-bottom:1px solid var(--bd);display:flex;align-items:center;padding:0 16px;gap:8px;background:var(--b1);flex-shrink:0}.TB h2{font-size:13px;font-weight:600}
.dot{width:5px;height:5px;border-radius:50%;background:var(--er)}.dot.on{background:var(--ok)}.ist{display:flex;align-items:center;gap:4px;font-size:9px;color:var(--t3);margin-left:auto}
.CT{flex:1;overflow-y:auto;padding:16px}.cd{background:var(--b2);border:1px solid var(--bd);border-radius:9px;padding:14px;margin-bottom:10px;backdrop-filter:blur(8px)}
.hd{display:flex;align-items:center;gap:6px;margin-bottom:10px;flex-wrap:wrap}.hd h3{font-size:12px;font-weight:600}.bg{font-size:8px;padding:2px 7px;border-radius:12px;background:var(--ad);color:var(--ac);font-weight:500}
.ds{display:flex;align-items:center;gap:4px;padding:4px 8px;border-radius:4px;font-size:10px;margin-bottom:6px}.ds.ok{background:var(--od);color:var(--ok)}.ds.er{background:#F4444418;color:var(--er)}.ds.in{background:#4A9EF518;color:var(--in)}.ds.wt{background:#F5943A18;color:var(--or)}
.fg{margin-bottom:9px}.fl{display:block;font-size:9px;font-weight:500;color:var(--t2);margin-bottom:3px;text-transform:uppercase;letter-spacing:.3px}
.fi,.fsl{width:100%;padding:7px 10px;background:var(--b1);border:1px solid var(--bd);border-radius:5px;color:var(--t1);font-family:inherit;font-size:11px;outline:none}.fi:focus,.fsl:focus{border-color:var(--ac)}.fsl option{background:var(--b1)}
.rw{display:grid;gap:8px}.r2{grid-template-columns:1fr 1fr}.r3{grid-template-columns:1fr 1fr 1fr}
.uz{border:2px dashed var(--bd);border-radius:8px;padding:16px;text-align:center;cursor:pointer;background:var(--b1)}.uz:hover,.uz.dg{border-color:var(--ac);background:var(--ad)}
.fp{display:flex;align-items:center;gap:6px;padding:6px 8px;background:var(--b1);border-radius:5px;margin-top:4px;font-size:10px}.fp .fn{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.fp .fz{font-size:8px;color:var(--t3);font-family:"JetBrains Mono",monospace}.fp .fr{background:none;border:none;color:var(--er);cursor:pointer;font-size:12px}
.bt{display:inline-flex;align-items:center;gap:5px;padding:7px 14px;border-radius:5px;font-family:inherit;font-size:11px;font-weight:500;cursor:pointer;border:none;transition:all .12s}
.bp{background:var(--ac);color:var(--b0)}.bp:hover{filter:brightness(1.1)}.bp:disabled{opacity:.35;cursor:not-allowed}.bs{background:var(--b3);border:1px solid var(--bd);color:var(--t1)}.bs:hover{border-color:var(--bh)}
.bo{background:var(--ok);color:var(--b0)}.bv{background:var(--pu);color:#fff}.bm{padding:3px 9px;font-size:10px}.bts{display:flex;gap:5px;margin-top:8px;flex-wrap:wrap}
.cxg{display:grid;grid-template-columns:1fr 1fr;gap:3px}.cxc{padding:5px 7px;border-radius:4px;border:1px solid var(--bd);background:var(--b1);cursor:pointer;font-family:inherit;color:var(--t2);font-size:9px;text-align:left;line-height:1.3}.cxc:hover{border-color:var(--bh)}.cxc.sl{border-color:var(--pu);background:#A66BF518;color:var(--pu)}
.tc{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ot{width:100%;border-collapse:separate;border-spacing:0}.ot th{text-align:left;padding:5px 7px;font-size:8px;text-transform:uppercase;color:var(--t3);border-bottom:1px solid var(--bd)}.ot td{padding:5px 7px;font-size:10px;border-bottom:1px solid var(--bd)}.ot tr:hover td{background:var(--b3)}
.stg{display:inline-flex;padding:2px 6px;border-radius:10px;font-size:8px;font-weight:500}.stg.si{background:#4A9EF518;color:var(--in)}.stg.str{background:#A66BF518;color:var(--pu)}.stg.sae{background:#F5943A18;color:var(--or)}.stg.srv{background:#E8474718;color:var(--er)}.stg.sdl{background:var(--od);color:var(--ok)}
.spn{display:inline-block;width:12px;height:12px;border:2px solid var(--bd);border-top-color:var(--ac);border-radius:50%;animation:sp .7s linear infinite}@keyframes sp{to{transform:rotate(360deg)}}
.lbr{height:3px;background:var(--bd);border-radius:2px;overflow:hidden;margin:6px 0}.lbi{height:100%;background:linear-gradient(90deg,var(--ac),var(--ok));transition:width .4s}
.toasts{position:fixed;top:10px;right:10px;z-index:1000;display:flex;flex-direction:column;gap:4px}.tst{padding:8px 12px;border-radius:5px;font-size:10px;animation:tI .25s ease;max-width:300px;font-family:"Outfit",sans-serif}.tst.su{background:var(--ok);color:var(--b0)}.tst.er{background:var(--er);color:#fff}.tst.inf{background:var(--in);color:#fff}@keyframes tI{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
.em{text-align:center;padding:32px;color:var(--t3)}.ei{font-size:32px;margin-bottom:6px}
.SG{display:grid;grid-template-columns:1fr 1fr;gap:10px}.SC{background:var(--b2);border:1px solid var(--bd);border-radius:6px;padding:10px;backdrop-filter:blur(8px)}.SC h4{font-size:10px;font-weight:600;margin-bottom:6px}.SF{grid-column:1/-1}
.ai-chip{display:inline-flex;align-items:center;gap:3px;padding:3px 8px;border-radius:12px;font-size:9px;cursor:pointer;border:1px solid var(--bd);background:var(--b1);color:var(--t2);margin-right:3px;margin-bottom:3px;transition:all .12s}.ai-chip:hover{border-color:var(--bh)}.ai-chip.on{border-color:var(--ac);background:var(--ad);color:var(--ac)}
.step-card{background:var(--b1);border:1px solid var(--bd);border-radius:6px;padding:10px;margin-bottom:6px}.step-num{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:var(--ad);color:var(--ac);font-size:10px;font-weight:700;margin-right:6px}
.scenario-card{background:var(--b1);border:1px solid var(--bd);border-radius:6px;padding:10px;margin-bottom:6px;cursor:pointer;transition:all .12s}.scenario-card:hover{border-color:var(--bh)}.scenario-card.on{border-color:var(--ac);background:var(--ad)}
.exec-card{background:var(--b1);border:1px solid var(--bd);border-radius:6px;padding:10px;margin-bottom:8px}.exec-card h5{font-size:12px;font-weight:600;margin-bottom:4px}
.exec-tag{display:inline-block;font-size:8px;padding:1px 5px;border-radius:8px;background:var(--ad);color:var(--ac);margin-right:3px;margin-bottom:2px}
.flink{display:block;padding:4px 0;font-size:11px}.flink a{color:var(--in);text-decoration:none}.flink a:hover{text-decoration:underline}
a{color:var(--ac)}
@media(max-width:860px){.S{width:48px;min-width:48px}.Sh h1,.Sh p,.ni span:not(.ni-i),.ni-b,.Sf{display:none}.ni{justify-content:center;padding:8px}.tc,.SG{grid-template-columns:1fr}.cxg,.r2,.r3{grid-template-columns:1fr 1fr}}`;

// ═══ MAIN APP ═══
export default function App(){
  const[pg,sPg]=useState("new");
  const[ord,sOrd]=useState(()=>LS.g("ord",[]));
  const[cur,sCur]=useState(null);
  const[keys,sKeys]=useState(()=>LS.g("keys",{gemini:"",openai:"",claude:"",grok:"",deepseek:""}));
  const[gu,sGu]=useState(()=>LS.g("gu",""));
  const[md,sMd]=useState(()=>LS.g("md","gemini-2.0-flash"));
  const[aep,sAep]=useState(()=>LS.g("aep",DEF_AE));
  const[execs,sExecs]=useState(()=>LS.g("execs",DEF_EXEC));
  const[scenarios,sScenarios]=useState(()=>LS.g("scenarios",DEF_SCENARIOS));
  const[driveClientId,sDriveClientId]=useState(()=>LS.g("driveClientId",""));
  const[tts,sTts]=useState([]);
  const[gok,sGok]=useState(false);
  const[driveOk,sDriveOk]=useState(false);
  const gas=useRef(null);
  const fm=useRef(new FileManager(""));
  const toast=useCallback((m,t="info")=>{const id=Date.now();sTts(v=>[...v,{id,m,t}]);setTimeout(()=>sTts(v=>v.filter(x=>x.id!==id)),3500);},[]);
  useEffect(()=>{LS.s("ord",ord);},[ord]);
  useEffect(()=>{LS.s("execs",execs);},[execs]);
  useEffect(()=>{LS.s("scenarios",scenarios);},[scenarios]);
  const sv=(k,v)=>LS.s(k,v);
  useEffect(()=>{if(!gu){sGok(false);gas.current=null;return;}const g=new GAS(gu);gas.current=g;g.gc().then(()=>sGok(true)).catch(()=>sGok(false));},[gu]);
  const ak=keys.gemini;const aok=ak?.length>10;
  const getKey=p=>keys[p]||"";
  const nav=[{id:"new",ic:"🏠",lb:"Новый заказ"},{id:"ord",ic:"📋",lb:"Заказы",bd:ord.length||null},{id:"analysis",ic:"🔍",lb:"Анализ"},{id:"transl",ic:"🤖",lb:"Перевод"},{id:"editor",ic:"🔧",lb:"Редактор"},{id:"rev",ic:"✏️",lb:"Ревью"},{id:"exec",ic:"👥",lb:"Исполнители"},{id:"set",ic:"⚙️",lb:"Настройки"}];

  const connectDrive=async()=>{
    if(!driveClientId){toast("Укажи Google Client ID в настройках","error");return;}
    fm.current=new FileManager(driveClientId);
    // Load Google Identity Services
    if(!document.getElementById("gis-script")){
      const s=document.createElement("script");s.id="gis-script";s.src="https://accounts.google.com/gsi/client";s.async=true;
      s.onload=async()=>{const ok=await fm.current.init();sDriveOk(ok);if(ok)toast("Drive подключён","success");else toast("Drive: авторизация отменена","error");};
      document.head.appendChild(s);
    }else{const ok=await fm.current.init();sDriveOk(ok);if(ok)toast("Drive подключён","success");}
  };

  return(<><style>{CSS}</style><div className="R">
    <div className="toasts">{tts.map(t=><div key={t.id} className={`tst ${t.t==="success"?"su":t.t==="error"?"er":"inf"}`}>{t.m}</div>)}</div>
    <aside className="S"><div className="Sh"><h1>The Words</h1><p>Translation Bureau</p></div>
      <nav className="Sn">{nav.map(n=><button key={n.id} className={`ni ${pg===n.id?"on":""}`} onClick={()=>sPg(n.id)}><span className="ni-i">{n.ic}</span><span>{n.lb}</span>{n.bd&&<span className="ni-b">{n.bd}</span>}</button>)}</nav>
      <div className="Sf"><div className="sfr"><span className="l">Drive</span><span className="v">{driveOk?"✓ OAuth":"✗"}</span></div><div className="sfr"><span className="l">Sheets</span><span className="v">{gok?"✓":"✗"}</span></div><div className="sfr"><span className="l">AI</span><span className="v">{Object.values(keys).filter(v=>v?.length>5).length}/{AI_PROVIDERS.length}</span></div></div>
    </aside>
    <main className="M">
      <div className="TB"><h2>{nav.find(n=>n.id===pg)?.ic} {nav.find(n=>n.id===pg)?.lb}</h2><div className="ist"><div className={`dot ${driveOk?"on":""}`}/>Drive {driveOk?"✓":"✗"} <div className={`dot ${gok?"on":""}`} style={{marginLeft:8}}/>Sheets</div></div>
      <div className="CT">
        {pg==="new"&&<NewOrd {...{cur,sCur,ord,sOrd,ak,aok,md,gas:gas.current,gok,execs,toast,getKey,fm:fm.current,driveOk,onGoAnalysis:(oid)=>{sPg("analysis");setTimeout(()=>{window.__twSel=oid},100)}}}/>}
        {pg==="ord"&&<OrdPage {...{ord,gas:gas.current,gok,toast}}/>}
        {pg==="analysis"&&<AnalysisPage {...{ord,sOrd,execs,scenarios,toast,getKey,gas:gas.current,gok,fm:fm.current,driveOk,md,onGoPage:p=>sPg(p)}}/>}
        {pg==="transl"&&<TranslPage {...{ord,sOrd,toast,fm:fm.current,driveOk}}/>}
        {pg==="editor"&&<EditorPage {...{ord,sOrd,toast,fm:fm.current,driveOk}}/>}
        {pg==="rev"&&<RevPage {...{ord,sOrd,gas:gas.current,gok,toast,fm:fm.current,driveOk}}/>}
        {pg==="exec"&&<ExecPage execs={execs} sExecs={sExecs} toast={toast}/>}
        {pg==="set"&&<SetPage {...{keys,sKeys:v=>{sKeys(v);sv("keys",v)},gu,sGu:v=>{sGu(v);sv("gu",v)},md,sMd:v=>{sMd(v);sv("md",v)},aep,sAep:v=>{sAep(v);sv("aep",v)},scenarios,sScenarios:v=>{sScenarios(v);sv("scenarios",v)},driveClientId,sDriveClientId:v=>{sDriveClientId(v);sv("driveClientId",v)},gok,driveOk,connectDrive,toast}}/>}
      </div>
    </main>
  </div></>);
}

// ═══ NEW ORDER ═══
function NewOrd({cur,sCur,ord,sOrd,ak,aok,md,gas,gok,execs,toast,getKey,fm,driveOk,onGoAnalysis}){
  const[cl,sCl]=useState("");const[ct,sCt]=useState("Физлицо");const[lp,sLp]=useState("ru-kk");
  const[dt,sDt]=useState(null);const[cx,sCx]=useState(null);const[pr,sPr]=useState("");const[nt,sNt]=useState("");const[ae,sAe]=useState(false);
  const[ss,sSS]=useState([]);const[df,sDF]=useState([]);const[mn,sMn]=useState("");const[selExec,sSelExec]=useState("");
  const[scn,sScn]=useState(false);const[upl,sUpl]=useState(false);const[prg,sPrg]=useState(0);const[dg,sDg]=useState(false);
  const ssr=useRef(null);const dr=useRef(null);

  const reset=()=>{sCur(null);sCl("");sCt("Физлицо");sLp("ru-kk");sDt(null);sCx(null);sPr("");sNt("");sAe(false);sSS([]);sDF([]);sMn("");sPrg(0);sUpl(false)};
  const addSS=async(files)=>{const a=[];for(const f of files){a.push({file:f,b64:await f2b(f),mime:getMime(f),prev:URL.createObjectURL(f)});}sSS(p=>[...p,...a]);};
  const addDF=(files)=>{sDF(p=>[...p,...Array.from(files).map(f=>({file:f,mime:getMime(f)}))]);};

  const scanSS=async()=>{if(!aok||!ss.length)return;sScn(true);
    try{const t=await callAI(ak,md,"Проанализируй скриншот(ы) заявки на перевод. Извлеки ВСЕ данные.\nJSON без markdown: {\"clientName\":\"\",\"clientType\":\"Физлицо/Юрлицо\",\"langFrom\":\"ru/kk/en\",\"langTo\":\"ru/kk/en\",\"docType\":\"legal/medical/technical/financial/personal/marketing\",\"price\":\"\",\"notes\":\"\",\"complexity\":\"phys_template/phys_template_new/phys_new/jur_translate/jur_ai_edit/jur_ai_edit_plus/jur_smartcat\"}\nПустая строка если нет данных.",ss.map(s=>({mime:s.mime,b64:s.b64})));
    const m=t.match(/\{[\s\S]*\}/);if(m){const d=JSON.parse(m[0]);if(d.clientName)sCl(d.clientName);if(d.clientType)sCt(d.clientType);if(d.langFrom&&d.langTo)sLp(d.langFrom+"-"+d.langTo);if(d.docType&&DT.find(x=>x.id===d.docType))sDt(d.docType);if(d.price)sPr(d.price);if(d.notes)sNt(d.notes);if(d.complexity&&CX.find(x=>x.id===d.complexity)){sCx(d.complexity);if(d.complexity.includes("ai_edit")||d.complexity.includes("smartcat"))sAe(true);}toast("📋 Данные извлечены","success");}
    }catch(e){toast(e.message,"error");}sScn(false);};

  const launchWork=async()=>{
    if(!df.length&&!mn.trim()){toast("Загрузи файлы или введи текст","error");return;}
    sUpl(true);sPrg(5);
    const oid="TW-"+String(ord.length+1).padStart(4,"0");
    const fileLinks=[];
    // ── Upload originals to Drive via OAuth (multipart, NOT base64 through GAS) ──
    if(driveOk&&fm.ok()){
      try{
        const folderName=orderFolderName({clientName:cl,langPair:lp});
        const orderFolderId=await fm.ensureOrderFolder(folderName);
        const origFolderId=await fm.ensureSubFolder(orderFolderId,"01_Original");
        sPrg(15);
        for(let i=0;i<df.length;i++){
          const doc=df[i];sPrg(15+Math.round(i/df.length*60));
          const result=await fm.uploadFile(doc.file,origFolderId,doc.file.name);
          if(result?.id){
            fileLinks.push({name:doc.file.name,url:result.webViewLink||"",fileId:result.id,stage:"original"});
            toast("📁 "+doc.file.name+" → Drive ✓","success");
          }
        }
        // Store folder IDs for later stages
        sPrg(80);
      }catch(e){toast("Drive: "+e.message,"error");if(gas)gas.log(oid,"upload",e.message);}
    }else{toast("Drive не подключён — файлы сохранены локально","info");}
    // Keep local copies for AI processing
    const fileDatas=[];
    for(const d of df){try{fileDatas.push({name:d.file.name,b64:await f2b(d.file),mime:d.mime});}catch{}}
    // Create order
    const tr=selExec||execs.find(x=>x.spec?.includes(dt))?.name||"Не назначен";
    const order={id:oid,clientName:cl||"Без имени",clientType:ct,fileName:df.map(f=>f.file.name).join(", ")||"Ручной",langPair:lp,docType:dt,complexity:cx,sourceText:mn.trim().substring(0,5000),stage:"classify",useAiEdit:ae,price:pr,notes:nt,createdAt:new Date().toISOString(),wordCount:mn.trim()?mn.trim().split(/\s+/).length:0,assignedTo:tr,aiProvider:"gemini",aiModel:md,fileLinks,fileDatas,aiTranslation:"",editedTranslation:"",editorNotes:"",orderFolderName:orderFolderName({clientName:cl,langPair:lp})};
    sCur(order);sOrd(p=>[...p,order]);
    // GAS: metadata only
    if(gok&&gas){try{await gas.co({orderId:oid,clientName:cl||"—",clientType:ct,langPair:lp.toUpperCase().replace("-"," → "),docType:DT.find(x=>x.id===dt)?.label||"",wordCount:order.wordCount,translator:tr,comment:(pr?pr+"₸ ":"")+(nt||"")});await gas.us(oid,"Анализ");}catch(e){toast("Sheets: "+e.message,"error");}}
    sPrg(100);toast("→ Анализ","success");sUpl(false);
    if(onGoAnalysis)onGoAnalysis(oid);
  };

  return(<>
    {cur&&<button className="bt bs bm" onClick={reset} style={{marginBottom:8}}>← Новый</button>}
    <div className="cd"><div className="hd"><h3>📸 Скриншоты</h3><span className="bg">OCR</span></div>
      <div className={`uz ${dg?"dg":""}`} onClick={()=>ssr.current?.click()} onDragOver={e=>{e.preventDefault();sDg(true)}} onDragLeave={()=>sDg(false)} onDrop={e=>{e.preventDefault();sDg(false);addSS(Array.from(e.dataTransfer.files))}}><div style={{fontSize:20}}>📸</div><div style={{fontSize:11,color:"var(--t2)"}}>PNG, JPG, PDF</div><input ref={ssr} type="file" accept="image/*,.pdf" multiple style={{display:"none"}} onChange={e=>addSS(Array.from(e.target.files))}/></div>
      {ss.length>0&&<div className="bts"><button className="bt bp" onClick={scanSS} disabled={scn||!aok}>{scn?<><span className="spn"/> ...</>:"🔍 Распознать "+ss.length}</button></div>}</div>
    <div className="cd"><div className="hd"><h3>📥 Данные</h3><span className="bg">Шаг 1</span></div>
      {!driveOk&&<div className="ds er">⚠ Drive не подключён. Подключи в Настройках.</div>}
      <div className="rw r3"><div className="fg"><label className="fl">Клиент</label><input className="fi" value={cl} onChange={e=>sCl(e.target.value)}/></div><div className="fg"><label className="fl">Тип</label><select className="fsl" value={ct} onChange={e=>sCt(e.target.value)}><option>Физлицо</option><option>Юрлицо</option></select></div><div className="fg"><label className="fl">₸</label><input className="fi" placeholder="0" value={pr} onChange={e=>sPr(e.target.value)}/></div></div>
      <div className="rw r2"><div className="fg"><label className="fl">Языки</label><select className="fsl" value={lp} onChange={e=>sLp(e.target.value)}>{LP.map(l=><option key={l.from+"-"+l.to} value={l.from+"-"+l.to}>{l.label}</option>)}</select></div><div className="fg"><label className="fl">Тип док.</label><select className="fsl" value={dt||""} onChange={e=>sDt(e.target.value||null)}><option value="">— AI —</option>{DT.map(d=><option key={d.id} value={d.id}>{d.icon} {d.label}</option>)}</select></div></div>
      <div className="fg"><label className="fl">Сложность</label><div className="cxg">{CX.map(c=><button key={c.id} className={`cxc ${cx===c.id?"sl":""}`} onClick={()=>{sCx(c.id);if(c.id.includes("ai_edit")||c.id.includes("smartcat"))sAe(true);}}>{c.label}</button>)}</div></div>
      <div className="fg" style={{display:"flex",alignItems:"center",gap:6}}><input type="checkbox" checked={ae} onChange={e=>sAe(e.target.checked)} style={{accentColor:"var(--pu)"}}/><label style={{fontSize:11,color:"var(--t2)"}} onClick={()=>sAe(!ae)}>🔧 Ред. ИИ</label></div>
      <div className="fg"><label className="fl">Исполнитель</label><select className="fsl" value={selExec} onChange={e=>sSelExec(e.target.value)}><option value="">— Авто —</option>{execs.map(ex=><option key={ex.id} value={ex.name}>{ex.name} ({ex.role==="translator"?"Перев.":"Ред."})</option>)}</select></div>
      <div className="fg"><label className="fl">Примечания</label><textarea className="fi" rows={2} value={nt} onChange={e=>sNt(e.target.value)} style={{resize:"vertical"}}/></div></div>
    <div className="cd"><div className="hd"><h3>📄 Файлы</h3><span className="bg">Шаг 2</span></div>
      <div className="uz" onClick={()=>dr.current?.click()}><div style={{fontSize:20}}>📄</div><div style={{fontSize:11,color:"var(--t2)"}}>PDF, Word, Excel, PNG, JPG, CSV, TXT</div><input ref={dr} type="file" accept=".pdf,.doc,.docx,.xlsx,.xls,.csv,.txt,.md,.html,.png,.jpg,.jpeg,.webp" multiple style={{display:"none"}} onChange={e=>addDF(e.target.files)}/></div>
      {df.map((d,i)=><div key={i} className="fp"><span>📄</span><span className="fn">{d.file.name}</span><span className="fz">{(d.file.size/1024).toFixed(1)}К</span><button className="fr" onClick={()=>sDF(p=>p.filter((_,j)=>j!==i))}>✕</button></div>)}
      {!df.length&&<div className="fg" style={{marginTop:6}}><label className="fl">Или текст</label><textarea className="fi" rows={3} value={mn} onChange={e=>sMn(e.target.value)} style={{resize:"vertical"}}/></div>}
      {(upl)&&<div className="lbr"><div className="lbi" style={{width:prg+"%"}}/></div>}
      <div className="bts"><button className="bt bp" disabled={upl||(!df.length&&!mn.trim())} onClick={launchWork} style={{padding:"10px 24px",fontSize:13}}>{upl?<><span className="spn"/> Загрузка...</>:"🚀 Запустить работу"}</button></div></div>
  </>);
}

// ═══ ANALYSIS PAGE ═══
function AnalysisPage({ord,sOrd,execs,scenarios,toast,getKey,gas,gok,fm,driveOk,md,onGoPage}){
  const active=ord.filter(o=>o.stage!=="deliver");
  const[sel,sSel]=useState(null);
  const[running,sRunning]=useState(false);
  const[runProg,sRunProg]=useState(0);const[runMsg,sRunMsg]=useState("");
  const o=sel?active.find(x=>x.id===sel):null;
  useEffect(()=>{if(window.__twSel){sSel(window.__twSel);delete window.__twSel;}},[ord]);

  const defAP="Проанализируй документ. Определи тип, тематику, сложность, ключевые термины. JSON: {type,topic,complexity,terms:[],recommendations:[]}";
  const upd=(field,val)=>{const u={...o,[field]:val};sOrd(p=>p.map(x=>x.id===o.id?u:x));};

  const runFullPipeline=async()=>{
    if(!o)return;
    const trProvider=o.aiTranslateProvider||o.aiProvider||"gemini";const trModel=o.aiTranslateModel||o.aiModel||md;const trKey=getKey(trProvider);
    if(!trKey){toast("Нет ключа для "+trProvider,"error");return;}
    sRunning(true);sRunProg(5);sRunMsg("Подготовка файлов...");
    try{
      // Get file data for AI
      let fileImgs=[];
      if(o.fileDatas?.length)fileImgs=o.fileDatas.filter(f=>f.b64).map(f=>({mime:f.mime,b64:f.b64}));
      // Also try Drive if local not available
      if(!fileImgs.length&&driveOk&&fm.ok()&&o.fileLinks?.length){
        sRunMsg("Скачивание с Drive...");
        for(const fl of o.fileLinks.filter(f=>f.stage==="original"&&f.fileId)){
          try{const d=await fm.downloadAsBase64(fl.fileId);fileImgs.push(d);}catch(e){toast("Drive download: "+e.message,"error");}
        }
      }
      if(!fileImgs.length&&!o.sourceText){toast("Нет файлов для обработки","error");sRunning(false);return;}
      // ── TRANSLATE ──
      sRunMsg("Перевод ("+trProvider+")...");sRunProg(20);
      const lf=o.langPair?.split("-")[0];const lt=o.langPair?.split("-")[1];
      const ln={ru:"русский",kk:"казахский",en:"английский"};
      const trPrompt=(o.customPrompt||PR[o.docType]||"")+"\n"+(ln[lf]||lf)+"→"+(ln[lt]||lt)+"\nПереведи документ полностью. Верни ТОЛЬКО готовый перевод.";
      const translation=await callAI(trKey,trModel,trPrompt,fileImgs.length?fileImgs:null,trProvider);
      if(!translation){toast("Пустой ответ перевода","error");sRunning(false);return;}
      // ── SAVE TRANSLATION TO DRIVE (Transaction: only continue if saved) ──
      const fls=[...(o.fileLinks||[])];
      let translSaved=false;
      if(driveOk&&fm.ok()){
        sRunMsg("Сохранение перевода на Drive...");sRunProg(45);
        try{
          const folderName=o.orderFolderName||orderFolderName(o);
          const orderFolderId=await fm.ensureOrderFolder(folderName);
          const trFolderId=await fm.ensureSubFolder(orderFolderId,"02_AI_Translation");
          const r=await fm.uploadText(translation,trFolderId,o.id+"_AI_"+o.langPair+".txt");
          if(r?.id){fls.push({name:r.name,url:r.webViewLink||"",fileId:r.id,stage:"ai_translation"});translSaved=true;}
        }catch(e){toast("Drive перевод: "+e.message,"error");if(gas)gas.log(o.id,"translate_save",e.message);}
      }
      if(!translSaved&&!driveOk){translSaved=true;} // Allow local-only mode
      if(!translSaved){toast("⚠ Перевод не сохранён — stage не меняется","error");sRunning(false);return;}
      // ── AI EDITING ──
      let editedText=translation;let editorNotes="";
      if(o.useAiEdit){
        const edProvider=o.aiEditProvider||o.aiProvider||"gemini";const edModel=o.aiEditModel||o.aiModel||md;const edKey=getKey(edProvider);
        sRunMsg("Редактирование ("+edProvider+")...");sRunProg(60);
        const editPrompt=(o.editPrompt||DEF_AE)+"\n\nПеревод:\n"+translation;
        const editResult=await callAI(edKey||trKey,edModel,editPrompt,fileImgs.length?fileImgs:null,edProvider);
        try{const j=editResult.match(/\{[\s\S]*\}/);if(j){const parsed=JSON.parse(j[0]);if(parsed.correctedText)editedText=parsed.correctedText;if(parsed.errors?.length)editorNotes=parsed.errors.map(e=>"• "+(e.type||"")+": \""+e.original+"\" → \""+e.corrected+"\" ("+(e.comment||"")+")").join("\n");}}catch{editedText=editResult;}
        // Save editing + error report to Drive
        if(driveOk&&fm.ok()){
          sRunMsg("Сохранение редактирования...");sRunProg(80);
          try{
            const folderName=o.orderFolderName||orderFolderName(o);
            const orderFolderId=await fm.ensureOrderFolder(folderName);
            const edFolderId=await fm.ensureSubFolder(orderFolderId,"03_AI_Editing");
            const r1=await fm.uploadText(editedText,edFolderId,o.id+"_EDIT_"+o.langPair+".txt");
            if(r1?.id)fls.push({name:r1.name,url:r1.webViewLink||"",fileId:r1.id,stage:"editing"});
            if(editorNotes){const r2=await fm.uploadText(editorNotes,edFolderId,o.id+"_ERRORS.txt");if(r2?.id)fls.push({name:r2.name,url:r2.webViewLink||"",fileId:r2.id,stage:"errors"});}
          }catch(e){toast("Drive ред.: "+e.message,"error");}
        }
      }
      // ── TRANSACTION: Update stage ONLY after all saves ──
      sRunMsg("✅ Готово!");sRunProg(100);
      const updated={...o,stage:"review",aiTranslation:translation,editedTranslation:editedText,editorNotes,fileLinks:fls};
      sOrd(p=>p.map(x=>x.id===o.id?updated:x));
      if(gok&&gas){try{await gas.us(o.id,"На ревью");}catch{}}
      toast("✅ → Ревью","success");
      if(onGoPage)onGoPage("rev");
    }catch(e){toast(e.message,"error");if(gas)gas.log(o?.id||"","pipeline",e.message);}
    sRunning(false);setTimeout(()=>{sRunProg(0);sRunMsg("")},2000);
  };

  if(o) return(<><button className="bt bs bm" onClick={()=>sSel(null)} style={{marginBottom:8}}>← Назад</button>
    <div className="cd"><div className="hd"><h3>🔍 Анализ: {o.id}</h3><span className="bg">{o.clientName} · {SM[o.stage]?.l}</span></div>
      {o.price&&<div className="ds in">💰 {o.price}₸</div>}{o.notes&&<div className="ds in">📝 {o.notes}</div>}
      {(o.fileLinks||[]).filter(f=>f.stage==="original").length>0&&<div className="ds ok">📁 {o.fileLinks.filter(f=>f.stage==="original").length} файл(ов) на Drive</div>}
      {/* ── Editable order fields ── */}
      <div className="rw r3" style={{marginBottom:8}}>
        <div className="fg"><label className="fl">Клиент</label><input className="fi" value={o.clientName||""} onChange={e=>upd("clientName",e.target.value)}/></div>
        <div className="fg"><label className="fl">₸ Сумма</label><input className="fi" value={o.price||""} onChange={e=>upd("price",e.target.value)}/></div>
        <div className="fg"><label className="fl">Тип</label><select className="fsl" value={o.clientType||"Физлицо"} onChange={e=>upd("clientType",e.target.value)}><option>Физлицо</option><option>Юрлицо</option></select></div>
      </div>
      <div className="rw r2" style={{marginBottom:8}}>
        <div className="fg"><label className="fl">Языки</label><select className="fsl" value={o.langPair||"ru-kk"} onChange={e=>upd("langPair",e.target.value)}>{LP.map(l=><option key={l.from+"-"+l.to} value={l.from+"-"+l.to}>{l.label}</option>)}</select></div>
        <div className="fg"><label className="fl">Сложность</label><select className="fsl" value={o.complexity||""} onChange={e=>upd("complexity",e.target.value)}><option value="">—</option>{CX.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
      </div>
      <div className="fg"><label className="fl">Исполнитель</label><select className="fsl" value={o.assignedTo||""} onChange={e=>upd("assignedTo",e.target.value)}><option value="">Не назначен</option>{execs.map(ex=><option key={ex.id} value={ex.name}>{ex.name}</option>)}</select></div>
    </div>
    <div className="cd"><div className="hd"><h3>1️⃣ Промпт анализа</h3><span className="bg">Анализ</span></div>
      <textarea className="fi" rows={2} value={o.analysisPrompt||defAP} onChange={e=>upd("analysisPrompt",e.target.value)} style={{resize:"vertical",fontFamily:"'JetBrains Mono',monospace",fontSize:9}}/>
      <div className="fg" style={{marginTop:6}}><label className="fl">ИИ</label><div>{AI_PROVIDERS.map(ai=><span key={ai.id} className={`ai-chip ${(o.aiProvider||"gemini")===ai.id?"on":""}`} onClick={()=>upd("aiProvider",ai.id)}>{ai.icon} {ai.name}{getKey(ai.id)?"":" ⚠"}</span>)}</div></div>
      <div className="fg"><label className="fl">Модель</label><select className="fsl" value={o.aiModel||""} onChange={e=>upd("aiModel",e.target.value)}>{(AI_PROVIDERS.find(a=>a.id===(o.aiProvider||"gemini"))?.models||[]).map(m=><option key={m} value={m}>{m}</option>)}</select></div>
    </div>
    <div className="cd"><div className="hd"><h3>2️⃣ Промпт перевода</h3><span className="bg">Перевод</span></div>
      <textarea className="fi" rows={2} value={o.customPrompt||PR[o.docType]||""} onChange={e=>upd("customPrompt",e.target.value)} style={{resize:"vertical",fontFamily:"'JetBrains Mono',monospace",fontSize:9}}/>
      <div className="fg" style={{marginTop:6}}><label className="fl">ИИ для перевода</label><div>{AI_PROVIDERS.map(ai=><span key={ai.id} className={`ai-chip ${(o.aiTranslateProvider||o.aiProvider||"gemini")===ai.id?"on":""}`} onClick={()=>upd("aiTranslateProvider",ai.id)}>{ai.icon} {ai.name}</span>)}</div></div>
      <div className="fg"><label className="fl">Модель</label><select className="fsl" value={o.aiTranslateModel||o.aiModel||""} onChange={e=>upd("aiTranslateModel",e.target.value)}>{(AI_PROVIDERS.find(a=>a.id===(o.aiTranslateProvider||o.aiProvider||"gemini"))?.models||[]).map(m=><option key={m} value={m}>{m}</option>)}</select></div>
    </div>
    <div className="cd"><div className="hd"><h3>3️⃣ Промпт редактирования</h3><span className="bg">Редактор</span></div>
      <p style={{fontSize:9,color:"var(--t3)",marginBottom:4}}>Ошибки будут в отчёте на Drive</p>
      <textarea className="fi" rows={2} value={o.editPrompt||DEF_AE} onChange={e=>upd("editPrompt",e.target.value)} style={{resize:"vertical",fontFamily:"'JetBrains Mono',monospace",fontSize:9}}/>
      <div className="fg" style={{marginTop:6}}><label className="fl">ИИ для редактирования</label><div>{AI_PROVIDERS.map(ai=><span key={ai.id} className={`ai-chip ${(o.aiEditProvider||o.aiProvider||"gemini")===ai.id?"on":""}`} onClick={()=>upd("aiEditProvider",ai.id)}>{ai.icon} {ai.name}</span>)}</div></div>
      <div className="fg"><label className="fl">Модель</label><select className="fsl" value={o.aiEditModel||o.aiModel||""} onChange={e=>upd("aiEditModel",e.target.value)}>{(AI_PROVIDERS.find(a=>a.id===(o.aiEditProvider||o.aiProvider||"gemini"))?.models||[]).map(m=><option key={m} value={m}>{m}</option>)}</select></div>
    </div>
    <div className="cd" style={{borderColor:"var(--ac)"}}><div className="hd"><h3>▶️ Запуск</h3></div>
      <p style={{fontSize:10,color:"var(--t2)",marginBottom:8}}>Файл → AI перевод → AI редактирование → сохранение на Drive → Ревью</p>
      {runProg>0&&<><div className="lbr"><div className="lbi" style={{width:runProg+"%"}}/></div><div style={{fontSize:9,color:"var(--t3)",marginBottom:4}}>{runMsg}</div></>}
      <button className="bt bp" style={{padding:"10px 28px",fontSize:13}} disabled={running} onClick={runFullPipeline}>{running?<><span className="spn"/> Работа...</>:"🚀 Начать работу"}</button>
    </div>
  </>);

  if(!active.length)return<div className="em"><div className="ei">🔍</div><p>Нет активных заказов</p></div>;
  return(<>{active.map(o=><div key={o.id} className="cd" style={{cursor:"pointer"}} onClick={()=>sSel(o.id)}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div>
      <div style={{fontSize:12,fontWeight:600}}>{o.id} — {o.clientName}</div>
      <div style={{fontSize:10,color:"var(--t3)"}}>{DT.find(d=>d.id===o.docType)?.icon} {o.langPair?.toUpperCase().replace("-"," → ")} · {SM[o.stage]?.l}</div>
    </div><span className={`stg ${o.stage==="translate"?"str":o.stage==="ai_edit"?"sae":o.stage==="review"?"srv":"si"}`}>{SM[o.stage]?.l}</span></div>
  </div>)}</>);
}

// ═══ TRANSLATION PAGE ═══
function TranslPage({ord,sOrd,toast,fm,driveOk}){
  const withTranslation=ord.filter(o=>o.aiTranslation);
  if(!withTranslation.length)return<div className="em"><div className="ei">🤖</div><p>Нет переводов</p></div>;
  return(<>{withTranslation.map(o=>{const tFiles=(o.fileLinks||[]).filter(f=>f.stage==="ai_translation");
    return<div key={o.id} className="cd"><div style={{fontSize:12,fontWeight:600}}>{o.id} — {o.clientName}</div>
      <div style={{fontSize:10,color:"var(--t3)"}}>{DT.find(d=>d.id===o.docType)?.icon} {o.langPair?.toUpperCase().replace("-"," → ")} · {SM[o.stage]?.l}</div>
      {tFiles.map((f,i)=><div key={i} className="flink"><a href={f.url} target="_blank" rel="noopener">📄 {f.name} (Drive)</a></div>)}
      {!tFiles.length&&o.aiTranslation&&<div style={{marginTop:4,fontSize:10,color:"var(--t3)",maxHeight:50,overflow:"hidden"}}>{o.aiTranslation.substring(0,200)}...</div>}
    </div>})}</>);
}

// ═══ EDITOR PAGE ═══
function EditorPage({ord,sOrd,toast,fm,driveOk}){
  const edited=ord.filter(o=>o.editedTranslation&&o.editedTranslation!==o.aiTranslation||o.editorNotes);
  if(!edited.length)return<div className="em"><div className="ei">🔧</div><p>Нет редактированных заказов</p></div>;
  return(<>{edited.map(o=>{const eFiles=(o.fileLinks||[]).filter(f=>f.stage==="editing"||f.stage==="errors");
    return<div key={o.id} className="cd"><div style={{fontSize:12,fontWeight:600}}>{o.id} — {o.clientName}</div>
      <div style={{fontSize:10,color:"var(--t3)"}}>{o.langPair?.toUpperCase().replace("-"," → ")} · {SM[o.stage]?.l}</div>
      {eFiles.map((f,i)=><div key={i} className="flink"><a href={f.url} target="_blank" rel="noopener">{f.stage==="errors"?"📋":"📄"} {f.name} (Drive)</a></div>)}
    </div>})}</>);
}

// ═══ ORDERS ═══
function OrdPage({ord,gas,gok,toast}){
  if(!ord.length)return<div className="em"><div className="ei">📋</div><p>Пусто</p></div>;
  return(<div className="cd" style={{padding:0,overflow:"auto"}}><table className="ot"><thead><tr><th>ID</th><th>Клиент</th><th>Языки</th><th>Тип</th><th>₸</th><th>Статус</th></tr></thead>
    <tbody>{[...ord].reverse().map(o=><tr key={o.id}><td style={{fontFamily:"'JetBrains Mono',monospace",color:"var(--ac)"}}>{o.id}</td><td>{o.clientName}</td><td>{o.langPair?.toUpperCase().replace("-"," → ")}</td><td>{DT.find(d=>d.id===o.docType)?.label||""}</td><td style={{fontSize:9}}>{o.price?o.price+"₸":"—"}</td><td><span className={`stg ${o.stage==="deliver"?"sdl":o.stage==="review"?"srv":"si"}`}>{SM[o.stage]?.l}</span></td></tr>)}</tbody></table></div>);
}

// ═══ REVIEW ═══
function RevPage({ord,sOrd,gas,gok,toast,fm,driveOk}){
  const rv=ord.filter(o=>o.stage==="review");const[aid,sAid]=useState(null);const a=rv.find(o=>o.id===aid);
  const ok=async()=>{if(!a)return;
    // Save final to Drive
    if(driveOk&&fm.ok()&&a.editedTranslation){
      try{const fn=a.orderFolderName||orderFolderName(a);const fid=await fm.ensureOrderFolder(fn);const ffid=await fm.ensureSubFolder(fid,"04_Final");
        await fm.uploadText(a.editedTranslation,ffid,a.id+"_FINAL_"+a.langPair+".txt");toast("Drive: финал сохранён","success");
      }catch(e){toast("Drive final: "+e.message,"error");}
    }
    sOrd(p=>p.map(o=>o.id===aid?{...o,stage:"deliver"}:o));
    if(gok&&gas){try{await gas.us(aid,"Готов");}catch{}}toast(aid+" ✅","success");sAid(null);};
  if(!rv.length&&!aid)return<div className="em"><div className="ei">✏️</div><p>Пусто</p></div>;
  if(a){return<><button className="bt bs bm" onClick={()=>sAid(null)} style={{marginBottom:8}}>←</button>
    <div className="cd"><div className="hd"><h3>✏️ {a.id}</h3><span className="bg">{a.clientName}</span></div>
    <div style={{fontSize:10,color:"var(--t3)",marginBottom:6}}>{DT.find(d=>d.id===a.docType)?.icon} {a.langPair?.toUpperCase().replace("-"," → ")} · {a.wordCount} сл.{a.price&&" · 💰"+a.price+"₸"}</div>
    {a.notes&&<div className="ds in">📝 {a.notes}</div>}
    {/* File links from Drive */}
    <div style={{padding:10,background:"var(--b1)",border:"1px solid var(--bd)",borderRadius:5,marginBottom:10}}>
      <div style={{fontSize:12,fontWeight:600,marginBottom:6}}>📁 Файлы на Drive</div>
      {(a.fileLinks||[]).filter(f=>f.stage==="original").map((f,i)=><div key={i} className="flink"><a href={f.url} target="_blank" rel="noopener">📄 {f.name} (Оригинал)</a></div>)}
      {(a.fileLinks||[]).filter(f=>f.stage==="ai_translation").map((f,i)=><div key={i} className="flink"><a href={f.url} target="_blank" rel="noopener">🤖 {f.name} (Перевод)</a></div>)}
      {(a.fileLinks||[]).filter(f=>f.stage==="editing").map((f,i)=><div key={i} className="flink"><a href={f.url} target="_blank" rel="noopener">🔧 {f.name} (Редактирование)</a></div>)}
      {(a.fileLinks||[]).filter(f=>f.stage==="errors").map((f,i)=><div key={i} className="flink"><a href={f.url} target="_blank" rel="noopener" style={{color:"var(--or)"}}>📋 {f.name} (Отчёт об ошибках)</a></div>)}
    </div>
    <div className="bts"><button className="bt bo" onClick={ok}>✅ Одобрить</button></div></div></>;
  }
  return rv.map(o=><div key={o.id} className="cd" style={{cursor:"pointer"}} onClick={()=>sAid(o.id)}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:12,fontWeight:600}}>✏️ {o.id} — {o.clientName}</div><div style={{fontSize:10,color:"var(--t3)"}}>{o.langPair?.toUpperCase().replace("-"," → ")}</div></div><button className="bt bp bm">Ревью →</button></div>
    {(o.fileLinks||[]).some(f=>f.stage==="errors")&&<div style={{marginTop:4,fontSize:9,color:"var(--or)"}}>📋 Есть отчёт об ошибках</div>}
  </div>);
}

// ═══ EXECUTORS ═══
function ExecPage({execs,sExecs,toast}){
  const[ed,sEd]=useState(null);const[nm,sNm]=useState("");const[rl,sRl]=useState("translator");const[em,sEm]=useState("");const[tg,sTg]=useState("");const[ln,sLn]=useState("");const[sp,sSp]=useState("");const[sv,sSv]=useState("");
  const startEd=x=>{sEd(x.id);sNm(x.name);sRl(x.role||"translator");sEm(x.email||"");sTg(x.telegram||"");sLn((x.langs||[]).join(", "));sSp((x.spec||[]).join(", "));sSv((x.services||[]).map(s=>s.name+":"+s.price+":"+s.unit).join("\n"));};
  const startNew=()=>{sEd("new");sNm("");sRl("translator");sEm("");sTg("");sLn("ru-kk");sSp("legal");sSv("Перевод:800:стр.");};
  const save=()=>{const pL=ln.split(",").map(s=>s.trim()).filter(Boolean);const pS=sp.split(",").map(s=>s.trim()).filter(Boolean);const pV=sv.split("\n").map(l=>{const p=l.split(":");return p.length>=2?{name:p[0].trim(),price:Number(p[1])||0,unit:p[2]?.trim()||"стр."}:null}).filter(Boolean);
    const ex={id:ed==="new"?Date.now():ed,name:nm,role:rl,email:em,telegram:tg,langs:pL,spec:pS,services:pV};
    if(ed==="new")sExecs(p=>[...p,ex]);else sExecs(p=>p.map(e=>e.id===ed?ex:e));sEd(null);toast("✓","success");};
  if(ed!==null)return(<div className="cd"><div className="hd"><h3>{ed==="new"?"➕":"✏️"}</h3></div>
    <div className="rw r2"><div className="fg"><label className="fl">Имя</label><input className="fi" value={nm} onChange={e=>sNm(e.target.value)}/></div><div className="fg"><label className="fl">Роль</label><select className="fsl" value={rl} onChange={e=>sRl(e.target.value)}><option value="translator">Переводчик</option><option value="editor">Редактор</option><option value="both">Оба</option></select></div></div>
    <div className="rw r2"><div className="fg"><label className="fl">Email</label><input className="fi" value={em} onChange={e=>sEm(e.target.value)}/></div><div className="fg"><label className="fl">Telegram</label><input className="fi" value={tg} onChange={e=>sTg(e.target.value)}/></div></div>
    <div className="rw r2"><div className="fg"><label className="fl">Языки (,)</label><input className="fi" value={ln} onChange={e=>sLn(e.target.value)}/></div><div className="fg"><label className="fl">Спец. (,)</label><input className="fi" value={sp} onChange={e=>sSp(e.target.value)}/></div></div>
    <div className="fg"><label className="fl">Услуги (назв:цена:ед.)</label><textarea className="fi" rows={3} value={sv} onChange={e=>sSv(e.target.value)} style={{resize:"vertical",fontFamily:"'JetBrains Mono',monospace",fontSize:9}}/></div>
    <div className="bts"><button className="bt bp" onClick={save}>💾</button><button className="bt bs" onClick={()=>sEd(null)}>✕</button></div></div>);
  return(<><div className="bts" style={{marginTop:0,marginBottom:10}}><button className="bt bp bm" onClick={startNew}>➕</button></div>
    {execs.map(ex=><div key={ex.id} className="exec-card"><div style={{display:"flex",justifyContent:"space-between"}}><div><h5>{ex.name}</h5><div style={{fontSize:9,color:"var(--t3)"}}>{ex.role}</div></div><div className="bts" style={{marginTop:0}}><button className="bt bs bm" onClick={()=>startEd(ex)}>✏️</button><button className="bt bs bm" style={{color:"var(--er)"}} onClick={()=>{sExecs(p=>p.filter(e=>e.id!==ex.id))}}>🗑</button></div></div>
      <div style={{marginTop:4}}>{(ex.langs||[]).map(l=><span key={l} className="exec-tag">{l}</span>)}{(ex.spec||[]).map(s=><span key={s} className="exec-tag">{s}</span>)}</div></div>)}</>);
}

// ═══ SCENARIO SETTINGS ═══
function ScenarioSettings({scenarios,sScenarios,toast}){
  const[ed,sEd]=useState(null);const[nm,sNm]=useState("");const[steps,sSteps]=useState([]);const[cxIds,sCxIds]=useState([]);
  const allStages=["classify","translate","ai_edit","review"];
  const startEdit=(sc)=>{sEd(sc.id);sNm(sc.name);sSteps([...(sc.steps||[])]);sCxIds([...(sc.complexities||[])]);};
  const startNew=()=>{sEd("new");sNm("");sSteps([{stage:"translate",ai:"gemini",model:"gemini-2.0-flash"},{stage:"review",ai:"human",model:""}]);sCxIds([]);};
  const updStep=(i,k,v)=>sSteps(p=>p.map((s,j)=>j===i?{...s,[k]:v}:s));
  const save=()=>{const sc={id:ed==="new"?("sc_"+Date.now()):ed,name:nm,steps,complexities:cxIds};if(ed==="new")sScenarios(p=>[...p,sc]);else sScenarios(p=>p.map(s=>s.id===ed?sc:s));sEd(null);toast("✓","success");};
  if(ed!==null)return(<div className="SC SF"><h4>📋 {ed==="new"?"Новый сценарий":"Редактирование"}</h4>
    <div className="fg"><label className="fl">Название</label><input className="fi" value={nm} onChange={e=>sNm(e.target.value)}/></div>
    <div className="fg"><label className="fl">Этапы</label>
      {steps.map((s,i)=><div key={i} className="step-card"><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}><span className="step-num">{i+1}</span>
        <select className="fsl" style={{flex:1}} value={s.stage} onChange={e=>updStep(i,"stage",e.target.value)}>{allStages.map(st=><option key={st} value={st}>{SM[st]?.i} {SM[st]?.l}</option>)}</select>
        <button className="bt bs bm" style={{color:"var(--er)"}} onClick={()=>sSteps(p=>p.filter((_,j)=>j!==i))}>✕</button></div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{AI_PROVIDERS.map(ai=><span key={ai.id} className={`ai-chip ${s.ai===ai.id?"on":""}`} onClick={()=>updStep(i,"ai",ai.id)}>{ai.icon} {ai.name}</span>)}<span className={`ai-chip ${s.ai==="human"?"on":""}`} onClick={()=>updStep(i,"ai","human")}>👤</span></div>
      </div>)}
      <button className="bt bs bm" onClick={()=>sSteps(p=>[...p,{stage:"translate",ai:"gemini",model:"gemini-2.0-flash"}])} style={{marginTop:4}}>➕ Этап</button>
    </div>
    <div className="fg"><label className="fl">Сложность</label><div className="cxg">{CX.map(c=><button key={c.id} className={`cxc ${cxIds.includes(c.id)?"sl":""}`} onClick={()=>sCxIds(p=>p.includes(c.id)?p.filter(x=>x!==c.id):[...p,c.id])}>{c.label}</button>)}</div></div>
    <div className="bts"><button className="bt bp" onClick={save}>💾</button><button className="bt bs" onClick={()=>sEd(null)}>✕</button></div>
  </div>);
  return(<div className="SC SF"><h4>📋 Сценарии перевода</h4>
    <div className="bts" style={{marginBottom:8}}><button className="bt bp bm" onClick={startNew}>➕ Новый</button></div>
    {scenarios.map(sc=><div key={sc.id} className="scenario-card" onClick={()=>startEdit(sc)}>
      <div style={{display:"flex",justifyContent:"space-between"}}><div><div style={{fontSize:12,fontWeight:600}}>{sc.name}</div><div style={{fontSize:9,color:"var(--t3)"}}>{(sc.steps||[]).map((s,j)=><span key={j}>{j>0?" → ":""}{SM[s.stage]?.i||"👤"} {s.ai}</span>)}</div>
      {sc.complexities?.length>0&&<div style={{marginTop:3}}>{sc.complexities.map(c=><span key={c} className="exec-tag">{CX.find(x=>x.id===c)?.s||c}</span>)}</div>}</div>
      <button className="bt bs bm" onClick={e=>{e.stopPropagation();sScenarios(p=>p.filter(s=>s.id!==sc.id))}} style={{color:"var(--er)"}}>🗑</button></div>
    </div>)}
  </div>);
}

// ═══ SETTINGS ═══
function SetPage({keys,sKeys,gu,sGu,md,sMd,aep,sAep,scenarios,sScenarios,driveClientId,sDriveClientId,gok,driveOk,connectDrive,toast}){
  const[u,sU]=useState(gu);
  const uk=(p,v)=>{const n={...keys,[p]:v};sKeys(n);};
  return(<div className="SG">
    <div className="SC"><h4>🔗 Google Drive (OAuth)</h4><div className={`ds ${driveOk?"ok":"er"}`}>{driveOk?"✓ Drive подключён":"✗ Не подключён"}</div>
      <div className="fg"><label className="fl">Google Cloud Client ID</label><input className="fi" value={driveClientId} onChange={e=>sDriveClientId(e.target.value)} placeholder="xxxx.apps.googleusercontent.com"/></div>
      <p style={{fontSize:8,color:"var(--t3)",marginBottom:4}}>Google Cloud Console → APIs → OAuth 2.0 → Web Client ID</p>
      <button className="bt bp bm" onClick={connectDrive}>🔑 Подключить Drive</button></div>
    <div className="SC"><h4>🔗 Google Sheets (GAS)</h4><div className={`ds ${gok?"ok":"er"}`}>{gok?"✓":"✗"}</div>
      <div className="fg"><label className="fl">GAS URL</label><input className="fi" value={u} onChange={e=>sU(e.target.value)}/></div>
      <button className="bt bp bm" onClick={()=>{sGu(u);toast("OK","info")}}>💾</button></div>
    <div className="SC"><h4>🔑 AI Ключи</h4>
      {AI_PROVIDERS.map(ai=><div key={ai.id} className="fg"><label className="fl">{ai.icon} {ai.name}</label><input className="fi" type="password" value={keys[ai.id]||""} onChange={e=>uk(ai.id,e.target.value)}/></div>)}
      <div className="fg"><label className="fl">Модель по умолч.</label><select className="fsl" value={md} onChange={e=>sMd(e.target.value)}>{AI_PROVIDERS[0].models.map(m=><option key={m}>{m}</option>)}</select></div></div>
    <div className="SC"><h4>🔧 Промпт «Ред. ИИ»</h4>
      <textarea className="fi" rows={3} value={aep} onChange={e=>sAep(e.target.value)} style={{resize:"vertical",fontFamily:"'JetBrains Mono',monospace",fontSize:9}}/></div>
    <ScenarioSettings scenarios={scenarios} sScenarios={sScenarios} toast={toast}/>
  </div>);
}
