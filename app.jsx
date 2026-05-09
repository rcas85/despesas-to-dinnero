const { useState, useEffect, useCallback, useRef } = React;

// ─── Build flags ─────────────────────────────────────────────────────────
const IS_BETA = true;
const APP_VERSION_BASE = "1.2.1";
const APP_VERSION = IS_BETA ? `${APP_VERSION_BASE}-beta` : APP_VERSION_BASE;

// ─── Constants ───────────────────────────────────────────────────────────
const CATEGORIES = [
  "Alm.cant.cliente s/iva","Almoço internacional","Almoço viagem - brasil",
  "Aluguel de veículos em viagem","Avarias em veículos alugados",
  "Brindes para clientes em eventos","Café da manhã - brasil",
  "Café da manhã - internacional","Combustível de frotas",
  "Combustível em viagem","Combustível/locomoção administrativa",
  "Copa e cozinha","Correios e malotes","Desp. com cartão não reconhecidas",
  "Despesas com eventos de marketing","Despesas legais e judiciais",
  "Despesas voluntariado - bunge","Devolução de valores sacados - bunge (cartão corporativo)",
  "Devolução por uso indevido do cartão","Estacionamento/pedagio adm",
  "Estacionamento/pedagio em viagem","Eventos corporativos",
  "Fee de agencia de viagem","Hospedagens","Jantar internacional",
  "Jantar viagem - brasil","Km rodado desp. administrativo",
  "Km rodado em viagem","Laboratórios análises e pesquisas p&d bel",
  "Lanches/lapas em percurso de viagem","Lavação/higienização de veículos",
  "Livros, jornais e revistas","Locomoções viagem",
  "Materiais de suprimentos de informática","Material de apoio marketing",
  "Material de escritório","Material de limpeza","Outras desp.viagens",
  "Passagens aéreas","Presentes p/ funcionários, diversidade e engajamento",
  "Refeições de representações","Refeições diversas - projetos e hora extra",
  "Saúde ocupacional","Seguros e taxas","Soldas em frota",
  "Suprimentos de informática","Táxi em viagens","Telefonia",
  "Treinamento de funcionários"
];

const QUICK_CATEGORIES = [
  "Almoço viagem - brasil","Jantar viagem - brasil","Café da manhã - brasil",
  "Hospedagens","Combustível em viagem","Km rodado em viagem",
  "Estacionamento/pedagio em viagem","Passagens aéreas",
  "Táxi em viagens","Fee de agencia de viagem"
];

const MEAL_CATEGORIES = [
  "Almoço viagem - brasil","Almoço internacional","Alm.cant.cliente s/iva",
  "Jantar viagem - brasil","Jantar internacional",
  "Café da manhã - brasil","Café da manhã - internacional",
  "Refeições de representações","Refeições diversas - projetos e hora extra"
];

const CATEGORY_PROFILES = {
  "Fee de agencia de viagem": { requer_anexo: false, campo: null },
  "Hospedagens": { requer_anexo: true, campo: { tipo: "numero_inteiro", label: "Nº de diárias" } },
  "Combustível em viagem": { requer_anexo: true, campo: { tipo: "alfanumerico", label: "Placa do veículo" } },
  "Combustível de frotas": { requer_anexo: true, campo: { tipo: "alfanumerico", label: "Placa do veículo" } },
  "Km rodado em viagem": { requer_anexo: true, campo: { tipo: "numero_inteiro", label: "Quilômetros rodados" } },
  "Km rodado desp. administrativo": { requer_anexo: true, campo: { tipo: "numero_inteiro", label: "Quilômetros rodados" } },
};

function uuid() {
  return crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function formatCurrency(v) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}

function formatDate(d) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function todayISO() {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

// ─── IndexedDB helpers ──────────────────────────────────────────────────
const DB_NAME = "despesas_dinnero";
const DB_VERSION = 2;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("viagens")) {
        db.createObjectStore("viagens", { keyPath: "viagem_id" });
      }
      if (!db.objectStoreNames.contains("config")) {
        db.createObjectStore("config", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("debug_log")) {
        db.createObjectStore("debug_log", { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGetAll(store) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const s = tx.objectStore(store);
    const req = s.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(store, data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const s = tx.objectStore(store);
    const req = s.put(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbDelete(store, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const s = tx.objectStore(store);
    const req = s.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function dbGet(store, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const s = tx.objectStore(store);
    const req = s.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ─── Debug log (Beta) ───────────────────────────────────────────────────
const LOG_MAX_ENTRIES = 100;
const LOG_MAX_BYTES = 500 * 1024; // 500 KB

async function dbGetAllLogs() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("debug_log", "readonly");
    const req = tx.objectStore("debug_log").getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function dbClearLogs() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("debug_log", "readwrite");
    tx.objectStore("debug_log").clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function dbAddLogEntry(entry) {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction("debug_log", "readwrite");
      tx.objectStore("debug_log").add(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    // Aplica FIFO: corta entradas mais antigas se passar dos limites
    const all = await dbGetAllLogs();
    const totalBytes = all.reduce((s, e) => s + (JSON.stringify(e).length), 0);
    if (all.length > LOG_MAX_ENTRIES || totalBytes > LOG_MAX_BYTES) {
      const sorted = all.sort((a, b) => a.id - b.id);
      // Quantos remover?
      let toRemove = Math.max(0, all.length - LOG_MAX_ENTRIES);
      if (totalBytes > LOG_MAX_BYTES) {
        let acc = totalBytes;
        for (const e of sorted) {
          if (acc <= LOG_MAX_BYTES && all.length - toRemove <= LOG_MAX_ENTRIES) break;
          acc -= JSON.stringify(e).length;
          toRemove++;
        }
      }
      const ids = sorted.slice(0, toRemove).map(e => e.id);
      const db2 = await openDB();
      await new Promise((resolve) => {
        const tx = db2.transaction("debug_log", "readwrite");
        const store = tx.objectStore("debug_log");
        ids.forEach(id => store.delete(id));
        tx.oncomplete = () => resolve();
      });
    }
  } catch (err) {
    // Falha silenciosa pra não criar loop infinito de log
    if (typeof console !== "undefined") console.warn("logEvent failed:", err);
  }
}

// API pública: logEvent(type, message, context?)
function logEvent(type, message, context) {
  const entry = {
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
    type,
    message: String(message || ""),
    context: context || null,
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
  };
  // Best-effort: dispara em background, sem bloquear o caller
  dbAddLogEntry(entry);
}

// Hook de erros de runtime (instala uma única vez)
let _runtimeHandlersInstalled = false;
function installRuntimeErrorHandlers() {
  if (_runtimeHandlersInstalled || typeof window === "undefined") return;
  _runtimeHandlersInstalled = true;
  window.addEventListener("error", (ev) => {
    logEvent("runtime_error", ev?.message || "window error", {
      filename: ev?.filename || null,
      lineno: ev?.lineno || null,
      colno: ev?.colno || null,
      stack: ev?.error?.stack ? String(ev.error.stack).slice(0, 1500) : null,
    });
  });
  window.addEventListener("unhandledrejection", (ev) => {
    const reason = ev?.reason;
    logEvent("unhandled_rejection",
      reason?.message ? String(reason.message) : String(reason),
      { stack: reason?.stack ? String(reason.stack).slice(0, 1500) : null });
  });
}

// ─── Gemini API (Fase 2) ────────────────────────────────────────────────
// Documentação: https://ai.google.dev/gemini-api/docs
// Modelo: gemini-2.5-flash | Free tier: 1500 req/dia
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const EXTRACTION_PROMPT_TEMPLATE = `Você é um assistente de extração de dados de notas fiscais, cupons fiscais e comprovantes brasileiros. A entrada pode ser uma imagem OU um PDF.

Analise o documento e extraia os dados em JSON.

Retorne APENAS um JSON válido (sem markdown, sem comentários, sem texto antes ou depois) com os campos:

{
  "estabelecimento": string,            // razão social ou nome fantasia legível, sem CNPJ junto
  "cnpj": string ou null,               // formato XX.XXX.XXX/XXXX-XX, ou null se ilegível
  "valor_total": number,                // em reais, com 2 decimais, apenas o total final
  "data_despesa": string,               // formato YYYY-MM-DD
  "horario": string ou null,            // formato HH:MM, ou null se não houver
  "cidade": string ou null,             // cidade onde a despesa ocorreu, se identificável
  "origem": string ou null,             // só para táxi/uber/passagem aérea: ponto de partida
  "destino": string ou null,            // só para táxi/uber/passagem aérea: ponto de chegada
  "diarias_extraidas": number ou null,  // só para hospedagem: nº de diárias (inteiro). Calcule por checkin/checkout se necessário.
  "placa_veiculo": string ou null,      // só para combustível: placa do veículo (ex: ABC1D23), se aparecer no cupom
  "km_rodados": number ou null,         // só para km rodado: quantidade de km rodados (inteiro)
  "categoria_sugerida": string,         // exatamente uma das categorias da lista abaixo
  "justificativa_sugerida": string,     // texto curto seguindo as regras abaixo
  "confianca": number                   // 0 a 1, sua confiança média na extração
}

CATEGORIAS POSSÍVEIS (escolha exatamente uma, escrevendo idêntico):
__CATEGORIES__

HEURÍSTICAS PARA SUGERIR CATEGORIA:
- Hotel/pousada/resort/flat/inn → "Hospedagens"
- Posto de combustível (Shell, Ipiranga, BR, Petrobras, Raízen, etc.) → "Combustível em viagem"
- Restaurante + horário 11h-14h → "Almoço viagem - brasil"
- Restaurante + horário 19h-22h → "Jantar viagem - brasil"
- Padaria/cafeteria/lanchonete + horário antes de 10h → "Café da manhã - brasil"
- Padaria/lanchonete em horário fora de café → "Lanches/lapas em percurso de viagem"
- Uber, 99, Táxi, Cabify → "Táxi em viagens"
- Estacionamento/Estapar/Multipark/Pedágio/CCR → "Estacionamento/pedagio em viagem"
- Companhia aérea (Latam, Gol, Azul, Avianca) → "Passagens aéreas"
- Locadora de veículos (Localiza, Movida, Unidas) → "Aluguel de veículos em viagem"
- Lava-jato, lava-rápido → "Lavação/higienização de veículos"

REGRAS PARA "justificativa_sugerida" (texto curto, em letras minúsculas no início, sem ponto final, em português):
- Almoço/Jantar/Café da manhã: "almoço em [estabelecimento][, cidade se houver]" / "jantar..." / "café da manhã..."
- Hospedagem: "hospedagem em [hotel][, cidade]" — se identificar checkin/checkout, pode mencionar diárias
- Combustível em viagem: "abastecimento em viagem[, cidade]"
- Táxi/Uber: "deslocamento de [origem] para [destino]" — se não tiver origem/destino, "deslocamento em viagem[, cidade]"
- Estacionamento/pedágio: "estacionamento em viagem[, cidade]" ou "pedágio em viagem"
- Passagem aérea: "passagem aérea [origem] → [destino][, data]"
- Aluguel de veículos: "aluguel de veículo em viagem[, cidade]"
- Fee de agência: "fee"
- Outros casos: descrição curta e factual ("compra de [item] em viagem")

Se não conseguir determinar com clareza:
- categoria_sugerida: prefira a categoria mais genérica de viagem ou string vazia
- justificativa_sugerida: gere algo plausível baseado no que conseguiu ler, ou string vazia

Se algum campo for ilegível, retorne null nesse campo (mas o JSON precisa ser válido).`;

function buildExtractionPrompt() {
  return EXTRACTION_PROMPT_TEMPLATE.replace("__CATEGORIES__", CATEGORIES.map(c => `- ${c}`).join("\n"));
}

// Extrai o mime type e o base64 puro de uma data URL
function parseDataUrl(dataUrl) {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || "");
  if (!m) return null;
  return { mimeType: m[1], data: m[2] };
}

// Extrai JSON de uma resposta que pode vir com cercas ```json ... ```
function safeParseJson(text) {
  if (!text) return null;
  let t = String(text).trim();
  // Remove cercas markdown se existirem
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  // Pega do primeiro { ao último }
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  if (a >= 0 && b > a) t = t.slice(a, b + 1);
  try { return JSON.parse(t); } catch { return null; }
}

async function geminiExtractFromImage(apiKey, fileDataUrl) {
  if (!apiKey) throw new Error("Chave Gemini não configurada");
  const parsed = parseDataUrl(fileDataUrl);
  if (!parsed) {
    logEvent("file_read_error", "Arquivo inválido ao chamar Gemini", { dataUrl_prefix: String(fileDataUrl).slice(0, 60) });
    throw new Error("Arquivo inválido");
  }

  // Gemini aceita imagens (image/*) e PDFs (application/pdf) via inline_data
  const body = {
    contents: [{
      parts: [
        { text: buildExtractionPrompt() },
        { inline_data: { mime_type: parsed.mimeType, data: parsed.data } },
      ],
    }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  };

  const url = `${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`;
  let resp;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    logEvent("gemini_error", "Falha de rede ao chamar Gemini", {
      mime_type: parsed.mimeType,
      data_size_bytes: parsed.data.length,
      error: String(e?.message || e),
    });
    throw new Error("Sem conexão com o Gemini");
  }

  if (!resp.ok) {
    let msg = `Gemini retornou ${resp.status}`;
    let errBody = null;
    try {
      errBody = await resp.json();
      if (errBody?.error?.message) msg = errBody.error.message;
    } catch {}
    logEvent("gemini_error", msg, {
      status: resp.status,
      mime_type: parsed.mimeType,
      data_size_bytes: parsed.data.length,
      response_body: errBody ? JSON.stringify(errBody).slice(0, 1000) : null,
    });
    throw new Error(msg);
  }

  const json = await resp.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  const data = safeParseJson(text);
  if (!data) {
    logEvent("parse_error", "JSON da resposta do Gemini não pôde ser parseado", {
      mime_type: parsed.mimeType,
      raw_response_excerpt: text ? String(text).slice(0, 500) : null,
      finish_reason: json?.candidates?.[0]?.finishReason || null,
    });
    throw new Error("Resposta da IA em formato inesperado");
  }

  // Normaliza
  const numOrNull = (v) => {
    if (v == null || v === "") return null;
    const n = typeof v === "number" ? v : parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  };
  return {
    estabelecimento: data.estabelecimento || "",
    cnpj: data.cnpj || null,
    valor_total: typeof data.valor_total === "number" ? data.valor_total : parseFloat(data.valor_total) || 0,
    data_despesa: data.data_despesa || todayISO(),
    horario: data.horario || null,
    cidade: data.cidade || null,
    origem: data.origem || null,
    destino: data.destino || null,
    diarias_extraidas: numOrNull(data.diarias_extraidas),
    placa_veiculo: data.placa_veiculo ? String(data.placa_veiculo).toUpperCase().replace(/[^A-Z0-9]/g, "") : null,
    km_rodados: numOrNull(data.km_rodados),
    categoria_sugerida: data.categoria_sugerida && CATEGORIES.includes(data.categoria_sugerida) ? data.categoria_sugerida : "",
    justificativa_sugerida: data.justificativa_sugerida || "",
    confianca: typeof data.confianca === "number" ? data.confianca : 0.5,
  };
}

async function geminiTestKey(apiKey) {
  if (!apiKey || !apiKey.trim()) throw new Error("Cole a chave antes de testar");
  const url = `${GEMINI_URL}?key=${encodeURIComponent(apiKey.trim())}`;
  const body = {
    contents: [{ parts: [{ text: "responda apenas com a palavra OK" }] }],
    generationConfig: { temperature: 0, maxOutputTokens: 10 },
  };
  let resp;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    logEvent("gemini_error", "Falha de rede no teste de chave", { error: String(e?.message || e) });
    throw new Error("Sem conexão com a internet");
  }
  if (!resp.ok) {
    let msg = `Erro ${resp.status}`;
    let errBody = null;
    try {
      errBody = await resp.json();
      if (errBody?.error?.message) msg = errBody.error.message;
    } catch {}
    logEvent("gemini_error", `Teste de chave falhou: ${msg}`, {
      status: resp.status,
      response_body: errBody ? JSON.stringify(errBody).slice(0, 500) : null,
    });
    throw new Error(msg);
  }
  return true;
}

// ─── Icons (inline SVG) ─────────────────────────────────────────────────
const Icons = {
  plus: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
  ),
  back: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
  ),
  camera: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
  ),
  image: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
  ),
  check: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
  ),
  trash: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
  ),
  edit: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
  ),
  export: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
  ),
  chevDown: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
  ),
  chevRight: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  ),
  receipt: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2-3-2z"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="13" y2="14"/></svg>
  ),
  plane: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>
  ),
  settings: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
  ),
  user: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  ),
  x: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
  ),
  sparkle: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5.6L19.5 10.5l-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9z"/><path d="M19 4l.7 2.1L21.8 7l-2.1.7L19 9.8l-.7-2.1L16.2 7l2.1-.7z"/></svg>
  ),
  eye: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
  ),
  eyeOff: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
  ),
  refresh: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
  ),
  alert: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
  ),
  fileText: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
  ),
};

