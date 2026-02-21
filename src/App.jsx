await gas.updateStatus(oid,useAiEdit?"Ред. ИИ":"На ревью");toast("📊 Sheets+Drive ✓","success");}catch(e){toast("Sheets: "+e.message,"error");}}
      toast(useAiEdit?"→ Ред. ИИ":"→ Ревью","success");
    }catch(e){toast(e.message,"error");}setTranslating(false);
  };

  const runAiEdit=async()=>{
    if(!cur||!result)return;setProg(80);toast("🔧 Ред. ИИ...","info");
    try{const t=await callGemini(apiKey,model,`${aiEditPrompt}\n\nОригинал:\n${src.substring(0,5000)}\n\nЧерновой:\n${result}`);
    if(t){setEdited(t);setProg(90);const u={...cur,stage:"review",editedTranslation:t};setCur(u);setOrders(p=>p.map(o=>o.id===u.id?u:o));
    if(gasOk&&gas){try{await gas.saveFile(cur.id,"review",t,lp,`${cur.id}_AI_EDIT_${lp}.txt`);await gas.updateStatus(cur.id,"На ревью","Ред. ИИ");}catch{}}
    toast("🔧 Ред. ИИ → ревью","success");}}catch(e){toast(e.message,"error");}
  };

  const approve=async()=>{
    if(!cur)return;const u={...cur,stage:"deliver",editedTranslation:edited};setCur(u);setOrders(p=>p.map(o=>o.id===u.id?u:o));setProg(100);
    if(gasOk&&gas){try{await gas.saveFile(cur.id,"review",edited,lp,`${cur.id}_REV_${lp}.txt`);await gas.saveFile(cur.id,"final",edited,lp,`${cur.id}_FINAL_${lp}.txt`);await gas.updateStatus(cur.id,"Готов","Одобрено");toast("📊 ✓","success");}catch(e){toast(e.message,"error");}}
    toast("✅ Готов!","success");
  };

  const dl=()=>{const b=new Blob([edited||result],{type:"text/plain;charset=utf-8"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=`${cur?.id||"tr"}_FINAL_${lp}.txt`;a.click();URL.revokeObjectURL(u);};

  // ═ RENDER ═
  if(!result) return (<>
    {cur&&<button className="btn btn-s btn-sm" onClick={reset} style={{marginBottom:10}}>← Новый</button>}
    <div className="card">
      <div className="ch"><h3>📸 Скриншоты заявки</h3><span className="badge">OCR</span></div>
      <p style={{fontSize:11,color:"var(--t3)",marginBottom:8}}>Загрузите скрин(ы) — AI заполнит форму автоматически</p>
      <div className={`upz ${drag?"drag":""}`} onClick={()=>ssRef.current?.click()} onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);addSS(Array.from(e.dataTransfer.files))}}>
        <div style={{fontSize:22}}>📸</div><div style={{fontSize:12,color:"var(--t2)"}}>PNG, JPG, PDF</div>
        <input ref={ssRef} type="file" accept="image/*,.pdf" multiple style={{display:"none"}} onChange={e=>addSS(Array.from(e.target.files))}/>
      </div>
      {screenshots.length>0&&<><div className="thumbs">{screenshots.map((s,i)=><img key={i} src={s.preview} alt="" className="thumb" onClick={()=>setSS(p=>p.filter((_,j)=>j!==i))} title="Удалить"/>)}</div>
      <div className="btns"><button className="btn btn-p" onClick={scanSS} disabled={scanning}>{scanning?<><span className="spin"/> Анализ...</>:`🔍 Распознать ${screenshots.length} скрин(ов)`}</button></div></>}
    </div>

    <div className="card">
      <div className="ch"><h3>📥 Данные заказа</h3><span className="badge">Шаг 1</span></div>
      {!gasOk&&<div className="ds err">⚠ Sheets не подключён</div>}
      <div className="row r3">
        <div className="fg"><label className="fl">Клиент</label><input className="fi" placeholder="Имя/компания" value={client} onChange={e=>setClient(e.target.value)}/></div>
        <div className="fg"><label className="fl">Тип</label><select className="fs" value={ctype} onChange={e=>setCtype(e.target.value)}><option>Физлицо</option><option>Юрлицо</option></select></div>
        <div className="fg"><label className="fl">Стоимость ₸</label><input className="fi" placeholder="0" value={price} onChange={e=>setPrice(e.target.value)}/></div>
      </div>
      <div className="row r2">
        <div className="fg"><label className="fl">Языковая пара</label><select className="fs" value={lp} onChange={e=>setLp(e.target.value)}>{LANG_PAIRS.map(l=><option key={`${l.from}-${l.to}`} value={`${l.from}-${l.to}`}>{l.label}</option>)}</select></div>
        <div className="fg"><label className="fl">Тип документа</label><select className="fs" value={dt||""} onChange={e=>setDt(e.target.value||null)}><option value="">— AI определит —</option>{DOC_TYPES.map(d=><option key={d.id} value={d.id}>{d.icon} {d.label}</option>)}</select></div>
      </div>
      <div className="fg"><label className="fl">Сложность</label><div className="cxg">{COMPLEXITY.map(c=><button key={c.id} className={`cxc ${cx===c.id?"sel":""}`} onClick={()=>{setCx(c.id);if(c.id.includes("ai_edit")||c.id.includes("smartcat"))setUseAiEdit(true)}}>{c.label}</button>)}</div></div>
      <div className="fg" style={{display:"flex",alignItems:"center",gap:7}}><input type="checkbox" checked={useAiEdit} onChange={e=>setUseAiEdit(e.target.checked)} style={{accentColor:"var(--purple)"}}/><label style={{fontSize:12,color:"var(--t2)",cursor:"pointer"}} onClick={()=>setUseAiEdit(!useAiEdit)}>🔧 Этап «Ред. ИИ» перед ревью</label></div>
      <div className="fg"><label className="fl">Примечания</label><textarea className="fi" rows={2} placeholder="Комментарии..." value={notes} onChange={e=>setNotes(e.target.value)} style={{resize:"vertical"}}/></div>
    </div>

    <div className="card">
      <div className="ch"><h3>📄 Файлы</h3><span className="badge">Шаг 2</span></div>
      <div className="upz" onClick={()=>docRef.current?.click()}><div style={{fontSize:22}}>📄</div><div style={{fontSize:12,color:"var(--t2)"}}>PDF, Word, Excel, PNG, JPG, CSV, TXT</div>
        <input ref={docRef} type="file" accept=".pdf,.doc,.docx,.xlsx,.xls,.csv,.txt,.md,.html,.png,.jpg,.jpeg,.webp" multiple style={{display:"none"}} onChange={e=>addDocs(Array.from(e.target.files))}/></div>
      {docFiles.map((d,i)=><div key={i} className="fp"><span>📄</span><span className="fn">{d.file.name}</span><span className="fsz">{(d.file.size/1024).toFixed(1)}КБ</span><button className="frm" onClick={()=>setDF(p=>p.filter((_,j)=>j!==i))}>✕</button></div>)}
      {docFiles.length>0&&!srcText&&<div className="btns"><button className="btn btn-s btn-sm" onClick={extractText}>📖 Извлечь текст через AI</button></div>}
      {!docFiles.length&&<div className="fg" style={{marginTop:8}}><label className="fl">Или текст</label><textarea className="fi" rows={3} placeholder="Вставьте текст..." value={manual} onChange={e=>setManual(e.target.value)} style={{resize:"vertical"}}/></div>}
      {srcText&&<div className="ds info">✓ {srcText.split(/\s+/).length} слов</div>}
      <div className="btns">
        <button className="btn btn-p" disabled={!src.trim()||classifying} onClick={classify}>{classifying?<><span className="spin"/> Кл-ция...</>:"🔍 Классифицировать"}</button>
        {dt&&<button className="btn btn-purple" disabled={!src.trim()||translating} onClick={translate}>{translating?<><span className="spin"/> Перевод...</>:"🤖 Перевести"}</button>}
      </div>
      {translating&&<div className="lbar"><div className="lbar-in" style={{width:`${prog}%`}}/></div>}
    </div>

    {autoDt&&!result&&<div className="card">
      <div className="ch"><h3>🔍 Тип</h3></div>
      <div style={{display:"flex",alignItems:"center",gap:8,padding:9,background:"var(--bg1)",borderRadius:6,border:"1px solid var(--bd)"}}>
        <span style={{fontSize:22}}>{autoDt.icon}</span><div><div style={{fontSize:13,fontWeight:600}}>{autoDt.label}</div><div style={{fontSize:10,color:"var(--t3)"}}>{Math.round(autoDt.confidence*100)}% — {autoDt.reason}</div></div></div>
      <div className="fg" style={{marginTop:10}}><label className="fl">Изменить</label><div className="dtg">{DOC_TYPES.map(d=><button key={d.id} className={`dtc ${dt===d.id?"sel":""}`} onClick={()=>setDt(d.id)}><span className="dtc-i">{d.icon}</span>{d.label}</button>)}</div></div>
      <div className="btns"><button className="btn btn-purple" disabled={!dt||translating} onClick={translate}>{translating?<><span className="spin"/></>:"🤖 Перевести"}</button></div>
    </div>}
  </>);

  if(cur?.stage==="ai_edit") return (<div className="card">
    <div className="ch"><h3>🔧 Ред. ИИ — {cur.id}</h3><span className="badge" style={{background:"#A66BF518",color:"var(--purple)"}}>Ред. ИИ</span></div>
    <div className="trc">
      <div className="trp"><div className="trp-h">AI Перевод</div><div className="trp-b">{result}</div></div>
      <div className="trp"><div className="trp-h">После ред. ИИ</div><div className="trp-b">{edited!==result?edited:<span style={{color:"var(--t3)"}}>Нажмите кнопку...</span>}</div></div>
    </div>
    <div className="btns"><button className="btn btn-purple" onClick={runAiEdit}>🔧 Запустить ред. ИИ</button><button className="btn btn-s" onClick={()=>{const u={...cur,stage:"review"};setCur(u);setOrders(p=>p.map(o=>o.id===u.id?u:o))}}>⏭ Пропустить</button></div>
  </div>);

  if(cur?.stage==="review") return (<div className="card">
    <div className="ch"><h3>✏️ Ревью — {cur.id}</h3></div>
    {cur.price&&<div className="ds info">💰 {cur.price} ₸</div>}
    {cur.notes&&<div className="ds info">📝 {cur.notes}</div>}
    {cur.complexity&&<div className="ds info">📊 {COMPLEXITY.find(c=>c.id===cur.complexity)?.label}</div>}
    <div className="trc">
      <div className="trp"><div className="trp-h">Оригинал ({lFrom.toUpperCase()})</div><div className="trp-b">{src}</div></div>
      <div className="trp"><div className="trp-h">Перевод ({lTo.toUpperCase()})</div><div className="trp-b"><textarea value={edited} onChange={e=>setEdited(e.target.value)}/></div></div>
    </div>
    {GLOSSARIES[dt]?.[lp]&&Object.keys(GLOSSARIES[dt][lp]).length>0&&<div className="glp"><h4>📚 Глоссарий</h4>{Object.entries(GLOSSARIES[dt][lp]).map(([s,t])=><div key={s} className="glr"><span className="gl-s">{s}</span><span className="gl-a">→</span><span className="gl-t">{t}</span></div>)}</div>}
    <div className="btns"><button className="btn btn-ok" onClick={approve}>✅ Одобрить</button><button className="btn btn-s" onClick={dl}>⬇️ Скачать</button></div>
  </div>);

  if(cur?.stage==="deliver") return (<div className="card" style={{borderColor:"var(--ok)"}}>
    <div className="ch"><h3>✅ {cur.id}</h3><span className="badge" style={{background:"var(--ok)",color:"var(--bg0)"}}>Готов</span></div>
    <p style={{fontSize:12,color:"var(--t2)",marginBottom:8}}>Готов{cur.clientName!=="Без имени"?` для ${cur.clientName}`:""}.{cur.price?` ${cur.price}₸.`:""}{gasOk?" Drive ✓":""}</p>
    <div className="btns"><button className="btn btn-ok" onClick={dl}>⬇️ Скачать</button><button className="btn btn-p" onClick={reset}>📥 Новый</button></div>
  </div>);
  return null;
}

