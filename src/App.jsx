import React, { useState, useEffect, useCallback, useRef } from "react";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";

// Базовые константы (твои + добавленные)
const LP = [{from:"ru",to:"kk",label:"Русский → Казахский"},{from:"kk",to:"ru",label:"Казахский → Русский"},{from:"ru",to:"en",label:"Русский → Английский"},{from:"en",to:"ru",label:"Английский → Русский"}];
const DT = [{id:"legal",label:"Юридический",icon:"⚖️"},{id:"medical",label:"Медицинский",icon:"🏥"},{id:"technical",label:"Технический",icon:"⚙️"},{id:"financial",label:"Финансовый",icon:"📊"},{id:"personal",label:"Личный",icon:"📋"}];
const CX = [{id:"phys_template",label:"Физлицо — шаблонные",s:"Физ/Шабл"},{id:"jur_ai_edit",label:"Юрлицо — перевод+ред.ИИ",s:"Юр/+РИИ"}];
const SM = {
  intake:{l:"Принят",i:"📥"},
  classify:{l:"Классификация",i:"🔍"},
  translate:{l:"AI Перевод",i:"🤖"},
  ai_edit:{l:"Ред. ИИ",i:"🔧"},
  review:{l:"Ревью",i:"✏️"},
  human_approval:{l:"Подписание",i:"👤"}, // НОВЫЙ ЭТАП
  deliver:{l:"Готов",i:"✅"}
};
const DEF_EXEC = [{id:1,name:"Иван Петров",role:"translator",email:"ivan@test.kz",langs:["ru-kk","kk-ru"],spec:["legal","personal"]}];

// Утилиты (Local Storage)
const LS = {
  g: (k, d) => { try { const v = localStorage.getItem("tw_" + k); return v ? JSON.parse(v) : d ?? null; } catch { return d ?? null; } },
  s: (k, v) => { try { localStorage.setItem("tw_" + k, JSON.stringify(v)); } catch {} }
};