// ─── Styles ──────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --bg: #0C0C0E;
  --bg2: #161619;
  --bg3: #1E1E22;
  --bg4: #28282E;
  --surface: #1A1A1E;
  --border: #2A2A30;
  --border2: #35353D;
  --text: #E8E6E3;
  --text2: #9B9A97;
  --text3: #6B6A68;
  --accent: #4ADE80;
  --accent2: #22C55E;
  --accent-dim: rgba(74,222,128,0.12);
  --accent-dim2: rgba(74,222,128,0.06);
  --warn: #F59E0B;
  --warn-dim: rgba(245,158,11,0.12);
  --danger: #EF4444;
  --danger-dim: rgba(239,68,68,0.12);
  --blue: #60A5FA;
  --blue-dim: rgba(96,165,250,0.12);
  --radius: 14px;
  --radius-sm: 10px;
  --radius-xs: 7px;
  --font: 'DM Sans', -apple-system, sans-serif;
  --mono: 'JetBrains Mono', monospace;
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-top: env(safe-area-inset-top, 0px);
}

* { margin:0; padding:0; box-sizing:border-box; -webkit-tap-highlight-color:transparent; }

html, body, #root {
  height:100%; width:100%; overflow:hidden;
  font-family:var(--font); background:var(--bg); color:var(--text);
  -webkit-font-smoothing:antialiased;
}

/* Page transitions */
.page { 
  height:100%; display:flex; flex-direction:column; overflow:hidden;
  animation: pageIn 0.25s ease-out;
}
@keyframes pageIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }

/* Scrollable areas */
.scroll { flex:1; min-height:0; overflow-y:auto; overflow-x:hidden; -webkit-overflow-scrolling:touch; }
.scroll::-webkit-scrollbar { display:none; }

/* In-scroll back nav (fallback for iOS keyboard viewport bug) */
.scroll-nav {
  display:flex; align-items:center; gap:6px; padding:10px 16px 2px;
  color:var(--accent); font-size:14px; font-weight:500; cursor:pointer;
}
.scroll-nav:active { opacity:0.6; }

/* Header bar */
.header {
  display:flex; align-items:center; gap:12px;
  padding: calc(16px + var(--safe-top)) 16px 12px;
  background:var(--bg); border-bottom:1px solid var(--border);
  flex-shrink:0; min-height:56px; position:sticky; top:0; z-index:50;
}
.header h1 { font-size:18px; font-weight:600; flex:1; letter-spacing:-0.3px; }
.header-btn {
  width:36px; height:36px; border-radius:var(--radius-xs);
  display:flex; align-items:center; justify-content:center;
  background:none; border:none; color:var(--text2); cursor:pointer;
  transition:all 0.15s;
}
.header-btn:active { background:var(--bg3); color:var(--text); transform:scale(0.92); }

/* Cards */
.card {
  background:var(--surface); border:1px solid var(--border);
  border-radius:var(--radius); padding:16px; margin:8px 16px;
  transition:all 0.15s;
}
.card:active { background:var(--bg3); transform:scale(0.985); }
.card-row { display:flex; align-items:center; gap:12px; }
.card-icon {
  width:44px; height:44px; border-radius:12px;
  display:flex; align-items:center; justify-content:center;
  flex-shrink:0; font-size:20px;
}
.card-body { flex:1; min-width:0; }
.card-title { font-size:15px; font-weight:600; letter-spacing:-0.2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.card-sub { font-size:13px; color:var(--text2); margin-top:2px; }
.card-right { text-align:right; flex-shrink:0; }
.card-amount { font-family:var(--mono); font-size:15px; font-weight:500; }
.card-badge {
  display:inline-flex; align-items:center; gap:4px;
  font-size:11px; font-weight:500; padding:3px 8px; border-radius:20px;
  margin-top:4px;
}

/* Big action button */
.fab {
  display:flex; align-items:center; justify-content:center; gap:8px;
  background:var(--accent); color:var(--bg); border:none;
  border-radius:var(--radius); padding:14px 24px; margin:16px;
  font-family:var(--font); font-size:15px; font-weight:600;
  cursor:pointer; transition:all 0.15s; letter-spacing:-0.2px;
  width:calc(100% - 32px);
}
.fab:active { transform:scale(0.97); filter:brightness(0.9); }
.fab:disabled { opacity:0.4; pointer-events:none; }
.fab.secondary { background:var(--bg3); color:var(--text); border:1px solid var(--border2); }
.fab.danger { background:var(--danger-dim); color:var(--danger); }
.fab.small { padding:10px 16px; font-size:14px; margin:8px 16px; }

/* Form elements */
.field { margin:0 16px 16px; }
.field label { display:block; font-size:12px; font-weight:500; color:var(--text2); margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px; }
.field input, .field textarea, .field select {
  width:100%; background:var(--bg3); border:1px solid var(--border);
  border-radius:var(--radius-sm); padding:12px 14px; color:var(--text);
  font-family:var(--font); font-size:15px; outline:none;
  transition:border-color 0.15s;
}
.field input:focus, .field textarea:focus, .field select:focus {
  border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-dim);
}
.field textarea { resize:none; min-height:80px; }
.field select { appearance:none; cursor:pointer; padding-right:36px; }
.field .select-wrap { position:relative; }
.field .select-wrap::after {
  content:''; position:absolute; right:14px; top:50%; transform:translateY(-50%);
  width:0; height:0; border-left:5px solid transparent; border-right:5px solid transparent;
  border-top:6px solid var(--text3); pointer-events:none;
}

/* Status pills */
.pill {
  display:inline-flex; align-items:center; gap:5px;
  font-size:11px; font-weight:600; padding:4px 10px;
  border-radius:20px; text-transform:uppercase; letter-spacing:0.3px;
}
.pill.green { background:var(--accent-dim); color:var(--accent); }
.pill.yellow { background:var(--warn-dim); color:var(--warn); }
.pill.blue { background:var(--blue-dim); color:var(--blue); }
.pill.red { background:var(--danger-dim); color:var(--danger); }