// ═══════════════════════════════════════════
function Orders({orders,gas,gasOk,toast}) {
  const [remote,setRemote]=useState(null);const [syncing,setSyncing]=useState(false);
  const sync=async()=>{if(!gasOk||!gas)return;setSyncing(true);try{const d=await gas.getOrders();setRemote(d);toast(`${d.length} из Sheets`,"success");}catch(e){toast(e.message,"error");}setSyncing(false);};
  const data=remote||orders;const isR=!!remote;
  if(!data.length)return<div className="empty"><div className="empty-i">📋</div><p>Нет заказов</p></div>;
  return(<>
    <div className="btns" style={{marginTop:0,marginBottom:12}}>{gasOk&&<button className="btn btn-s btn-sm" onClick={sync} disabled={syncing}>{syncing?<span className="spin"/>:"🔄 Из Sheets"}</button>}{isR&&<button className="btn btn-s btn-sm" onClick={()=>setRemote(null)}>Лок.</button>}</div>
    <div className="card" style={{padding:0,overflow:"auto"}}><table className="otbl"><thead><tr><th>ID</th><th>Клиент</th><th>Языки</th><th>Тип</th><th>Слож.</th><th>₸</th><th>Слов</th><th>Статус</th><th>Дата</th></tr></thead>
    <tbody>{(isR?data:[...data].reverse()).map((o,i)=>{
      const id=isR?o["ID заказа"]:o.id,cl=isR?o["Клиент"]:o.clientName,lang=isR?o["Языковая пара"]:o.langPair?.toUpperCase().replace("-"," → ");
      const typ=isR?o["Тип документа"]:DOC_TYPES.find(d=>d.id===o.docType)?.label;const wc=isR?o["Кол-во слов"]:o.wordCount;
      const st=isR?o["Статус"]:STAGE_MAP[o.stage]?.label;const dt=isR?o["Дата создания"]:new Date(o.createdAt).toLocaleDateString("ru-RU");
      const cxL=isR?"":COMPLEXITY.find(c=>c.id===o.complexity)?.short||"—";const pr=isR?"":o.price?o.price+"₸":"—";
      const sc=isR?(st==="Принят"?"intake":st==="AI Перевод"?"translate":st==="Ред. ИИ"?"ai_edit":st==="На ревью"?"review":st==="Готов"?"deliver":"classify"):o.stage;
      return<tr key={id||i}><td style={{fontFamily:"'JetBrains Mono',monospace",color:"var(--acc)"}}>{id}</td><td>{cl}</td><td>{lang}</td><td>{typ}</td><td style={{fontSize:9}}>{cxL}</td><td style={{fontSize:10}}>{pr}</td><td>{wc}</td><td><span className={`stag s-${sc}`}>{st}</span></td><td style={{color:"var(--t3)",fontSize:10}}>{dt}</td></tr>;
    })}</tbody></table></div>
  </>);
}

