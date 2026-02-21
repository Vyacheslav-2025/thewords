import { useState, useEffect, useCallback, useRef } from "react";

// ─── CONSTANTS ──────────────────────────────────────────────
const LANG_PAIRS = [
  { from: "ru", to: "kk", label: "Русский → Казахский" },
  { from: "kk", to: "ru", label: "Казахский → Русский" },
  { from: "ru", to: "en", label: "Русский → Английский" },
  { from: "en", to: "ru", label: "Английский → Русский" },
  { from: "kk", to: "en", label: "Казахский → Английский" },
  { from: "en", to: "kk", label: "Английский → Казахский" },
];

const DOC_TYPES = [
  { id: "legal", label: "Юридический", icon: "⚖️" },
  { id: "medical", label: "Медицинский", icon: "🏥" },
  { id: "technical", label: "Технический", icon: "⚙️" },
  { id: "financial", label: "Финансовый", icon: "📊" },
  { id: "personal", label: "Личный документ", icon: "📋" },
  { id: "marketing", label: "Маркетинг", icon: "📢" },
];

const STAGE_MAP = {
  intake: { label: "Принят", icon: "📥" },
  classify: { label: "Классификация", icon: "🔍" },
  translate: { label: "AI Перевод", icon: "🤖" },
  review: { label: "На ревью", icon: "✏️" },
  deliver: { label: "Готов", icon: "✅" },
};
const STAGES_LIST = ["intake", "classify", "translate", "review", "deliver"];

const TRANSLATORS = [
  { id: 1, name: "Переводчик 1", langs: ["ru-kk", "kk-ru"], spec: ["legal", "personal"] },
  { id: 2, name: "Переводчик 2", langs: ["ru-en", "en-ru"], spec: ["technical", "financial"] },
];

const PROMPTS = {
  legal: "Ты профессиональный юридический переводчик. Переводи точно, сохраняя юридическую терминологию и устоявшиеся формулировки целевого языка. Не упрощай юридические конструкции.",
  medical: "Ты профессиональный медицинский переводчик. Используй точную медицинскую терминологию. Латинские термины оставляй без изменений. Дозировки переводи согласно стандартам целевого языка.",
  technical: "Ты профессиональный технический переводчик. Сохраняй техническую терминологию. Аббревиатуры оставляй в оригинале с расшифровкой.",
  financial: "Ты профессиональный финансовый переводчик. Числовые данные переноси без изменений. Названия организаций оставляй в оригинале.",
  personal: "Ты профессиональный переводчик шаблонных документов (паспорта, свидетельства). Переводи строго по формату. Имена транслитерируй по стандартам.",
  marketing: "Ты профессиональный маркетинговый переводчик. Адаптируй текст культурно. Слоганы адаптируй, а не переводи дословно.",
};

const GLOSSARIES = {
  legal: {
    "ru-kk": { "договор": "шарт", "ответственность": "жауапкершілік", "обязательство": "міндеттеме", "истец": "талапкер", "ответчик": "жауапкер" },
    "ru-en": { "договор": "agreement", "доверенность": "power of attorney", "исковое заявление": "statement of claim" },
  },
  medical: {
    "ru-kk": { "диагноз": "диагноз", "назначение": "тағайындау", "пациент": "науқас" },
    "ru-en": { "направление": "referral", "выписка": "discharge summary" },
  },
  financial: {
    "ru-en": { "выручка": "revenue", "прибыль": "profit", "убыток": "loss" },
    "ru-kk": { "выручка": "түсім", "прибыль": "пайда" },
  },
  personal: {
    "ru-kk": { "свидетельство о рождении": "туу туралы куәлік", "удостоверение личности": "жеке куәлік" },
    "ru-en": { "свидетельство о рождении": "birth certificate", "справка": "certificate" },
  },
  technical: {}, marketing: {},
};

// ─── GAS CLIENT ─────────────────────────────────────────────
class GAS {
  constructor(url) { this.url = url; }

  async call(params) {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(this.url + "?" + qs, { redirect: "follow" });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "GAS error");
    return data.data;
  }

  createOrder(o) {
    return this.call({
      action: "createOrder", orderId: o.orderId, clientName: o.clientName,
      clientType: o.clientType, langPair: o.langPair, docType: o.docType,
      wordCount: String(o.wordCount || 0), translator: o.translator, comment: o.comment || "",
    });
  }

  saveFile(orderId, stage, content, langPair, fileName) {
    // URL safe limit ~8KB; обрезаем если больше
    const safe = content.length > 6000 ? content.substring(0, 6000) : content;
    return this.call({ action: "saveFile", orderId, stage, content: safe, langPair, fileName });
  }

  updateStatus(orderId, status, comment) {
    return this.call({ action: "updateStatus", orderId, status, comment: comment || "" });
  }

  getOrders() { return this.call({ action: "getOrders" }); }
  getConfig() { return this.call({ action: "getConfig" }); }
}

// ─── LOCAL STORAGE HELPER ───────────────────────────────────
const LS = {
  get(k, def = null) { try { const v = localStorage.getItem("tw_" + k); return v ? JSON.parse(v) : def; } catch { return def; } },
  set(k, v) { try { localStorage.setItem("tw_" + k, JSON.stringify(v)); } catch {} },
};