/* Totalizador */
.totalizer {
  display:flex; align-items:center; justify-content:space-between;
  background:var(--accent-dim2); border:1px solid rgba(74,222,128,0.15);
  border-radius:var(--radius); padding:14px 16px; margin:12px 16px 4px;
}
.totalizer-label { font-size:13px; color:var(--text2); }
.totalizer-val { font-family:var(--mono); font-size:20px; font-weight:600; color:var(--accent); }
.totalizer-count { font-size:12px; color:var(--text3); margin-top:2px; }

/* Photo capture area */
.photo-area {
  margin:8px 16px 16px; border:2px dashed var(--border2); border-radius:var(--radius);
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  min-height:160px; gap:10px; cursor:pointer; transition:all 0.15s;
  position:relative; overflow:hidden; background:var(--bg2);
}
.photo-area:active { border-color:var(--accent); background:var(--accent-dim2); }
.photo-area img {
  width:100%; height:200px; object-fit:cover; border-radius:calc(var(--radius) - 2px);
}
.photo-area .photo-label { font-size:13px; color:var(--text3); }

/* Tags / chips */
.chip {
  display:inline-flex; align-items:center; gap:6px;
  background:var(--bg4); border:1px solid var(--border2);
  border-radius:20px; padding:6px 12px; font-size:13px;
  margin:3px; cursor:pointer; transition:all 0.12s;
}
.chip:active { background:var(--border); }
.chip.selected { background:var(--accent-dim); border-color:var(--accent); color:var(--accent); }
.chip .chip-x { color:var(--text3); margin-left:2px; font-size:16px; line-height:1; }

/* Category grid */
.cat-quick { display:flex; flex-wrap:wrap; padding:0 13px 8px; gap:0; }
.cat-item {
  padding:8px 14px; margin:3px; border-radius:20px; font-size:13px;
  background:var(--bg3); border:1px solid var(--border);
  cursor:pointer; transition:all 0.12s; white-space:nowrap;
}
.cat-item:active, .cat-item.sel { background:var(--accent-dim); border-color:var(--accent); color:var(--accent); }

/* Participant list */
.participant-row {
  display:flex; align-items:center; gap:10px; padding:8px 16px;
}
.participant-row .p-name { flex:1; font-size:14px; }
.participant-row .p-remove {
  width:28px; height:28px; border-radius:50%; border:none;
  background:var(--danger-dim); color:var(--danger); cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  font-size:18px; line-height:1;
}

/* Section header */
.section-head {
  font-size:11px; font-weight:600; color:var(--text3);
  text-transform:uppercase; letter-spacing:0.8px;
  padding:16px 16px 6px; 
}

/* Empty state */
.empty {
  display:flex; flex-direction:column; align-items:center;
  justify-content:center; padding:60px 32px; gap:12px; text-align:center;
}
.empty-icon { color:var(--text3); opacity:0.5; }
.empty-text { font-size:14px; color:var(--text3); line-height:1.5; }

/* Bottom safe area spacer */
.safe-bottom { height:calc(16px + var(--safe-bottom)); flex-shrink:0; }

/* Sticky bottom bar */
.sticky-bottom {
  flex-shrink:0; padding:12px 16px calc(12px + var(--safe-bottom));
  background:var(--bg); border-top:1px solid var(--border);
  position:relative; z-index:10;
}
.sticky-bottom .fab { margin:0; width:100%; }

/* Modal overlay */
.modal-overlay {
  position:fixed; inset:0; background:rgba(0,0,0,0.7);
  z-index:100; display:flex; align-items:center; justify-content:center;
  animation:fadeIn 0.15s; padding:16px;
}
@keyframes fadeIn { from { opacity:0; } }
.modal-sheet {
  background:var(--bg2); border-radius:var(--radius);
  width:100%; max-height:80vh; overflow-y:auto;
  animation:popIn 0.2s ease-out;
}
@keyframes popIn { from { opacity:0; transform:scale(0.95); } }
.modal-handle {
  width:36px; height:4px; border-radius:2px; background:var(--border2);
  margin:10px auto 6px;
}
.modal-title {
  font-size:16px; font-weight:600; padding:8px 16px 12px; letter-spacing:-0.2px;
}

/* Confirm dialog */
.confirm-box {
  background:var(--bg3); border:1px solid var(--border2);
  border-radius:var(--radius); padding:20px; margin:0 16px 16px;
  text-align:center;
}
.confirm-box p { font-size:14px; color:var(--text2); margin-bottom:16px; line-height:1.5; }
.confirm-btns { display:flex; gap:10px; }
.confirm-btns button {
  flex:1; padding:12px; border-radius:var(--radius-sm);
  font-family:var(--font); font-size:14px; font-weight:600;
  border:none; cursor:pointer; transition:all 0.12s;
}
.confirm-btns .cancel { background:var(--bg4); color:var(--text2); }
.confirm-btns .danger { background:var(--danger); color:white; }

/* Export checklist */
.export-item {
  display:flex; align-items:center; gap:12px; padding:12px 16px;
  border-bottom:1px solid var(--border);
}
.export-cb {
  width:22px; height:22px; border-radius:6px; border:2px solid var(--border2);
  display:flex; align-items:center; justify-content:center; cursor:pointer;
  background:none; transition:all 0.12s; flex-shrink:0;
}
.export-cb.checked { background:var(--accent); border-color:var(--accent); }
.export-cb.checked svg { color:var(--bg); }

/* Toast */
.toast {
  position:fixed; bottom:calc(24px + var(--safe-bottom)); left:50%; transform:translateX(-50%);
  background:var(--accent); color:var(--bg); padding:10px 20px;
  border-radius:20px; font-size:14px; font-weight:600; z-index:200;
  animation:toastIn 0.3s ease-out; pointer-events:none;
  box-shadow:0 8px 30px rgba(74,222,128,0.3);
}
@keyframes toastIn { from { opacity:0; transform:translateX(-50%) translateY(20px); } }