// Крипто-проверка хэша
async function hashFile(fileOrBlob) {
  const buffer = await fileOrBlob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Умный CSS (Dual Theme)
const CSS = `
@import url("https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap");

:root, :root[data-theme="dark"] {
  --b0:#08080D; --b1:#0F0F17; --b2:rgba(22,22,32,.8); --b3:#1C1C2A; 
  --bd:#252538; --bh:#3A3A55; --t1:#EDEDF4; --t2:#9494AD; --t3:#5C5C75; 
  --ac:#E8C547; --ad:#E8C54725; --ok:#3DDC84; --od:#3DDC8418; --er:#F44; 
  --in:#4A9EF5; --pu:#A66BF5; --or:#F5943A; --card: #161620;
}

:root[data-theme="light"] {
  --b0:#F4F5F7; --b1:#FFFFFF; --b2:rgba(255,255,255,.9); --b3:#F9FAFB; 
  --bd:#E5E7EB; --bh:#D1D5DB; --t1:#111827; --t2:#4B5563; --t3:#9CA3AF; 
  --ac:#D9A01B; --ad:#FDF6E3; --ok:#10B981; --od:#D1FAE5; --er:#EF4444; 
  --in:#3B82F6; --pu:#8B5CF6; --or:#F97316; --card: #FFFFFF;
}

* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:"Outfit",sans-serif; background:var(--b0); color:var(--t1); min-height:100vh; transition: background 0.3s, color 0.3s; }
.R { display:flex; height:100vh; overflow:hidden; }
.S { width:220px; min-width:220px; background:var(--b1); border-right:1px solid var(--bd); display:flex; flex-direction:column; transition: background 0.3s; }
.Sh { padding:16px 12px; border-bottom:1px solid var(--bd); }
.Sh h1 { font-size:16px; font-weight:700; color:var(--ac); }
.Sn { padding:5px; flex:1; overflow-y:auto; }
.ni { display:flex; align-items:center; gap:8px; padding:7px 10px; border-radius:6px; cursor:pointer; font-size:12px; color:var(--t2); border:none; background:none; width:100%; text-align:left; font-family:inherit; transition:all .12s; }
.ni:hover { background:var(--b3); color:var(--t1); } .ni.on { background:var(--ad); color:var(--ac); font-weight:500; }
.M { flex:1; display:flex; flex-direction:column; overflow:hidden; }
.TB { height:42px; border-bottom:1px solid var(--bd); display:flex; align-items:center; padding:0 16px; gap:8px; background:var(--b1); justify-content:space-between; }
.CT { flex:1; overflow-y:auto; padding:16px; }
.cd { background:var(--card); border:1px solid var(--bd); border-radius:12px; padding:16px; margin-bottom:12px; box-shadow: 0 4px 20px rgba(0,0,0,0.02); }
.hd { display:flex; align-items:center; gap:6px; margin-bottom:10px; flex-wrap:wrap; }
.bt { display:inline-flex; align-items:center; gap:5px; padding:8px 16px; border-radius:8px; font-family:inherit; font-size:12px; font-weight:500; cursor:pointer; border:none; transition:all .12s; }
.bp { background:var(--ac); color:#111; font-weight:600; } .bp:hover { transform:translateY(-1px); filter:brightness(1.05); }
.bs { background:var(--b3); border:1px solid var(--bd); color:var(--t1); }
.bo { background:var(--ok); color:#fff; }
.stg { display:inline-flex; padding:3px 8px; border-radius:12px; font-size:10px; font-weight:500; }
.stg.si { background:var(--od); color:var(--ok); } .stg.srv { background:var(--ad); color:var(--ac); }

/* Публичная верификация */
.verify-wrap { max-width:600px; margin: 80px auto; padding:40px; background:var(--card); border-radius:24px; box-shadow:0 20px 60px rgba(0,0,0,0.05); text-align:center; border: 1px solid var(--bd); }
.v-status { display:inline-block; padding:12px 24px; border-radius:12px; font-weight:600; font-size:18px; margin: 20px 0; }
.v-valid { background:var(--od); color:var(--ok); }
.v-invalid { background:#FEE2E2; color:#DC2626; }
.v-meta { font-size:13px; color:var(--t2); line-height:1.8; margin-bottom:20px; text-align:left; background:var(--b3); padding:16px; border-radius:12px; }
`;

// --- ГЛАВНОЕ ПРИЛОЖЕНИЕ ---
export default function App() {
  const [theme, setTheme] = useState(() => LS.g("theme", "dark"));
  const [hashLoc, setHashLoc] = useState(window.location.hash);
  const [pg, sPg] = useState("new");
  const [ord, sOrd] = useState(() => LS.g("ord", []));
  const [execs] = useState(() => LS.g("execs", DEF_EXEC));
  const [tts, sTts] = useState([]);
  
  const toast = useCallback((m, t = "info") => alert(`${t.toUpperCase()}: ${m}`), []);

  // Синхронизация темы
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    LS.s("theme", theme);
  }, [theme]);

  // Роутер для страницы верификации
  useEffect(() => {
    const handleHash = () => setHashLoc(window.location.hash);
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  // Сохранение заказов
  useEffect(() => { LS.s("ord", ord); }, [ord]);

  // Маршрутизация на страницу верификации
  if (hashLoc.startsWith("#/verify/")) {
    const vId = hashLoc.split("#/verify/")[1];
    return <><style>{CSS}</style><VerifyPage id={vId} theme={theme} setTheme={setTheme} /></>;
  }

  const bs = s => ord.filter(o => o.stage === s).length;
  const nav = [
    {id:"new", ic:"🏠", lb:"Новый заказ"},
    {id:"ord", ic:"📋", lb:"Заказы"},
    {id:"rev", ic:"✏️", lb:"Ревью", bd: bs("review")},
    {id:"approval", ic:"👤", lb:"Подписание", bd: bs("human_approval")} // НОВЫЙ РАЗДЕЛ
  ];

  return (
    <>
      <style>{CSS}</style>
      <div className="R">
        <aside className="S">
          <div className="Sh"><h1>The Words</h1><p>Verified System v2</p></div>
          <nav className="Sn">
            {nav.map(n => (
              <button key={n.id} className={`ni ${pg === n.id ? "on" : ""}`} onClick={() => sPg(n.id)}>
                <span>{n.ic} {n.lb}</span> {n.bd > 0 && <strong>({n.bd})</strong>}
              </button>
            ))}
          </nav>
        </aside>
        
        <main className="M">
          <div className="TB">
            <h2 style={{fontSize:14}}>{nav.find(n=>n.id===pg)?.lb}</h2>
            <button className="bt bs" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? "🌞 Светлая тема" : "🌙 Тёмная тема"}
            </button>
          </div>
          
          <div className="CT">
            {pg === "new" && <NewOrdMock ord={ord} sOrd={sOrd} toast={toast} />}
            {pg === "ord" && <OrdPage ord={ord} />}
            {pg === "rev" && <RevPage ord={ord} sOrd={sOrd} toast={toast} />}
            {pg === "approval" && <ApprovalPage ord={ord} sOrd={sOrd} execs={execs} toast={toast} />}
          </div>
        </main>
      </div>
    </>
  );
}