// ─── CSS ────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
:root{--bg0:#08080D;--bg1:#0F0F17;--bg2:rgba(22,22,32,.8);--bg3:#1C1C2A;--bd:#252538;--bdh:#3A3A55;--t1:#EDEDF4;--t2:#9494AD;--t3:#5C5C75;--acc:#E8C547;--accd:#E8C54725;--ok:#3DDC84;--okd:#3DDC8418;--err:#F44;--info:#4A9EF5;--purple:#A66BF5;--orange:#F5943A}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Outfit',sans-serif;background:var(--bg0);color:var(--t1);min-height:100vh}
.root{display:flex;height:100vh;overflow:hidden}
.sb{width:250px;min-width:250px;background:var(--bg1);border-right:1px solid var(--bd);display:flex;flex-direction:column}
.sb-hd{padding:20px 16px;border-bottom:1px solid var(--bd)}.sb-hd h1{font-size:18px;font-weight:700;color:var(--acc)}.sb-hd p{font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:2px;margin-top:3px}
.sb-nav{padding:8px;flex:1;overflow-y:auto}
.ni{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:7px;cursor:pointer;font-size:13px;color:var(--t2);border:none;background:none;width:100%;text-align:left;font-family:inherit;transition:all .12s}
.ni:hover{background:var(--bg3);color:var(--t1)}.ni.on{background:var(--accd);color:var(--acc);font-weight:500}
.ni-i{font-size:16px;width:22px;text-align:center;flex-shrink:0}
.ni-b{margin-left:auto;background:var(--acc);color:var(--bg0);font-size:10px;font-weight:600;padding:1px 7px;border-radius:10px}
.sb-ft{padding:12px 16px;border-top:1px solid var(--bd);font-size:11px}
.sfr{display:flex;justify-content:space-between;padding:2px 0}.sfr .l{color:var(--t3)}.sfr .v{color:var(--t2);font-family:'JetBrains Mono',monospace;font-size:10px}
.mn{flex:1;display:flex;flex-direction:column;overflow:hidden}
.tb{height:50px;border-bottom:1px solid var(--bd);display:flex;align-items:center;padding:0 20px;gap:12px;background:var(--bg1);flex-shrink:0}
.tb h2{font-size:15px;font-weight:600}
.st{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--t3);margin-left:auto}
.dot{width:6px;height:6px;border-radius:50%;background:var(--err)}.dot.on{background:var(--ok)}
.st2{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--t3);margin-left:12px}
.pipe{display:flex;gap:3px;padding:12px 20px;background:var(--bg1);border-bottom:1px solid var(--bd);flex-shrink:0}
.ps{flex:1;display:flex;align-items:center;gap:6px;padding:7px 10px;border-radius:6px;font-size:12px;background:var(--bg3);border:1px solid var(--bd);color:var(--t3);transition:all .2s}
.ps.on{background:var(--accd);border-color:var(--acc);color:var(--acc);font-weight:500}.ps.ok{background:var(--okd);border-color:transparent;color:var(--ok)}
.ct{flex:1;overflow-y:auto;padding:20px}
.card{background:var(--bg2);border:1px solid var(--bd);border-radius:10px;padding:18px;margin-bottom:14px;backdrop-filter:blur(8px)}
.ch{display:flex;align-items:center;gap:8px;margin-bottom:14px}.ch h3{font-size:14px;font-weight:600}
.badge{font-size:10px;padding:2px 9px;border-radius:16px;background:var(--accd);color:var(--acc);font-weight:500}
.ds{display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:6px;font-size:11px;margin-bottom:10px}
.ds.ok{background:var(--okd);color:var(--ok)}.ds.wait{background:#F5943A18;color:var(--orange)}.ds.err{background:#F4444418;color:var(--err)}
.fg{margin-bottom:14px}
.fl{display:block;font-size:11px;font-weight:500;color:var(--t2);margin-bottom:5px;text-transform:uppercase;letter-spacing:.4px}
.fi,.fs{width:100%;padding:9px 12px;background:var(--bg1);border:1px solid var(--bd);border-radius:7px;color:var(--t1);font-family:inherit;font-size:13px;outline:none;transition:border-color .12s}
.fi:focus,.fs:focus{border-color:var(--acc)}.fs option{background:var(--bg1)}
.upz{border:2px dashed var(--bd);border-radius:10px;padding:28px;text-align:center;cursor:pointer;transition:all .15s;background:var(--bg1)}
.upz:hover,.upz.drag{border-color:var(--acc);background:var(--accd)}
.fp{display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg1);border-radius:7px;margin-top:10px}
.fp .fn{font-size:12px;flex:1}.fp .fsz{font-size:10px;color:var(--t3);font-family:'JetBrains Mono',monospace}
.fp .frm{background:none;border:none;color:var(--err);cursor:pointer;font-size:14px}
.btn{display:inline-flex;align-items:center;gap:7px;padding:9px 18px;border-radius:7px;font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;border:none;transition:all .12s}
.btn-p{background:var(--acc);color:var(--bg0)}.btn-p:hover{filter:brightness(1.1)}.btn-p:disabled{opacity:.35;cursor:not-allowed}
.btn-s{background:var(--bg3);border:1px solid var(--bd);color:var(--t1)}.btn-s:hover{border-color:var(--bdh)}
.btn-ok{background:var(--ok);color:var(--bg0)}.btn-ok:hover{filter:brightness(1.1)}
.btn-sm{padding:5px 11px;font-size:12px}
.btns{display:flex;gap:7px;margin-top:14px;flex-wrap:wrap}
.dtg{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}
.dtc{padding:10px;border-radius:7px;border:1px solid var(--bd);background:var(--bg1);cursor:pointer;text-align:center;transition:all .12s;font-family:inherit;color:var(--t2);font-size:11px}
.dtc:hover{border-color:var(--bdh)}.dtc.sel{border-color:var(--acc);background:var(--accd);color:var(--acc)}
.dtc-i{font-size:20px;display:block;margin-bottom:3px}
.trc{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.trp{background:var(--bg1);border:1px solid var(--bd);border-radius:8px;overflow:hidden}
.trp-h{padding:8px 12px;border-bottom:1px solid var(--bd);font-size:11px;text-transform:uppercase;letter-spacing:.4px;color:var(--t3);display:flex;justify-content:space-between}
.trp-b{padding:14px;min-height:180px;font-size:13px;line-height:1.65;white-space:pre-wrap}
.trp-b textarea{width:100%;min-height:180px;background:transparent;border:none;color:var(--t1);font-family:inherit;font-size:13px;line-height:1.65;resize:vertical;outline:none}
.glp{background:var(--bg3);border:1px solid var(--bd);border-radius:8px;padding:12px;margin-top:14px}
.glp h4{font-size:11px;text-transform:uppercase;letter-spacing:.4px;color:var(--t3);margin-bottom:8px}
.glr{display:flex;gap:6px;font-size:12px;padding:3px 0;border-bottom:1px solid var(--bd);font-family:'JetBrains Mono',monospace}.glr:last-child{border-bottom:none}
.gl-s{color:var(--t3);flex:1}.gl-a{color:var(--t3)}.gl-t{color:var(--acc);flex:1}
.otbl{width:100%;border-collapse:separate;border-spacing:0}
.otbl th{text-align:left;padding:7px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.4px;color:var(--t3);border-bottom:1px solid var(--bd)}
.otbl td{padding:8px 10px;font-size:12px;border-bottom:1px solid var(--bd)}.otbl tr:hover td{background:var(--bg3)}
.stag{display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:14px;font-size:10px;font-weight:500}
.stag.s-intake{background:#4A9EF518;color:var(--info)}.stag.s-classify{background:var(--accd);color:var(--acc)}.stag.s-translate{background:#A66BF518;color:var(--purple)}.stag.s-review{background:#F5943A18;color:var(--orange)}.stag.s-deliver{background:var(--okd);color:var(--ok)}
.spin{display:inline-block;width:14px;height:14px;border:2px solid var(--bd);border-top-color:var(--acc);border-radius:50%;animation:sp .7s linear infinite}@keyframes sp{to{transform:rotate(360deg)}}
.lbar{height:3px;background:var(--bd);border-radius:2px;overflow:hidden;margin:10px 0}.lbar-in{height:100%;background:linear-gradient(90deg,var(--acc),var(--ok));border-radius:2px;transition:width .4s}
.toasts{position:fixed;top:14px;right:14px;z-index:1000;display:flex;flex-direction:column;gap:6px}
.toast{padding:10px 14px;border-radius:7px;font-size:12px;animation:tIn .25s ease;max-width:320px;font-family:'Outfit',sans-serif}
.toast.success{background:var(--ok);color:var(--bg0)}.toast.error{background:var(--err);color:#fff}.toast.info{background:var(--info);color:#fff}
@keyframes tIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
.empty{text-align:center;padding:40px 20px;color:var(--t3)}.empty-i{font-size:40px;margin-bottom:10px}
.sg{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.sc{background:var(--bg2);border:1px solid var(--bd);border-radius:8px;padding:14px;backdrop-filter:blur(8px)}.sc h4{font-size:12px;font-weight:600;margin-bottom:10px}
.hint{font-size:11px;color:var(--t3);line-height:1.5;margin-top:10px}
a{color:var(--acc)}
@media(max-width:860px){.sb{width:54px;min-width:54px}.sb-hd h1,.sb-hd p,.ni span:not(.ni-i),.ni-b,.sb-ft{display:none}.ni{justify-content:center;padding:10px}.trc,.sg{grid-template-columns:1fr}.dtg{grid-template-columns:repeat(2,1fr)}.ps span{display:none}}
`;

// ─── APP ────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("new-order");
  const [orders, setOrders] = useState(() => LS.get("orders", []));
  const [cur, setCur] = useState(null);
  const [apiKey, setApiKey] = useState(() => LS.get("apiKey", ""));
  const [gasUrl, setGasUrl] = useState(() => LS.get("gasUrl", ""));
  const [model, setModel] = useState(() => LS.get("model", "gemini-2.0-flash"));
  const [toasts, setToasts] = useState([]);
  const [gasOk, setGasOk] = useState(false);
  const [gasCfg, setGasCfg] = useState(null);
  const gas = useRef(null);

  const toast = useCallback((msg, type = "info") => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  // Persist
  useEffect(() => { LS.set("orders", orders); }, [orders]);
  const save = (k, v) => { LS.set(k, v); };

  // GAS connection
  useEffect(() => {
    if (!gasUrl) { setGasOk(false); gas.current = null; return; }
    const g = new GAS(gasUrl);
    gas.current = g;
    g.getConfig().then(c => { setGasOk(true); setGasCfg(c); }).catch(() => setGasOk(false));
  }, [gasUrl]);

  const apiOk = apiKey.length > 10;
  const byStage = s => orders.filter(o => o.stage === s).length;

  const nav = [
    { id: "new-order", icon: "📥", label: "Новый заказ" },
    { id: "orders", icon: "📋", label: "Заказы", badge: orders.length || null },
    { id: "review-queue", icon: "✏️", label: "На ревью", badge: byStage("review") || null },
    { id: "settings", icon: "⚙️", label: "Настройки", badge: (!apiOk || !gasOk) ? "!" : null },
  ];

  return (
    <>
      <style>{CSS}</style>
      <div className="root">
        <div className="toasts">{toasts.map(t => <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>)}</div>
        <aside className="sb">
          <div className="sb-hd"><h1>The Words</h1><p>Translation Bureau</p></div>
          <nav className="sb-nav">
            {nav.map(n => (
              <button key={n.id} className={`ni ${page === n.id ? "on" : ""}`} onClick={() => setPage(n.id)}>
                <span className="ni-i">{n.icon}</span><span>{n.label}</span>
                {n.badge && <span className="ni-b">{n.badge}</span>}
              </button>
            ))}
          </nav>
          <div className="sb-ft">
            <div className="sfr"><span className="l">Заказов</span><span className="v">{orders.length}</span></div>
            <div className="sfr"><span className="l">Sheets</span><span className="v">{gasOk ? "✓" : "✗"}</span></div>
            <div className="sfr"><span className="l">Gemini</span><span className="v">{apiOk ? "✓" : "✗"}</span></div>
          </div>
        </aside>
        <main className="mn">
          <div className="tb">
            <h2>{nav.find(n => n.id === page)?.icon} {nav.find(n => n.id === page)?.label}</h2>
            <div className="st"><div className={`dot ${apiOk ? "on" : ""}`} />{apiOk ? "Gemini" : "Нет API"}</div>
            <div className="st2"><div className={`dot ${gasOk ? "on" : ""}`} />{gasOk ? "Sheets ✓" : "Sheets ✗"}</div>
          </div>
          {cur && page === "new-order" && (
            <div className="pipe">
              {STAGES_LIST.map(s => {
                const ci = STAGES_LIST.indexOf(cur.stage), si = STAGES_LIST.indexOf(s);
                return <div key={s} className={`ps ${si < ci ? "ok" : si === ci ? "on" : ""}`}>{STAGE_MAP[s].icon} <span>{STAGE_MAP[s].label}</span></div>;
              })}
            </div>
          )}
          <div className="ct">
            {page === "new-order" && <NewOrder {...{cur, setCur, orders, setOrders, apiKey, apiOk, model, gas: gas.current, gasOk, toast}} />}
            {page === "orders" && <Orders {...{orders, gas: gas.current, gasOk, toast}} />}
            {page === "review-queue" && <Review {...{orders, setOrders, gas: gas.current, gasOk, toast}} />}
            {page === "settings" && <Settings {...{apiKey, setApiKey: v => { setApiKey(v); save("apiKey", v); }, gasUrl, setGasUrl: v => { setGasUrl(v); save("gasUrl", v); }, model, setModel: v => { setModel(v); save("model", v); }, gasOk, gasCfg, toast}} />}
          </div>
        </main>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════
// NEW ORDER
// ═══════════════════════════════════════════
function NewOrder({ cur, setCur, orders, setOrders, apiKey, apiOk, model, gas, gasOk, toast }) {
  const [file, setFile] = useState(null);
  const [fileText, setFileText] = useState("");
  const [manual, setManual] = useState("");
  const [lp, setLp] = useState("ru-kk");
  const [dt, setDt] = useState(null);
  const [autoDt, setAutoDt] = useState(null);
  const [client, setClient] = useState("");
  const [ctype, setCtype] = useState("Физлицо");
  const [clsfy, setClsfy] = useState(false);
  const [trslt, setTrslt] = useState(false);
  const [result, setResult] = useState("");
  const [edited, setEdited] = useState("");
  const [prog, setProg] = useState(0);
  const [drvSt, setDrvSt] = useState({});
  const [drag, setDrag] = useState(false);
  const fRef = useRef(null);

  const src = fileText || manual;
  const [lFrom, lTo] = lp.split("-");

  const reset = () => { setCur(null); setFile(null); setFileText(""); setManual(""); setDt(null); setAutoDt(null); setResult(""); setEdited(""); setProg(0); setClient(""); setDrvSt({}); };

  const onFile = async f => { if (!f) return; setFile(f); setFileText((await f.text()).substring(0, 50000)); toast("Файл загружен", "success"); };

  const drv = async (oid, stage, content, label) => {
    if (!gasOk || !gas) return;
    try {
      setDrvSt(p => ({ ...p, [stage]: "saving" }));
      const fn = `${oid}_${stage === "original" ? "ORIG" : stage === "ai_translation" ? "AI" : stage === "review" ? "REV" : "FINAL"}_${lp}.txt`;
      await gas.saveFile(oid, stage, content, lp, fn);
      setDrvSt(p => ({ ...p, [stage]: "ok" }));
      toast(`📁 ${label} → Drive ✓`, "success");
    } catch (e) {
      setDrvSt(p => ({ ...p, [stage]: "err" }));
      toast(`Drive: ${e.message}`, "error");
    }
  };

  const classify = async () => {
    if (!apiOk) { toast("Нет Gemini API ключа", "error"); return; }
    if (!src.trim()) { toast("Нет текста", "error"); return; }
    setClsfy(true); setProg(25);
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: `Классифицируй: legal,medical,technical,financial,personal,marketing.\nJSON: {"type":"...","confidence":0.0-1.0,"reason":"..."}\n\n${src.substring(0, 3000)}` }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 200 } }),
      });
      const d = await r.json(); const txt = d?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const m = txt.match(/\{[\s\S]*?\}/);
      if (m) { const p = JSON.parse(m[0]); const f = DOC_TYPES.find(x => x.id === p.type); if (f) { setAutoDt({ ...p, ...f }); setDt(p.type); setProg(50); toast(`${f.icon} ${f.label}`, "success"); } }
      else toast("Выберите тип вручную", "error");
    } catch (e) { toast(e.message, "error"); }
    setClsfy(false);
  };

  const translate = async () => {
    if (!dt) { toast("Выберите тип", "error"); return; }
    setTrslt(true); setProg(60);
    const gl = GLOSSARIES[dt]?.[lp] || {};
    const glS = Object.entries(gl).length ? "\n\nГлоссарий:\n" + Object.entries(gl).map(([k, v]) => `"${k}"→"${v}"`).join("\n") : "";
    const ln = { ru: "русский", kk: "казахский", en: "английский" };
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: `${PROMPTS[dt]}\n\n${ln[lFrom]}→${ln[lTo]}${glS}\n\nПереведи, верни ТОЛЬКО перевод:\n\n${src.substring(0, 30000)}` }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 8192 } }),
      });
      const d = await r.json(); const t = d?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!t) { toast("Пустой ответ", "error"); setTrslt(false); return; }
      setResult(t); setEdited(t); setProg(75);

      const tr = TRANSLATORS.find(x => x.spec.includes(dt))?.name || "Не назначен";
      const oid = `TW-${String(orders.length + 1).padStart(4, "0")}`;
      const order = { id: oid, clientName: client || "Без имени", clientType: ctype, fileName: file?.name || "Ручной ввод", langPair: lp, docType: dt, sourceText: src.substring(0, 5000), aiTranslation: t, editedTranslation: t, stage: "review", createdAt: new Date().toISOString(), wordCount: src.split(/\s+/).length, assignedTo: tr };
      setCur(order); setOrders(p => [...p, order]);

      if (gasOk && gas) {
        try {
          await gas.createOrder({ orderId: oid, clientName: client || "Без имени", clientType: ctype, langPair: lp.toUpperCase().replace("-", " → "), docType: DOC_TYPES.find(x => x.id === dt)?.label, wordCount: src.split(/\s+/).length, translator: tr, comment: `Файл: ${file?.name || "ручной ввод"}` });
          toast("📊 Sheets ✓", "success");
          await gas.updateStatus(oid, "AI Перевод");
          await drv(oid, "original", src, "Оригинал");
          await drv(oid, "ai_translation", t, "AI-перевод");
          await gas.updateStatus(oid, "На ревью");
        } catch (e) { toast("Sheets: " + e.message, "error"); }
      }
      toast("Перевод готов → ревью", "success");
    } catch (e) { toast(e.message, "error"); }
    setTrslt(false);
  };

  const approve = async () => {
    if (!cur) return;
    const upd = { ...cur, stage: "deliver", editedTranslation: edited };
    setCur(upd); setOrders(p => p.map(o => o.id === upd.id ? upd : o)); setProg(100);
    if (gasOk && gas) {
      try { await drv(cur.id, "review", edited, "Ревью"); await drv(cur.id, "final", edited, "Финал"); await gas.updateStatus(cur.id, "Готов", "Одобрено"); toast("📊 Sheets+Drive ✓", "success"); } catch (e) { toast(e.message, "error"); }
    }
    toast("✅ Готов!", "success");
  };

  const dl = () => { const b = new Blob([edited || result], { type: "text/plain;charset=utf-8" }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = `${cur?.id || "tr"}_FINAL_${lp}.txt`; a.click(); URL.revokeObjectURL(u); };

  const DrvS = ({ label, st }) => st ? <div className={`ds ${st === "ok" ? "ok" : st === "saving" ? "wait" : "err"}`}>{st === "ok" ? "✓" : st === "saving" ? "↻" : "✗"} {label}</div> : null;

  return (
    <>
      {cur && <button className="btn btn-s btn-sm" onClick={reset} style={{ marginBottom: 12 }}>← Новый заказ</button>}

      {(!cur || cur.stage === "intake") && !result && (
        <div className="card">
          <div className="ch"><h3>📥 Приём заказа</h3><span className="badge">Шаг 1</span></div>
          {!gasOk && <div className="ds err">⚠ Sheets не подключён</div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="fg"><label className="fl">Клиент</label><input className="fi" placeholder="Имя / компания" value={client} onChange={e => setClient(e.target.value)} /></div>
            <div className="fg"><label className="fl">Тип</label><select className="fs" value={ctype} onChange={e => setCtype(e.target.value)}><option>Физлицо</option><option>Юрлицо</option></select></div>
          </div>
          <div className="fg"><label className="fl">Языковая пара</label><select className="fs" value={lp} onChange={e => setLp(e.target.value)}>{LANG_PAIRS.map(l => <option key={`${l.from}-${l.to}`} value={`${l.from}-${l.to}`}>{l.label}</option>)}</select></div>
          <div className="fg">
            <label className="fl">Документ</label>
            <div className={`upz ${drag ? "drag" : ""}`} onClick={() => fRef.current?.click()} onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files[0]); }}>
              <div style={{ fontSize: 28 }}>📄</div><div style={{ fontSize: 13, color: "var(--t2)" }}>Нажмите или перетащите</div><div style={{ fontSize: 11, color: "var(--t3)", marginTop: 3 }}>.txt .md .html .csv</div>
              <input ref={fRef} type="file" accept=".txt,.md,.html,.csv" style={{ display: "none" }} onChange={e => onFile(e.target.files[0])} />
            </div>
            {file && <div className="fp"><span style={{ fontSize: 20 }}>📄</span><span className="fn">{file.name}</span><span className="fsz">{(file.size / 1024).toFixed(1)} КБ</span><button className="frm" onClick={() => { setFile(null); setFileText(""); }}>✕</button></div>}
          </div>
          {!file && <div className="fg"><label className="fl">Или текст</label><textarea className="fi" rows={5} placeholder="Вставьте текст..." value={manual} onChange={e => setManual(e.target.value)} style={{ resize: "vertical" }} /></div>}
          <div className="btns"><button className="btn btn-p" disabled={!src.trim() || clsfy} onClick={classify}>{clsfy ? <><span className="spin" /> Классификация...</> : "🔍 Классифицировать"}</button></div>
        </div>
      )}

      {autoDt && !result && (
        <div className="card">
          <div className="ch"><h3>🔍 Тип документа</h3><span className="badge">Шаг 2</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, background: "var(--bg1)", borderRadius: 7, border: "1px solid var(--bd)" }}>
            <span style={{ fontSize: 26 }}>{autoDt.icon}</span>
            <div><div style={{ fontSize: 14, fontWeight: 600 }}>{autoDt.label}</div><div style={{ fontSize: 11, color: "var(--t3)" }}>{Math.round(autoDt.confidence * 100)}% — {autoDt.reason}</div></div>
          </div>
          <div className="fg" style={{ marginTop: 14 }}><label className="fl">Изменить</label>
            <div className="dtg">{DOC_TYPES.map(d => <button key={d.id} className={`dtc ${dt === d.id ? "sel" : ""}`} onClick={() => setDt(d.id)}><span className="dtc-i">{d.icon}</span>{d.label}</button>)}</div>
          </div>
          <div className="btns"><button className="btn btn-p" disabled={!dt || trslt} onClick={translate}>{trslt ? <><span className="spin" /> Перевод...</> : "🤖 Перевести"}</button></div>
          {trslt && <div className="lbar"><div className="lbar-in" style={{ width: `${prog}%` }} /></div>}
        </div>
      )}

      {result && cur?.stage === "review" && (
        <div className="card">
          <div className="ch"><h3>✏️ Ревью — {cur.id}</h3><span className="badge">Шаг 4</span></div>
          <DrvS label="Оригинал" st={drvSt.original} /><DrvS label="AI-перевод" st={drvSt.ai_translation} />
          <div className="trc">
            <div className="trp"><div className="trp-h"><span>Оригинал ({lFrom.toUpperCase()})</span><span>{src.split(/\s+/).length} сл.</span></div><div className="trp-b">{src}</div></div>
            <div className="trp"><div className="trp-h"><span>Перевод ({lTo.toUpperCase()})</span><span>{edited.split(/\s+/).length} сл.</span></div><div className="trp-b"><textarea value={edited} onChange={e => setEdited(e.target.value)} /></div></div>
          </div>
          {GLOSSARIES[dt]?.[lp] && Object.keys(GLOSSARIES[dt][lp]).length > 0 && <div className="glp"><h4>📚 Глоссарий</h4>{Object.entries(GLOSSARIES[dt][lp]).map(([s, t]) => <div key={s} className="glr"><span className="gl-s">{s}</span><span className="gl-a">→</span><span className="gl-t">{t}</span></div>)}</div>}
          <div className="btns"><button className="btn btn-ok" onClick={approve}>✅ Одобрить</button><button className="btn btn-s" onClick={dl}>⬇️ Скачать</button></div>
        </div>
      )}

      {cur?.stage === "deliver" && (
        <div className="card" style={{ borderColor: "var(--ok)" }}>
          <div className="ch"><h3>✅ {cur.id} готов</h3><span className="badge" style={{ background: "var(--ok)", color: "var(--bg0)" }}>Выдача</span></div>
          <DrvS label="Ревью" st={drvSt.review} /><DrvS label="Финал" st={drvSt.final} />
          <p style={{ fontSize: 13, color: "var(--t2)", marginBottom: 10 }}>Перевод готов{cur.clientName !== "Без имени" ? ` для ${cur.clientName}` : ""}.{gasOk ? " Файлы на Drive, строка в Sheets." : ""}</p>
          <div className="btns"><button className="btn btn-ok" onClick={dl}>⬇️ Скачать</button><button className="btn btn-p" onClick={reset}>📥 Новый</button></div>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════
// ORDERS
// ═══════════════════════════════════════════
function Orders({ orders, gas, gasOk, toast }) {
  const [remote, setRemote] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const sync = async () => { if (!gasOk || !gas) return; setSyncing(true); try { const d = await gas.getOrders(); setRemote(d); toast(`${d.length} заказов из Sheets`, "success"); } catch (e) { toast(e.message, "error"); } setSyncing(false); };
  const data = remote || orders;
  const isR = !!remote;
  if (!data.length) return <div className="empty"><div className="empty-i">📋</div><p>Нет заказов</p></div>;
  return (
    <>
      <div className="btns" style={{ marginTop: 0, marginBottom: 14 }}>
        {gasOk && <button className="btn btn-s btn-sm" onClick={sync} disabled={syncing}>{syncing ? <><span className="spin" /> Sync...</> : "🔄 Из Sheets"}</button>}
        {isR && <button className="btn btn-s btn-sm" onClick={() => setRemote(null)}>Локальные</button>}
      </div>
      <div className="card" style={{ padding: 0, overflow: "auto" }}>
        <table className="otbl"><thead><tr><th>ID</th><th>Клиент</th><th>Языки</th><th>Тип</th><th>Слов</th><th>Статус</th><th>Дата</th></tr></thead>
          <tbody>{(isR ? data : [...data].reverse()).map((o, i) => {
            const id = isR ? o["ID заказа"] : o.id, cl = isR ? o["Клиент"] : o.clientName, lang = isR ? o["Языковая пара"] : o.langPair?.toUpperCase().replace("-", " → "), typ = isR ? o["Тип документа"] : DOC_TYPES.find(d => d.id === o.docType)?.label, wc = isR ? o["Кол-во слов"] : o.wordCount, st = isR ? o["Статус"] : STAGE_MAP[o.stage]?.label, dt = isR ? o["Дата создания"] : new Date(o.createdAt).toLocaleDateString("ru-RU");
            const sc = isR ? (st === "Принят" ? "intake" : st === "AI Перевод" ? "translate" : st === "На ревью" ? "review" : st === "Готов" ? "deliver" : "classify") : o.stage;
            return <tr key={id || i}><td style={{ fontFamily: "'JetBrains Mono',monospace", color: "var(--acc)" }}>{id}</td><td>{cl}</td><td>{lang}</td><td>{typ}</td><td>{wc}</td><td><span className={`stag s-${sc}`}>{st}</span></td><td style={{ color: "var(--t3)", fontSize: 11 }}>{dt}</td></tr>;
          })}</tbody></table>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════
// REVIEW
// ═══════════════════════════════════════════
function Review({ orders, setOrders, gas, gasOk, toast }) {
  const rv = orders.filter(o => o.stage === "review");
  const [aid, setAid] = useState(null);
  const [txt, setTxt] = useState("");
  const a = rv.find(o => o.id === aid);

  const ok = async () => {
    if (!aid) return;
    setOrders(p => p.map(o => o.id === aid ? { ...o, stage: "deliver", editedTranslation: txt } : o));
    if (gasOk && gas) {
      try { await gas.saveFile(aid, "review", txt, a.langPair, `${aid}_REV_${a.langPair}.txt`); await gas.saveFile(aid, "final", txt, a.langPair, `${aid}_FINAL_${a.langPair}.txt`); await gas.updateStatus(aid, "Готов", "Одобрено"); toast("Sheets+Drive ✓", "success"); } catch (e) { toast(e.message, "error"); }
    }
    toast(`${aid} ✓`, "success"); setAid(null);
  };

  if (!rv.length && !aid) return <div className="empty"><div className="empty-i">✏️</div><p>Нет на ревью</p></div>;
  if (a) {
    const [f, t] = a.langPair.split("-");
    return <>
      <button className="btn btn-s btn-sm" onClick={() => setAid(null)} style={{ marginBottom: 12 }}>← Назад</button>
      <div className="card">
        <div className="ch"><h3>✏️ {a.id}</h3><span className="badge">{a.clientName} · {a.langPair.toUpperCase().replace("-", " → ")}</span></div>
        <div style={{ fontSize: 12, color: "var(--t3)", marginBottom: 10 }}>{DOC_TYPES.find(d => d.id === a.docType)?.icon} {DOC_TYPES.find(d => d.id === a.docType)?.label} · {a.wordCount} сл. · {a.assignedTo}</div>
        <div className="trc">
          <div className="trp"><div className="trp-h">Оригинал ({f.toUpperCase()})</div><div className="trp-b">{a.sourceText}</div></div>
          <div className="trp"><div className="trp-h">Перевод ({t.toUpperCase()})</div><div className="trp-b"><textarea value={txt} onChange={e => setTxt(e.target.value)} /></div></div>
        </div>
        {GLOSSARIES[a.docType]?.[a.langPair] && <div className="glp"><h4>📚 Глоссарий</h4>{Object.entries(GLOSSARIES[a.docType][a.langPair]).map(([s, t]) => <div key={s} className="glr"><span className="gl-s">{s}</span><span className="gl-a">→</span><span className="gl-t">{t}</span></div>)}</div>}
        <div className="btns"><button className="btn btn-ok" onClick={ok}>✅ Одобрить</button></div>
      </div>
    </>;
  }
  return rv.map(o => <div key={o.id} className="card" style={{ cursor: "pointer" }} onClick={() => { setAid(o.id); setTxt(o.editedTranslation || o.aiTranslation); }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div><div style={{ fontSize: 14, fontWeight: 600 }}>{o.id} — {o.clientName}</div><div style={{ fontSize: 12, color: "var(--t3)", marginTop: 3 }}>{DOC_TYPES.find(d => d.id === o.docType)?.icon} {o.langPair.toUpperCase().replace("-", " → ")} · {o.wordCount} сл.</div></div>
      <button className="btn btn-p btn-sm">Ревью →</button>
    </div>
  </div>);
}

// ═══════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════
function Settings({ apiKey, setApiKey, gasUrl, setGasUrl, model, setModel, gasOk, gasCfg, toast }) {
  const [k, setK] = useState(apiKey);
  const [u, setU] = useState(gasUrl);
  const [testing, setTesting] = useState(false);
  const [res, setRes] = useState("");

  const test = async () => {
    setTesting(true); setRes("Проверяю...");
    try {
      const r = await fetch(u + "?action=getConfig", { redirect: "follow" });
      const d = await r.json();
      if (d.success) { setRes("✅ Работает! ID таблицы: " + d.data?.spreadsheetId?.substring(0, 12) + "..."); setGasUrl(u); toast("Подключено!", "success"); }
      else setRes("❌ " + (d.error || "ошибка"));
    } catch (e) { setRes("❌ " + e.message); }
    setTesting(false);
  };

  return (
    <div className="sg">
      <div className="sc">
        <h4>🔗 Google Apps Script</h4>
        <div className={`ds ${gasOk ? "ok" : "err"}`}>{gasOk ? "✓ Подключено к Sheets + Drive" : "✗ Не подключено"}</div>
        <div className="fg"><label className="fl">Web App URL</label><input className="fi" placeholder="https://script.google.com/macros/s/.../exec" value={u} onChange={e => setU(e.target.value)} /></div>
        <div className="btns" style={{ marginTop: 8 }}>
          <button className="btn btn-p btn-sm" onClick={() => { setGasUrl(u); toast("Сохранено", "info"); }}>💾 Подключить</button>
          <button className="btn btn-s btn-sm" onClick={test} disabled={testing || !u}>{testing ? <><span className="spin" /></> : "🔍 Тест"}</button>
        </div>
        {res && <div style={{ marginTop: 10, fontSize: 12, color: "var(--t2)", padding: 10, background: "var(--bg1)", borderRadius: 6, border: "1px solid var(--bd)" }}>{res}</div>}
        {gasOk && gasCfg && <div style={{ marginTop: 12, fontSize: 12, lineHeight: 1.5 }}>📊 <a href={gasCfg.spreadsheetUrl} target="_blank" rel="noopener">Google Sheets</a> · 📁 <a href={gasCfg.driveFolderUrl} target="_blank" rel="noopener">Google Drive</a></div>}
      </div>
      <div className="sc">
        <h4>🔑 Gemini API</h4>
        <div className="fg"><label className="fl">API ключ</label><input className="fi" type="password" placeholder="AIza..." value={k} onChange={e => setK(e.target.value)} /></div>
        <div className="fg"><label className="fl">Модель</label><select className="fs" value={model} onChange={e => setModel(e.target.value)}><option value="gemini-2.0-flash">Gemini 2.0 Flash</option><option value="gemini-2.0-flash-lite">Flash Lite</option><option value="gemini-1.5-pro">1.5 Pro</option></select></div>
        <button className="btn btn-p btn-sm" onClick={() => { setApiKey(k); toast("Сохранено", "success"); }}>💾 Сохранить</button>
      </div>
      <div className="sc">
        <h4>👥 Переводчики</h4>
        {TRANSLATORS.map(t => <div key={t.id} style={{ padding: "6px 0", borderBottom: "1px solid var(--bd)" }}><div style={{ fontSize: 13, fontWeight: 500 }}>{t.name}</div><div style={{ fontSize: 11, color: "var(--t3)" }}>{t.langs.map(l => l.toUpperCase().replace("-", "→")).join(", ")} · {t.spec.map(s => DOC_TYPES.find(d => d.id === s)?.label).join(", ")}</div></div>)}
      </div>
      <div className="sc">
        <h4>📚 Глоссарии</h4>
        {Object.entries(GLOSSARIES).filter(([_, v]) => Object.keys(v).length > 0).map(([type, langs]) => <div key={type} style={{ marginBottom: 6 }}><div style={{ fontSize: 12, fontWeight: 500 }}>{DOC_TYPES.find(d => d.id === type)?.icon} {DOC_TYPES.find(d => d.id === type)?.label}</div>{Object.entries(langs).map(([lp, terms]) => <div key={lp} style={{ fontSize: 11, color: "var(--t3)", paddingLeft: 6 }}>{lp.toUpperCase().replace("-", " → ")}: {Object.keys(terms).length} терм.</div>)}</div>)}
      </div>
    </div>
  );
}