// ═══════════════════════════════════════════
function ReviewQ({orders,setOrders,gas,gasOk,apiKey,apiOk,model,aiEditPrompt,toast}) {
  const rv=orders.filter(o=>o.stage==="review"||o.stage==="ai_edit");
  const [aid,setAid]=useState(null);const [txt,setTxt]=useState("");const [editing,setEditing]=useState(false);
  const a=rv.find(o=>o.id===aid);

  const runAiEdit=async()=>{if(!a)return;setEditing(true);try{const r=await callGemini(apiKey,model,`${aiEditPrompt}\n\nОригинал:\n${a.sourceText}\n\nЧерновой:\n${a.aiTranslation}`);if(r){setTxt(r);setOrders(p=>p.map(o=>o.id===a.id?{...o,stage:"review",editedTranslation:r}:o));if(gasOk&&gas){try{await gas.updateStatus(a.id,"На ревью","Ред. ИИ");}catch{}}toast("🔧 Ред. ИИ ✓","success");}}catch(e){toast(e.message,"error");}setEditing(false);};

  const ok=async()=>{if(!aid||!a)return;setOrders(p=>p.map(o=>o.id===aid?{...o,stage:"deliver",editedTranslation:txt}:o));
    if(gasOk&&gas){try{await gas.saveFile(aid,"review",txt,a.langPair,`${aid}_REV.txt`);await gas.saveFile(aid,"final",txt,a.langPair,`${aid}_FINAL.txt`);await gas.updateStatus(aid,"Готов","Одобрено");toast("✓","success");}catch(e){toast(e.message,"error");}}
    toast(`${aid} ✓`,"success");setAid(null);};

  if(!rv.length&&!aid)return<div className="empty"><div className="empty-i">✏️</div><p>Нет на ревью</p></div>;
  if(a){const [f,t]=a.langPair.split("-");const isAE=a.stage==="ai_edit";
    return<><button className="btn btn-s btn-sm" onClick={()=>setAid(null)} style={{marginBottom:10}}>← Назад</button>
    <div className="card"><div className="ch"><h3>{isAE?"🔧":"✏️"} {a.id}</h3><span className="badge">{a.clientName} · {a.langPair.toUpperCase().replace("-"," → ")}</span></div>
    <div style={{fontSize:11,color:"var(--t3)",marginBottom:7}}>{DOC_TYPES.find(d=>d.id===a.docType)?.icon} {DOC_TYPES.find(d=>d.id===a.docType)?.label} · {a.wordCount} сл.{a.price&&<> · 💰{a.price}₸</>}{a.complexity&&<> · {COMPLEXITY.find(c=>c.id===a.complexity)?.short}</>}</div>
    {a.notes&&<div className="ds info">📝 {a.notes}</div>}
    {isAE&&<div className="btns" style={{marginBottom:10,marginTop:0}}><button className="btn btn-purple" onClick={runAiEdit} disabled={editing||!apiOk}>{editing?<><span className="spin"/> Ред. ИИ...</>:"🔧 Ред. ИИ"}</button><button className="btn btn-s btn-sm" onClick={()=>setOrders(p=>p.map(o=>o.id===a.id?{...o,stage:"review"}:o))}>⏭ Пропустить</button></div>}
    <div className="trc"><div className="trp"><div className="trp-h">Оригинал ({f.toUpperCase()})</div><div className="trp-b">{a.sourceText}</div></div><div className="trp"><div className="trp-h">Перевод ({t.toUpperCase()})</div><div className="trp-b"><textarea value={txt} onChange={e=>setTxt(e.target.value)}/></div></div></div>
    {GLOSSARIES[a.docType]?.[a.langPair]&&<div className="glp"><h4>📚 Глоссарий</h4>{Object.entries(GLOSSARIES[a.docType][a.langPair]).map(([s,t])=><div key={s} className="glr"><span className="gl-s">{s}</span><span className="gl-a">→</span><span className="gl-t">{t}</span></div>)}</div>}
    {!isAE&&<div className="btns"><button className="btn btn-ok" onClick={ok}>✅ Одобрить</button></div>}
    </div></>;
  }
  return rv.map(o=><div key={o.id} className="card" style={{cursor:"pointer"}} onClick={()=>{setAid(o.id);setTxt(o.editedTranslation||o.aiTranslation)}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div><div style={{fontSize:13,fontWeight:600}}>{o.stage==="ai_edit"?"🔧":"✏️"} {o.id} — {o.clientName}</div><div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>{DOC_TYPES.find(d=>d.id===o.docType)?.icon} {o.langPair.toUpperCase().replace("-"," → ")} · {o.wordCount} сл.{o.price&&<> · 💰{o.price}₸</>}</div></div>
      <button className={`btn btn-sm ${o.stage==="ai_edit"?"btn-purple":"btn-p"}`}>{o.stage==="ai_edit"?"Ред.ИИ →":"Ревью →"}</button>
    </div></div>);
}

// ═══════════════════════════════════════════
function Settings({apiKey,setApiKey,gasUrl,setGasUrl,model,setModel,aiEditPrompt,setAiEditPrompt,gasOk,gasCfg,toast}) {
  const [k,setK]=useState(apiKey);const [u,setU]=useState(gasUrl);const [testing,setTesting]=useState(false);const [res,setRes]=useState("");
  const test=async()=>{setTesting(true);setRes("...");try{const r=await fetch(u+"?action=getConfig",{redirect:"follow"});const d=await r.json();if(d.success){setRes("✅ OK!");setGasUrl(u);toast("✓","success");}else setRes("❌ "+d.error);}catch(e){setRes("❌ "+e.message);}setTesting(false);};
  return(<div className="sg">
    <div className="sc"><h4>🔗 Google Apps Script</h4><div className={`ds ${gasOk?"ok":"err"}`}>{gasOk?"✓ Sheets+Drive":"✗ Нет"}</div>
      <div className="fg"><label className="fl">URL</label><input className="fi" placeholder="https://script.google.com/macros/s/.../exec" value={u} onChange={e=>setU(e.target.value)}/></div>
      <div className="btns" style={{marginTop:6}}><button className="btn btn-p btn-sm" onClick={()=>{setGasUrl(u);toast("OK","info")}}>💾</button><button className="btn btn-s btn-sm" onClick={test} disabled={testing||!u}>{testing?<span className="spin"/>:"🔍 Тест"}</button></div>
      {res&&<div style={{marginTop:8,fontSize:11,color:"var(--t2)",padding:7,background:"var(--bg1)",borderRadius:5,border:"1px solid var(--bd)"}}>{res}</div>}
      {gasOk&&gasCfg&&<div style={{marginTop:10,fontSize:11}}>📊 <a href={gasCfg.spreadsheetUrl} target="_blank" rel="noopener">Sheets</a> · 📁 <a href={gasCfg.driveFolderUrl} target="_blank" rel="noopener">Drive</a></div>}
    </div>
    <div className="sc"><h4>🔑 Gemini API</h4>
      <div className="fg"><label className="fl">Ключ</label><input className="fi" type="password" placeholder="AIza..." value={k} onChange={e=>setK(e.target.value)}/></div>
      <div className="fg"><label className="fl">Модель</label><select className="fs" value={model} onChange={e=>setModel(e.target.value)}><option value="gemini-2.0-flash">2.0 Flash</option><option value="gemini-2.0-flash-lite">Flash Lite</option><option value="gemini-1.5-pro">1.5 Pro</option></select></div>
      <button className="btn btn-p btn-sm" onClick={()=>{setApiKey(k);toast("✓","success")}}>💾</button>
    </div>
    <div className="sc sc-full"><h4>🔧 Промпт «Редактирование ИИ»</h4>
      <p style={{fontSize:10,color:"var(--t3)",marginBottom:6}}>Используется на этапе «Ред. ИИ» для правки чернового перевода</p>
      <textarea className="fi" rows={6} value={aiEditPrompt} onChange={e=>setAiEditPrompt(e.target.value)} style={{resize:"vertical",fontFamily:"'JetBrains Mono',monospace",fontSize:11}}/>
      <div className="btns"><button className="btn btn-s btn-sm" onClick={()=>{setAiEditPrompt(DEFAULT_AI_EDIT_PROMPT);toast("Сброшен","info")}}>↩ Сбросить</button></div>
    </div>
    <div className="sc"><h4>👥 Переводчики</h4>{TRANSLATORS.map(t=><div key={t.id} style={{padding:"5px 0",borderBottom:"1px solid var(--bd)"}}><div style={{fontSize:12,fontWeight:500}}>{t.name}</div><div style={{fontSize:10,color:"var(--t3)"}}>{t.langs.map(l=>l.toUpperCase().replace("-","→")).join(", ")} · {t.spec.map(s=>DOC_TYPES.find(d=>d.id===s)?.label).join(", ")}</div></div>)}</div>
    <div className="sc"><h4>📚 Глоссарии</h4>{Object.entries(GLOSSARIES).filter(([_,v])=>Object.keys(v).length>0).map(([type,langs])=><div key={type} style={{marginBottom:5}}><div style={{fontSize:11,fontWeight:500}}>{DOC_TYPES.find(d=>d.id===type)?.icon} {DOC_TYPES.find(d=>d.id===type)?.label}</div>{Object.entries(langs).map(([lp,terms])=><div key={lp} style={{fontSize:10,color:"var(--t3)",paddingLeft:5}}>{lp.toUpperCase().replace("-"," → ")}: {Object.keys(terms).length}</div>)}</div>)}</div>
  </div>);
}