// --- 1. СИМУЛЯЦИЯ НОВОГО ЗАКАЗА ---
function NewOrdMock({ ord, sOrd, toast }) {
  const createMock = () => {
    const order = {
      id: "TW-" + String(ord.length + 1).padStart(4, "0"),
      clientName: "ТОО Тест-Клиент",
      langPair: "ru-en",
      docType: "legal",
      sourceText: "Настоящий договор вступает в силу с момента подписания.",
      editedTranslation: "This Agreement shall enter into force upon signature.",
      stage: "review", // Сразу кидаем на ревью для теста
      createdAt: new Date().toISOString()
    };
    sOrd([...ord, order]);
    toast("Тестовый заказ создан и отправлен на Ревью", "success");
  };

  return (
    <div className="cd">
      <h3>Быстрый старт (MVP Test)</h3>
      <p style={{fontSize:12, color:"var(--t2)", margin:"10px 0"}}>
        Для теста нажми кнопку. Будет создан готовый переведенный заказ, который пойдет по маршруту: <br/>
        <b>Ревью → Подписание (генерация PDF) → Верификация</b>
      </p>
      <button className="bt bp" onClick={createMock}>Создать тестовый заказ</button>
    </div>
  );
}

// --- 2. РЕВЬЮ (Review) ---
function RevPage({ ord, sOrd, toast }) {
  const rv = ord.filter(o => o.stage === "review");
  
  const approve = (id) => {
    sOrd(p => p.map(o => o.id === id ? { ...o, stage: "human_approval" } : o));
    toast("Отправлено на Подписание", "success");
  };

  if(!rv.length) return <div className="cd">Нет заказов на ревью</div>;

  return rv.map(o => (
    <div key={o.id} className="cd">
      <div className="hd"><h3>✏️ Ревью: {o.id}</h3></div>
      <div style={{fontSize:12, marginBottom:10}}>
        <b>Оригинал:</b> {o.sourceText}<br/><br/>
        <b>Перевод:</b> {o.editedTranslation}
      </div>
      <button className="bt bp" onClick={() => approve(o.id)}>✅ Одобрить перевод (Передать на подпись)</button>
    </div>
  ));
}