/* Settings */
.settings-row {
  display:flex; align-items:center; gap:12px; padding:14px 16px;
  border-bottom:1px solid var(--border);
}
.settings-row .s-icon { color:var(--text3); flex-shrink:0; }
.settings-row .s-label { flex:1; font-size:14px; }
.settings-row .s-value { font-size:13px; color:var(--text3); max-width:50%; text-align:right; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

/* AI banner inside capture (Fase 2) */
.ai-banner {
  display:flex; align-items:center; gap:10px;
  margin:0 16px 12px; padding:10px 12px;
  border-radius:var(--radius-sm); font-size:13px;
  border:1px solid transparent; line-height:1.4;
}
.ai-banner.loading { background:var(--blue-dim); border-color:rgba(96,165,250,0.25); color:var(--blue); }
.ai-banner.success { background:var(--accent-dim); border-color:rgba(74,222,128,0.25); color:var(--accent); }
.ai-banner.warn    { background:var(--warn-dim);  border-color:rgba(245,158,11,0.25); color:var(--warn); }
.ai-banner.error   { background:var(--danger-dim); border-color:rgba(239,68,68,0.25); color:var(--danger); }
.ai-banner .ai-icon { display:flex; flex-shrink:0; }
.ai-banner .ai-text { flex:1; }
.ai-banner .ai-action {
  background:none; border:1px solid currentColor; color:inherit;
  border-radius:20px; padding:4px 10px; font-size:12px; font-weight:600;
  font-family:var(--font); cursor:pointer; flex-shrink:0;
  display:inline-flex; align-items:center; gap:4px;
}
.ai-banner .ai-action:active { opacity:0.7; }
.ai-banner .ai-action:disabled { opacity:0.5; pointer-events:none; }

/* Spinner */
.spinner {
  width:14px; height:14px; border-radius:50%;
  border:2px solid currentColor; border-top-color:transparent;
  animation: spin 0.7s linear infinite; flex-shrink:0;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Confidence badge next to field labels */
.field-label-row {
  display:flex; align-items:center; justify-content:space-between;
  margin-bottom:6px;
}
.field-label-row label { margin:0 !important; }
.conf-badge {
  display:inline-flex; align-items:center; gap:3px;
  font-size:10px; font-weight:600; padding:2px 7px; border-radius:12px;
  text-transform:uppercase; letter-spacing:0.4px;
}
.conf-badge.ok    { background:var(--accent-dim); color:var(--accent); }
.conf-badge.check { background:var(--warn-dim);   color:var(--warn); }

/* Suggested category chip on top of cat list */
.suggest-cat {
  display:flex; align-items:center; gap:8px;
  margin:0 16px 8px; padding:10px 12px;
  background:var(--accent-dim2); border:1px dashed rgba(74,222,128,0.3);
  border-radius:var(--radius-sm); font-size:13px; color:var(--text2);
}
.suggest-cat strong { color:var(--accent); font-weight:600; }
.suggest-cat .sc-x {
  margin-left:auto; background:none; border:none; color:var(--text3);
  cursor:pointer; padding:2px; display:flex;
}

/* API key row in settings (Fase 2) */
.api-key-row {
  display:flex; gap:8px; padding:0 16px; align-items:stretch; margin-bottom:8px;
}
.api-key-row input {
  flex:1; background:var(--bg3); border:1px solid var(--border);
  border-radius:var(--radius-sm); padding:10px 12px; color:var(--text);
  font-family:var(--mono); font-size:13px; outline:none;
}
.api-key-row input:focus { border-color:var(--border2); }
.api-key-row .icon-btn {
  background:var(--bg3); border:1px solid var(--border);
  border-radius:var(--radius-sm); padding:0 12px;
  color:var(--text2); cursor:pointer; display:flex; align-items:center;
}
.api-key-row .icon-btn:active { background:var(--bg4); }

.test-btn-row {
  display:flex; align-items:center; gap:10px;
  padding:0 16px; margin-bottom:8px;
}
.test-btn {
  background:var(--bg3); border:1px solid var(--border2);
  color:var(--text); border-radius:var(--radius-sm);
  padding:8px 14px; font-family:var(--font); font-size:13px; font-weight:500;
  cursor:pointer; display:inline-flex; align-items:center; gap:6px;
}
.test-btn:active { background:var(--bg4); }
.test-btn:disabled { opacity:0.5; pointer-events:none; }
.test-result { font-size:12px; flex:1; }
.test-result.ok { color:var(--accent); }
.test-result.bad { color:var(--danger); }

/* PDF preview card (Fase 2) */
.pdf-card {
  display:flex; align-items:center; gap:12px;
  margin:8px 16px 16px; padding:18px 16px;
  background:var(--bg2); border:1px solid var(--border);
  border-radius:var(--radius);
}
.pdf-card .pdf-icon {
  width:44px; height:44px; border-radius:10px;
  background:var(--blue-dim); color:var(--blue);
  display:flex; align-items:center; justify-content:center;
  flex-shrink:0;
}
.pdf-card .pdf-body { flex:1; min-width:0; }
.pdf-card .pdf-name {
  font-size:14px; font-weight:500;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
.pdf-card .pdf-sub { font-size:12px; color:var(--text3); margin-top:2px; }

/* Dual capture buttons (Foto / PDF) */
.capture-buttons {
  display:flex; gap:8px; margin:8px 16px 12px;
}
.capture-buttons .cap-btn {
  flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:6px; padding:14px 8px; border-radius:var(--radius);
  background:var(--bg2); border:1px dashed var(--border2);
  color:var(--text2); cursor:pointer; transition:all 0.15s;
  font-family:var(--font); font-size:12px; font-weight:500;
}
.capture-buttons .cap-btn:active { background:var(--bg3); border-color:var(--accent); color:var(--accent); }
.capture-buttons .cap-btn .cap-icon { color:var(--text3); }
.capture-buttons .cap-btn:active .cap-icon { color:var(--accent); }
`;

// ─── Main App ────────────────────────────────────────────────────────────
function App() {
  const [view, setView] = useState("trips"); // trips | tripDetail | capture | editExpense | export | settings
  const [trips, setTrips] = useState([]);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [currentExpense, setCurrentExpense] = useState(null);
  const [toast, setToast] = useState(null);
  const [config, setConfig] = useState({ nome: "", participantes_frequentes: [], gemini_api_key: "" });
  const [loaded, setLoaded] = useState(false);

  // Load data
  useEffect(() => {
    if (IS_BETA) installRuntimeErrorHandlers();
    (async () => {
      try {
        const v = await dbGetAll("viagens");
        setTrips(v.sort((a, b) => (b.data_inicio || "").localeCompare(a.data_inicio || "")));
        const c = await dbGet("config", "user");
        if (c) setConfig(c);
      } catch (e) {
        console.error(e);
        logEvent("runtime_error", "Falha ao carregar dados iniciais", { error: String(e?.message || e) });
      }
      setLoaded(true);
    })();
  }, []);

  const saveTrip = useCallback(async (trip) => {
    await dbPut("viagens", trip);
    setTrips(prev => {
      const idx = prev.findIndex(t => t.viagem_id === trip.viagem_id);
      const next = [...prev];
      if (idx >= 0) next[idx] = trip; else next.unshift(trip);
      return next;
    });
    setCurrentTrip(trip);
  }, []);

  const saveConfig = useCallback(async (c) => {
    const data = { ...c, key: "user" };
    await dbPut("config", data);
    setConfig(data);
  }, []);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  if (!loaded) return (
    <div style={{ height:"100%", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--bg)" }}>
      <style>{CSS}</style>
      <div style={{ color:"var(--text3)", fontSize:14 }}>Carregando…</div>
    </div>
  );

  return (
    <>
      <style>{CSS}</style>
      {view === "trips" && (
        <TripsPage
          trips={trips}
          onOpen={(t) => { setCurrentTrip(t); setView("tripDetail"); }}
          onCreate={(t) => { saveTrip(t); setCurrentTrip(t); setView("tripDetail"); }}
          onSettings={() => setView("settings")}
        />
      )}
      {view === "tripDetail" && currentTrip && (
        <TripDetailPage
          trip={currentTrip}
          onBack={() => setView("trips")}
          onCapture={() => { setCurrentExpense(null); setView("capture"); }}
          onEdit={(exp) => { setCurrentExpense(exp); setView("editExpense"); }}
          onExport={() => setView("export")}
          onSaveTrip={saveTrip}
          showToast={showToast}
        />
      )}
      {view === "capture" && currentTrip && (
        <CapturePage
          trip={currentTrip}
          config={config}
          onSave={(exp) => {
            const updated = { ...currentTrip, despesas: [...(currentTrip.despesas || []), exp] };
            saveTrip(updated);
            showToast("Despesa salva!");
            setView("tripDetail");
          }}
          onBack={() => setView("tripDetail")}
        />
      )}
      {view === "editExpense" && currentTrip && currentExpense && (
        <EditExpensePage
          trip={currentTrip}
          expense={currentExpense}
          config={config}
          onSave={(exp) => {
            const updated = {
              ...currentTrip,
              despesas: currentTrip.despesas.map(d => d.despesa_id === exp.despesa_id ? exp : d)
            };
            saveTrip(updated);
            showToast("Despesa atualizada!");
            setView("tripDetail");
          }}
          onDelete={(id) => {
            const updated = {
              ...currentTrip,
              despesas: currentTrip.despesas.filter(d => d.despesa_id !== id)
            };
            saveTrip(updated);
            showToast("Despesa excluída");
            setView("tripDetail");
          }}
          onBack={() => setView("tripDetail")}
        />
      )}
      {view === "export" && currentTrip && (
        <ExportPage
          trip={currentTrip}
          onBack={() => setView("tripDetail")}
          onExported={(t) => { saveTrip(t); showToast("Viagem exportada!"); setView("tripDetail"); }}
        />
      )}
      {view === "settings" && (
        <SettingsPage
          config={config}
          onSave={saveConfig}
          onBack={() => setView("trips")}
          showToast={showToast}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

// ─── Trips Page ──────────────────────────────────────────────────────────
function TripsPage({ trips, onOpen, onCreate, onSettings }) {
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newStart, setNewStart] = useState(todayISO());
  const [newEnd, setNewEnd] = useState(todayISO());

  const active = trips.filter(t => t.status === "em_andamento");
  const closed = trips.filter(t => t.status !== "em_andamento");

  const handleCreate = () => {
    if (!newName.trim()) return;
    const trip = {
      viagem_id: uuid(),
      nome: newName.trim(),
      data_inicio: newStart,
      data_fim: newEnd,
      status: "em_andamento",
      despesas: [],
      participantes_frequentes: [],
    };
    onCreate(trip);
    setShowNew(false);
    setNewName("");
  };

  return (
    <div className="page">
      <div className="header">
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:22 }}>{Icons.plane}</span>
          <h1>Despesas to Dinnero</h1>
        </div>
        <button className="header-btn" onClick={onSettings}>{Icons.settings}</button>
      </div>

      <div className="scroll">
        <button className="fab" onClick={() => setShowNew(true)}>
          {Icons.plus} Nova viagem
        </button>

        {active.length > 0 && (
          <>
            <div className="section-head">Em andamento</div>
            {active.map(t => <TripCard key={t.viagem_id} trip={t} onClick={() => onOpen(t)} />)}
          </>
        )}

        {closed.length > 0 && (
          <>
            <div className="section-head">Histórico</div>
            {closed.map(t => <TripCard key={t.viagem_id} trip={t} onClick={() => onOpen(t)} />)}
          </>
        )}

        {trips.length === 0 && (
          <div className="empty">
            <div className="empty-icon">{Icons.plane}</div>
            <div className="empty-text">Nenhuma viagem ainda.<br/>Crie uma para começar a capturar despesas.</div>
          </div>
        )}
        <div className="safe-bottom" />
      </div>

      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title">Nova viagem</div>
            <div className="field">
              <label>Nome da viagem</label>
              <input placeholder="Ex: Viagem Rio Grande – Maio 2026" value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
            </div>
            <div style={{ display:"flex", gap:8, padding:"0 16px" }}>
              <div className="field" style={{ flex:1, margin:0 }}>
                <label>Início</label>
                <input type="date" value={newStart} onChange={e => setNewStart(e.target.value)} />
              </div>
              <div className="field" style={{ flex:1, margin:0 }}>
                <label>Fim</label>
                <input type="date" value={newEnd} onChange={e => setNewEnd(e.target.value)} />
              </div>
            </div>
            <button className="fab" onClick={handleCreate} disabled={!newName.trim()} style={{marginTop:8}}>
              Criar viagem
            </button>
            <div className="safe-bottom" />
          </div>
        </div>
      )}
    </div>
  );
}

function TripCard({ trip, onClick }) {
  const total = (trip.despesas || []).reduce((s, d) => s + (d.dados_nf?.valor || 0), 0);
  const count = (trip.despesas || []).length;
  const statusMap = {
    em_andamento: { cls: "green", text: "Em andamento" },
    fechada: { cls: "yellow", text: "Fechada" },
    exportada: { cls: "blue", text: "Exportada" },
  };
  const st = statusMap[trip.status] || statusMap.em_andamento;

  return (
    <div className="card" onClick={onClick} style={{ cursor:"pointer" }}>
      <div className="card-row">
        <div className="card-icon" style={{ background:"var(--accent-dim)", color:"var(--accent)" }}>
          {Icons.plane}
        </div>
        <div className="card-body">
          <div className="card-title">{trip.nome}</div>
          <div className="card-sub">
            {formatDate(trip.data_inicio)} — {formatDate(trip.data_fim)} · {count} despesa{count !== 1 ? "s" : ""}
          </div>
        </div>
        <div className="card-right">
          <div className="card-amount" style={{ color:"var(--accent)" }}>{formatCurrency(total)}</div>
          <div className={`pill ${st.cls}`} style={{ marginTop:6 }}>{st.text}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Trip Detail Page ────────────────────────────────────────────────────
function TripDetailPage({ trip, onBack, onCapture, onEdit, onExport, onSaveTrip, showToast }) {
  const despesas = trip.despesas || [];
  const total = despesas.reduce((s, d) => s + (d.dados_nf?.valor || 0), 0);
  const allReviewed = despesas.length > 0 && despesas.every(d => d.status_revisao === "revisado");
  const isActive = trip.status === "em_andamento";
  const [showClose, setShowClose] = useState(false);
  const [showEditTrip, setShowEditTrip] = useState(false);
  const [editNome, setEditNome] = useState(trip.nome);
  const [editInicio, setEditInicio] = useState(trip.data_inicio);
  const [editFim, setEditFim] = useState(trip.data_fim);

  const handleClose = async () => {
    const updated = { ...trip, status: "fechada" };
    await onSaveTrip(updated);
    showToast("Viagem fechada");
    setShowClose(false);
  };

  const handleReopen = async () => {
    const updated = { ...trip, status: "em_andamento" };
    await onSaveTrip(updated);
    showToast("Viagem reaberta");
  };

  const handleSaveTrip = async () => {
    const updated = { ...trip, nome: editNome.trim(), data_inicio: editInicio, data_fim: editFim };
    await onSaveTrip(updated);
    showToast("Viagem atualizada");
    setShowEditTrip(false);
  };

  return (
    <div className="page">
      <div className="header">
        <button className="header-btn" onClick={onBack}>{Icons.back}</button>
        <h1 style={{ fontSize:16 }}>{trip.nome}</h1>
        <button className="header-btn" onClick={() => { setEditNome(trip.nome); setEditInicio(trip.data_inicio); setEditFim(trip.data_fim); setShowEditTrip(true); }}>{Icons.edit}</button>
      </div>

      <div className="scroll">
        <div className="totalizer">
          <div>
            <div className="totalizer-label">Total da viagem</div>
            <div className="totalizer-count">{despesas.length} despesa{despesas.length !== 1 ? "s" : ""}</div>
          </div>
          <div className="totalizer-val">{formatCurrency(total)}</div>
        </div>

        {isActive && (
          <button className="fab" onClick={onCapture}>
            {Icons.receipt} Nova despesa
          </button>
        )}

        {despesas.length > 0 ? (
          <>
            <div className="section-head">Despesas</div>
            {despesas.map((d) => (
              <ExpenseCard key={d.despesa_id} expense={d} onClick={() => onEdit(d)} />
            ))}
          </>
        ) : (
          <div className="empty">
            <div className="empty-icon">{Icons.receipt}</div>
            <div className="empty-text">Nenhuma despesa ainda.<br/>Toque em "Nova despesa" para capturar.</div>
          </div>
        )}

        {despesas.length > 0 && isActive && (
          <>
            <div style={{ height:8 }} />
            <button className="fab secondary" onClick={() => onExport()}>
              {Icons.export} Exportar pacote
            </button>
            <button className="fab secondary" onClick={() => setShowClose(true)} style={{ marginTop:0 }}>
              Fechar viagem
            </button>
          </>
        )}

        {trip.status === "fechada" && (
          <button className="fab" onClick={() => onExport()}>
            {Icons.export} Exportar pacote
          </button>
        )}

        <div className="safe-bottom" />
      </div>

      {showClose && (
        <div className="modal-overlay" onClick={() => setShowClose(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="confirm-box">
              <p>Fechar esta viagem? Você poderá reabrir depois se precisar.</p>
              <div className="confirm-btns">
                <button className="cancel" onClick={() => setShowClose(false)}>Cancelar</button>
                <button className="danger" onClick={handleClose} style={{background:"var(--warn)", color:"var(--bg)"}}>Fechar viagem</button>
              </div>
            </div>
            <div className="safe-bottom" />
          </div>
        </div>
      )}

      {showEditTrip && (
        <div className="modal-overlay" onClick={() => setShowEditTrip(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title">Editar viagem</div>
            <div className="field">
              <label>Nome da viagem</label>
              <input value={editNome} onChange={e => setEditNome(e.target.value)} />
            </div>
            <div style={{ display:"flex", gap:8, padding:"0 16px" }}>
              <div className="field" style={{ flex:1, margin:0 }}>
                <label>Início</label>
                <input type="date" value={editInicio} onChange={e => setEditInicio(e.target.value)} />
              </div>
              <div className="field" style={{ flex:1, margin:0 }}>
                <label>Fim</label>
                <input type="date" value={editFim} onChange={e => setEditFim(e.target.value)} />
              </div>
            </div>
            {!isActive && (
              <button className="fab secondary" onClick={() => { handleReopen(); setShowEditTrip(false); }} style={{ marginTop:8 }}>
                Reabrir viagem
              </button>
            )}
            <button className="fab" onClick={handleSaveTrip} disabled={!editNome.trim()} style={{ marginTop: isActive ? 8 : 0 }}>
              {Icons.check} Salvar
            </button>
            <button className="fab secondary" onClick={() => setShowEditTrip(false)} style={{ marginTop:0 }}>
              Cancelar
            </button>
            <div style={{ height:16 }} />
          </div>
        </div>
      )}
    </div>
  );
}

function ExpenseCard({ expense, onClick }) {
  const d = expense;
  const isMeal = MEAL_CATEGORIES.includes(d.categoria_dinnero);
  const isReviewed = d.status_revisao === "revisado";
  const hasPhoto = !!d.captura?.foto_thumbnail_base64;
  const isPdf = d.captura?.anexo_tipo === "pdf" || d.captura?.foto_thumbnail_base64?.startsWith("data:application/pdf");

  return (
    <div className="card" onClick={onClick} style={{ cursor:"pointer" }}>
      <div className="card-row">
        {isPdf ? (
          <div className="card-icon" style={{ background:"var(--blue-dim)", color:"var(--blue)" }}>
            {Icons.fileText}
          </div>
        ) : hasPhoto ? (
          <img src={d.captura.foto_thumbnail_base64} alt="" style={{ width:44, height:44, borderRadius:10, objectFit:"cover", flexShrink:0 }} />
        ) : (
          <div className="card-icon" style={{ background:"var(--bg4)", color:"var(--text3)" }}>
            {Icons.receipt}
          </div>
        )}
        <div className="card-body">
          <div className="card-title">{d.dados_nf?.estabelecimento || "Sem nome"}</div>
          <div className="card-sub">
            {d.categoria_dinnero || "Sem categoria"} · {formatDate(d.dados_nf?.data_despesa)}
          </div>
        </div>
        <div className="card-right">
          <div className="card-amount">{formatCurrency(d.dados_nf?.valor)}</div>
          <div className={`pill ${isReviewed ? "green" : "yellow"}`} style={{ marginTop:4 }}>
            {isReviewed ? "Revisado" : "Rascunho"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Capture Page ────────────────────────────────────────────────────────
function CapturePage({ trip, config, onSave, onBack }) {
  const [step, setStep] = useState(0); // 0=photo, 1=data, 2=category
  const [photo, setPhoto] = useState(null);
  const [estab, setEstab] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(todayISO());
  const [cat, setCat] = useState("");
  const [showAllCats, setShowAllCats] = useState(false);
  const [justificativa, setJust] = useState("");
  const [diarias, setDiarias] = useState("");
  const [placa, setPlaca] = useState("");
  const [km, setKm] = useState("");
  const [participantes, setParticipantes] = useState([]);
  const [newParticipant, setNewParticipant] = useState("");
  // Fase 2: estado da extração via Gemini
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiExtracted, setAiExtracted] = useState(false);
  const [aiConfidence, setAiConfidence] = useState(null);
  const [catSuggested, setCatSuggested] = useState("");
  const [justSuggested, setJustSuggested] = useState("");
  const [horario, setHorario] = useState(null);
  const [cnpj, setCnpj] = useState(null);
  // Fase 2: anexo (imagem ou PDF)
  const [attachment, setAttachment] = useState(null); // {type: 'image'|'pdf', dataUrl, name, size}
  const fileRef = useRef(null);
  const pdfRef = useRef(null);

  const hasKey = !!(config.gemini_api_key && config.gemini_api_key.trim());
  const isMeal = MEAL_CATEGORIES.includes(cat);
  const profile = CATEGORY_PROFILES[cat];
  const needsConditional = !!profile?.campo;

  // Confiança visual: alta (>=0.8) verde, média (0.6-0.8) amarelo, abaixo: pede revisão
  const confLevel = aiConfidence == null ? null : (aiConfidence >= 0.8 ? "ok" : "check");

  const runExtraction = async (dataUrl) => {
    setAiLoading(true);
    setAiError(null);
    setAiExtracted(false);
    setCatSuggested("");
    setJustSuggested("");
    try {
      const r = await geminiExtractFromImage(config.gemini_api_key.trim(), dataUrl);
      if (r.estabelecimento) setEstab(r.estabelecimento);
      if (r.valor_total) setValor(r.valor_total.toFixed(2).replace(".", ","));
      if (r.data_despesa) setData(r.data_despesa);
      if (r.horario) setHorario(r.horario);
      if (r.cnpj) setCnpj(r.cnpj);
      if (r.categoria_sugerida) setCatSuggested(r.categoria_sugerida);
      if (r.justificativa_sugerida) setJustSuggested(r.justificativa_sugerida);
      // Auto-preenche campos condicionais quando a IA extrair
      if (r.diarias_extraidas != null) setDiarias(String(r.diarias_extraidas));
      if (r.placa_veiculo) setPlaca(r.placa_veiculo);
      if (r.km_rodados != null) setKm(String(r.km_rodados));
      setAiConfidence(r.confianca);
      setAiExtracted(true);
    } catch (e) {
      setAiError(e.message || "Falha ao extrair");
    } finally {
      setAiLoading(false);
    }
  };

  // Aceita File (image/* ou application/pdf) e dispara extração
  const handleFile = (file) => {
    if (!file) return;
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name || "");
    const reader = new FileReader();
    reader.onerror = () => {
      logEvent("file_read_error", "FileReader falhou ao ler o arquivo", {
        name: file.name || null,
        type: file.type || null,
        size: file.size || 0,
        error: String(reader.error?.message || reader.error || "unknown"),
      });
      setAiError("Não consegui ler o arquivo. Tente outro.");
    };
    reader.onload = () => {
      const dataUrl = reader.result;
      // Photo armazena dataUrl pra display + envio à IA + persistência
      setPhoto(dataUrl);
      setAttachment({
        type: isPdf ? "pdf" : "image",
        dataUrl,
        name: file.name || (isPdf ? "documento.pdf" : "foto.jpg"),
        size: file.size || 0,
      });
      setStep(1);
      if (hasKey && navigator.onLine) {
        runExtraction(dataUrl);
      } else if (!hasKey) {
        setAiError("Sem chave Gemini configurada — preencha manualmente ou adicione em Configurações.");
      } else {
        setAiError("Sem internet — preencha manualmente. Você pode re-extrair depois.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePhoto = (e) => handleFile(e.target.files?.[0]);
  const handlePdf = (e) => handleFile(e.target.files?.[0]);

  const handleSave = () => {
    const valNum = parseFloat(valor.replace(",", ".")) || 0;
    const ext = attachment?.type === "pdf" ? "pdf" : "jpg";
    const expense = {
      despesa_id: uuid(),
      captura: {
        timestamp_captura: new Date().toISOString(),
        foto_path: `fotos/despesa_${uuid().slice(0,8)}_nf.${ext}`,
        foto_thumbnail_base64: photo,
        anexo_tipo: attachment?.type || (photo ? "image" : null),
        anexo_nome_original: attachment?.name || null,
      },
      dados_nf: {
        estabelecimento: estab.trim() || "Sem nome",
        cnpj: cnpj || null,
        valor: valNum,
        data_despesa: data,
        horario: horario || null,
        extraido_por_ia: aiExtracted,
        confianca_extracao: aiConfidence,
      },
      categoria_dinnero: cat,
      justificativa: justificativa.trim(),
      campos_condicionais: {
        diarias: cat === "Hospedagens" ? (parseInt(diarias) || null) : null,
        placa_veiculo: ["Combustível em viagem","Combustível de frotas"].includes(cat) ? (placa.trim() || null) : null,
        km_rodados: ["Km rodado em viagem","Km rodado desp. administrativo"].includes(cat) ? (parseInt(km) || null) : null,
      },
      participantes: isMeal ? {
        internos: participantes,
        externos: [],
      } : null,
      status_revisao: "rascunho",
      modais_dinnero_aplicaveis: buildModais(cat),
    };
    onSave(expense);
  };

  const addParticipant = () => {
    const name = newParticipant.trim();
    if (name && !participantes.includes(name)) {
      setParticipantes([...participantes, name]);
    }
    setNewParticipant("");
  };

  const freqParticipants = config.participantes_frequentes || [];
  const suggestedP = freqParticipants.filter(p =>
    newParticipant.length > 0 &&
    p.toLowerCase().includes(newParticipant.toLowerCase()) &&
    !participantes.includes(p)
  );

  const canSave = estab.trim() && cat;

  return (
    <div className="page">
      <div className="header">
        <button className="header-btn" onClick={onBack}>{Icons.back}</button>
        <h1 style={{ fontSize:16 }}>Nova despesa</h1>
        <div style={{ display:"flex", gap:4 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width:8, height:8, borderRadius:4,
              background: step >= i ? "var(--accent)" : "var(--border2)",
              transition:"all 0.2s"
            }} />
          ))}
        </div>
      </div>

      <div className="scroll">
        {step === 0 && (
          <>
            <div className="section-head">Anexo da despesa</div>

            {attachment?.type === "pdf" ? (
              <div className="pdf-card">
                <div className="pdf-icon">{Icons.fileText}</div>
                <div className="pdf-body">
                  <div className="pdf-name">{attachment.name}</div>
                  <div className="pdf-sub">PDF · {attachment.size ? `${(attachment.size/1024).toFixed(0)} KB` : "anexado"}</div>
                </div>
                <button className="ai-action" style={{borderColor:"var(--text3)", color:"var(--text2)"}} onClick={() => { setAttachment(null); setPhoto(null); }}>
                  Trocar
                </button>
              </div>
            ) : photo ? (
              <div className="photo-area" onClick={() => fileRef.current?.click()}>
                <img src={photo} alt="NF" />
              </div>
            ) : (
              <div className="capture-buttons">
                <button className="cap-btn" onClick={() => fileRef.current?.click()}>
                  <span className="cap-icon">{Icons.camera}</span>
                  <span>Tirar foto / galeria</span>
                </button>
                <button className="cap-btn" onClick={() => pdfRef.current?.click()}>
                  <span className="cap-icon">{Icons.fileText}</span>
                  <span>Anexar PDF</span>
                </button>
              </div>
            )}

            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display:"none" }} />
            <input ref={pdfRef} type="file" accept="application/pdf,.pdf" onChange={handlePdf} style={{ display:"none" }} />

            <button className="fab secondary" onClick={() => setStep(1)}>
              Pular anexo (preencher manualmente)
            </button>
          </>
        )}

        {step === 1 && (
          <>
            <div className="section-head">Dados da despesa</div>
            {attachment?.type === "pdf" ? (
              <div className="pdf-card" style={{margin:"0 16px 12px"}}>
                <div className="pdf-icon">{Icons.fileText}</div>
                <div className="pdf-body">
                  <div className="pdf-name">{attachment.name}</div>
                  <div className="pdf-sub">PDF · {attachment.size ? `${(attachment.size/1024).toFixed(0)} KB` : "anexado"}</div>
                </div>
              </div>
            ) : photo && (
              <div style={{ margin:"0 16px 12px", borderRadius:12, overflow:"hidden", height:120 }}>
                <img src={photo} alt="NF" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              </div>
            )}

            {/* Banner de status da IA */}
            {aiLoading && (
              <div className="ai-banner loading">
                <span className="ai-icon spinner" />
                <span className="ai-text">Extraindo dados com IA…</span>
              </div>
            )}
            {!aiLoading && aiExtracted && !aiError && (
              <div className="ai-banner success">
                <span className="ai-icon">{Icons.sparkle}</span>
                <span className="ai-text">
                  {confLevel === "ok"
                    ? "Dados extraídos. Confira e ajuste se necessário."
                    : "Dados extraídos com confiança baixa. Revise os campos."}
                </span>
                {photo && hasKey && (
                  <button className="ai-action" onClick={() => runExtraction(photo)} disabled={aiLoading}>
                    {Icons.refresh}
                  </button>
                )}
              </div>
            )}
            {!aiLoading && aiError && (
              <div className="ai-banner warn">
                <span className="ai-icon">{Icons.alert}</span>
                <span className="ai-text">{aiError}</span>
                {photo && hasKey && navigator.onLine && (
                  <button className="ai-action" onClick={() => runExtraction(photo)} disabled={aiLoading}>
                    {Icons.refresh} Tentar
                  </button>
                )}
              </div>
            )}

            <div className="field">
              <div className="field-label-row">
                <label>Estabelecimento</label>
                {confLevel && <span className={`conf-badge ${confLevel}`}>{confLevel === "ok" ? "IA" : "Verifique"}</span>}
              </div>
              <input placeholder="Nome do estabelecimento" value={estab} onChange={e => setEstab(e.target.value)} autoFocus={!aiExtracted} />
            </div>
            <div style={{ display:"flex", gap:8, padding:"0 16px" }}>
              <div className="field" style={{ flex:1, margin:0 }}>
                <div className="field-label-row">
                  <label>Valor (R$)</label>
                  {confLevel && <span className={`conf-badge ${confLevel}`}>{confLevel === "ok" ? "IA" : "✓?"}</span>}
                </div>
                <input placeholder="0,00" value={valor} onChange={e => setValor(e.target.value)} inputMode="decimal" />
              </div>
              <div className="field" style={{ flex:1, margin:0 }}>
                <div className="field-label-row">
                  <label>Data</label>
                  {confLevel && <span className={`conf-badge ${confLevel}`}>{confLevel === "ok" ? "IA" : "✓?"}</span>}
                </div>
                <input type="date" value={data} onChange={e => setData(e.target.value)} />
              </div>
            </div>
            <div style={{ height:16 }} />
            <button className="fab" onClick={() => setStep(2)} disabled={!estab.trim()}>
              Próximo: categorizar
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="section-head">Categoria</div>

            {/* Sugestão da IA, aparece se foi extraída e ainda não foi escolhida igual */}
            {catSuggested && cat !== catSuggested && (
              <div className="suggest-cat">
                <span style={{display:"flex"}}>{Icons.sparkle}</span>
                <span>Sugerimos: <strong>{catSuggested}</strong></span>
                <button className="ai-action" style={{borderColor:"var(--accent)", color:"var(--accent)"}} onClick={() => setCat(catSuggested)}>
                  Aplicar
                </button>
                <button className="sc-x" onClick={() => setCatSuggested("")} aria-label="Dispensar">{Icons.x}</button>
              </div>
            )}

            <div className="cat-quick">
              {QUICK_CATEGORIES.map(c => (
                <div key={c} className={`cat-item ${cat === c ? "sel" : ""}`}
                  onClick={() => { setCat(c); setShowAllCats(false); }}>
                  {c}
                </div>
              ))}
              <div className="cat-item" onClick={() => setShowAllCats(!showAllCats)}
                style={{ background:"var(--bg4)", color:"var(--text2)" }}>
                {showAllCats ? "Menos" : "Todas…"}
              </div>
            </div>

            {showAllCats && (
              <div className="field">
                <div className="select-wrap">
                  <select value={cat} onChange={e => setCat(e.target.value)}>
                    <option value="">Selecione…</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Conditional fields */}
            {needsConditional && (
              <div className="field">
                <label>{profile.campo.label}</label>
                {profile.campo.tipo === "numero_inteiro" && cat === "Hospedagens" && (
                  <input type="number" placeholder="Ex: 2" value={diarias} onChange={e => setDiarias(e.target.value)} inputMode="numeric" />
                )}
                {profile.campo.tipo === "alfanumerico" && (
                  <input placeholder="Ex: ABC1D23" value={placa} onChange={e => setPlaca(e.target.value.toUpperCase())} />
                )}
                {profile.campo.tipo === "numero_inteiro" && cat !== "Hospedagens" && (
                  <input type="number" placeholder="Ex: 150" value={km} onChange={e => setKm(e.target.value)} inputMode="numeric" />
                )}
              </div>
            )}

            {/* Meal participants */}
            {isMeal && (
              <>
                <div className="section-head" style={{ marginTop:4 }}>Participantes da refeição</div>
                {participantes.map((p, i) => (
                  <div key={i} className="participant-row">
                    <span style={{ color:"var(--text3)" }}>{Icons.user}</span>
                    <span className="p-name">{p}</span>
                    <button className="p-remove" onClick={() => setParticipantes(participantes.filter((_, j) => j !== i))}>×</button>
                  </div>
                ))}
                <div style={{ display:"flex", gap:8, padding:"0 16px", marginBottom:8 }}>
                  <input
                    style={{ flex:1, background:"var(--bg3)", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", padding:"10px 12px", color:"var(--text)", fontFamily:"var(--font)", fontSize:14, outline:"none" }}
                    placeholder="Nome do participante"
                    value={newParticipant}
                    onChange={e => setNewParticipant(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") addParticipant(); }}
                  />
                  <button onClick={addParticipant}
                    style={{ background:"var(--accent-dim)", color:"var(--accent)", border:"1px solid rgba(74,222,128,0.2)", borderRadius:"var(--radius-sm)", padding:"10px 14px", fontFamily:"var(--font)", fontSize:14, fontWeight:600, cursor:"pointer" }}>
                    +
                  </button>
                </div>
                {suggestedP.length > 0 && (
                  <div style={{ padding:"0 16px 8px", display:"flex", flexWrap:"wrap", gap:4 }}>
                    {suggestedP.map(p => (
                      <div key={p} className="chip" onClick={() => { setParticipantes([...participantes, p]); setNewParticipant(""); }}>
                        {p}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Justificativa */}
            {justSuggested && justSuggested !== justificativa && (
              <div className="suggest-cat" style={{marginBottom:0}}>
                <span style={{display:"flex"}}>{Icons.sparkle}</span>
                <span>Sugerimos: <strong>{justSuggested}</strong></span>
                <button className="ai-action" style={{borderColor:"var(--accent)", color:"var(--accent)"}} onClick={() => setJust(justSuggested)}>
                  Aplicar
                </button>
                <button className="sc-x" onClick={() => setJustSuggested("")} aria-label="Dispensar">{Icons.x}</button>
              </div>
            )}
            <div className="field" style={{ marginTop:8 }}>
              <label>Justificativa</label>
              <textarea
                placeholder="Motivo da despesa (obrigatório no Dinnero)"
                value={justificativa}
                onChange={e => setJust(e.target.value)}
                rows={3}
              />
            </div>

            <button className="fab" onClick={handleSave} disabled={!canSave}>
              {Icons.check} Salvar despesa
            </button>
            <div style={{ height:80 }} />
          </>
        )}
        <div className="safe-bottom" />
      </div>
    </div>
  );
}

// ─── Edit Expense Page ───────────────────────────────────────────────────
function EditExpensePage({ trip, expense, config, onSave, onDelete, onBack }) {
  const [estab, setEstab] = useState(expense.dados_nf?.estabelecimento || "");
  const [valor, setValor] = useState(String(expense.dados_nf?.valor || ""));
  const [data, setData] = useState(expense.dados_nf?.data_despesa || todayISO());
  const [cat, setCat] = useState(expense.categoria_dinnero || "");
  const [showAllCats, setShowAllCats] = useState(false);
  const [justificativa, setJust] = useState(expense.justificativa || "");
  const [diarias, setDiarias] = useState(String(expense.campos_condicionais?.diarias || ""));
  const [placa, setPlaca] = useState(expense.campos_condicionais?.placa_veiculo || "");
  const [km, setKm] = useState(String(expense.campos_condicionais?.km_rodados || ""));
  const [participantes, setParticipantes] = useState(expense.participantes?.internos || []);
  const [newParticipant, setNewParticipant] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reviewed, setReviewed] = useState(expense.status_revisao === "revisado");
  // Fase 2: re-extração
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiInfo, setAiInfo] = useState(null); // {confianca}
  const [catSuggested, setCatSuggested] = useState("");
  const [horario, setHorario] = useState(expense.dados_nf?.horario || null);
  const [cnpj, setCnpj] = useState(expense.dados_nf?.cnpj || null);
  const [justSuggested, setJustSuggested] = useState("");
  // Anexo: detecta tipo a partir dos metadados salvos
  const attachmentType = expense.captura?.anexo_tipo || (expense.captura?.foto_thumbnail_base64?.startsWith("data:application/pdf") ? "pdf" : "image");
  const attachmentName = expense.captura?.anexo_nome_original || null;
  const photo = expense.captura?.foto_thumbnail_base64;

  const hasKey = !!(config.gemini_api_key && config.gemini_api_key.trim());
  const isMeal = MEAL_CATEGORIES.includes(cat);
  const profile = CATEGORY_PROFILES[cat];
  const needsConditional = !!profile?.campo;

  const freqParticipants = config.participantes_frequentes || [];
  const suggestedP = freqParticipants.filter(p =>
    newParticipant.length > 0 &&
    p.toLowerCase().includes(newParticipant.toLowerCase()) &&
    !participantes.includes(p)
  );

  const addParticipant = () => {
    const name = newParticipant.trim();
    if (name && !participantes.includes(name)) {
      setParticipantes([...participantes, name]);
    }
    setNewParticipant("");
  };

  const handleSave = () => {
    const valNum = parseFloat(valor.replace(",", ".")) || 0;
    const updated = {
      ...expense,
      dados_nf: {
        ...expense.dados_nf,
        estabelecimento: estab.trim(),
        valor: valNum,
        data_despesa: data,
        cnpj: cnpj || expense.dados_nf?.cnpj || null,
        horario: horario || expense.dados_nf?.horario || null,
        // se fez re-extração, atualiza; senão mantém o que veio
        extraido_por_ia: aiInfo ? true : !!expense.dados_nf?.extraido_por_ia,
        confianca_extracao: aiInfo ? aiInfo.confianca : (expense.dados_nf?.confianca_extracao ?? null),
      },
      categoria_dinnero: cat,
      justificativa: justificativa.trim(),
      campos_condicionais: {
        diarias: cat === "Hospedagens" ? (parseInt(diarias) || null) : null,
        placa_veiculo: ["Combustível em viagem","Combustível de frotas"].includes(cat) ? (placa.trim() || null) : null,
        km_rodados: ["Km rodado em viagem","Km rodado desp. administrativo"].includes(cat) ? (parseInt(km) || null) : null,
      },
      participantes: isMeal ? { internos: participantes, externos: [] } : null,
      status_revisao: reviewed ? "revisado" : "rascunho",
      modais_dinnero_aplicaveis: buildModais(cat),
    };
    onSave(updated);
  };

  const reExtract = async () => {
    if (!photo || !hasKey) return;
    setAiLoading(true);
    setAiError(null);
    setJustSuggested("");
    try {
      const r = await geminiExtractFromImage(config.gemini_api_key.trim(), photo);
      if (r.estabelecimento) setEstab(r.estabelecimento);
      if (r.valor_total) setValor(r.valor_total.toFixed(2).replace(".", ","));
      if (r.data_despesa) setData(r.data_despesa);
      if (r.horario) setHorario(r.horario);
      if (r.cnpj) setCnpj(r.cnpj);
      if (r.categoria_sugerida) setCatSuggested(r.categoria_sugerida);
      if (r.justificativa_sugerida) setJustSuggested(r.justificativa_sugerida);
      if (r.diarias_extraidas != null) setDiarias(String(r.diarias_extraidas));
      if (r.placa_veiculo) setPlaca(r.placa_veiculo);
      if (r.km_rodados != null) setKm(String(r.km_rodados));
      setAiInfo({ confianca: r.confianca });
    } catch (e) {
      setAiError(e.message || "Falha ao re-extrair");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="header">
        <button className="header-btn" onClick={onBack}>{Icons.back}</button>
        <h1 style={{ fontSize:16 }}>Editar despesa</h1>
        <button className="header-btn" onClick={() => setConfirmDelete(true)} style={{ color:"var(--danger)" }}>{Icons.trash}</button>
      </div>

      <div className="scroll">
        {photo && attachmentType === "pdf" ? (
          <div className="pdf-card" style={{margin:"12px 16px 0"}}>
            <div className="pdf-icon">{Icons.fileText}</div>
            <div className="pdf-body">
              <div className="pdf-name">{attachmentName || "documento.pdf"}</div>
              <div className="pdf-sub">PDF anexado</div>
            </div>
          </div>
        ) : photo && (
          <div style={{ margin:"12px 16px 0", borderRadius:12, overflow:"hidden", height:140 }}>
            <img src={photo} alt="NF" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
          </div>
        )}

        {/* Botão re-extrair com IA (Fase 2) */}
        {photo && (
          <div style={{ padding:"12px 16px 0" }}>
            {aiLoading ? (
              <div className="ai-banner loading" style={{margin:0}}>
                <span className="ai-icon spinner" />
                <span className="ai-text">Re-extraindo com IA…</span>
              </div>
            ) : aiError ? (
              <div className="ai-banner warn" style={{margin:0}}>
                <span className="ai-icon">{Icons.alert}</span>
                <span className="ai-text">{aiError}</span>
                {hasKey && navigator.onLine && (
                  <button className="ai-action" onClick={reExtract}>
                    {Icons.refresh}
                  </button>
                )}
              </div>
            ) : aiInfo ? (
              <div className="ai-banner success" style={{margin:0}}>
                <span className="ai-icon">{Icons.sparkle}</span>
                <span className="ai-text">
                  Re-extraído com sucesso{aiInfo.confianca != null ? ` (confiança ${(aiInfo.confianca*100).toFixed(0)}%)` : ""}.
                </span>
              </div>
            ) : hasKey ? (
              <button className="fab secondary small" style={{margin:0, width:"100%"}} onClick={reExtract}>
                {Icons.sparkle} Re-extrair com IA
              </button>
            ) : (
              <div className="ai-banner warn" style={{margin:0}}>
                <span className="ai-icon">{Icons.alert}</span>
                <span className="ai-text">Configure a chave Gemini em Configurações para usar a IA.</span>
              </div>
            )}
          </div>
        )}

        {catSuggested && cat !== catSuggested && (
          <div className="suggest-cat" style={{marginTop:12}}>
            <span style={{display:"flex"}}>{Icons.sparkle}</span>
            <span>Sugerimos: <strong>{catSuggested}</strong></span>
            <button className="ai-action" style={{borderColor:"var(--accent)", color:"var(--accent)"}} onClick={() => setCat(catSuggested)}>
              Aplicar
            </button>
            <button className="sc-x" onClick={() => setCatSuggested("")} aria-label="Dispensar">{Icons.x}</button>
          </div>
        )}

        <div className="section-head">Dados</div>
        <div className="field">
          <label>Estabelecimento</label>
          <input value={estab} onChange={e => setEstab(e.target.value)} />
        </div>
        <div style={{ display:"flex", gap:8, padding:"0 16px" }}>
          <div className="field" style={{ flex:1, margin:0 }}>
            <label>Valor (R$)</label>
            <input value={valor} onChange={e => setValor(e.target.value)} inputMode="decimal" />
          </div>
          <div className="field" style={{ flex:1, margin:0 }}>
            <label>Data</label>
            <input type="date" value={data} onChange={e => setData(e.target.value)} />
          </div>
        </div>

        <div className="section-head" style={{ marginTop:4 }}>Categoria</div>
        <div className="cat-quick">
          {QUICK_CATEGORIES.map(c => (
            <div key={c} className={`cat-item ${cat === c ? "sel" : ""}`}
              onClick={() => { setCat(c); setShowAllCats(false); }}>
              {c}
            </div>
          ))}
          <div className="cat-item" onClick={() => setShowAllCats(!showAllCats)}
            style={{ background:"var(--bg4)", color:"var(--text2)" }}>
            {showAllCats ? "Menos" : "Todas…"}
          </div>
        </div>

        {showAllCats && (
          <div className="field">
            <div className="select-wrap">
              <select value={cat} onChange={e => setCat(e.target.value)}>
                <option value="">Selecione…</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        )}

        {needsConditional && (
          <div className="field">
            <label>{profile.campo.label}</label>
            {profile.campo.tipo === "numero_inteiro" && cat === "Hospedagens" && (
              <input type="number" value={diarias} onChange={e => setDiarias(e.target.value)} inputMode="numeric" />
            )}
            {profile.campo.tipo === "alfanumerico" && (
              <input value={placa} onChange={e => setPlaca(e.target.value.toUpperCase())} />
            )}
            {profile.campo.tipo === "numero_inteiro" && cat !== "Hospedagens" && (
              <input type="number" value={km} onChange={e => setKm(e.target.value)} inputMode="numeric" />
            )}
          </div>
        )}

        {isMeal && (
          <>
            <div className="section-head" style={{ marginTop:4 }}>Participantes</div>
            {participantes.map((p, i) => (
              <div key={i} className="participant-row">
                <span style={{ color:"var(--text3)" }}>{Icons.user}</span>
                <span className="p-name">{p}</span>
                <button className="p-remove" onClick={() => setParticipantes(participantes.filter((_, j) => j !== i))}>×</button>
              </div>
            ))}
            <div style={{ display:"flex", gap:8, padding:"0 16px", marginBottom:8 }}>
              <input
                style={{ flex:1, background:"var(--bg3)", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", padding:"10px 12px", color:"var(--text)", fontFamily:"var(--font)", fontSize:14, outline:"none" }}
                placeholder="Nome do participante"
                value={newParticipant}
                onChange={e => setNewParticipant(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addParticipant(); }}
              />
              <button onClick={addParticipant}
                style={{ background:"var(--accent-dim)", color:"var(--accent)", border:"1px solid rgba(74,222,128,0.2)", borderRadius:"var(--radius-sm)", padding:"10px 14px", fontFamily:"var(--font)", fontSize:14, fontWeight:600, cursor:"pointer" }}>
                +
              </button>
            </div>
            {suggestedP.length > 0 && (
              <div style={{ padding:"0 16px 8px", display:"flex", flexWrap:"wrap", gap:4 }}>
                {suggestedP.map(p => (
                  <div key={p} className="chip" onClick={() => { setParticipantes([...participantes, p]); setNewParticipant(""); }}>
                    {p}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {justSuggested && justSuggested !== justificativa && (
          <div className="suggest-cat" style={{marginTop:8, marginBottom:0}}>
            <span style={{display:"flex"}}>{Icons.sparkle}</span>
            <span>Sugerimos: <strong>{justSuggested}</strong></span>
            <button className="ai-action" style={{borderColor:"var(--accent)", color:"var(--accent)"}} onClick={() => setJust(justSuggested)}>
              Aplicar
            </button>
            <button className="sc-x" onClick={() => setJustSuggested("")} aria-label="Dispensar">{Icons.x}</button>
          </div>
        )}

        <div className="field" style={{ marginTop:8 }}>
          <label>Justificativa</label>
          <textarea value={justificativa} onChange={e => setJust(e.target.value)} rows={3} />
        </div>

        {/* Mark as reviewed toggle */}
        <div style={{ padding:"0 16px 8px" }}>
          <div className="chip" style={{ cursor:"pointer" }}
            onClick={() => setReviewed(!reviewed)}>
            <span style={{ color: reviewed ? "var(--accent)" : "var(--text3)", display:"flex" }}>{reviewed ? Icons.check : null}</span>
            <span style={{ color: reviewed ? "var(--accent)" : "var(--text2)" }}>
              {reviewed ? "Marcado como revisado" : "Marcar como revisado"}
            </span>
          </div>
        </div>

        <button className="fab" onClick={handleSave}>
          {Icons.check} Salvar alterações
        </button>
        <div style={{ height:80 }} />
      </div>

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="confirm-box">
              <p>Excluir esta despesa?<br/>Esta ação não pode ser desfeita.</p>
              <div className="confirm-btns">
                <button className="cancel" onClick={() => setConfirmDelete(false)}>Cancelar</button>
                <button className="danger" onClick={() => onDelete(expense.despesa_id)}>Excluir</button>
              </div>
            </div>
            <div className="safe-bottom" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Export Page ──────────────────────────────────────────────────────────
function ExportPage({ trip, onBack, onExported }) {
  const despesas = trip.despesas || [];
  const [selected, setSelected] = useState(() => new Set(despesas.map(d => d.despesa_id)));
  const [exporting, setExporting] = useState(false);

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const total = despesas.filter(d => selected.has(d.despesa_id)).reduce((s, d) => s + (d.dados_nf?.valor || 0), 0);

  // Validation
  const warnings = [];
  despesas.filter(d => selected.has(d.despesa_id)).forEach(d => {
    if (!d.categoria_dinnero) warnings.push(`${d.dados_nf?.estabelecimento}: sem categoria`);
    if (!d.justificativa) warnings.push(`${d.dados_nf?.estabelecimento}: sem justificativa`);
    const profile = CATEGORY_PROFILES[d.categoria_dinnero];
    if (profile?.requer_anexo !== false && !d.captura?.foto_thumbnail_base64) {
      warnings.push(`${d.dados_nf?.estabelecimento}: sem foto da NF`);
    }
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const selectedDespesas = despesas.filter(d => selected.has(d.despesa_id));
      const manifest = {
        viagem_id: trip.viagem_id,
        nome: trip.nome,
        data_inicio: trip.data_inicio,
        data_fim: trip.data_fim,
        exportado_em: new Date().toISOString(),
        total_despesas: selectedDespesas.length,
        valor_total: total,
        despesas: selectedDespesas.map(d => ({
          ...d,
          captura: { ...d.captura, foto_thumbnail_base64: undefined },
        })),
      };

      const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `manifest_${trip.nome.replace(/[^a-zA-Z0-9]/g, "_")}.json`;

      // Try share API first (iOS), fallback to download
      if (navigator.share && navigator.canShare?.({ files: [new File([blob], a.download, { type: "application/json" })] })) {
        const file = new File([blob], a.download, { type: "application/json" });
        await navigator.share({ files: [file], title: `Pacote: ${trip.nome}` });
      } else {
        a.click();
      }
      URL.revokeObjectURL(url);

      const updated = { ...trip, status: "exportada" };
      onExported(updated);
    } catch (e) {
      console.error(e);
      setExporting(false);
    }
  };

  return (
    <div className="page">
      <div className="header">
        <button className="header-btn" onClick={onBack}>{Icons.back}</button>
        <h1 style={{ fontSize:16 }}>Exportar pacote</h1>
      </div>

      <div className="scroll">
        <div className="totalizer">
          <div>
            <div className="totalizer-label">Selecionadas</div>
            <div className="totalizer-count">{selected.size} de {despesas.length} despesas</div>
          </div>
          <div className="totalizer-val">{formatCurrency(total)}</div>
        </div>

        {warnings.length > 0 && (
          <div style={{ margin:"8px 16px", padding:"12px", background:"var(--warn-dim)", border:"1px solid rgba(245,158,11,0.2)", borderRadius:"var(--radius-sm)" }}>
            <div style={{ fontSize:12, fontWeight:600, color:"var(--warn)", marginBottom:4 }}>Atenção</div>
            {warnings.map((w, i) => (
              <div key={i} style={{ fontSize:12, color:"var(--text2)", lineHeight:1.4 }}>• {w}</div>
            ))}
          </div>
        )}

        <div className="section-head">Despesas no pacote</div>
        {despesas.map(d => (
          <div key={d.despesa_id} className="export-item">
            <button className={`export-cb ${selected.has(d.despesa_id) ? "checked" : ""}`}
              onClick={() => toggle(d.despesa_id)}>
              {selected.has(d.despesa_id) && Icons.check}
            </button>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:500 }}>{d.dados_nf?.estabelecimento || "Sem nome"}</div>
              <div style={{ fontSize:12, color:"var(--text3)" }}>{d.categoria_dinnero} · {formatDate(d.dados_nf?.data_despesa)}</div>
            </div>
            <div style={{ fontFamily:"var(--mono)", fontSize:14 }}>{formatCurrency(d.dados_nf?.valor)}</div>
          </div>
        ))}

        <button className="fab" onClick={handleExport} disabled={selected.size === 0 || exporting} style={{ marginTop:16 }}>
          {Icons.export} {exporting ? "Exportando…" : "Exportar manifest.json"}
        </button>
        <div style={{ padding:"0 16px", fontSize:12, color:"var(--text3)", textAlign:"center", lineHeight:1.4 }}>
          O pacote será salvo como JSON. As fotos das NFs precisam ser compartilhadas separadamente via galeria.
        </div>
        <div className="safe-bottom" />
      </div>
    </div>
  );
}

// ─── Settings Page ───────────────────────────────────────────────────────
function SettingsPage({ config, onSave, onBack, showToast }) {
  const [nome, setNome] = useState(config.nome || "");
  const [partList, setPartList] = useState(config.participantes_frequentes || []);
  const [newPart, setNewPart] = useState("");
  // Fase 2: chave Gemini
  const [apiKey, setApiKey] = useState(config.gemini_api_key || "");
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // {ok: bool, msg: string}
  // Beta: log de debug
  const [logEntries, setLogEntries] = useState([]);
  const [logBytes, setLogBytes] = useState(0);
  const [confirmClearLog, setConfirmClearLog] = useState(false);

  const refreshLogStats = useCallback(async () => {
    if (!IS_BETA) return;
    try {
      const all = await dbGetAllLogs();
      setLogEntries(all);
      setLogBytes(all.reduce((s, e) => s + JSON.stringify(e).length, 0));
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    refreshLogStats();
  }, [refreshLogStats]);

  const buildLogPayload = () => ({
    app: "Despesas to Dinnero",
    version: APP_VERSION,
    exported_at: new Date().toISOString(),
    user_agent: navigator.userAgent,
    entries_count: logEntries.length,
    entries: logEntries.sort((a, b) => a.id - b.id),
  });

  const handleCopyLog = async () => {
    try {
      const text = JSON.stringify(buildLogPayload(), null, 2);
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // fallback antigo
        const ta = document.createElement("textarea");
        ta.value = text; document.body.appendChild(ta);
        ta.select(); document.execCommand("copy");
        document.body.removeChild(ta);
      }
      showToast("Log copiado");
    } catch (e) {
      showToast("Falha ao copiar");
      logEvent("runtime_error", "Falha ao copiar log", { error: String(e?.message || e) });
    }
  };

  const handleExportLog = () => {
    try {
      const text = JSON.stringify(buildLogPayload(), null, 2);
      const blob = new Blob([text], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      a.download = `despesas-dinnero-log-${ts}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      showToast("Arquivo de log gerado");
    } catch (e) {
      showToast("Falha ao exportar");
      logEvent("runtime_error", "Falha ao exportar log", { error: String(e?.message || e) });
    }
  };

  const handleClearLog = async () => {
    try {
      await dbClearLogs();
      await refreshLogStats();
      setConfirmClearLog(false);
      showToast("Log limpo");
    } catch (e) {
      showToast("Falha ao limpar");
    }
  };

  const addPart = () => {
    const n = newPart.trim().toUpperCase();
    if (n && !partList.includes(n)) setPartList([...partList, n]);
    setNewPart("");
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await geminiTestKey(apiKey.trim());
      setTestResult({ ok: true, msg: "Chave válida e ativa." });
    } catch (e) {
      setTestResult({ ok: false, msg: e.message || "Falha ao testar" });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    onSave({
      ...config,
      nome,
      participantes_frequentes: partList,
      gemini_api_key: apiKey.trim(),
    });
    showToast("Configurações salvas");
    onBack();
  };

  return (
    <div className="page">
      <div className="header">
        <button className="header-btn" onClick={onBack}>{Icons.back}</button>
        <h1 style={{ fontSize:16 }}>Configurações</h1>
      </div>

      <div className="scroll">
        <div className="section-head">Seus dados</div>
        <div className="field">
          <label>Nome completo</label>
          <input placeholder="Ricardo Assmann" value={nome} onChange={e => setNome(e.target.value)} />
        </div>

        <div className="section-head">Inteligência artificial</div>
        <div style={{ padding:"0 16px 8px", fontSize:12, color:"var(--text3)", lineHeight:1.45 }}>
          Chave da API Gemini (Google) usada para extrair dados das notas fiscais automaticamente.
          Crie a sua gratuitamente em <span style={{color:"var(--accent)"}}>aistudio.google.com/apikey</span>.
          A chave fica guardada apenas neste dispositivo.
        </div>
        <div style={{padding:"0 16px 6px"}}>
          <label style={{fontSize:12, fontWeight:500, color:"var(--text2)", textTransform:"uppercase", letterSpacing:"0.5px"}}>
            Chave API Gemini
          </label>
        </div>
        <div className="api-key-row">
          <input
            type={showKey ? "text" : "password"}
            placeholder="AIza…"
            value={apiKey}
            onChange={e => { setApiKey(e.target.value); setTestResult(null); }}
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <button className="icon-btn" onClick={() => setShowKey(!showKey)} aria-label="Mostrar/ocultar chave">
            {showKey ? Icons.eyeOff : Icons.eye}
          </button>
        </div>
        <div className="test-btn-row">
          <button className="test-btn" onClick={handleTest} disabled={!apiKey.trim() || testing}>
            {testing ? <span className="spinner" /> : Icons.sparkle}
            {testing ? "Testando…" : "Testar conexão"}
          </button>
          {testResult && (
            <span className={`test-result ${testResult.ok ? "ok" : "bad"}`}>
              {testResult.ok ? "✓ " : "✗ "}{testResult.msg}
            </span>
          )}
        </div>

        <div className="section-head">Participantes frequentes</div>
        <div style={{ padding:"0 16px 4px", fontSize:12, color:"var(--text3)", lineHeight:1.4 }}>
          Nomes que aparecerão como sugestão ao cadastrar participantes em refeições.
        </div>
        {partList.map((p, i) => (
          <div key={i} className="participant-row">
            <span style={{ color:"var(--text3)" }}>{Icons.user}</span>
            <span className="p-name">{p}</span>
            <button className="p-remove" onClick={() => setPartList(partList.filter((_, j) => j !== i))}>×</button>
          </div>
        ))}
        <div style={{ display:"flex", gap:8, padding:"0 16px", marginBottom:16 }}>
          <input
            style={{ flex:1, background:"var(--bg3)", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", padding:"10px 12px", color:"var(--text)", fontFamily:"var(--font)", fontSize:14, outline:"none" }}
            placeholder="Adicionar participante"
            value={newPart}
            onChange={e => setNewPart(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") addPart(); }}
          />
          <button onClick={addPart}
            style={{ background:"var(--accent-dim)", color:"var(--accent)", border:"1px solid rgba(74,222,128,0.2)", borderRadius:"var(--radius-sm)", padding:"10px 14px", fontFamily:"var(--font)", fontSize:14, fontWeight:600, cursor:"pointer" }}>
            +
          </button>
        </div>

        <button className="fab" onClick={handleSave}>
          {Icons.check} Salvar configurações
        </button>

        {IS_BETA && (
          <>
            <div className="section-head">Debug & Log (beta)</div>
            <div style={{ padding:"0 16px 8px", fontSize:12, color:"var(--text3)", lineHeight:1.45 }}>
              Eventos registrados automaticamente para diagnóstico durante o desenvolvimento.
              Capturamos: erros de extração da IA, erros de leitura de arquivo e erros de runtime.
            </div>
            <div style={{ padding:"0 16px 8px", display:"flex", alignItems:"center", gap:10 }}>
              <span className="pill" style={{ background:"var(--bg4)", color:"var(--text2)" }}>
                {logEntries.length} evento{logEntries.length !== 1 ? "s" : ""}
              </span>
              <span className="pill" style={{ background:"var(--bg4)", color:"var(--text2)" }}>
                {logBytes < 1024 ? `${logBytes} B` : `${(logBytes/1024).toFixed(1)} KB`}
              </span>
              <button onClick={refreshLogStats} className="ai-action" style={{ borderColor:"var(--text3)", color:"var(--text2)", marginLeft:"auto" }}>
                {Icons.refresh}
              </button>
            </div>
            <div style={{ display:"flex", gap:8, padding:"0 16px 8px" }}>
              <button className="fab secondary small" style={{ flex:1, margin:0 }}
                onClick={handleCopyLog} disabled={logEntries.length === 0}>
                Copiar
              </button>
              <button className="fab secondary small" style={{ flex:1, margin:0 }}
                onClick={handleExportLog} disabled={logEntries.length === 0}>
                {Icons.export} Exportar
              </button>
            </div>
            <button className="fab small" style={{ background:"var(--danger-dim)", color:"var(--danger)" }}
              onClick={() => setConfirmClearLog(true)} disabled={logEntries.length === 0}>
              Limpar log
            </button>
          </>
        )}

        <div style={{ padding:"24px 16px 8px", textAlign:"center", fontSize:11, color:"var(--text3)" }}>
          Despesas to Dinnero · PWA v{APP_VERSION}
        </div>
        <div className="safe-bottom" />
      </div>

      {confirmClearLog && (
        <div className="modal-overlay" onClick={() => setConfirmClearLog(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="confirm-box">
              <p>Limpar todos os {logEntries.length} eventos do log?<br/>Esta ação não pode ser desfeita.</p>
              <div className="confirm-btns">
                <button className="cancel" onClick={() => setConfirmClearLog(false)}>Cancelar</button>
                <button className="danger" onClick={handleClearLog}>Limpar</button>
              </div>
            </div>
            <div className="safe-bottom" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────
function buildModais(cat) {
  const modais = ["categoria"];
  const profile = CATEGORY_PROFILES[cat];
  if (profile?.requer_anexo !== false) modais.push("anexo");
  modais.push("justificativa");
  if (MEAL_CATEGORIES.includes(cat)) modais.push("participantes");
  return modais;
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(React.createElement(App));