// --- 3. HUMAN APPROVAL (ПОДПИСАНИЕ И ГЕНЕРАЦИЯ PDF) ---
function ApprovalPage({ ord, sOrd, execs, toast }) {
  const pending = ord.filter(o => o.stage === "human_approval");
  const [exec, setExec] = useState("");

  const finalize = async (order) => {
    if (!exec) return toast("Выберите переводчика", "error");

    const approvedAt = new Date().toISOString();
    const vId = order.id + "-" + Date.now().toString().slice(-6);

    // 1. Создаем PDF документ
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    
    // ВНИМАНИЕ: Для реальной кириллицы в jsPDF нужен кастомный шрифт TTF!
    // В MVP мы используем транслит или английский текст, чтобы не загружать 200Кб шрифт в этот файл.
    // Если нужно, я потом покажу как добавить Arial.ttf в jsPDF.
    const verifyUrl = window.location.origin + window.location.pathname + "#/verify/" + vId;
    const qrData = await QRCode.toDataURL(verifyUrl, { margin: 1 });

    doc.setFontSize(18);
    doc.text("The Words - Verified Translation", 40, 60);
    
    doc.setFontSize(10);
    doc.text(`Verification ID: ${vId}`, 40, 90);
    doc.text(`Approved By: ${exec}`, 40, 105);
    doc.text(`Date: ${new Date(approvedAt).toLocaleString()}`, 40, 120);

    doc.setDrawColor(200);
    doc.line(40, 140, 550, 140);

    doc.setFontSize(12);
    // Разбиваем текст чтобы не вылезал за края
    const splitText = doc.splitTextToSize(order.editedTranslation, 450);
    doc.text(splitText, 40, 170);

    // Добавляем QR код
    doc.addImage(qrData, "PNG", 450, 40, 80, 80);

    // 2. Получаем готовый Blob файла PDF
    const pdfBlob = doc.output("blob");

    // 3. Вычисляем крипто-хэш самого файла PDF!
    const hashHex = await hashFile(pdfBlob);

    // 4. Сохраняем верификацию (симуляция GAS базы)
    const record = {
      id: vId,
      orderId: order.id,
      hash: hashHex,
      status: "valid",
      approvedAt,
      translator: exec
    };
    LS.s("tw_verify_" + vId, record);

    // 5. Скачиваем файл клиенту
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${order.id}_Verified.pdf`;
    a.click();
    URL.revokeObjectURL(url);

    // 6. Завершаем заказ
    sOrd(p => p.map(o => o.id === order.id ? { 
      ...o, 
      stage: "deliver", 
      approvedBy: exec, 
      approvedAt, 
      verificationId: vId, 
      finalHash: hashHex 
    } : o));

    toast("Финальный документ подписан и сгенерирован!", "success");
  };

  if(!pending.length) return <div className="cd">Нет документов для подписания</div>;

  return pending.map(o => (
    <div key={o.id} className="cd" style={{borderColor: "var(--pu)"}}>
      <div className="hd"><h3>👤 Подписание: {o.id}</h3></div>
      <div style={{fontSize:12, marginBottom:10, color:"var(--t2)"}}>
        Документ проверен. Выберите исполнителя для формирования юридического следа и QR-кода.
      </div>
      
      <div style={{marginBottom: 15}}>
        <select value={exec} onChange={e => setExec(e.target.value)} style={{padding:"8px", borderRadius:"6px", width:"200px"}}>
          <option value="">-- Переводчик --</option>
          {execs.map(ex => <option key={ex.name} value={ex.name}>{ex.name}</option>)}
        </select>
      </div>

      <button className="bt bp" onClick={() => finalize(o)} disabled={!exec}>
        ✍️ Подписать и сгенерировать PDF
      </button>
    </div>
  ));
}

// --- 4. ПУБЛИЧНАЯ СТРАНИЦА ПРОВЕРКИ (VERIFY) ---
function VerifyPage({ id, theme, setTheme }) {
  const [fileHash, setFileHash] = useState(null);
  const [status, setStatus] = useState("idle"); // idle, valid, invalid
  
  // Ищем запись в "БД"
  const record = LS.g("tw_verify_" + id, null);

  const checkFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const hash = await hashFile(file);
    setFileHash(hash);

    if (hash === record.hash) {
      setStatus("valid");
    } else {
      setStatus("invalid");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--b0)", padding: "20px" }}>
      <button className="bt bs" style={{position:"absolute", top:20, right:20}} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
        {theme === "dark" ? "🌞 Светлая тема" : "🌙 Тёмная тема"}
      </button>

      <div className="verify-wrap">
        <h2>Проверка подлинности перевода</h2>

        {!record ? (
          <div className="v-status v-invalid">❌ Документ не найден в реестре</div>
        ) : (
          <>
            {record.status === "valid" && <div className="v-status v-valid">🟢 Документ подтверждён системой</div>}
            {record.status === "revoked" && <div className="v-status v-invalid">🔴 Документ аннулирован</div>}

            <div className="v-meta">
              <div><strong>Verification ID:</strong> {record.id}</div>
              <div><strong>Дата подтверждения:</strong> {new Date(record.approvedAt).toLocaleString()}</div>
              {/* Конфиденциальность: мы не показываем клиента публично! */}
            </div>

            <div style={{marginTop: 30, paddingTop: 30, borderTop: "1px solid var(--bd)"}}>
              <h3>🛡 Проверка неизменности файла</h3>
              <p style={{fontSize: 12, color: "var(--t3)", marginBottom: 15}}>
                Загрузите PDF файл, чтобы убедиться, что он не был изменён с момента перевода.
              </p>
              
              <input type="file" accept=".pdf" onChange={checkFile} style={{marginBottom: 20}} />

              {status === "valid" && <div className="v-status v-valid" style={{display:"block"}}>✅ Документ подлинный (Хэш совпадает)</div>}
              {status === "invalid" && <div className="v-status v-invalid" style={{display:"block"}}>❌ Ошибка: Документ был изменён!</div>}
              
              {fileHash && (
                <div style={{fontSize:9, color:"var(--t3)", wordBreak:"break-all", marginTop:10}}>
                  Хэш файла: {fileHash}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Простая таблица заказов
function OrdPage({ ord }) {
  if(!ord.length) return <div className="cd">Пусто</div>;
  return (
    <div className="cd">
      <table style={{width:"100%", textAlign:"left", fontSize:12}}>
        <thead><tr><th>ID</th><th>Этап</th><th>Дата</th><th>Verification ID</th></tr></thead>
        <tbody>
          {ord.map(o => (
            <tr key={o.id}>
              <td>{o.id}</td>
              <td><span className="stg srv">{SM[o.stage]?.l || o.stage}</span></td>
              <td>{new Date(o.createdAt).toLocaleDateString()}</td>
              <td style={{color:"var(--ac)"}}>{o.verificationId || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
