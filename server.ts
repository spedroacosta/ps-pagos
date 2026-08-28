import express from 'express';
import path from 'path';
import fs from 'fs';
import nodemailer from 'nodemailer';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { google } from 'googleapis';

dotenv.config();

function getCaracasDateString(): string {
  try {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'America/Caracas',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    };
    const formatter = new Intl.DateTimeFormat('sv-SE', options);
    return formatter.format(new Date());
  } catch (e) {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// Initialize Firestore if Firebase config exists
const FIREBASE_CONFIG_FILE = path.join(process.cwd(), 'firebase-applet-config.json');
let db: any = null;
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (configData.projectId) {
      const app = initializeApp(configData);
      db = getFirestore(app, configData.firestoreDatabaseId || '(default)');
      console.log('Firestore initialized successfully with Project ID:', configData.projectId, 'Database ID:', configData.firestoreDatabaseId || '(default)');
    }
  }
} catch (err) {
  console.error('Failed to initialize Firestore:', err);
}

// Timeout wrapper for Firestore operations to avoid blocking deployment/server if database is unreachable
function withTimeout<T>(promise: Promise<T>, ms = 2500): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Firestore operation timed out after ${ms}ms`));
    }, ms);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Tenant system definition
export interface Tenant {
  id: string; // unique lowercase ID, e.g., "promo2026"
  name: string; // display name
  passwordHash: string; // admin login password
  createdAt: string;
  licenseKey: string; // TRIAL or custom key
  expiresAt: string;
  adminEmail?: string;
  logoUrl?: string;
  logoCircularUrl?: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
  enabled: boolean;
}

export interface TelegramConfig {
  botToken: string;
  chatIdAllowed: string;
  enabled: boolean;
}

export interface TenantConfig {
  smtp: SmtpConfig;
  telegram: TelegramConfig;
  telegramLogs: { timestamp: string; message: string; success: boolean }[];
  googleDrive?: {
    accessToken?: string;
    refreshToken?: string;
    autoBackupEnabled?: boolean;
    lastAutoBackupDate?: string;
    userEmail?: string;
    updatedAt?: string;
  };
  lateFee?: { 
    feeUSD_direct: number; 
    feeUSD_bcv: number; 
    paused: boolean; 
    pausedUntil?: string;
    startDay?: number; 
    graceMonths?: number; 
    overrideMonth?: string; 
    overrideDay?: number; 
  };
}

const TENANTS_FILE = path.join(process.cwd(), 'tenants_list.json');
const TENANTS_CONFIG_FILE = path.join(process.cwd(), 'tenants_config.json');

// Helper to find a tenant by ID
async function findTenant(id: string): Promise<Tenant | null> {
  const lowercaseId = id.trim().toLowerCase();
  
  // Try Firestore first
  if (db) {
    try {
      const docSnap = await withTimeout(getDoc(doc(db, 'tenants', lowercaseId)), 15000);
      if (docSnap.exists() ) {
        return docSnap.data() as Tenant;
      }
    } catch (err) {
      console.error('Error finding tenant in Firestore:', err);
      throw new Error('Timeout consultando perfil en base de datos. Intenta nuevamente.');
    }
  }

  // Try local file fallback
  try {
    if (fs.existsSync(TENANTS_FILE)) {
      const list = JSON.parse(fs.readFileSync(TENANTS_FILE, 'utf-8'));
      return list[lowercaseId] || null;
    }
  } catch (err) {
    console.error('Error reading local tenants list:', err);
  }
  return null;
}

// Helper to save/register a tenant
async function saveTenant(tenant: Tenant): Promise<boolean> {
  const lowercaseId = tenant.id.trim().toLowerCase();
  let success = false;

  if (db) {
    try {
      await withTimeout(setDoc(doc(db, 'tenants', lowercaseId), tenant), 15000);
      success = true;
    } catch (err) {
      console.error('Error saving tenant to Firestore:', err);
    }
  }

  try {
    let list: Record<string, Tenant> = {};
    if (fs.existsSync(TENANTS_FILE)) {
      list = JSON.parse(fs.readFileSync(TENANTS_FILE, 'utf-8'));
    }
    list[lowercaseId] = tenant;
    fs.writeFileSync(TENANTS_FILE, JSON.stringify(list, null, 2), 'utf-8');
    if (!success) success = true;
  } catch (err) {
    console.error('Error writing local tenants list:', err);
  }
  return success;
}

// Helper to load config for a tenant
async function loadTenantConfig(tenantId: string): Promise<TenantConfig> {
  const defaultConf: TenantConfig = {
    smtp: {
      host: '',
      port: 587,
      secure: false,
      user: '',
      pass: '',
      fromName: 'Comité de Finanzas',
      fromEmail: '',
      enabled: false,
    },
    telegram: {
      botToken: '',
      chatIdAllowed: '',
      enabled: false,
    },
    telegramLogs: [],
    lateFee: {
      feeUSD_direct: 2,
      feeUSD_bcv: 3,
      paused: false,
      startDay: 6,
      graceMonths: 2,
    }
  };

  if (db) {
    try {
      const docSnap = await withTimeout(getDoc(doc(db, 'tenants_config', tenantId)), 15000);
      if (docSnap.exists() ) {
        return { ...defaultConf, ...docSnap.data() } as TenantConfig;
      }
    } catch (err) {
      console.error('Error loading config from Firestore:', err);
      throw new Error('Timeout consultando configuración. Intenta nuevamente.');
    }
  }

  try {
    if (fs.existsSync(TENANTS_CONFIG_FILE)) {
      const allConfigs = JSON.parse(fs.readFileSync(TENANTS_CONFIG_FILE, 'utf-8'));
      if (allConfigs[tenantId]) {
        return { ...defaultConf, ...allConfigs[tenantId] };
      }
    }
  } catch (err) {
    console.error('Error reading local tenants config file:', err);
  }

  return defaultConf;
}

// Helper to save config for a tenant
async function saveTenantConfig(tenantId: string, config: TenantConfig): Promise<boolean> {
  let success = false;
  if (db) {
    try {
      await withTimeout(setDoc(doc(db, 'tenants_config', tenantId), config), 15000);
      success = true;
    } catch (err) {
      console.error('Error saving config to Firestore:', err);
    }
  }

  try {
    let allConfigs: Record<string, TenantConfig> = {};
    if (fs.existsSync(TENANTS_CONFIG_FILE)) {
      allConfigs = JSON.parse(fs.readFileSync(TENANTS_CONFIG_FILE, 'utf-8'));
    }
    allConfigs[tenantId] = config;
    fs.writeFileSync(TENANTS_CONFIG_FILE, JSON.stringify(allConfigs, null, 2), 'utf-8');
    if (!success) success = true;
  } catch (err) {
    console.error('Error saving local tenants config file:', err);
  }
  return success;
}

// In-memory registry of active multi-tenant bot pollers
interface BotPollerState {
  tenantId: string;
  botToken: string;
  lastUpdateId: number;
  interval: NodeJS.Timeout | null;
  isPolling: boolean;
}
const activeBotPollers = new Map<string, BotPollerState>();

async function addTenantTelegramLog(tenantId: string, message: string, success: boolean) {
  const timestamp = new Date().toLocaleString('es-VE', { timeZone: 'America/Caracas' });
  const conf = await loadTenantConfig(tenantId);
  if (!conf.telegramLogs) {
    conf.telegramLogs = [];
  }
  conf.telegramLogs.unshift({ timestamp, message, success });
  if (conf.telegramLogs.length > 20) {
    conf.telegramLogs.pop();
  }
  await saveTenantConfig(tenantId, conf);
}

function getMethodLabelTelegram(method: string): string {
  switch (method) {
    case 'pago_movil': return 'Pago Móvil 📱';
    case 'transferencia_ves': return 'Transferencia Bs 🏦';
    case 'efectivo_usd': return 'Efectivo $ 💵';
    case 'binance': return 'Binance 🪙';
    case 'efectivo_ves': return 'Efectivo Bs 💵';
    case 'banesco_panama': return 'Banesco Panamá 🏦';
    default: return 'Otro Método 💳';
  }
}

async function sendTelegramMessage(chatId: number, text: string, token: string) {
  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
      }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      console.error(`Telegram sendMessage failed with status ${response.status}:`, errJson);

      // If Markdown parsing failed, retry sending as plain text to guarantee delivery!
      if (response.status === 400) {
        console.log('Retrying Telegram message as plain text...');
        // Clean markdown indicators for plain text fallback
        const plainText = text.replace(/[*_`\[\]()]/g, '');
        const retryRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: plainText,
          }),
        });
        if (!retryRes.ok) {
          console.error(`Telegram plain-text retry also failed:`, await retryRes.text().catch(() => ''));
        }
      }
    }
  } catch (err) {
    console.error('Failed to send Telegram message:', err);
  }
}

async function notifyNewPaymentsTelegram(tenantId: string, newPayments: any[], newPurchases: any[]) {
  // Disabled to avoid sending duplicate "(Web)" notifications.
  // Confirmation is sent directly by Telegram bot handlers when processing updates.
  return;
}

function distributePaymentAcrossConceptsInTelegram(params: {
  memberId: string;
  selectedConcepts: string[];
  amountOriginal: number;
  currency: 'USD' | 'VES';
  method: string;
  bcvRate: number;
  months: any[];
  quotas: any[];
  existingPayments?: any[];
}) {
  const {
    memberId,
    selectedConcepts,
    amountOriginal,
    currency,
    method,
    bcvRate,
    months,
    quotas,
    existingPayments = [],
  } = params;

  if (!selectedConcepts || selectedConcepts.length === 0 || amountOriginal <= 0) {
    return [];
  }

  const isDirectUsd = currency === 'USD' || ['efectivo_usd', 'banesco_panama', 'binance'].includes(method);
  
  // Total original currency pool to distribute (either USD or VES)
  let remainingPoolOriginal = amountOriginal;
  const count = selectedConcepts.length;
  const results: any[] = [];

  for (let i = 0; i < count; i++) {
    if (remainingPoolOriginal <= 0) break;

    const key = selectedConcepts[i];
    const [type, id] = key.split(':');
    const tType = type as 'month' | 'quota' | 'late_fee';

    let targetLabel = id;
    let requiredFee_direct = 12;
    let requiredFee_bcv = 16;

    if (tType === 'month') {
      const m = months.find((m) => m.id === id);
      targetLabel = m ? `${m.name} ${m.year}` : id;
      if (m) {
        requiredFee_direct = m.feeUSD_direct || m.feeUSD || 12;
        requiredFee_bcv = m.feeUSD_bcv || m.feeUSD || 16;
      }
    } else if (tType === 'late_fee') {
      targetLabel = 'Multas por Atraso';
      requiredFee_direct = 0;
      requiredFee_bcv = 0;
    } else {
      const q = quotas.find((q) => q.id === id);
      targetLabel = q ? q.title : id;
      if (q) {
        requiredFee_direct = q.feeUSD_direct || q.feeUSD || 0;
        requiredFee_bcv = q.feeUSD_bcv || q.feeUSD_direct || 0;
      }
    }

    // Check how much member ALREADY paid for this target in direct USD equivalent
    const currentPayments = existingPayments.filter(
      (p) => p.memberId === memberId && p.targetType === tType && p.targetId === id
    );
    const alreadyPaidUSD_direct = currentPayments.reduce((s, p) => s + p.amountUSD, 0);
    const neededUSD_direct = Math.max(0, requiredFee_direct - alreadyPaidUSD_direct);

    // If it's fully paid already (or late_fee), just target what's required (for display or overpayment)
    const targetUSD_direct = neededUSD_direct > 0 ? neededUSD_direct : requiredFee_direct;
    
    // Determine how much is required in the ORIGINAL currency (USD or VES)
    let targetOriginalNeeded = 0;
    if (isDirectUsd) {
      targetOriginalNeeded = targetUSD_direct;
    } else {
      // Rule of 3 for VES payments: (direct_usd_needed * fee_bcv / fee_direct) * bcvRate
      // Or simply: portion of fee_bcv needed * bcvRate
      const proportion = requiredFee_direct > 0 ? (targetUSD_direct / requiredFee_direct) : 1;
      targetOriginalNeeded = proportion * requiredFee_bcv * bcvRate;
    }

    // Allocate from pool
    let allocOriginal = 0;

    if (i === count - 1) {
      // Last item gets all the remaining pool
      allocOriginal = remainingPoolOriginal;
      
      // Apply tolerance logic for single or last item
      if (targetOriginalNeeded > 0) {
        const toleranceOriginal = isDirectUsd ? 0.80 : (0.80 * bcvRate);
        if (allocOriginal >= targetOriginalNeeded - toleranceOriginal && allocOriginal < targetOriginalNeeded) {
          allocOriginal = targetOriginalNeeded; 
        }
      }
    } else {
      // Waterfall allocation up to what's needed
      allocOriginal = Math.min(remainingPoolOriginal, targetOriginalNeeded);
      
      // Apply tolerance logic for intermediate items
      if (targetOriginalNeeded > 0) {
        const toleranceOriginal = isDirectUsd ? 0.80 : (0.80 * bcvRate);
        if (remainingPoolOriginal >= targetOriginalNeeded - toleranceOriginal && remainingPoolOriginal < targetOriginalNeeded) {
          allocOriginal = targetOriginalNeeded; 
        }
      }
      
      remainingPoolOriginal = Math.max(0, remainingPoolOriginal - allocOriginal);
    }

    // Convert allocated original currency back to direct USD equivalent
    let allocDirectUSD = 0;
    if (isDirectUsd) {
      allocDirectUSD = allocOriginal;
    } else {
      // allocOriginal is in VES. Convert to direct USD using rule of 3:
      if (requiredFee_bcv > 0 && bcvRate > 0) {
        allocDirectUSD = (allocOriginal / bcvRate) * (requiredFee_direct / requiredFee_bcv);
      } else {
        allocDirectUSD = (allocOriginal / bcvRate);
      }
    }

    results.push({
      targetType: tType,
      targetId: id,
      targetLabel,
      amountOriginal: Math.round(allocOriginal * 100) / 100,
      amountUSD: Math.round(allocDirectUSD * 100) / 100,
    });
  }

  return results;
}

async function handleTenantTelegramUpdate(tenantId: string, update: any, token: string, chatIdAllowed: string) {
  const message = update.message || update.edited_message;
  if (!message || !message.text) return;

  const chatId = message.chat.id;
  const rawText = message.text;

  // Handle bot commands (/start, /help, /id) FIRST regardless of chat restrictions
  if (rawText.startsWith('/')) {
    const cmd = rawText.split(' ')[0].toLowerCase();
    if (cmd === '/start' || cmd === '/help' || cmd === '/id' || cmd === '/chatid') {
      const reply = `👋 *Bot de Control de Pagos*\n\n` +
        `🆔 *ID de este chat/grupo:* \`${chatId}\`\n\n` +
        `💡 *Instrucciones de Configuración:*\n` +
        `1. Copia el número \`${chatId}\` (incluyendo el signo menos - si lo tiene).\n` +
        `2. En la web ve a *Configuración > Bot de Telegram*.\n` +
        `3. Pégalo en el campo *"ID de Chat/Grupo Permitido"*. Si dejas el campo vacío, el bot responderá a cualquier chat.\n\n` +
        ` Reenvíame reportes de pago de WhatsApp para procesarlos con IA.`;
      await sendTelegramMessage(chatId, reply, token);
      return;
    }
  }

  // Optional filter of allowed chat ids
  if (chatIdAllowed && chatIdAllowed.trim()) {
    const allowed = chatIdAllowed.split(',').map(s => s.trim());
    if (!allowed.includes(chatId.toString())) {
      console.log(`[Tenant: ${tenantId}] Telegram message from unauthorized chat: ${chatId}`);
      addTenantTelegramLog(tenantId, `Mensaje ignorado del chat ${chatId} (Permitidos: ${chatIdAllowed})`, false);
      const accessNotice = `⚠️ *Acceso Restringido*\n\nEste chat (ID: \`${chatId}\`) no está autorizado. Para permitir que el bot procese pagos desde aquí, agrega el ID \`${chatId}\` en la web (*Configuración > Bot de Telegram*).`;
      await sendTelegramMessage(chatId, accessNotice, token);
      return;
    }
  }

  try {
    const data = await loadServerData(tenantId);
    const members = data.members || [];
    const months = data.months || [];
    const quotas = data.quotas || [];
    const payments = data.payments || [];
    const currentBcvRate = await getOrFetchCurrentBcvRate();

    let parsedItems: any[] = [];
    let usedAi = false;

    if (process.env.GEMINI_API_KEY) {
      try {
        usedAi = true;
        const membersListStr = JSON.stringify(members);
        const monthsStr = JSON.stringify(months);
        const quotasStr = JSON.stringify(quotas);

        const prompt = `
Eres un asistente contable especializado para comités de finanzas de graduación en Venezuela.
Tu tarea es analizar los mensajes de texto de WhatsApp de reportes de pago y extraer de manera estructurada CADA UNO de los pagos reportados o transacciones de cambio de divisas.

INFORMACIÓN DE CONTEXTO:
1. Lista de integrantes registrados en la base de datos:
${membersListStr}

2. Meses disponibles y sus cuotas:
${monthsStr}

3. Cuotas especiales vigentes:
${quotasStr}

4. Tasa BCV oficial de hoy: ${currentBcvRate} Bs/$

REGLAS CRÍTICAS DE EXTRACCIÓN Y RECONOCIMIENTO:

1. COINCIDENCIA DE INTEGRANTES Y NOMBRES PROPIOS:
- Analiza minuciosamente el cuerpo del mensaje para identificar al alumno/integrante.
- REGLA DE ORO DE NOMBRES CON TILDES Y APODOS (ESTRICTO): Ignora tildes y acentos. 'Vanessa Marín' o 'Vanessa Marin' debe coincidir exactamente con 'MARÍN, VANESSA' (matchedMemberName: 'MARÍN, VANESSA').
- REGLA DE ORO DE NOMBRES VS MESES (ESTRICTO): El término 'Junior' (ej: 'Junior Sigurani', 'Junior Acosta', 'Junior S.') es el NOMBRE O APELLIDO de un integrante registrado de la lista, NUNCA debe ser interpretado ni confundido con el mes de 'Junio'. Si el texto dice 'Junior Sigurani', la persona es 'Junior Sigurani' (matchedMemberName: 'Junior Sigurani').
- Compara los nombres, apellidos y cédula con la lista de integrantes registrados. Haz coincidir a integrantes aunque usen un solo apellido o nombre parcial (ej: "samuel acosta" para "ACOSTA LA ROSA, SAMUEL DAVID", o "Paola Vellorín" para "VELLORIN DE CONNO PAOLA MARÍA JOSÉ").

2. MONEDA, FORMATOS DE NÚMEROS Y MÉTODOS DE PAGO:
- RECONOCIMIENTO DE SEPARADORES DE MILES Y DECIMALES EN BS (ALTAMENTE CRÍTICO): En Venezuela los montos en bolívares suelen escribirse con punto '.' como separador de miles y coma ',' como separador de decimales (ej: '12.229,44' o '12.229,44 bs' o '12.229,44 bs (16$ bcv)'). Debes interpretar '12.229,44' como doce mil doscientos veintinueve bolívares con 44 céntimos y devolver en amountOriginal el float exacto 12229.44. La anotación entre paréntesis como '(16$ bcv)' indica el equivalente informativo en dólares a tasa BCV y NO altera que el pago fue en bolívares (amountOriginal: 12229.44, currency: 'VES'). NUNCA interpretes '12.229' como 12.229 ni 12.23 dólares o doce bolívares.
- PAGOS EN DÓLARES / BINANCE / USDT Y REFERENCIAS (ESTRICTO): Si el mensaje indica '12 usdt', '12 usdt', '12$' o '12 usdt / Binance', la moneda del pago es DÓLARES (currency: 'USD', method: 'binance') y el monto original es 12 USD (amountOriginal: 12). Si en ese mismo mensaje aparece un número aislado de 4 o más dígitos (ej: '9280', '1074', '3049', '849201'), ese número representa la REFERENCIA BANCARIA O COMPROBANTE DE BINANCE (reference: '9280'), ¡NUNCA es un monto de $9280 dólares ni $9280 bolívares! Los pagos de cuotas de alumnos en dólares nunca exceden $500.
- Pagos reportados por métodos como Binance ("binance"), Efectivo en Dólares ("efectivo_usd"), o Banesco Panamá ("banesco_panama") SIEMPRE deben registrarse en DÓLARES (currency: "USD") directos, sin realizar conversiones ni divisiones con la tasa BCV. El monto original (amountOriginal) representará exactamente el valor en dólares (ej: si se reportan 12 usdt por Binance, amountOriginal es 12 y currency es "USD").
- Si el mensaje reporta un monto en bolívares (VES), regístralo como tal con método "pago_movil" o "transferencia_ves".

3. NÚMERO DE REFERENCIA:
- Busca números de 4 a 10 dígitos asociados a "Ref.", "Ref", "Nro", "#" o números aislados de comprobante (ej: "#1504" o "1504" o "9280" en un pago USDT es la referencia).

4. COMPRA DE DÓLARES (CAMBIO DE DIVISAS DE LA PROMOCIÓN):
- Si el texto describe que el comité compró, adquirió o cambió bolívares por dólares (ej: "Compra de 100$", "Compra de $100", "Se compraron 100$", "Comprados $100 a tasa 880", "Se cambiaron 44000 bs por $50", "comprados 100$"), se trata de una COMPRA DE DÓLARES. Configure isDollarPurchase: true.

5. UN SOLO PAGO CON MÚLTIPLES CONCEPTOS:
- NUNCA dividas un único mensaje de WhatsApp que reporte una única transferencia/pago en múltiples objetos JSON. Devuelve EXACTAMENTE UN OBJETO en la lista JSON.

6. METADATOS Y FECHAS DE WHATSAPP:
- Si el mensaje incluye metadatos de WhatsApp (ej: "[5/8/2026, 17:28] Pedro Acosta: ..."), extrae la fecha (5/8/2026 -> paymentDate: "2026-08-05") e IGNORE el nombre del remitente del encabezado para la coincidencia del alumno que pagó.

7. RECONOCIMIENTO DE EGRESOS / GASTOS DE LA PROMOCIÓN:
- Si el texto describe el pago de una multa o atraso (ej: "multa", "atraso", "penalidad", "pago de multa mes de junio"), asócialo al targetType "late_fee", targetId "YYYY-MM" del mes al que pertenece la multa.
- Si el pago incluye múltiples conceptos (Ej: "Multa de Mayo 3$ + Mensualidad Mayo 14$"), utiliza \`selectedConcepts\` (ej: ["late_fee:2026-05", "month:2026-05"]) Y ADEMÁS llena \`conceptAllocationsUSD\` especificando los dólares asignados a cada uno.
- Si el texto describe un egreso, gasto o salida de dinero realizada por el comité/promoción (ej: "Gasto: 50$ en impresiones", "Egreso 1500 bs pago de transporte ref 4892", "Se pagaron 20$ a fotógrafo", "Gastados 4500 bs en decoración", "Pago de servicio de sonido $100", "Gasto de $30 en bebidas"), establece isExpense: true.
- Asigna expenseCategory ("Logística", "Eventos", "Administrativo", "Protocolo", "Imprevistos") y expenseDescription con el concepto detallado del gasto.

MENSAJES DE WHATSAPP A ANALIZAR:
"""
${rawText}
"""

Devuelve una lista JSON con cada pago, cambio de divisa o egreso detectado.
`;

        const geminiRes = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              description: 'Lista de pagos extraídos del mensaje',
              items: {
                type: Type.OBJECT,
                properties: {
                  matchedMemberId: { type: Type.STRING },
                  matchedMemberName: { type: Type.STRING },
                  matchConfidence: { type: Type.NUMBER },
                  paymentDate: { type: Type.STRING },
                  method: { type: Type.STRING },
                  amountOriginal: { type: Type.NUMBER },
                  currency: { type: Type.STRING },
                  bcvRate: { type: Type.NUMBER },
                  reference: { type: Type.STRING },
                  targetType: { type: Type.STRING },
                  targetId: { type: Type.STRING },
                  targetLabel: { type: Type.STRING },
                  selectedConcepts: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  conceptAllocationsUSD: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        conceptKey: { type: Type.STRING },
                        amountUSD: { type: Type.NUMBER }
                      }
                    }
                  },
                  notes: { type: Type.STRING },
                  rawTextExcerpt: { type: Type.STRING },
                  isDollarPurchase: { type: Type.BOOLEAN },
                  usdAmount: { type: Type.NUMBER },
                  isExpense: { type: Type.BOOLEAN },
                  expenseCategory: { type: Type.STRING },
                  expenseDescription: { type: Type.STRING },
                },
                required: ['paymentDate', 'method', 'amountOriginal', 'currency', 'reference', 'targetType'],
              },
            },
          },
        });
        const text = geminiRes.text?.trim() || '[]';
        parsedItems = JSON.parse(text);
      } catch (geminiErr: any) {
        console.warn(`[Tenant: ${tenantId}] Gemini parser failed in Telegram, using fallback:`, geminiErr);
        parsedItems = fallbackParseWhatsApp(rawText, members, currentBcvRate, months, quotas);
        usedAi = false;
      }
    } else {
      parsedItems = fallbackParseWhatsApp(rawText, members, currentBcvRate, months, quotas);
    }

    if (!parsedItems || parsedItems.length === 0) {
      await sendTelegramMessage(chatId, '❌ No se pudo detectar ningún abono, pago o cambio en este mensaje.', token);
      addTenantTelegramLog(tenantId, `Mensaje no parseado: "${rawText.slice(0, 50)}..."`, false);
      return;
    }

    const replyParts: string[] = [];
    const addedPayments: string[] = [];
    const addedPurchases: string[] = [];
    const addedExpenses: string[] = [];

    for (const item of parsedItems) {
      // Determine historical BCV rate for the payment date if date is not today
      let itemBcvRate = currentBcvRate;
      if (item.paymentDate && /^\d{4}-\d{2}-\d{2}$/.test(item.paymentDate)) {
        const today = getCaracasDateString();
        if (item.paymentDate !== today) {
          const histRate = await getBcvRateForDate(item.paymentDate);
          if (histRate) {
            itemBcvRate = histRate;
          }
        }
      }
      item.bcvRate = item.bcvRate || itemBcvRate;

      // Check if item is an Egreso / Gasto
      const isExpense =
        item.isExpense === true ||
        !!item.expenseDescription ||
        /\b(gasto|egreso|gastos|egresos|se gast[oó]|se gastaron|compras de insumos|pago a fot[oó]grafo|pago de servicio|pago impresiones)\b/i.test(`${item.notes || ''} ${item.rawTextExcerpt || ''} ${rawText}`);

      if (isExpense && !item.isDollarPurchase && item.matchedMemberName !== 'Fondo de Promoción') {
        const expenseId = `exp-tg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const category = item.expenseCategory || 'Imprevistos';
        const description = item.expenseDescription || item.notes || item.rawTextExcerpt || 'Gasto registrado vía Telegram';
        const amount = item.amountOriginal || 0;
        const currency = item.currency === 'VES' ? 'VES' : 'USD';
        const ref = item.reference || 'S/R';
        const date = item.paymentDate || getCaracasDateString();

        const newExpense = {
          id: expenseId,
          date,
          category,
          description,
          amount,
          currency,
          reference: ref,
          notes: item.notes || 'Registrado automáticamente vía Bot de Telegram'
        };

        if (!data.expenses) {
          data.expenses = [];
        }
        data.expenses.unshift(newExpense);
        addedExpenses.push(`${description} (${amount} ${currency})`);

        replyParts.push(
          `📉 *¡Egreso / Gasto Registrado Exitosamente!*\n` +
          `• *Concepto:* ${description}\n` +
          `• *Categoría:* ${category}\n` +
          `• *Monto:* ${amount} ${currency === 'VES' ? 'Bs' : '$'}\n` +
          `• *Referencia:* \`${ref}\`\n` +
          `• *Fecha:* ${date}`
        );
        continue;
      }

      const isDollarPurchase =
        item.isDollarPurchase === true ||
        item.targetLabel === 'Compra de Dólares' ||
        item.matchedMemberName === 'Fondo de Promoción' ||
        (item.usdAmount > 0 && !item.matchedMemberId && /\b(compra|comprados|compraron|adquisicion|cambio)\b/i.test(`${item.notes || ''} ${item.rawTextExcerpt || ''} ${rawText}`));

      if (isDollarPurchase) {
        const purchaseId = `dp-tg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const realRate = item.bcvRate || (item.usdAmount ? item.amountOriginal / item.usdAmount : currentBcvRate);
        const newPurchase = {
          id: purchaseId,
          date: item.paymentDate || getCaracasDateString(),
          bsAmount: item.amountOriginal,
          usdAmount: item.usdAmount || 0,
          rate: Math.round(realRate * 100) / 100,
          notes: item.notes || `Compra de $${item.usdAmount} USD`
        };
        if (!data.dollarPurchases) {
          data.dollarPurchases = [];
        }
        data.dollarPurchases.push(newPurchase);
        addedPurchases.push(`Compra $${item.usdAmount}`);

        replyParts.push(
          `💵 *¡Compra de Dólares (Cambio de Divisas) Registrada!*\n` +
          `• *Bolívares Invertidos:* ${item.amountOriginal} Bs\n` +
          `• *Dólares Adquiridos:* $${item.usdAmount} USD\n` +
          `• *Tasa de Cambio:* ${newPurchase.rate.toFixed(2)} Bs/$\n` +
          `• *Referencia:* \`${item.reference || 'S/R'}\`\n` +
          `• *Fecha:* ${newPurchase.date}\n` +
          `• *Nota:* ${newPurchase.notes}`
        );
        continue;
      }

      const matchedMem = members.find((m: any) => m.id === item.matchedMemberId);
      if (!matchedMem) {
        replyParts.push(`⚠️ No se pudo identificar al integrante para el pago de *${item.amountOriginal} ${item.currency === 'VES' ? 'Bs' : '$'}* (ref: \`${item.reference}\`). Por favor regístralo manualmente en la web.`);
        addTenantTelegramLog(tenantId, `Pago de ${item.amountOriginal} ${item.currency} (ref: ${item.reference}) sin integrante identificado`, false);
        continue;
      }

      const paymentId = `p-tg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const concepts = item.selectedConcepts && item.selectedConcepts.length > 0
        ? item.selectedConcepts
        : [`${item.targetType}:${item.targetId}`];

      const distribution = distributePaymentAcrossConceptsInTelegram({
        memberId: item.matchedMemberId,
        selectedConcepts: concepts,
        amountOriginal: item.amountOriginal,
        currency: item.currency,
        method: item.method,
        bcvRate: item.bcvRate,
        months,
        quotas,
        existingPayments: payments,
      });

      const calculatedUSD = distribution.reduce((sum: number, d: any) => sum + d.amountUSD, 0);

      const labelList = distribution.map((d: any) => d.targetLabel).join(', ');
      const first = distribution[0] || {
        targetType: 'month',
        targetId: '',
        targetLabel: 'Saldo Inicial',
      };

      const count = distribution.length;
      const targetType = first.targetType || 'month';
      const targetId = first.targetId || '';
      const targetLabel = count > 1 ? `Multi-concepto (${count}): ${labelList}` : (first.targetLabel || item.targetLabel || 'Mensualidad');

      const newPayment = {
        id: paymentId,
        dateEntered: getCaracasDateString(),
        memberId: item.matchedMemberId,
        memberName: `${matchedMem.lastName}, ${matchedMem.firstName}`,
        method: item.method,
        paymentDate: item.paymentDate || getCaracasDateString(),
        amountOriginal: item.amountOriginal,
        currency: item.currency,
        bcvRate: item.bcvRate,
        amountUSD: calculatedUSD,
        reference: item.reference || 'S/R',
        targetType,
        targetId,
        targetLabel,
        notes: item.notes || (count > 1 ? `Pago con ${count} conceptos: ${labelList}` : 'Registrado automáticamente vía Bot de Telegram'),
        breakdown: distribution,
      };

      payments.push(newPayment);
      addedPayments.push(`${matchedMem.lastName} (${item.amountOriginal} ${item.currency})`);

      const methodLabel = getMethodLabelTelegram(item.method);
      replyParts.push(
        `✅ *¡Pago registrado exitosamente!*\n` +
        `• *Integrante:* ${matchedMem.lastName}, ${matchedMem.firstName}\n` +
        `• *Monto:* ${item.amountOriginal} ${item.currency === 'VES' ? 'Bs' : '$'}\n` +
        `• *Método:* ${methodLabel}\n` +
        `• *Referencia:* \`${item.reference}\`\n` +
        `• *Concepto(s):* ${distribution.map((d: any) => d.targetLabel).join(', ')}\n` +
        `• *Fecha de Pago:* ${item.paymentDate}`
      );
    }

    if (addedPayments.length > 0 || addedPurchases.length > 0 || addedExpenses.length > 0) {
      await saveServerData(tenantId, {
        ...data,
        payments,
        dollarPurchases: data.dollarPurchases || [],
        expenses: data.expenses || []
      });
      const logsText = [];
      if (addedPayments.length > 0) logsText.push(`Pagos: ${addedPayments.join(', ')}`);
      if (addedPurchases.length > 0) logsText.push(`Compras: ${addedPurchases.join(', ')}`);
      if (addedExpenses.length > 0) logsText.push(`Egresos: ${addedExpenses.join(', ')}`);
      addTenantTelegramLog(tenantId, `${logsText.join(' | ')} (${usedAi ? 'IA Gemini' : 'Local Fallback'})`, true);
    }

    const finalReply = replyParts.join('\n\n');
    await sendTelegramMessage(chatId, finalReply, token);

  } catch (err: any) {
    console.error(`[Tenant: ${tenantId}] Error in handleTenantTelegramUpdate:`, err);
    await sendTelegramMessage(chatId, `❌ Error al procesar el mensaje: ${err.message}`, token);
    addTenantTelegramLog(tenantId, `Error: ${err.message}`, false);
  }
}

function startTenantTelegramBot(tenantId: string, botToken: string, chatIdAllowed: string) {
  stopTenantTelegramBot(tenantId);

  if (!botToken || !botToken.trim()) return;

  const state: BotPollerState = {
    tenantId,
    botToken: botToken.trim(),
    lastUpdateId: 0,
    isPolling: false,
    interval: null,
  };

  // Attempt deleteWebhook on start to clear out any 409 conflict
  fetch(`https://api.telegram.org/bot${state.botToken}/deleteWebhook?drop_pending_updates=true`)
    .then(r => r.json())
    .then(data => console.log(`[Bot Tenant: ${tenantId}] Telegram deleteWebhook on startup:`, data))
    .catch((err) => console.warn(`[Bot Tenant: ${tenantId}] Could not delete Telegram webhook on startup:`, err.message || err));

  state.interval = setInterval(async () => {
    if (state.isPolling) return;
    state.isPolling = true;

    try {
      const url = `https://api.telegram.org/bot${state.botToken}/getUpdates?offset=${state.lastUpdateId + 1}&timeout=5`;
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 409) {
          console.log(`[Bot Tenant: ${tenantId}] Telegram conflict (409) detected. Auto-deleting webhook...`);
          await fetch(`https://api.telegram.org/bot${state.botToken}/deleteWebhook?drop_pending_updates=true`).catch(() => {});
        }
        throw new Error(`Telegram API returned status ${res.status}`);
      }

      const data = await res.json();
      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          state.lastUpdateId = Math.max(state.lastUpdateId, update.update_id);
          await handleTenantTelegramUpdate(tenantId, update, state.botToken, chatIdAllowed);
        }
      }
    } catch (err: any) {
      console.error(`[Bot Tenant: ${tenantId}] Error polling Telegram updates:`, err.message || err);
    } finally {
      state.isPolling = false;
    }
  }, 4000); // Poll every 4 seconds

  activeBotPollers.set(tenantId, state);
  console.log(`[Bot Tenant: ${tenantId}] Telegram Bot polling started successfully.`);
}

function stopTenantTelegramBot(tenantId: string) {
  const existing = activeBotPollers.get(tenantId);
  if (existing) {
    if (existing.interval) {
      clearInterval(existing.interval);
    }
    activeBotPollers.delete(tenantId);
    console.log(`[Bot Tenant: ${tenantId}] Telegram Bot polling stopped.`);
  }
}

// Initialize Gemini Client server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Firestore and local storage combined integration per tenant
async function loadServerData(tenantId: string): Promise<any> {
  const defaultData = {
    members: [],
    months: [],
    quotas: [],
    payments: [],
    dollarPurchases: [],
    expenses: [],
    expenseCategories: ['Logística', 'Eventos', 'Administrativo', 'Protocolo', 'Imprevistos'],
    expenseConfig: { enabled: false }
  };

  if (!tenantId) return defaultData;

  const cleanTenantId = tenantId.trim().toLowerCase();

  // 1. Read Firestore if present
  let firestoreData: any = null;
  if (db) {
    try {
      const result: any = {};
      const docs = ['members', 'months', 'quotas', 'payments', 'dollarPurchases', 'expenses', 'expenseCategories', 'expenseConfig'];
      let hasAnyFirestoreData = false;

      const docSnaps = await withTimeout(
        Promise.all(docs.map((docName) => getDoc(doc(db, 'tenants_data', cleanTenantId, 'data', docName)))),
        25000
      );

      docSnaps.forEach((docSnap, index) => {
        const docName = docs[index];
        if (docSnap.exists()) {
          const docData = docSnap.data();
          if (docName === 'expenseConfig') {
            result[docName] = { enabled: !!docData?.enabled };
          } else {
            result[docName] = docData?.items || [];
          }
          hasAnyFirestoreData = true;
        } else {
          if (docName === 'expenseConfig') result[docName] = { enabled: false };
          else if (docName === 'expenseCategories') result[docName] = ['Logística', 'Eventos', 'Administrativo', 'Protocolo', 'Imprevistos'];
          else result[docName] = [];
        }
      });

      if (hasAnyFirestoreData) {
        firestoreData = result;
      }
    } catch (err) {
      console.error(`Error fetching tenant ${cleanTenantId} from Firestore:`, err);
      throw new Error('No se pudo conectar a la base de datos Firestore (Posible timeout por inicio en frío). Por favor reintente o recargue la página. ' + (err.message || ''));
    }
  }

  // 2. Read local JSON file if present (as a fallback)
  let localData: any = null;
  const tenantFile = path.join(process.cwd(), `server_data_${cleanTenantId}.json`);
  const backupFile = path.join(process.cwd(), `server_data_${cleanTenantId}_backup.json`);
  const legacyFile = (cleanTenantId === 'original' || cleanTenantId === 'default') ? path.join(process.cwd(), 'server_data.json') : null;

  try {
    if (fs.existsSync(tenantFile)) {
      const content = fs.readFileSync(tenantFile, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object') {
        localData = parsed;
      }
    }
    
    // Fallback to backup file if main file missing or empty
    if ((!localData || !Array.isArray(localData.members) || localData.members.length === 0) && fs.existsSync(backupFile)) {
      const backupContent = fs.readFileSync(backupFile, 'utf-8');
      const parsedBackup = JSON.parse(backupContent);
      if (parsedBackup && Array.isArray(parsedBackup.members) && parsedBackup.members.length > 0) {
        localData = parsedBackup;
        console.log(`[Persistence] Restored tenant ${cleanTenantId} data from backup file.`);
      }
    }

    // Fallback to legacy server_data.json if original/default
    if ((!localData || !Array.isArray(localData.members) || localData.members.length === 0) && legacyFile && fs.existsSync(legacyFile)) {
      const legacyContent = fs.readFileSync(legacyFile, 'utf-8');
      const parsedLegacy = JSON.parse(legacyContent);
      if (parsedLegacy && typeof parsedLegacy === 'object') {
        localData = parsedLegacy;
      }
    }
  } catch (err) {
    console.error(`Error reading local tenant file for ${cleanTenantId}:`, err);
  }

  // CORE PERSISTENCE DECISION ENGINE:
  // In an ephemeral cloud container (like Cloud Run), the local filesystem is wiped on restarts.
  // We MUST prioritize Firestore as the durable master database.
  // We only fallback to local files if Firestore is not configured/failed, OR if Firestore is empty but the local files have actual members.
  const hasFirestoreMembers = firestoreData && Array.isArray(firestoreData.members) && firestoreData.members.length > 0;
  const hasLocalMembers = localData && Array.isArray(localData.members) && localData.members.length > 0;

  if (hasFirestoreMembers) {
    return firestoreData;
  }

  if (hasLocalMembers) {
    if (db) {
      console.log(`[Persistence] Syncing local non-empty fallback data for ${cleanTenantId} to Firestore...`);
      saveServerData(cleanTenantId, localData).catch(err => {
        console.error(`[Persistence] Failed to sync local data to Firestore:`, err);
      });
    }
    return localData;
  }

  if (firestoreData) {
    return firestoreData;
  }

  if (localData) {
    return localData;
  }

  return defaultData;
}

async function saveServerData(tenantId: string, newData: any): Promise<boolean> {
  let success = false;
  if (!tenantId) return false;
  const cleanTenantId = tenantId.trim().toLowerCase();

  // Safety check: load local current state to avoid overwriting members with an empty array by accident
  const tenantFile = path.join(process.cwd(), `server_data_${cleanTenantId}.json`);
  const backupFile = path.join(process.cwd(), `server_data_${cleanTenantId}_backup.json`);
  let localData: any = {};
  try {
    if (fs.existsSync(tenantFile)) {
      localData = JSON.parse(fs.readFileSync(tenantFile, 'utf-8'));
    }
  } catch(e) {}

  let membersToSave = Array.isArray(newData.members) ? newData.members : [];

  if (membersToSave.length === 0 && localData.members && localData.members.length > 0 && !newData.allowEmptyMembers) {
    console.warn(`[Persistence Warning] Retaining existing ${localData.members.length} members for ${cleanTenantId} because payload had 0 members.`);
    membersToSave = localData.members;
  }

  const finalData = {
    members: membersToSave,
    months: Array.isArray(newData.months) && newData.months.length > 0 ? newData.months : (localData.months || []),
    quotas: Array.isArray(newData.quotas) ? newData.quotas : (localData.quotas || []),
    payments: Array.isArray(newData.payments) ? newData.payments : (localData.payments || []),
    dollarPurchases: Array.isArray(newData.dollarPurchases) ? newData.dollarPurchases : (localData.dollarPurchases || []),
    expenses: Array.isArray(newData.expenses) ? newData.expenses : (localData.expenses || []),
    expenseCategories: Array.isArray(newData.expenseCategories) && newData.expenseCategories.length > 0 ? newData.expenseCategories : ['Logística', 'Eventos', 'Administrativo', 'Protocolo', 'Imprevistos'],
    expenseConfig: newData.expenseConfig && typeof newData.expenseConfig === 'object' ? newData.expenseConfig : { enabled: false }
  };

  // Save to local file synchronously
  try {
    if (fs.existsSync(tenantFile)) {
      const existingStr = fs.readFileSync(tenantFile, 'utf-8');
      if (existingStr.length > 20) {
        fs.writeFileSync(backupFile, existingStr, 'utf-8');
      }
    }
    fs.writeFileSync(tenantFile, JSON.stringify(finalData, null, 2), 'utf-8');
    if (cleanTenantId === 'original' || cleanTenantId === 'default') {
      const legacyFile = path.join(process.cwd(), 'server_data.json');
      fs.writeFileSync(legacyFile, JSON.stringify(finalData, null, 2), 'utf-8');
    }
    success = true;
  } catch (err) {
    console.error(`Error writing local tenant file for ${cleanTenantId}:`, err);
  }

  // Save to Firestore asynchronously so we don't block the HTTP response
  if (db) {
    const writes = Object.entries(finalData).map(([key, value]) => {
      if (key === 'expenseConfig') {
        return setDoc(doc(db, 'tenants_data', cleanTenantId, 'data', key), value);
      } else {
        return setDoc(doc(db, 'tenants_data', cleanTenantId, 'data', key), { items: value });
      }
    });
    // Fire and forget
    Promise.all(writes).then(() => {
      console.log(`Successfully saved database state for tenant ${cleanTenantId} to Firestore in background.`);
    }).catch(err => {
      console.error(`Error saving tenant ${cleanTenantId} to Firestore in background:`, err);
    });
  }

  return success;
}

interface ActiveSession {
  sessionId: string;
  tenantId: string;
  tenantName: string;
  userAgent: string;
  ip: string;
  loggedInAt: string;
  lastActiveAt: string;
}

let activeSessions: ActiveSession[] = [];
const revokedSessionIds = new Set<string>();

// Middleware for validating tenant requests
async function tenantAuthMiddleware(req: any, res: any, next: any) {
  const tenantId = req.headers['x-tenant-id'];
  const tenantAuth = req.headers['x-tenant-auth'];
  const sessionId = req.headers['x-session-id'];

  if (!tenantId || !tenantAuth) {
    return res.status(401).json({ error: 'Falta ID de promoción o contraseña de acceso (x-tenant-id / x-tenant-auth)' });
  }

  // Session revocation check
  if (sessionId && revokedSessionIds.has(sessionId.toString())) {
    return res.status(401).json({ error: 'Su sesión ha sido cerrada por el administrador general.', sessionRevoked: true });
  }

  const tenant = await findTenant(tenantId.toString());
  if (!tenant) {
    return res.status(401).json({ error: 'La promoción especificada no existe.' });
  }

  if (tenant.passwordHash !== tenantAuth.toString()) {
    return res.status(401).json({ error: 'Contraseña de acceso incorrecta para esta promoción.' });
  }

  const expires = new Date(tenant.expiresAt);
  if (Date.now() > expires.getTime()) {
    return res.status(402).json({ error: 'La suscripción o período de prueba de esta promoción ha expirado. Por favor, renueva la licencia.' });
  }

  // Track / update active session in memory
  if (sessionId) {
    let sess = activeSessions.find(s => s.sessionId === sessionId.toString());
    const ip = (req.headers['x-forwarded-for'] || req.ip || '127.0.0.1').toString().split(',')[0].trim();
    if (!sess) {
      sess = {
        sessionId: sessionId.toString(),
        tenantId: tenant.id,
        tenantName: tenant.name,
        userAgent: req.headers['user-agent'] || 'Desconocido',
        ip,
        loggedInAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString()
      };
      activeSessions.push(sess);
    } else {
      sess.lastActiveAt = new Date().toISOString();
      sess.ip = ip;
      sess.tenantName = tenant.name;
    }
  }

  req.tenant = tenant;
  req.tenantId = tenant.id;
  next();
}

// POST /api/tenant/register - Create a new workspace for a promotion
app.post('/api/tenant/register', async (req, res) => {
  try {
    const { tenantId, tenantName, name, tenantPassword, password, licenseKey } = req.body;
    
    const finalId = tenantId;
    const finalName = tenantName || name;
    const finalPassword = tenantPassword || password;

    if (!finalId || !finalName || !finalPassword) {
      return res.status(400).json({ error: 'Por favor completa todos los campos de registro.' });
    }

    const cleanId = finalId.trim().toLowerCase();
    if (!/^[a-z0-9-]+$/.test(cleanId)) {
      return res.status(400).json({ error: 'El ID de promoción sólo debe contener letras minúsculas, números y guiones.' });
    }

    const existing = await findTenant(cleanId);
    if (existing) {
      return res.status(400).json({ error: 'Este ID de promoción ya está registrado. Elige otro ID único.' });
    }

    const newTenant: Tenant = {
      id: cleanId,
      name: finalName.trim(),
      passwordHash: finalPassword, // using simple plain text/hash check matching frontend's simplicity requirement
      createdAt: new Date().toISOString(),
      licenseKey: licenseKey ? licenseKey.trim() : 'TRIAL',
      expiresAt: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(), // 14 days trial period
    };

    const saved = await saveTenant(newTenant);
    if (!saved) {
      return res.status(500).json({ error: 'Error al registrar la promoción en el servidor.' });
    }

    // Seed default month configuration for the brand-new tenant database
    const defaultMonths = [
      { id: '2026-01', name: 'Enero', monthNumber: 1, year: 2026, feeUSD_direct: 8, feeUSD_bcv: 12, feeUSD: 8 },
      { id: '2026-02', name: 'Febrero', monthNumber: 2, year: 2026, feeUSD_direct: 8, feeUSD_bcv: 12, feeUSD: 8 },
      { id: '2026-03', name: 'Marzo', monthNumber: 3, year: 2026, feeUSD_direct: 8, feeUSD_bcv: 12, feeUSD: 8 },
      { id: '2026-04', name: 'Abril', monthNumber: 4, year: 2026, feeUSD_direct: 8, feeUSD_bcv: 12, feeUSD: 8 },
      { id: '2026-05', name: 'Mayo', monthNumber: 5, year: 2026, feeUSD_direct: 12, feeUSD_bcv: 16, feeUSD: 12 },
      { id: '2026-06', name: 'Junio', monthNumber: 6, year: 2026, feeUSD_direct: 12, feeUSD_bcv: 16, feeUSD: 12 },
      { id: '2026-07', name: 'Julio', monthNumber: 7, year: 2026, feeUSD_direct: 12, feeUSD_bcv: 16, feeUSD: 12 },
      { id: '2026-08', name: 'Agosto', monthNumber: 8, year: 2026, feeUSD_direct: 12, feeUSD_bcv: 16, feeUSD: 12 },
      { id: '2026-09', name: 'Septiembre', monthNumber: 9, year: 2026, feeUSD_direct: 12, feeUSD_bcv: 16, feeUSD: 12 },
      { id: '2026-10', name: 'Octubre', monthNumber: 10, year: 2026, feeUSD_direct: 12, feeUSD_bcv: 16, feeUSD: 12 },
      { id: '2026-11', name: 'Noviembre', monthNumber: 11, year: 2026, feeUSD_direct: 12, feeUSD_bcv: 16, feeUSD: 12 },
      { id: '2026-12', name: 'Diciembre', monthNumber: 12, year: 2026, feeUSD_direct: 12, feeUSD_bcv: 16, feeUSD: 12 },
    ];
    await saveServerData(cleanId, {
      members: [],
      months: defaultMonths,
      quotas: [],
      payments: [],
      dollarPurchases: []
    });

    const sessionId = 'sess_' + Math.random().toString(36).substr(2, 9);
    const ip = (req.headers['x-forwarded-for'] || req.ip || '127.0.0.1').toString().split(',')[0].trim();
    activeSessions.push({
      sessionId,
      tenantId: newTenant.id,
      tenantName: newTenant.name,
      userAgent: req.headers['user-agent'] || 'Desconocido',
      ip,
      loggedInAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString()
    });

    res.json({
      success: true,
      message: '¡Promoción registrada y configurada exitosamente!',
      sessionId,
      tenant: {
        id: newTenant.id,
        name: newTenant.name,
        isTrial: newTenant.licenseKey === 'TRIAL'
      }
    });
  } catch (err: any) {
    console.error('Error during tenant registration:', err);
    res.status(500).json({ error: `Error interno de registro: ${err.message}` });
  }
});

// POST /api/tenant/login - Log in to a workspace
app.post('/api/tenant/login', async (req, res) => {
  try {
    const { tenantId, tenantPassword, password } = req.body;
    const finalPassword = tenantPassword || password;

    if (!tenantId || !finalPassword) {
      return res.status(400).json({ error: 'Por favor proporciona ID de promoción y contraseña.' });
    }

    const cleanId = tenantId.trim().toLowerCase();
    const tenant = await findTenant(cleanId);
    if (!tenant) {
      return res.status(401).json({ error: 'ID de promoción no registrado.' });
    }

    if (tenant.passwordHash !== finalPassword) {
      return res.status(401).json({ error: 'Contraseña incorrecta.' });
    }

    const expires = new Date(tenant.expiresAt);
    if (Date.now() > expires.getTime()) {
      return res.status(402).json({ error: 'La licencia o período de prueba de esta promoción ha expirado.' });
    }

    const sessionId = 'sess_' + Math.random().toString(36).substr(2, 9);
    const ip = (req.headers['x-forwarded-for'] || req.ip || '127.0.0.1').toString().split(',')[0].trim();
    activeSessions.push({
      sessionId,
      tenantId: tenant.id,
      tenantName: tenant.name,
      userAgent: req.headers['user-agent'] || 'Desconocido',
      ip,
      loggedInAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString()
    });

    res.json({
      success: true,
      sessionId,
      tenantId: tenant.id,
      tenantName: tenant.name,
      expiresAt: tenant.expiresAt,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        expiresAt: tenant.expiresAt,
        isTrial: tenant.licenseKey === 'TRIAL'
      }
    });
  } catch (err: any) {
    console.error('Error during tenant login:', err);
    res.status(500).json({ error: `Error interno de inicio de sesión: ${err.message}` });
  }
});

// GET /api/data - Load tenant-specific persistent database
app.get('/api/data', tenantAuthMiddleware, async (req: any, res) => {
  try {
    const data = await loadServerData(req.tenantId);
    return res.json({ success: true, data });
  } catch (err: any) {
    console.error(`Error reading data for tenant ${req.tenantId}:`, err);
    res.status(500).json({ error: 'Error al leer datos de la promoción en el servidor' });
  }
});

// POST /api/data - Save tenant-specific database
app.post('/api/data', tenantAuthMiddleware, async (req: any, res) => {
  try {
    const newData = req.body;
    if (!newData || typeof newData !== 'object') {
      return res.status(400).json({ error: 'Datos no válidos' });
    }

    // Detect new payments or dollar purchases to notify via Telegram
    let newPayments: any[] = [];
    let newPurchases: any[] = [];
    try {
      const currentData = await loadServerData(req.tenantId);
      const existingPaymentIds = new Set((currentData.payments || []).map((p: any) => p && p.id).filter(Boolean));
      const existingPurchaseIds = new Set((currentData.dollarPurchases || []).map((p: any) => p && p.id).filter(Boolean));

      newPayments = (newData.payments || []).filter((p: any) => p && p.id && !existingPaymentIds.has(p.id));
      newPurchases = (newData.dollarPurchases || []).filter((p: any) => p && p.id && !existingPurchaseIds.has(p.id));
    } catch (diffErr) {
      console.error('Error identifying new items for Telegram notification:', diffErr);
    }

    const saved = await saveServerData(req.tenantId, newData);
    if (saved) {
      res.json({ success: true, message: 'Datos de la promoción guardados correctamente' });

      // Run notifications in background so it doesn't slow down the response
      if (newPayments.length > 0 || newPurchases.length > 0) {
        notifyNewPaymentsTelegram(req.tenantId, newPayments, newPurchases).catch(notifyErr => {
          console.error('Error running Telegram notifications in background:', notifyErr);
        });
      }
    } else {
      res.status(500).json({ error: 'Error al guardar datos de la promoción' });
    }
  } catch (err: any) {
    console.error(`Error saving data for tenant ${req.tenantId}:`, err);
    res.status(500).json({ error: 'Error al guardar datos de la promoción' });
  }
});

// POST /api/restore - Overwrite complete tenant database state from a backup
app.post('/api/restore', tenantAuthMiddleware, async (req: any, res) => {
  try {
    const backupData = req.body;
    if (!backupData || typeof backupData !== 'object') {
      return res.status(400).json({ error: 'Datos de copia de seguridad no válidos' });
    }

    // Direct delegate to the robust, atomic saveServerData helper
    const saved = await saveServerData(req.tenantId, backupData);
    if (!saved) {
      throw new Error('Error al guardar datos de la copia de seguridad en Firestore o archivos locales');
    }

    console.log(`Copia de seguridad restaurada exitosamente para la promoción "${req.tenantId}"`);
    res.json({ success: true, message: 'Copia de seguridad restaurada exitosamente para la promoción' });
  } catch (err: any) {
    console.error(`Error restoring backup for tenant ${req.tenantId}:`, err);
    res.status(500).json({ error: `Error al restaurar la copia de seguridad: ${err.message}` });
  }
});

// Helper: Get historical BCV rate using Gemini Search Grounding
async function getBcvRateForDate(dateStr: string): Promise<number | null> {
  const today = getCaracasDateString();
  if (dateStr === today) {
    return null;
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      const prompt = `Responde ÚNICAMENTE con la tasa oficial de cambio del Banco Central de Venezuela (BCV) correspondiente a la fecha exacta del ${dateStr} en bolívares por dólar (Bs/$). Formato de respuesta: número decimal (ejemplo: 36.45).`;
      const geminiRes = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
      const text = geminiRes.text?.trim() || '';
      const cleanText = text.replace(',', '.');
      const match = cleanText.match(/\b\d{2,3}(?:\.\d{1,4})?\b/);
      const extractedNum = match ? parseFloat(match[0]) : null;
      if (extractedNum && !isNaN(extractedNum) && extractedNum > 10 && extractedNum < 2000) {
        console.log(`Historical BCV rate for ${dateStr} found via Gemini Search: ${extractedNum}`);
        return extractedNum;
      }
    } catch (gErr) {
      console.error(`Gemini historical BCV fallback failed for ${dateStr}:`, gErr);
    }
  }
  return null;
}

// Cache for BCV rate
let cachedBcvRate = {
  rate: 138.50, //Sensible fallback rate
  date: getCaracasDateString(),
  source: 'Tasa Oficial BCV',
  lastUpdated: 0, // 0 so it fetches immediately on first request
};

async function getOrFetchCurrentBcvRate(forceRefresh = false): Promise<number> {
  const cacheAge = Date.now() - cachedBcvRate.lastUpdated;
  if (!forceRefresh && cacheAge < 900000 && cachedBcvRate.lastUpdated > 0 && cachedBcvRate.rate > 10) {
    return cachedBcvRate.rate;
  }

  // Primary API source: DolarApi Venezuela (Official BCV)
  try {
    const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
    if (response.ok) {
      const data = await response.json();
      const parsed = parseFloat(data?.promedio || data?.precio);
      if (!isNaN(parsed) && parsed > 10) {
        cachedBcvRate = {
          rate: parsed,
          date: data.fechaActualizacion || getCaracasDateString(),
          source: 'BCV Oficial (DolarApi)',
          lastUpdated: Date.now(),
        };
        console.log(`[Tasa BCV] Obtenida exitosamente de API Única (DolarApi): ${parsed} Bs/$`);
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[Tasa BCV] Error al consultar API DolarApi:', e);
  }

  // Backup fallback: Direct BCV website portal (bcv.org.ve)
  try {
    const bcvRes = await fetch('https://www.bcv.org.ve/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (bcvRes.ok) {
      const html = await bcvRes.text();
      const dolarMatch = html.match(/id="dolar"[\s\S]*?<strong>\s*([0-9.,]+)\s*<\/strong>/i) ||
                         html.match(/USD[\s\S]*?<strong>\s*([0-9.,]+)\s*<\/strong>/i);
      if (dolarMatch && dolarMatch[1]) {
        const rawNumStr = dolarMatch[1].trim().replace(',', '.');
        const parsedRate = parseFloat(rawNumStr);
        if (!isNaN(parsedRate) && parsedRate > 10) {
          cachedBcvRate = {
            rate: parsedRate,
            date: getCaracasDateString(),
            source: 'BCV Oficial Portal (bcv.org.ve)',
            lastUpdated: Date.now(),
          };
          console.log(`[Tasa BCV] Obtenida directamente del portal oficial BCV: ${parsedRate} Bs/$`);
          return parsedRate;
        }
      }
    }
  } catch (bcvErr) {
    console.warn('[Tasa BCV] Fallback portal BCV falló:', bcvErr);
  }

  return cachedBcvRate.rate || 138.50;
}

// GET /api/bcv - Fetch BCV Rate directly from official APIs
app.get('/api/bcv', async (req, res) => {
  try {
    const dateQuery = req.query.date as string | undefined;
    if (dateQuery && /^\d{4}-\d{2}-\d{2}$/.test(dateQuery)) {
      const today = getCaracasDateString();
      if (dateQuery !== today) {
        const histRate = await getBcvRateForDate(dateQuery);
        if (histRate) {
          return res.json({
            rate: histRate,
            date: dateQuery,
            source: `Gemini Histórico (${dateQuery})`,
            historical: true
          });
        }
      }
    }

    const forceRefresh = req.query.force === 'true';
    const rate = await getOrFetchCurrentBcvRate(forceRefresh);
    res.json({ ...cachedBcvRate, rate });
  } catch (err: any) {
    res.json(cachedBcvRate);
  }
});

// Helper: Smart local regex parser fallback for Venezuelan bank receipts when Gemini quota is exceeded
function fallbackParseWhatsApp(
  rawText: string,
  members: any[],
  currentBcvRate: number,
  monthsConfig: any[],
  specialQuotas: any[]
) {
  // 1. Separate rawText into message blocks (by double newline or bullet/number markers)
  let blocks = rawText
    .split(/\n\s*\n+/)
    .map((b) => b.trim())
    .filter((b) => b.length > 2);

  if (blocks.length <= 1 && rawText.includes('\n')) {
    const lines = rawText.split(/\n+/).map((l) => l.trim()).filter((l) => l.length > 0);
    let currentBlock: string[] = [];
    const groupedBlocks: string[] = [];

    for (const line of lines) {
      const isNewEntryStart = /^\d+[\.\)]\s*/.test(line) || /^[*•-]\s*/.test(line);
      if (isNewEntryStart && currentBlock.length > 0) {
        groupedBlocks.push(currentBlock.join('\n'));
        currentBlock = [line];
      } else {
        currentBlock.push(line);
      }
    }
    if (currentBlock.length > 0) {
      groupedBlocks.push(currentBlock.join('\n'));
    }

    if (groupedBlocks.length > 1) {
      blocks = groupedBlocks;
    } else {
      blocks = [rawText]; // Fallback to full block
    }
  }

  const parsedItems: any[] = [];

  for (const block of blocks) {
    // Extract WhatsApp header info (Date and Sender)
    let paymentDate = getCaracasDateString();
    let textToMatchNames = block;

    // Detect WhatsApp header dates: e.g. [5/8/2026, 17:28] Pedro Acosta: ... or 05/08/2026, 17:28 - Pedro Acosta:
    const dateRegex = /\b(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})\b/;
    const dateMatch = block.match(dateRegex);
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]);
      let year = parseInt(dateMatch[3]);
      if (year < 100) year += 2000;
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2000 && year <= 2100) {
        const mm = month < 10 ? `0${month}` : `${month}`;
        const dd = day < 10 ? `0${day}` : `${day}`;
        paymentDate = `${year}-${mm}-${dd}`;
      }
    } else {
      // Spanish text date parsing (e.g. "15 de julio" or "10 de mayo de 2026")
      const textMonthMatch = block.match(/\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?:\s+de\s+(\d{4}))?\b/i);
      if (textMonthMatch) {
        const day = parseInt(textMonthMatch[1]);
        const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        const monthIdx = monthNames.indexOf(textMonthMatch[2].toLowerCase()) + 1;
        const year = textMonthMatch[3] ? parseInt(textMonthMatch[3]) : new Date().getFullYear();
        if (monthIdx > 0 && day >= 1 && day <= 31) {
          const mm = monthIdx < 10 ? `0${monthIdx}` : `${monthIdx}`;
          const dd = day < 10 ? `0${day}` : `${day}`;
          paymentDate = `${year}-${mm}-${dd}`;
        }
      }
    }

    // Identify the sender and strip it to avoid matching the sender
    const headerRegex = /^(?:\[\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4},?[^\]]+\]\s*([^:\n]+):|^\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4},?[^\-\n]+-\s*([^:\n]+):)/im;
    const headerMatch = block.match(headerRegex);
    if (headerMatch) {
      const senderName = headerMatch[1] || headerMatch[2];
      if (senderName) {
        textToMatchNames = block.replace(headerRegex, '');
      }
    } else {
      const genericHeaderRegex = /^\[?\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}[^:\n]*:\s*/i;
      textToMatchNames = block.replace(genericHeaderRegex, '');
    }

    const cleanBlock = block.toLowerCase();
    const cleanBlockForMatching = textToMatchNames.toLowerCase();

    // Check for Dollar Purchase (Compra de Dólares del Fondo / Comité)
    const isDollarPurchaseText =
      /\b(compra|comprado|comprados|compraron|adquisicion|adquisición|cambio)\b/i.test(cleanBlock) &&
      (/\b\d+(?:[.,]\d+)?\s*(\$|usd|dolares|dólares)\b/i.test(cleanBlock) || /\b(\$|usd)\s*\d+/i.test(cleanBlock));

    // Check for Expense (Egreso / Gasto)
    const isExpenseText =
      /\b(gasto|egreso|gastos|egresos|se gast[oó]|se gastaron|pago de servicio|pago a fot[oó]grafo|impresiones|decoraci[oó]n|sonido)\b/i.test(cleanBlock) &&
      !isDollarPurchaseText;

    if (isExpenseText) {
      let expenseAmount = 0;
      let currency = 'VES';

      const usdMatch = cleanBlock.match(/(\d+(?:[.,]\d+)?)\s*(\$|usd|dolares|dólares)/i) || cleanBlock.match(/(\$|usd)\s*(\d+(?:[.,]\d+)?)/i);
      if (usdMatch) {
        const valStr = (usdMatch[1] === '$' || usdMatch[1] === 'usd') ? usdMatch[2] : usdMatch[1];
        expenseAmount = parseFloat(valStr.replace(',', '.'));
        currency = 'USD';
      } else {
        const vesMatch = cleanBlock.match(/(\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+(?:[.,]\d+)?)\s*(bs|bolivares|bolívares|ves)/i);
        if (vesMatch) {
          expenseAmount = parseFloat(vesMatch[1].replace(/\./g, '').replace(',', '.'));
          currency = 'VES';
        } else {
          const numMatch = cleanBlock.match(/\b\d+(?:[.,]\d+)?\b/);
          if (numMatch) expenseAmount = parseFloat(numMatch[0].replace(',', '.'));
        }
      }

      let reference = 'S/R';
      const refMatch = cleanBlock.match(/(ref|referencia|comprobante|nro|#)[:.\s]*([0-9a-z]{3,14})/i);
      if (refMatch) reference = refMatch[2].toUpperCase();

      let category = 'Imprevistos';
      if (/log[ií]stica|transporte|gasolina|alquiler/i.test(cleanBlock)) category = 'Logística';
      else if (/evento|sonido|m[uú]sica|dj|decoraci[oó]n|fiesta|fot[oó]grafo/i.test(cleanBlock)) category = 'Eventos';
      else if (/impresi[oó]n|papeler[ií]a|planilla|diploma/i.test(cleanBlock)) category = 'Administrativo';
      else if (/protocolo|refrigerio|comida|bebida/i.test(cleanBlock)) category = 'Protocolo';

      parsedItems.push({
        isExpense: true,
        expenseCategory: category,
        expenseDescription: block.slice(0, 80),
        paymentDate,
        method: currency === 'VES' ? 'pago_movil' : 'efectivo_usd',
        amountOriginal: expenseAmount,
        currency,
        reference,
        targetType: 'month',
        targetId: '',
        notes: block,
        rawTextExcerpt: block,
      });
      continue;
    }

    if (isDollarPurchaseText) {
      // Find USD amount (e.g. 100)
      const usdMatch =
        cleanBlock.match(/(?:compra|comprados|compraron|dolares|\$|usd)\s*de?\s*(\$?\s*\d+(?:[.,]\d+)?)/i) ||
        cleanBlock.match(/(\d+(?:[.,]\d+)?)\s*(\$|usd|dolares|dólares)/i);
      let usdVal = 0;
      if (usdMatch) {
        const rawUsd = (usdMatch[1] || usdMatch[2] || '').replace('$', '').trim().replace(',', '.');
        usdVal = parseFloat(rawUsd) || 0;
      }

      // Find VES amount (e.g. 825000)
      const vesMatch =
        cleanBlock.match(/(\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+(?:[.,]\d+)?)\s*(bs|bolivares|bolívares|ves)/i) ||
        cleanBlock.match(/(bs|bolivares|bolívares|ves)[:.\s]*(\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+(?:[.,]\d+)?)/i);
      let vesVal = 0;
      if (vesMatch) {
        const rawVes = (vesMatch[1] || vesMatch[2] || '').replace(/\./g, '').replace(',', '.');
        vesVal = parseFloat(rawVes) || 0;
      } else {
        const nums = (cleanBlock.match(/\b\d+(?:[.,]\d+)?\b/g) || [])
          .map((n) => parseFloat(n.replace(/\./g, '').replace(',', '.')))
          .filter((n) => n > 150);
        if (nums.length > 0) vesVal = nums[0];
      }

      // Extract Reference if present
      let reference = 'COMPRA';
      const refMatch = cleanBlock.match(/(ref|referencia|comprobante|nro|num|#)[:.\s]*([0-9a-z]{3,14})/i);
      if (refMatch) {
        reference = refMatch[2].toUpperCase();
      }

      if (usdVal > 0 || vesVal > 0) {
        parsedItems.push({
          isDollarPurchase: true,
          matchedMemberId: '',
          matchedMemberName: 'Fondo de Promoción',
          paymentDate,
          method: 'transferencia_ves',
          amountOriginal: vesVal,
          currency: 'VES',
          usdAmount: usdVal,
          bcvRate: usdVal > 0 && vesVal > 0 ? Math.round((vesVal / usdVal) * 100) / 100 : currentBcvRate,
          reference,
          targetType: 'month',
          targetId: '',
          targetLabel: 'Compra de Dólares',
          notes: `Compra de $${usdVal} USD (${vesVal} Bs)`,
          rawTextExcerpt: block,
        });
        continue;
      }
    }

    // A. Detect Amount & Currency
    // To extract the actual amount, first strip dates and reference numbers to avoid false matching
    let textForAmount = cleanBlock
      .replace(/\b\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}\b/g, '') // strip dates
      .replace(/(?:ref|referencia|comprobante|nro|num|#)[:.\s]*([0-9a-z]{3,14})/gi, '') // strip marked references
      .replace(/#\s*\d+/g, ''); // strip #1250 style references

    let currency: 'USD' | 'VES' = 'VES';
    let amountOriginal = 0;

    // Check if there are explicit bolívares indicators for any number first
    const vesMatch =
      textForAmount.match(/(\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+(?:[.,]\d+)?)\s*(bs|bolivares|ves)/i) ||
      textForAmount.match(/(bs|bolivares|ves)[:.\s]*(\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+(?:[.,]\d+)?)/i);

    if (vesMatch) {
      currency = 'VES';
      const rawNumStr = (vesMatch[1] || vesMatch[2]).replace(/\./g, '').replace(',', '.');
      amountOriginal = parseFloat(rawNumStr);
    } else {
      // Find all numbers in the text block
      const numMatches = textForAmount.match(/\b\d+(?:[.,]\d+)?\b/g) || [];
      let parsedNums = numMatches.map(m => {
        const cleaned = m.replace(/\./g, '').replace(',', '.');
        return { original: m, val: parseFloat(cleaned) };
      }).filter(n => !isNaN(n.val) && n.val > 0);

      if (parsedNums.length > 1) {
        // Filter out pure integers of 4+ digits if they look like reference numbers and we have other numbers
        parsedNums = parsedNums.filter(n => {
          const isPureInteger4Plus = /^\d{4,10}$/.test(n.original);
          return !isPureInteger4Plus;
        });
      }

      // 1. If any parsed number is > 150, it is almost certainly a bolívares amount (even if labeled with $ by mistake, e.g. 4479,78$)
      const largeNum = parsedNums.find(n => n.val > 150);
      if (largeNum) {
        currency = 'VES';
        amountOriginal = largeNum.val;
      } else {
        // 2. Check for explicit USD match
        const usdMatch =
          textForAmount.match(/(\$|usd|usdt|dolares?|cash|binance)\s*(\d+(?:[.,]\d+)?)/i) ||
          textForAmount.match(/(\d+(?:[.,]\d+)?)\s*(\$|usd|usdt|dolares?|cash|binance)/i);

        if (usdMatch) {
          currency = 'USD';
          const firstGroup = usdMatch[1];
          const secondGroup = usdMatch[2];
          const numStr = /\d/.test(secondGroup) ? secondGroup : firstGroup;
          const rawNumStr = numStr.replace(',', '.');
          amountOriginal = parseFloat(rawNumStr);
        } else if (parsedNums.length > 0) {
          // 3. Fallback to the first number found
          // If the first number "looks like" bolívares (contains decimal comma, or is relatively large e.g. > 100), treat as VES
          const firstNumObj = parsedNums[0];
          amountOriginal = firstNumObj.val;
          if (firstNumObj.val > 100 || firstNumObj.original.includes(',')) {
            currency = 'VES';
          } else {
            // Default to USD if there is a USD keyword, else VES
            const hasUsdKeyword = /binance|efectivo|usdt|usd|\$|dolares/i.test(cleanBlock);
            currency = hasUsdKeyword ? 'USD' : 'VES';
          }
        }
      }
    }

    if (amountOriginal <= 0) continue; // Skip blocks without amount

    // B. Detect Reference Number
    let reference = 'S/R';
    const refMatch = cleanBlock.match(/(ref|referencia|comprobante|nro|num|#)[:.\s]*([0-9a-z]{3,14})/i);
    if (refMatch) {
      reference = refMatch[2].toUpperCase();
    } else {
      const digitsMatch = cleanBlock.match(/\b\d{4,10}\b/g);
      if (digitsMatch && digitsMatch.length > 0) {
        reference = digitsMatch[0];
      }
    }

    // C. Detect Payment Method
    let method = currency === 'USD' ? 'efectivo_usd' : 'pago_movil';
    if (currency === 'USD') {
      if (cleanBlock.includes('efectivo') || cleanBlock.includes('cash')) method = 'efectivo_usd';
      else if (cleanBlock.includes('binance') || cleanBlock.includes('usdt')) method = 'binance';
      else if (cleanBlock.includes('banesco panama')) method = 'banesco_panama';
    } else {
      method = 'pago_movil';
      if (cleanBlock.includes('efectivo')) method = 'efectivo_ves';
      else if (
        cleanBlock.includes('transferencia') ||
        cleanBlock.includes('transf') ||
        cleanBlock.includes('bdv') ||
        cleanBlock.includes('mercantil')
      ) {
        method = 'transferencia_ves';
      }
    }

    // D. Match Member across entire block with strict token & stopword logic
    let matchedMemberId = '';
    let matchedMemberName = 'No identificado';
    let matchConfidence = 0;

    // Normalize block text (remove accents and split into clean words)
    const normalizeStr = (s: string) =>
      (s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const normBlock = normalizeStr(cleanBlockForMatching);
    const blockTokens = new Set(normBlock.split(/[^a-z0-9]+/i).filter((t) => t.length >= 2));

    const stopWords = new Set([
      'de', 'del', 'la', 'las', 'los', 'el', 'da', 'di', 'van', 'san', 'dos', 'con', 'por', 'para',
      'pago', 'movil', 'pagomovil', 'monto', 'ref', 'referencia', 'bs', 'usd', 'banco', 'transf',
      'transferencia', 'comprobante', 'numero', 'nro', 'mes', 'cuota', 'marzo', 'abril', 'mayo',
      'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre', 'enero',
      'febrero', 'efectivo', 'bolivares', 'dolares', 'reporte', 'lista', 'solvencia'
    ]);

    let bestScore = 0;

    for (const mem of members) {
      let score = 0;
      const cleanCedula = (mem.cedula || '').replace(/\./g, '');

      // Check Cedula Match (100% confidence)
      if (cleanCedula && cleanCedula.length >= 6 && normBlock.includes(cleanCedula)) {
        score = 100;
      } else {
        const lastWords = normalizeStr(mem.lastName || '')
          .split(/[^a-z0-9]+/i)
          .filter((w) => w.length >= 3 && !stopWords.has(w));
        const firstWords = normalizeStr(mem.firstName || '')
          .split(/[^a-z0-9]+/i)
          .filter((w) => w.length >= 3 && !stopWords.has(w));

        const matchedLast = lastWords.filter((lw) => blockTokens.has(lw));
        const matchedFirst = firstWords.filter((fw) => blockTokens.has(fw));

        if (matchedFirst.length > 0 && matchedLast.length > 0) {
          score = 95; // High confidence: Both first and last name present
        } else if (matchedLast.length >= 2) {
          score = 90; // Two last names match (e.g. Acosta La Rosa)
        } else if (matchedFirst.length >= 2) {
          score = 85; // Two first names match (e.g. Pedro Samuel)
        } else if (matchedLast.length === 1) {
          // Check if last name is distinctive
          const singleLast = matchedLast[0];
          score = singleLast.length >= 5 ? 75 : 65;
        } else if (matchedFirst.length === 1) {
          // Check if first name is unique among all members
          const singleFirst = matchedFirst[0];
          const totalWithFirst = members.filter((m) =>
            normalizeStr(m.firstName || '')
              .split(/[^a-z0-9]+/i)
              .includes(singleFirst)
          ).length;

          if (totalWithFirst === 1) {
            score = 75; // Unique first name (e.g. "Rafael")
          } else {
            score = 45; // Ambiguous first name (e.g. "Maria")
          }
        }
      }

      if (score >= 70 && score > bestScore) {
        bestScore = score;
        matchedMemberId = mem.id;
        matchedMemberName = `${mem.lastName}, ${mem.firstName}`;
        matchConfidence = Math.min(100, score);
      }
    }

    // E. Detect Target Months & Special Quotas
    const targetList: Array<{ type: 'month' | 'quota'; id: string; label: string }> = [];

    // Check special quotas
    if (specialQuotas && specialQuotas.length > 0) {
      for (const sq of specialQuotas) {
        const sqTitleClean = (sq.title || '').toLowerCase();
        if (cleanBlock.includes(sqTitleClean) || (cleanBlock.includes('cuota especial') && specialQuotas.length === 1)) {
          targetList.push({ type: 'quota', id: sq.id, label: `Cuota: ${sq.title}` });
        }
      }
      if (targetList.length === 0 && cleanBlock.includes('cuota especial') && specialQuotas.length > 0) {
        targetList.push({ type: 'quota', id: specialQuotas[0].id, label: `Cuota: ${specialQuotas[0].title}` });
      }
    }

    // Check months
    const monthKeywords = [
      { key: 'enero', id: '2026-01', label: 'Enero 2026' },
      { key: 'febrero', id: '2026-02', label: 'Febrero 2026' },
      { key: 'marzo', id: '2026-03', label: 'Marzo 2026' },
      { key: 'abril', id: '2026-04', label: 'Abril 2026' },
      { key: 'mayo', id: '2026-05', label: 'Mayo 2026' },
      { key: 'junio', id: '2026-06', label: 'Junio 2026' },
      { key: 'julio', id: '2026-07', label: 'Julio 2026' },
      { key: 'agosto', id: '2026-08', label: 'Agosto 2026' },
      { key: 'septiembre', id: '2026-09', label: 'Septiembre 2026' },
      { key: 'octubre', id: '2026-10', label: 'Octubre 2026' },
      { key: 'noviembre', id: '2026-11', label: 'Noviembre 2026' },
      { key: 'diciembre', id: '2026-12', label: 'Diciembre 2026' },
    ];

    for (const mk of monthKeywords) {
      if (cleanBlock.includes(mk.key)) {
        targetList.push({ type: 'month', id: mk.id, label: mk.label });
      }
    }

    if (targetList.length === 0) {
      const defaultMonth = monthsConfig[4] || monthsConfig[0] || { id: '2026-05', name: 'Mayo', year: 2026 };
      targetList.push({ type: 'month', id: defaultMonth.id, label: `${defaultMonth.name} ${defaultMonth.year}` });
    }

    // F. Attach selectedConcepts list for single item with multi-concept checkboxes
    const primaryTarget = targetList[0] || { type: 'month', id: '2026-05', label: 'Mayo 2026' };
    const selectedConcepts = targetList.map((t) => `${t.type}:${t.id}`);

    parsedItems.push({
      matchedMemberId,
      matchedMemberName,
      matchConfidence,
      paymentDate,
      method,
      amountOriginal,
      currency,
      bcvRate: currentBcvRate || 61.5,
      reference,
      targetType: primaryTarget.type,
      targetId: primaryTarget.id,
      targetLabel: primaryTarget.label,
      selectedConcepts,
      notes: targetList.length > 1 ? `Pago con ${targetList.length} conceptos` : 'Analizado vía WhatsApp',
      rawTextExcerpt: block.slice(0, 80),
    });
  }

  return parsedItems;
}

// POST /api/parse-whatsapp - Parse WhatsApp raw payment messages with Gemini AI & Fallback
app.post('/api/parse-whatsapp', tenantAuthMiddleware, async (req: any, res) => {
  try {
    const { rawText } = req.body;

    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
      return res.status(400).json({ error: 'Debes proporcionar el texto de los mensajes de WhatsApp.' });
    }

    // Load active data for the authenticated tenant
    const data = await loadServerData(req.tenantId);
    const membersList = data.members || [];
    const monthsConfig = data.months || [];
    const specialQuotas = data.quotas || [];

    // Fetch current BCV Rate
    const bcvRateNum = await getOrFetchCurrentBcvRate();

    // Check if GEMINI_API_KEY exists
    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY missing, using local fallback parser');
      const fallbackItems = fallbackParseWhatsApp(rawText, membersList, bcvRateNum, monthsConfig, specialQuotas);
      return res.json({ success: true, items: fallbackItems, source: 'local_fallback' });
    }

    const membersListStr = JSON.stringify(membersList);
    const monthsStr = JSON.stringify(monthsConfig);
    const quotasStr = JSON.stringify(specialQuotas);

    const prompt = `
Eres un asistente contable especializado para comités de finanzas de graduación en Venezuela.
Tu tarea es analizar los mensajes de texto de WhatsApp de reportes de pago y extraer de manera estructurada CADA UNO de los pagos reportados o transacciones de cambio de divisas.

INFORMACIÓN DE CONTEXTO:
1. Lista de integrantes registrados en la base de datos:
${membersListStr}

2. Meses disponibles y sus cuotas:
${monthsStr}

3. Cuotas especiales vigentes:
${quotasStr}

4. Tasa BCV oficial de hoy: ${bcvRateNum} Bs/$

REGLAS CRÍTICAS DE EXTRACCIÓN Y RECONOCIMIENTO:

1. COINCIDENCIA DE INTEGRANTES Y NOMBRES PROPIOS:
- Analiza minuciosamente el cuerpo del mensaje para identificar al alumno/integrante.
- REGLA DE ORO DE NOMBRES CON TILDES Y APODOS (ESTRICTO): Ignora tildes y acentos. 'Vanessa Marín' o 'Vanessa Marin' debe coincidir exactamente con 'MARÍN, VANESSA' (matchedMemberName: 'MARÍN, VANESSA').
- REGLA DE ORO DE NOMBRES VS MESES (ESTRICTO): El término 'Junior' (ej: 'Junior Sigurani', 'Junior Acosta', 'Junior S.') es el NOMBRE O APELLIDO de un integrante registrado de la lista, NUNCA debe ser interpretado ni confundido con el mes de 'Junio'. Si el texto dice 'Junior Sigurani', la persona es 'Junior Sigurani' (matchedMemberName: 'Junior Sigurani').
- Compara los nombres, apellidos y cédula con la lista de integrantes registrados. Haz coincidir a integrantes aunque usen un solo apellido o nombre parcial (ej: "samuel acosta" para "ACOSTA LA ROSA, SAMUEL DAVID", o "Paola Vellorín" para "VELLORIN DE CONNO PAOLA MARÍA JOSÉ").

2. MONEDA, FORMATOS DE NÚMEROS Y MÉTODOS DE PAGO:
- RECONOCIMIENTO DE SEPARADORES DE MILES Y DECIMALES EN BS (ALTAMENTE CRÍTICO): En Venezuela los montos en bolívares suelen escribirse con punto '.' como separador de miles y coma ',' como separador de decimales (ej: '12.229,44' o '12.229,44 bs' o '12.229,44 bs (16$ bcv)'). Debes interpretar '12.229,44' como doce mil doscientos veintinueve bolívares con 44 céntimos y devolver en amountOriginal el float exacto 12229.44. La anotación entre paréntesis como '(16$ bcv)' indica el equivalente informativo en dólares a tasa BCV y NO altera que el pago fue en bolívares (amountOriginal: 12229.44, currency: 'VES'). NUNCA interpretes '12.229' como 12.229 ni 12.23 dólares o doce bolívares.
- PAGOS EN DÓLARES / BINANCE / USDT Y REFERENCIAS (ESTRICTO): Si el mensaje indica '12 usdt', '12 usdt', '12$' o '12 usdt / Binance', la moneda del pago es DÓLARES (currency: 'USD', method: 'binance') y el monto original es 12 USD (amountOriginal: 12). Si en ese mismo mensaje aparece un número aislado de 4 o más dígitos (ej: '9280', '1074', '3049', '849201'), ese número representa la REFERENCIA BANCARIA O COMPROBANTE DE BINANCE (reference: '9280'), ¡NUNCA es un monto de $9280 dólares ni $9280 bolívares! Los pagos de cuotas de alumnos en dólares nunca exceden $500.
- Pagos reportados por métodos como Binance ("binance"), Efectivo en Dólares ("efectivo_usd"), o Banesco Panamá ("banesco_panama") SIEMPRE deben registrarse en DÓLARES (currency: "USD") directos, sin realizar conversiones ni divisiones con la tasa BCV. El monto original (amountOriginal) representará exactamente el valor en dólares (ej: si se reportan 12 usdt por Binance, amountOriginal es 12 y currency es "USD").
- Si el mensaje reporta un monto en bolívares (VES), regístralo como tal con método "pago_movil" o "transferencia_ves".

3. NÚMERO DE REFERENCIA:
- Busca números de 4 a 10 dígitos asociados a "Ref.", "Ref", "Nro", "#" o números aislados de comprobante (ej: "#1504" o "1504" o "9280" en un pago USDT es la referencia).

4. COMPRA DE DÓLARES (CAMBIO DE DIVISAS DE LA PROMOCIÓN):
- Si el texto describe que el comité compró, adquirió o cambió bolívares por dólares (ej: "Compra de 100$", "Compra de $100", "Se compraron 100$", "Comprados $100 a tasa 880", "Se cambiaron 44000 bs por $50", "comprados 100$"), se trata de una COMPRA DE DÓLARES. Configure isDollarPurchase: true.

5. UN SOLO PAGO CON MÚLTIPLES CONCEPTOS:
- NUNCA dividas un único mensaje de WhatsApp que reporte una única transferencia/pago en múltiples objetos JSON. Devuelve EXACTAMENTE UN OBJETO en la lista JSON.

6. METADATOS Y FECHAS DE WHATSAPP:
- Si el mensaje incluye metadatos de WhatsApp (ej: "[5/8/2026, 17:28] Pedro Acosta: ..."), extrae la fecha (5/8/2026 -> paymentDate: "2026-08-05") e IGNORE el nombre del remitente del encabezado para la coincidencia del alumno que pagó.

7. RECONOCIMIENTO DE EGRESOS / GASTOS DE LA PROMOCIÓN:
- Si el texto describe el pago de una multa o atraso (ej: "multa", "atraso", "penalidad", "pago de multa mes de junio"), asócialo al targetType "late_fee", targetId "YYYY-MM" del mes al que pertenece la multa.
- Si el pago incluye múltiples conceptos (Ej: "Multa de Mayo 3$ + Mensualidad Mayo 14$"), utiliza \`selectedConcepts\` (ej: ["late_fee:2026-05", "month:2026-05"]) Y ADEMÁS llena \`conceptAllocationsUSD\` especificando los dólares asignados a cada uno.
- Si el texto describe un egreso, gasto o salida de dinero realizada por el comité/promoción (ej: "Gasto: 50$ en impresiones", "Egreso 1500 bs pago de transporte ref 4892", "Se pagaron 20$ a fotógrafo", "Gastados 4500 bs en decoración", "Pago de servicio de sonido $100"), establece isExpense: true.
- Asigna expenseCategory ("Logística", "Eventos", "Administrativo", "Protocolo", "Imprevistos") y expenseDescription con el concepto detallado del gasto.

MENSAJES DE WHATSAPP A ANALIZAR:
"""
${rawText}
"""

Devuelve una lista JSON con cada pago, cambio de divisa o egreso detectado.
`;

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            description: 'Lista de pagos extraídos del mensaje',
            items: {
              type: Type.OBJECT,
              properties: {
                matchedMemberId: { type: Type.STRING, description: 'ID del integrante coincidente o vacio' },
                matchedMemberName: { type: Type.STRING, description: 'Nombre completo del integrante coincidente' },
                matchConfidence: { type: Type.NUMBER, description: 'Nivel de confianza de 0 a 100 basada en nombres y apellidos' },
                paymentDate: { type: Type.STRING, description: 'Fecha del pago YYYY-MM-DD' },
                method: { type: Type.STRING, description: 'pago_movil, transferencia_ves, efectivo_usd, binance, banesco_panama, etc.' },
                amountOriginal: { type: Type.NUMBER, description: 'Monto ingresado en la moneda original' },
                currency: { type: Type.STRING, description: 'VES o USD' },
                bcvRate: { type: Type.NUMBER, description: 'Tasa BCV utilizada para la conversión' },
                reference: { type: Type.STRING, description: 'Número de referencia bancaria' },
                targetType: { type: Type.STRING, description: 'month o quota' },
                targetId: { type: Type.STRING, description: 'ID del mes ej 2026-06 o ID de cuota especial' },
                targetLabel: { type: Type.STRING, description: 'Etiqueta descriptiva del mes/cuota' },
                selectedConcepts: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Lista de conceptos seleccionados en formato "type:id" (ej: ["quota:sq-1", "month:2026-05", "late_fee:2026-05"])'
                },
                conceptAllocationsUSD: {
                  type: Type.ARRAY,
                  description: 'Cantidades EXACTAS en DÓLARES asignadas a cada bolsillo (concepto) según la descripción del usuario. Solo incluir si el usuario define expresamente los montos. Ej: [{"conceptKey": "late_fee:2026-05", "amountUSD": 3}, {"conceptKey": "month:2026-05", "amountUSD": 14}]',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      conceptKey: { type: Type.STRING },
                      amountUSD: { type: Type.NUMBER }
                    }
                  }
                },
                notes: { type: Type.STRING, description: 'Nota o resumen del pago con el desglose si aplica' },
                rawTextExcerpt: { type: Type.STRING, description: 'Fragmento de texto original de donde se extrajo este pago' },
                isDollarPurchase: { type: Type.BOOLEAN, description: 'Verdadero si es una compra de dolares con bolivares' },
                usdAmount: { type: Type.NUMBER, description: 'Monto de dolares adquiridos si aplica' },
                isExpense: { type: Type.BOOLEAN, description: 'Verdadero si es un egreso o gasto de la promocion' },
                expenseCategory: { type: Type.STRING, description: 'Categoria del egreso' },
                expenseDescription: { type: Type.STRING, description: 'Descripcion o concepto del egreso' },
              },
              required: ['paymentDate', 'method', 'amountOriginal', 'currency', 'reference', 'targetType'],
            },
          },
        },
      });
    } catch (primaryErr: any) {
      console.warn('Gemini 3.6 API failed (Quota/Rate Limit), falling back to local receipt parser:', primaryErr?.message || primaryErr);
      const fallbackItems = fallbackParseWhatsApp(rawText, membersList, bcvRateNum, monthsConfig, specialQuotas);
      return res.json({ success: true, items: fallbackItems, source: 'local_fallback' });
    }

    const parsedJsonStr = response.text?.trim() || '[]';
    let parsedItems = [];
    try {
      parsedItems = JSON.parse(parsedJsonStr);
      if (Array.isArray(parsedItems)) {
        for (let item of parsedItems) {
          if (item.paymentDate && /^\d{4}-\d{2}-\d{2}$/.test(item.paymentDate)) {
            const histRate = await getBcvRateForDate(item.paymentDate);
            if (histRate) {
              item.bcvRate = histRate;
            } else {
              item.bcvRate = bcvRateNum;
            }
          } else {
            item.bcvRate = bcvRateNum;
          }
        }
      }
    } catch (parseErr) {
      console.error('Failed to parse Gemini JSON output, using local fallback:', parseErr);
      parsedItems = fallbackParseWhatsApp(rawText, membersList, bcvRateNum, monthsConfig, specialQuotas);
    }

    res.json({ success: true, items: parsedItems });
  } catch (err: any) {
    console.error('Error in /api/parse-whatsapp:', err);
    try {
      const data = await loadServerData(req.tenantId);
      const fallbackItems = fallbackParseWhatsApp(
        req.body?.rawText || '',
        data.members || [],
        cachedBcvRate.rate || 61.5,
        data.months || [],
        data.quotas || []
      );
      res.json({ success: true, items: fallbackItems, source: 'local_fallback' });
    } catch (fallbackErr) {
      res.json({ success: true, items: [], source: 'local_fallback' });
    }
  }
});

// GET /api/tenant/profile - Load profile info (name, logoUrl) for tenant
app.get('/api/tenant/profile', tenantAuthMiddleware, async (req: any, res) => {
  try {
    const tenant = await findTenant(req.tenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'La promoción especificada no existe.' });
    }
    res.json({
      success: true,
      id: tenant.id,
      name: tenant.name,
      logoUrl: (tenant as any).logoUrl || null,
      logoCircularUrl: (tenant as any).logoCircularUrl || null,
      email: (tenant as any).email || 'contacto@controlsaas.com', // fallback default read-only email
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al cargar perfil de la promoción en el servidor' });
  }
});

// GET /api/public/tenant/:tenantId/query - Public route for regular members to look up their balance by Cédula
app.get('/api/public/tenant/:tenantId/query', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { cedula } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'ID de promoción faltante.' });
    }

    if (!cedula || typeof cedula !== 'string' || !cedula.trim()) {
      return res.status(400).json({ error: 'Por favor ingresa un número de cédula para consultar.' });
    }

    const cleanId = tenantId.trim().toLowerCase();
    let tenant = await findTenant(cleanId);
    
    // Fallback for original or default tenant if not explicitly listed in tenants_list.json
    if (!tenant) {
      if (cleanId === 'original' || cleanId === 'default') {
        tenant = {
          id: cleanId,
          name: 'Promoción Original',
          passwordHash: 'admin',
          createdAt: new Date().toISOString(),
          licenseKey: 'TRIAL',
          expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
        };
      } else {
        const checkData = await loadServerData(cleanId);
        if (checkData && checkData.members && checkData.members.length > 0) {
          tenant = {
            id: cleanId,
            name: `Promoción ${cleanId.toUpperCase()}`,
            passwordHash: 'admin',
            createdAt: new Date().toISOString(),
            licenseKey: 'TRIAL',
            expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
          };
        }
      }
    }

    if (!tenant) {
      return res.status(404).json({ error: 'La promoción especificada no existe.' });
    }

    const data = await loadServerData(cleanId);
    const members = data.members || [];

    // Robust Cédula Normalization (handles V-28.313.167, V28313167, 28.313.167, 28313167)
    const normalizeCedula = (s: string) => {
      if (!s) return '';
      let clean = s.toString().trim().toLowerCase();
      clean = clean.replace(/^[veVE][-\s.]*/, ''); // remove leading V/E
      clean = clean.replace(/[^0-9a-zA-Z]/g, ''); // keep alphanumeric
      return clean;
    };

    const searchCedula = normalizeCedula(cedula);

    const matchedMember = members.find((m: any) => normalizeCedula(m.cedula) === searchCedula);

    if (!matchedMember) {
      return res.status(404).json({ error: 'No se encontró ningún integrante con la cédula ingresada. Verifica que esté correcta o solicita soporte al Comité de Finanzas.' });
    }

    const payments = data.payments || [];
    const memberPayments = payments.filter((p: any) => p.memberId === matchedMember.id);

    res.json({
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        logoUrl: (tenant as any).logoUrl || null,
        circularLogoUrl: (tenant as any).circularLogoUrl || null,
      },
      member: matchedMember,
      months: data.months || [],
      quotas: data.quotas || [],
      payments: memberPayments,
      lateFee: (await loadTenantConfig(cleanId)).lateFee || { feeUSD_direct: 2, feeUSD_bcv: 3, paused: false },
    });
  } catch (err: any) {
    console.error('Error in public tenant query:', err);
    res.status(500).json({ error: 'Error interno al consultar la información del integrante' });
  }
});

// POST /api/tenant/profile - Update profile info (name, logoUrl, logoCircularUrl) for tenant
app.post('/api/tenant/profile', tenantAuthMiddleware, async (req: any, res) => {
  try {
    const { name, logoUrl, logoCircularUrl } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'El nombre de la promoción es obligatorio.' });
    }

    const tenant = await findTenant(req.tenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'La promoción especificada no existe.' });
    }

    tenant.name = name.trim();
    if (logoUrl !== undefined) {
      (tenant as any).logoUrl = logoUrl;
    }
    if (logoCircularUrl !== undefined) {
      (tenant as any).logoCircularUrl = logoCircularUrl;
    }

    const saved = await saveTenant(tenant);
    if (!saved) {
      return res.status(500).json({ error: 'Error al guardar los cambios de perfil en el servidor.' });
    }

    res.json({
      success: true,
      message: '¡Perfil de la promoción actualizado con éxito!',
      tenant: {
        id: tenant.id,
        name: tenant.name,
        logoUrl: (tenant as any).logoUrl || null,
        logoCircularUrl: (tenant as any).logoCircularUrl || null,
      }
    });
  } catch (err: any) {
    console.error('Error in POST /api/tenant/profile:', err);
    res.status(500).json({ error: 'Error interno al guardar los cambios de perfil' });
  }
});

// GET /api/late-fee-config - Return stored Late Fee config for tenant
app.get('/api/late-fee-config', tenantAuthMiddleware, async (req: any, res) => {
  try {
    const config = await loadTenantConfig(req.tenantId);
    res.json({
      success: true,
      config: config.lateFee || { feeUSD_direct: 2, feeUSD_bcv: 3, paused: false, pausedUntil: undefined, startDay: 6, graceMonths: 2 }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error cargando configuración de multas' });
  }
});

// POST /api/late-fee-config - Save Late Fee config for tenant
app.post('/api/late-fee-config', tenantAuthMiddleware, async (req: any, res) => {
  try {
    const { feeUSD_direct, feeUSD_bcv, paused, pausedUntil, startDay, graceMonths, overrideMonth, overrideDay } = req.body;
    const config = await loadTenantConfig(req.tenantId);

    config.lateFee = {
      feeUSD_direct: typeof feeUSD_direct === 'number' ? feeUSD_direct : 2,
      feeUSD_bcv: typeof feeUSD_bcv === 'number' ? feeUSD_bcv : 3,
      paused: paused !== undefined ? Boolean(paused) : false,
      pausedUntil: typeof pausedUntil === 'string' ? pausedUntil : undefined,
      startDay: typeof startDay === 'number' ? startDay : 6,
      graceMonths: typeof graceMonths === 'number' ? graceMonths : 2,
      overrideMonth: typeof overrideMonth === 'string' ? overrideMonth : undefined,
      overrideDay: typeof overrideDay === 'number' ? overrideDay : undefined,
    };

    await saveTenantConfig(req.tenantId, config);

    res.json({
      success: true,
      message: '¡Configuración de multas guardada con éxito!',
      config: config.lateFee,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al guardar la configuración de multas.' });
  }
});

// GET /api/telegram-config - Return stored Telegram config for tenant
app.get('/api/telegram-config', tenantAuthMiddleware, async (req: any, res) => {
  try {
    const config = await loadTenantConfig(req.tenantId);
    res.json({
      botToken: config.telegram.botToken,
      chatIdAllowed: config.telegram.chatIdAllowed,
      enabled: config.telegram.enabled,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error cargando configuración de Telegram' });
  }
});

// POST /api/telegram-config - Save Telegram config and (re)start bot for tenant
app.post('/api/telegram-config', tenantAuthMiddleware, async (req: any, res) => {
  try {
    const { botToken, chatIdAllowed, enabled } = req.body;
    const config = await loadTenantConfig(req.tenantId);

    config.telegram = {
      botToken: (botToken || '').trim(),
      chatIdAllowed: (chatIdAllowed || '').trim(),
      enabled: enabled !== undefined ? Boolean(enabled) : false,
    };

    await saveTenantConfig(req.tenantId, config);

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const isLocalOrPreview = 
      host.includes('localhost') || 
      host.includes('127.0.0.1') || 
      host.includes('googleusercontent.com');

    if (config.telegram.enabled && config.telegram.botToken) {
      if (isLocalOrPreview) {
        // Local dev or AI Studio Preview sandbox: use polling, delete webhook first
        try {
          await fetch(`https://api.telegram.org/bot${config.telegram.botToken}/deleteWebhook?drop_pending_updates=true`);
        } catch (err) {}
        startTenantTelegramBot(req.tenantId, config.telegram.botToken, config.telegram.chatIdAllowed);
        addTenantTelegramLog(req.tenantId, 'Iniciado polling de Telegram para entorno de desarrollo/vista previa.', true);
      } else {
        // Standalone Production: Use Webhook
        const publicUrl = `${protocol}://${host}`;
        const webhookUrl = `${publicUrl}/api/telegram-webhook/${req.tenantId}`;
        try {
          stopTenantTelegramBot(req.tenantId);
          const setWebhookRes = await fetch(`https://api.telegram.org/bot${config.telegram.botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
          const setWebhookData = await setWebhookRes.json();
          console.log(`[Tenant: ${req.tenantId}] Telegram setWebhook result:`, setWebhookData);
          addTenantTelegramLog(req.tenantId, `Webhook registrado de forma permanente en: ${webhookUrl}`, true);
        } catch (err: any) {
          console.error(`[Tenant: ${req.tenantId}] Failed to set Telegram webhook:`, err.message);
          addTenantTelegramLog(req.tenantId, `Error registrando Webhook (${err.message}). Iniciando polling temporal.`, false);
          startTenantTelegramBot(req.tenantId, config.telegram.botToken, config.telegram.chatIdAllowed);
        }
      }
    } else {
      if (config.telegram.botToken) {
        try {
          await fetch(`https://api.telegram.org/bot${config.telegram.botToken}/deleteWebhook`);
        } catch (err) {}
      }
      stopTenantTelegramBot(req.tenantId);
      addTenantTelegramLog(req.tenantId, 'Servicio del Bot de Telegram desactivado.', true);
    }

    res.json({ success: true, config: config.telegram });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error guardando configuración de Telegram' });
  }
});

// GET /api/telegram-logs - Fetch latest bot activity logs for tenant
app.get('/api/telegram-logs', tenantAuthMiddleware, async (req: any, res) => {
  try {
    const config = await loadTenantConfig(req.tenantId);
    res.json({ success: true, logs: config.telegramLogs || [] });
  } catch (err: any) {
    res.status(500).json({ error: 'Error obteniendo bitácora de Telegram' });
  }
});

// POST /api/telegram-webhook/:tenantId - Receive webhook updates from Telegram
app.post('/api/telegram-webhook/:tenantId', async (req, res) => {
  const { tenantId } = req.params;
  const update = req.body;
  try {
    // Respond immediately to Telegram to avoid timeouts and repeat deliveries
    res.json({ ok: true });

    if (update && typeof update === 'object') {
      const config = await loadTenantConfig(tenantId);
      if (config && config.telegram && config.telegram.enabled && config.telegram.botToken) {
        // Run processing asynchronously
        handleTenantTelegramUpdate(tenantId, update, config.telegram.botToken, config.telegram.chatIdAllowed)
          .catch(err => {
            console.error(`[Webhook Tenant: ${tenantId}] Async handler error:`, err);
          });
      }
    }
  } catch (err: any) {
    console.error(`[Webhook Tenant: ${tenantId}] Webhook endpoint error:`, err);
  }
});

// POST /api/verify-password - Verify the tenant password for critical actions (like deleting members)
app.post('/api/verify-password', tenantAuthMiddleware, async (req: any, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, error: 'Falta ingresar la contraseña' });
    }
    const tenant = await findTenant(req.tenantId);
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Promoción no encontrada' });
    }
    if (tenant.passwordHash === password.trim()) {
      return res.json({ success: true });
    } else {
      return res.json({ success: false, error: 'Contraseña incorrecta de la promoción.' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al verificar contraseña' });
  }
});

// GET /api/smtp-config - Return stored SMTP configuration for tenant
app.get('/api/smtp-config', tenantAuthMiddleware, async (req: any, res) => {
  try {
    const config = await loadTenantConfig(req.tenantId);
    res.json({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      user: config.smtp.user,
      pass: config.smtp.pass,
      fromName: config.smtp.fromName,
      fromEmail: config.smtp.fromEmail,
      enabled: config.smtp.enabled,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error cargando configuración SMTP' });
  }
});

// POST /api/smtp-config - Save SMTP configuration for tenant
app.post('/api/smtp-config', tenantAuthMiddleware, async (req: any, res) => {
  try {
    const { host, port, secure, user, pass, fromName, fromEmail, enabled } = req.body;
    const config = await loadTenantConfig(req.tenantId);

    config.smtp = {
      host: (host || '').trim(),
      port: Number(port) || 587,
      secure: Boolean(secure),
      user: (user || '').trim(),
      pass: pass !== undefined ? pass : '',
      fromName: (fromName || 'Comité de Finanzas').trim(),
      fromEmail: (fromEmail || user || '').trim(),
      enabled: enabled !== undefined ? Boolean(enabled) : true,
    };

    await saveTenantConfig(req.tenantId, config);
    res.json({ success: true, config: config.smtp });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error guardando configuración SMTP' });
  }
});

// POST /api/smtp-test - Verify SMTP credentials & optionally send a test email
app.post('/api/smtp-test', tenantAuthMiddleware, async (req: any, res) => {
  try {
    const { host, port, secure, user, pass, fromName, fromEmail, testRecipient } = req.body;

    if (!host || !user || !pass) {
      return res.status(400).json({ error: 'Por favor proporciona Host, Usuario y Contraseña SMTP.' });
    }

    const transporter = nodemailer.createTransport({
      host: host.trim(),
      port: Number(port) || 587,
      secure: Boolean(secure),
      auth: {
        user: user.trim(),
        pass: pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 10000,
    });

    // Verify SMTP connection
    await transporter.verify();

    // Send a test email if recipient provided
    if (testRecipient && testRecipient.trim()) {
      await transporter.sendMail({
        from: `"${fromName || 'Comité de Finanzas'}" <${fromEmail || user}>`,
        to: testRecipient.trim(),
        subject: `Prueba de Conexión SMTP - Promoción ${req.tenantId.toUpperCase()}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
            <h2 style="color: #162e58; margin-top: 0;">¡Conexión SMTP Exitosa! ✉️</h2>
            <p style="color: #334155; font-size: 14px;">Este es un mensaje de prueba enviado desde tu aplicación de control financiero de promoción.</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 15px 0;" />
            <p style="color: #64748b; font-size: 12px;">Servidor: <strong>${host}:${port}</strong><br/>Remitente: <strong>${fromEmail || user}</strong></p>
          </div>
        `,
      });
    }

    res.json({
      success: true,
      message: testRecipient
        ? `✅ Conexión SMTP verificada y correo de prueba enviado a ${testRecipient}`
        : '✅ Conexión con el servidor SMTP verificada exitosamente.',
    });
  } catch (err: any) {
    console.error('SMTP test error:', err);
    res.status(400).json({
      success: false,
      error: err.message || 'Error al conectar con el servidor SMTP. Verifica el host, puerto y credenciales.',
    });
  }
});

// POST /api/send-invoice - Generate & send invoice email directly via SMTP or fallback
app.post('/api/send-invoice', tenantAuthMiddleware, async (req: any, res) => {
  try {
    const { member, targetTitle, totalPaidUSD, requiredFeeUSD, invoiceNumber, pdfBase64, pdfFileName } = req.body;

    if (!member || !member.email) {
      return res.status(400).json({ error: 'El integrante debe tener un correo electrónico válido.' });
    }

    const emailSubject = `Comprobante de Pago ${targetTitle || 'Promoción'} - ${member.lastName}, ${member.firstName}`;
    const isSolvent = totalPaidUSD >= requiredFeeUSD - 0.10;
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <div style="background-color: #162e58; padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 20px; font-weight: bold; text-transform: uppercase; tracking: 1px;">Comprobante de Pago</h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">Comité de Finanzas - Promoción ${req.tenantId.toUpperCase()}</p>
        </div>
        
        <div style="padding: 24px; color: #1e293b;">
          <p style="font-size: 15px; margin-top: 0;">Estimado(a) <strong>${member.firstName} ${member.lastName}</strong>,</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.5;">Le adjuntamos el recibo individual de pago correspondiente a <strong>${targetTitle || 'la mensualidad'}</strong>.</p>
          
          <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Nº Recibo:</td>
                <td style="padding: 6px 0; font-weight: bold; text-align: right; font-family: monospace;">${invoiceNumber}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Concepto:</td>
                <td style="padding: 6px 0; font-weight: bold; text-align: right;">${targetTitle}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Monto Abonado:</td>
                <td style="padding: 6px 0; font-weight: bold; color: #059669; text-align: right;">$${(totalPaidUSD || 0).toFixed(2)} USD</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Monto Requerido:</td>
                <td style="padding: 6px 0; font-weight: bold; text-align: right;">$${(requiredFeeUSD || 0).toFixed(2)} USD</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Estado:</td>
                <td style="padding: 6px 0; font-weight: bold; text-align: right;">
                  <span style="background-color: ${isSolvent ? '#dcfce7' : '#fef3c7'}; color: ${isSolvent ? '#166534' : '#92400e'}; padding: 3px 10px; border-radius: 12px; font-size: 12px;">
                    ${isSolvent ? 'SOLVENTE' : 'PARCIAL / DEUDA'}
                  </span>
                </td>
              </tr>
            </table>
          </div>

          <p style="font-size: 13px; color: #64748b;">El comprobante oficial adjunto en PDF detalla el desglose completo de los movimientos registrados.</p>
          
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
            Este es un correo automático de notificación emitido por el Comité de Finanzas.
          </div>
        </div>
      </div>
    `;

    const emailBodyText = `Estimado(a) ${member.firstName} ${member.lastName},\n\nLe enviamos el comprobante individual de pago correspondiente a ${targetTitle || 'la promoción'}.\n\nNº Recibo: ${invoiceNumber}\nMonto Abonado: $${(totalPaidUSD || 0).toFixed(2)} USD\nMonto Requerido: $${(requiredFeeUSD || 0).toFixed(2)} USD\nEstado: ${isSolvent ? 'SOLVENTE' : 'PENDIENTE'}\n\nGracias por su compromiso.\nComité de Finanzas de Promoción`;

    // Try to send via SMTP if configured for this tenant
    const config = await loadTenantConfig(req.tenantId);
    const smtpCfg = config.smtp;

    if (smtpCfg.enabled && smtpCfg.host && smtpCfg.user && smtpCfg.pass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpCfg.host,
          port: smtpCfg.port || 587,
          secure: smtpCfg.secure,
          auth: {
            user: smtpCfg.user,
            pass: smtpCfg.pass,
          },
          tls: { rejectUnauthorized: false },
        });

        const attachments = [];
        if (pdfBase64) {
          const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
          attachments.push({
            filename: pdfFileName || `Comprobante_${member.lastName}_${invoiceNumber}.pdf`,
            content: Buffer.from(base64Data, 'base64'),
            contentType: 'application/pdf',
          });
        }

        await transporter.sendMail({
          from: `"${smtpCfg.fromName || 'Comité de Finanzas'}" <${smtpCfg.fromEmail || smtpCfg.user}>`,
          to: member.email,
          subject: emailSubject,
          text: emailBodyText,
          html: emailHtml,
          attachments,
        });

        return res.json({
          success: true,
          sentViaSmtp: true,
          message: `Comprobante enviado exitosamente por correo a ${member.email}`,
          email: member.email,
        });
      } catch (smtpErr: any) {
        console.error(`Failed to send invoice via SMTP for tenant ${req.tenantId}:`, smtpErr);
        // Fallback info if SMTP fails
        return res.json({
          success: true,
          sentViaSmtp: false,
          smtpError: smtpErr.message || 'Error del servidor SMTP',
          message: `No se pudo enviar vía SMTP directamente: ${smtpErr.message}. Se generó enlace de respaldo.`,
          email: member.email,
          subject: emailSubject,
          body: emailBodyText,
          mailtoUrl: `mailto:${encodeURIComponent(member.email)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBodyText)}`,
        });
      }
    }

    // Default response if SMTP is not configured
    res.json({
      success: true,
      sentViaSmtp: false,
      message: `Configuración SMTP no activa. Se preparó correo para ${member.email}`,
      email: member.email,
      subject: emailSubject,
      body: emailBodyText,
      mailtoUrl: `mailto:${encodeURIComponent(member.email)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBodyText)}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error generando el comprobante' });
  }
});

// Super Admin Middleware
function superAdminAuthMiddleware(req: any, res: any, next: any) {
  const token = req.headers['x-superadmin-token'];
  const masterPassword = process.env.SUPER_ADMIN_PASSWORD || 'admin123';
  if (!token || token !== masterPassword) {
    return res.status(401).json({ error: 'Acceso denegado. Código de administración incorrecto.' });
  }
  next();
}

// Backup config file
const BACKUP_CONFIG_FILE = path.join(process.cwd(), 'backup_config.json');

function loadBackupConfig() {
  try {
    if (fs.existsSync(BACKUP_CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(BACKUP_CONFIG_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Error loading backup config:', err);
  }
  return {
    autoBackupEnabled: true,
    frequency: 'daily', // 'daily', 'weekly', 'monthly'
    targets: { firestore: true, googleDrive: false },
    googleDriveFolderId: '',
    tenantConfigs: {} // tenantId -> { enabled: boolean, frequency: string }
  };
}

function saveBackupConfig(config: any) {
  try {
    fs.writeFileSync(BACKUP_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving backup config:', err);
    return false;
  }
}

// Tenant Daily Google Drive Backup Routine (Server-side with Refresh Tokens)
async function runTenantDailyDriveBackups(): Promise<void> {
  const todayStr = new Date().toISOString().split('T')[0];
  console.log(`[Drive Auto-Backup Engine] Running automated daily Drive backup check for date: ${todayStr}...`);

  let tenantsMap: Record<string, any> = {};
  if (fs.existsSync(TENANTS_FILE)) {
    try {
      tenantsMap = JSON.parse(fs.readFileSync(TENANTS_FILE, 'utf-8'));
    } catch (e) {}
  }
  if (Object.keys(tenantsMap).length === 0) {
    tenantsMap['original'] = { id: 'original', name: 'Promoción Principal' };
  }

  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "753906353358-ld8k47do0qkqfsnmidk4t50ojrbaihre.apps.googleusercontent.com";
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

  for (const tenantId of Object.keys(tenantsMap)) {
    try {
      const config = await loadTenantConfig(tenantId);
      const gd = config.googleDrive;

      if (!gd || gd.autoBackupEnabled === false) {
        continue;
      }

      if (gd.lastAutoBackupDate === todayStr) {
        continue;
      }

      if (!gd.refreshToken && !gd.accessToken) {
        continue;
      }

      console.log(`[Drive Auto-Backup Engine] Backing up tenant ${tenantId} to Google Drive...`);

      const oauth2Client = new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET
      );

      oauth2Client.setCredentials({
        refresh_token: gd.refreshToken,
        access_token: gd.accessToken
      });

      // Try refreshing access token if refresh_token is present
      if (gd.refreshToken) {
        try {
          const refreshed = await oauth2Client.getAccessToken();
          if (refreshed && refreshed.token) {
            gd.accessToken = refreshed.token;
          }
        } catch (rErr: any) {
          console.warn(`[Drive Auto-Backup Engine] Token refresh note for ${tenantId}:`, rErr.message);
        }
      }

      const drive = google.drive({ version: 'v3', auth: oauth2Client });
      const tenantData = await loadServerData(tenantId);
      const fileName = `control_pagos_respaldo_${tenantId}_${todayStr}.json`;

      const fileMetadata = {
        name: fileName,
        mimeType: 'application/json',
      };
      const media = {
        mimeType: 'application/json',
        body: JSON.stringify(tenantData, null, 2)
      };

      const file = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id',
      });

      if (file.data.id) {
        console.log(`[Drive Auto-Backup Engine] Daily backup uploaded for tenant ${tenantId} -> File ID: ${file.data.id}`);
        gd.lastAutoBackupDate = todayStr;
        config.googleDrive = gd;
        await saveTenantConfig(tenantId, config);
      }
    } catch (err: any) {
      console.error(`[Drive Auto-Backup Engine] Error for tenant ${tenantId}:`, err.message);
    }
  }
}

// Master Daily Backup Function for SuperAdmin
async function generateMasterDailySnapshot(): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    const backupDir = path.join(process.cwd(), 'server_backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const todayDate = new Date().toISOString().split('T')[0];
    const fileName = `master_snapshot_${todayDate}.json`;
    const filePath = path.join(backupDir, fileName);

    let tenantsMap: Record<string, any> = {};
    if (fs.existsSync(TENANTS_FILE)) {
      try {
        tenantsMap = JSON.parse(fs.readFileSync(TENANTS_FILE, 'utf-8'));
      } catch (e) {}
    }

    if (Object.keys(tenantsMap).length === 0) {
      tenantsMap['original'] = { id: 'original', name: 'Promoción Principal', createdAt: new Date().toISOString(), licenseKey: 'TRIAL', expiresAt: '2099-12-31' };
    }

    const masterSnapshot: any = {
      snapshotDate: todayDate,
      createdAt: new Date().toISOString(),
      backupType: 'MASTER_FULL_SYSTEM',
      totalTenants: Object.keys(tenantsMap).length,
      tenants: tenantsMap,
      tenantsData: {}
    };

    for (const tenantId of Object.keys(tenantsMap)) {
      try {
        const tenantData = await loadServerData(tenantId);
        masterSnapshot.tenantsData[tenantId] = tenantData;
      } catch (err) {
        console.error(`Error adding tenant ${tenantId} to master snapshot:`, err);
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(masterSnapshot, null, 2), 'utf-8');
    console.log(`[Master Backup] Automated daily snapshot created successfully: ${fileName}`);

    // Prune old snapshots (keep last 30)
    try {
      const files = fs.readdirSync(backupDir);
      const snapshots = files.filter(f => f.startsWith('master_snapshot_')).sort();
      if (snapshots.length > 30) {
        while (snapshots.length > 30) {
          const oldest = snapshots.shift();
          if (oldest) {
            fs.unlinkSync(path.join(backupDir, oldest));
          }
        }
      }
    } catch (e) {}

    return { success: true, filePath };
  } catch (err: any) {
    console.error('[Master Backup] Error creating snapshot:', err);
    return { success: false, error: err.message };
  }
}

// GET /api/superadmin/master-backup - Download live master backup of all tenants
app.get('/api/superadmin/master-backup', async (req, res) => {
  const token = req.query.token || req.headers['x-superadmin-token'];
  const masterPassword = process.env.SUPER_ADMIN_PASSWORD || 'admin123';
  if (!token || token !== masterPassword) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    let tenantsMap: Record<string, any> = {};
    if (fs.existsSync(TENANTS_FILE)) {
      try {
        tenantsMap = JSON.parse(fs.readFileSync(TENANTS_FILE, 'utf-8'));
      } catch (e) {}
    }

    if (Object.keys(tenantsMap).length === 0) {
      tenantsMap['original'] = { id: 'original', name: 'Promoción Principal', createdAt: new Date().toISOString(), licenseKey: 'TRIAL', expiresAt: '2099-12-31' };
    }

    const masterData: any = {
      exportDate: new Date().toISOString(),
      backupType: 'MASTER_FULL_SYSTEM',
      totalTenants: Object.keys(tenantsMap).length,
      tenants: tenantsMap,
      tenantsData: {}
    };

    for (const tenantId of Object.keys(tenantsMap)) {
      masterData.tenantsData[tenantId] = await loadServerData(tenantId);
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="master_backup_FULL_${new Date().toISOString().split('T')[0]}.json"`);
    res.send(JSON.stringify(masterData, null, 2));
  } catch (error: any) {
    console.error('Error generating master backup:', error);
    res.status(500).json({ error: 'Error al generar respaldo general', details: error.message });
  }
});

// GET /api/superadmin/master-snapshots - List saved daily server snapshots
app.get('/api/superadmin/master-snapshots', superAdminAuthMiddleware, (req, res) => {
  try {
    const backupDir = path.join(process.cwd(), 'server_backups');
    if (!fs.existsSync(backupDir)) {
      return res.json({ success: true, snapshots: [] });
    }
    const files = fs.readdirSync(backupDir).filter(f => f.startsWith('master_snapshot_')).sort().reverse();
    const snapshots = files.map(filename => {
      const stats = fs.statSync(path.join(backupDir, filename));
      return {
        filename,
        sizeBytes: stats.size,
        date: filename.replace('master_snapshot_', '').replace('.json', ''),
        createdAt: stats.mtime.toISOString()
      };
    });
    res.json({ success: true, snapshots });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/superadmin/master-snapshots/download/:filename
app.get('/api/superadmin/master-snapshots/download/:filename', async (req, res) => {
  const token = req.query.token || req.headers['x-superadmin-token'];
  const masterPassword = process.env.SUPER_ADMIN_PASSWORD || 'admin123';
  if (!token || token !== masterPassword) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const { filename } = req.params;
  const filePath = path.join(process.cwd(), 'server_backups', path.basename(filename));
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Snapshot no encontrado' });
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(fs.readFileSync(filePath, 'utf-8'));
});

// GET /api/superadmin/backup-config
app.get('/api/superadmin/backup-config', superAdminAuthMiddleware, (req, res) => {
  const config = loadBackupConfig();
  res.json({ success: true, config });
});

// POST /api/superadmin/backup-config
app.post('/api/superadmin/backup-config', superAdminAuthMiddleware, (req, res) => {
  const newConfig = req.body;
  if (!newConfig) {
    return res.status(400).json({ error: 'Configuración inválida' });
  }
  saveBackupConfig(newConfig);
  res.json({ success: true, message: 'Configuración de respaldos guardada con éxito.' });
});

// POST /api/superadmin/change-password
app.post('/api/superadmin/change-password', superAdminAuthMiddleware, (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.trim().length < 4) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 4 caracteres.' });
  }
  process.env.SUPER_ADMIN_PASSWORD = newPassword.trim();
  res.json({ success: true, message: 'Contraseña de Administrador General actualizada con éxito.' });
});

// POST /api/superadmin/generate-license
app.post('/api/superadmin/generate-license', superAdminAuthMiddleware, (req, res) => {
  const { days = 365, promoName = '' } = req.body;
  const randCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const licenseKey = `LIC-${new Date().getFullYear()}-${randCode}`;
  const expiresAt = new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();
  
  res.json({
    success: true,
    license: {
      licenseKey,
      expiresAt,
      days,
      promoName,
      createdAt: new Date().toISOString()
    }
  });
});
app.post('/api/superadmin/login', (req, res) => {
  const { password } = req.body;
  const masterPassword = process.env.SUPER_ADMIN_PASSWORD || 'admin123';
  if (password === masterPassword) {
    return res.json({ success: true, token: masterPassword });
  }
  return res.status(401).json({ error: 'Código de acceso de Administrador General incorrecto.' });
});

// POST /api/tenant/logout - Terminate tenant session
app.post('/api/tenant/logout', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  if (sessionId) {
    activeSessions = activeSessions.filter(s => s.sessionId !== sessionId.toString());
    revokedSessionIds.delete(sessionId.toString());
  }
  res.json({ success: true });
});

// GET /api/superadmin/sessions - List active tenant sessions
app.get('/api/superadmin/sessions', superAdminAuthMiddleware, (req, res) => {
  res.json({ success: true, sessions: activeSessions });
});

// POST /api/superadmin/sessions/revoke - Terminate a specific active session
app.post('/api/superadmin/sessions/revoke', superAdminAuthMiddleware, (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: 'Falta sessionId en la solicitud.' });
  }
  revokedSessionIds.add(sessionId.toString());
  activeSessions = activeSessions.filter(s => s.sessionId !== sessionId.toString());
  res.json({ success: true, message: 'La sesión ha sido cerrada y revocada.' });
});

// GET /api/superadmin/tenants/:id/backup - Download backup manually
app.get('/api/superadmin/tenants/:id/backup', async (req, res) => {
  const token = req.query.token;
  if (!token || token !== process.env.SUPERADMIN_TOKEN) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const tenantId = req.params.id;
    const dataPath = path.join(process.cwd(), 'data', `data_${tenantId}.json`);
    
    if (!fs.existsSync(dataPath)) {
      return res.status(404).json({ error: 'Base de datos no encontrada para este inquilino' });
    }

    const fileContent = await fs.promises.readFile(dataPath, 'utf-8');
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="backup_${tenantId}_${new Date().toISOString().split('T')[0]}.json"`);
    res.send(fileContent);
  } catch (error) {
    console.error('Error generating backup:', error);
    res.status(500).json({ error: 'Error interno del servidor al generar el respaldo' });
  }
});

// GET /api/superadmin/tenants - List all tenants with some metrics
app.get('/api/superadmin/tenants', superAdminAuthMiddleware, async (req, res) => {
  try {
    let tenantsMap: Record<string, Tenant> = {};

    // Load from local file
    try {
      if (fs.existsSync(TENANTS_FILE)) {
        tenantsMap = JSON.parse(fs.readFileSync(TENANTS_FILE, 'utf-8'));
      }
    } catch (err) {
      console.error('Error reading local tenants list:', err);
    }

    // Load from Firestore
    if (db) {
      try {
        const tenantsSnap = await getDocs(collection(db, 'tenants'));
        tenantsSnap.forEach((doc) => {
          const d = doc.data() as Tenant;
          tenantsMap[d.id] = d;
        });
      } catch (err) {
        console.error('Error reading tenants from Firestore:', err);
      }
    }

    const tenantsList = Object.values(tenantsMap);
    const result = [];

    for (const t of tenantsList) {
      try {
        const data = await loadServerData(t.id);
        result.push({
          id: t.id,
          name: t.name,
          adminEmail: t.adminEmail || '',
          createdAt: t.createdAt || new Date().toISOString(),
          licenseKey: t.licenseKey || 'TRIAL',
          expiresAt: t.expiresAt,
          passwordHash: t.passwordHash,
          membersCount: data.members?.length || 0,
          paymentsCount: data.payments?.length || 0,
          dollarPurchasesCount: data.dollarPurchases?.length || 0,
        });
      } catch (e) {
        result.push({
          id: t.id,
          name: t.name,
          adminEmail: t.adminEmail || '',
          createdAt: t.createdAt || new Date().toISOString(),
          licenseKey: t.licenseKey || 'TRIAL',
          expiresAt: t.expiresAt,
          passwordHash: t.passwordHash,
          membersCount: 0,
          paymentsCount: 0,
          dollarPurchasesCount: 0,
        });
      }
    }

    res.json({ success: true, tenants: result });
  } catch (err: any) {
    res.status(500).json({ error: `Error cargando promociones: ${err.message}` });
  }
});

// POST /api/superadmin/tenants - Create a tenant from Super Admin dashboard
app.post('/api/superadmin/tenants', superAdminAuthMiddleware, async (req, res) => {
  try {
    const { tenantId, name, password, licenseKey, expiresAt, adminEmail } = req.body;
    if (!tenantId || !name || !password) {
      return res.status(400).json({ error: 'Faltan campos obligatorios para la creación.' });
    }

    const cleanId = tenantId.trim().toLowerCase();
    if (!/^[a-z0-9-]+$/.test(cleanId)) {
      return res.status(400).json({ error: 'El ID de promoción sólo debe contener letras minúsculas, números y guiones.' });
    }

    const existing = await findTenant(cleanId);
    if (existing) {
      return res.status(400).json({ error: 'Este ID de promoción ya está registrado.' });
    }

    const defaultExpiresAt = expiresAt || new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString();

    const newTenant: Tenant = {
      id: cleanId,
      name: name.trim(),
      passwordHash: password.trim(),
      createdAt: new Date().toISOString(),
      licenseKey: licenseKey ? licenseKey.trim() : 'TRIAL',
      expiresAt: defaultExpiresAt,
      adminEmail: adminEmail ? adminEmail.trim() : '',
    };

    const saved = await saveTenant(newTenant);
    if (!saved) {
      return res.status(500).json({ error: 'Error al registrar la promoción.' });
    }

    // Seed default month configuration for the brand-new tenant database
    const defaultMonths = [
      { id: '2026-01', name: 'Enero', monthNumber: 1, year: 2026, feeUSD_direct: 8, feeUSD_bcv: 12, feeUSD: 8 },
      { id: '2026-02', name: 'Febrero', monthNumber: 2, year: 2026, feeUSD_direct: 8, feeUSD_bcv: 12, feeUSD: 8 },
      { id: '2026-03', name: 'Marzo', monthNumber: 3, year: 2026, feeUSD_direct: 8, feeUSD_bcv: 12, feeUSD: 8 },
      { id: '2026-04', name: 'Abril', monthNumber: 4, year: 2026, feeUSD_direct: 8, feeUSD_bcv: 12, feeUSD: 8 },
      { id: '2026-05', name: 'Mayo', monthNumber: 5, year: 2026, feeUSD_direct: 12, feeUSD_bcv: 16, feeUSD: 12 },
      { id: '2026-06', name: 'Junio', monthNumber: 6, year: 2026, feeUSD_direct: 12, feeUSD_bcv: 16, feeUSD: 12 },
      { id: '2026-07', name: 'Julio', monthNumber: 7, year: 2026, feeUSD_direct: 12, feeUSD_bcv: 16, feeUSD: 12 },
      { id: '2026-08', name: 'Agosto', monthNumber: 8, year: 2026, feeUSD_direct: 12, feeUSD_bcv: 16, feeUSD: 12 },
      { id: '2026-09', name: 'Septiembre', monthNumber: 9, year: 2026, feeUSD_direct: 12, feeUSD_bcv: 16, feeUSD: 12 },
      { id: '2026-10', name: 'Octubre', monthNumber: 10, year: 2026, feeUSD_direct: 12, feeUSD_bcv: 16, feeUSD: 12 },
      { id: '2026-11', name: 'Noviembre', monthNumber: 11, year: 2026, feeUSD_direct: 12, feeUSD_bcv: 16, feeUSD: 12 },
      { id: '2026-12', name: 'Diciembre', monthNumber: 12, year: 2026, feeUSD_direct: 12, feeUSD_bcv: 16, feeUSD: 12 },
    ];
    await saveServerData(cleanId, {
      members: [],
      months: defaultMonths,
      quotas: [],
      payments: [],
      dollarPurchases: []
    });

    res.json({ success: true, tenant: newTenant });
  } catch (err: any) {
    res.status(500).json({ error: `Error creando promoción: ${err.message}` });
  }
});

// PUT /api/superadmin/tenants/:id - Update tenant from Super Admin dashboard
app.put('/api/superadmin/tenants/:id', superAdminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { newId, name, password, licenseKey, expiresAt, adminEmail } = req.body;
    
    const tenant = await findTenant(id);
    if (!tenant) {
      return res.status(404).json({ error: 'La promoción no existe.' });
    }

    if (name) tenant.name = name.trim();
    if (password) tenant.passwordHash = password.trim();
    if (licenseKey) tenant.licenseKey = licenseKey.trim();
    if (expiresAt) tenant.expiresAt = expiresAt;
    if (adminEmail !== undefined) (tenant as any).adminEmail = adminEmail.trim();

    // If changing ID
    if (newId && newId.trim().toLowerCase() !== id.toLowerCase()) {
      const cleanNewId = newId.trim().toLowerCase();
      if (!/^[a-z0-9-]+$/.test(cleanNewId)) {
        return res.status(400).json({ error: 'El ID de promoción sólo debe contener letras minúsculas, números y guiones.' });
      }
      const existing = await findTenant(cleanNewId);
      if (existing) {
        return res.status(400).json({ error: 'El nuevo ID de promoción ya está en uso.' });
      }
      
      // We need to rename data files and tenant list entries
      const fs = require('fs');
      const path = require('path');
      
      // Update tenant object
      const oldId = tenant.id;
      tenant.id = cleanNewId;
      
      // 1. Local tenants list
      if (fs.existsSync(TENANTS_FILE)) {
        try {
          const list = JSON.parse(fs.readFileSync(TENANTS_FILE, 'utf-8'));
          list[cleanNewId] = tenant;
          delete list[oldId];
          fs.writeFileSync(TENANTS_FILE, JSON.stringify(list, null, 2), 'utf-8');
        } catch(e) {}
      }
      
      // 2. Rename server_data file if exists
      const oldDataFile = path.join(process.cwd(), `server_data_${oldId}.json`);
      const newDataFile = path.join(process.cwd(), `server_data_${cleanNewId}.json`);
      if (fs.existsSync(oldDataFile)) {
        try {
          fs.renameSync(oldDataFile, newDataFile);
        } catch(e) {}
      }

      // 3. Firestore update (if db)
      if (db) {
        try {
          const { doc, setDoc, deleteDoc } = require('firebase/firestore');
          await setDoc(doc(db, 'tenants', cleanNewId), tenant);
          await deleteDoc(doc(db, 'tenants', oldId));
        } catch(e) {}
      }
      
      // Also update any active sessions
      for (const s of activeSessions) {
        if (s.tenantId === oldId) {
          s.tenantId = cleanNewId;
        }
      }
      
      return res.json({ success: true, tenant });
    }

    const saved = await saveTenant(tenant);
    if (!saved) {
      return res.status(500).json({ error: 'Error al actualizar los datos de la promoción.' });
    }

    res.json({ success: true, tenant });
  } catch (err: any) {
    res.status(500).json({ error: `Error actualizando promoción: ${err.message}` });
  }
});

// DELETE /api/superadmin/tenants/:id - Delete tenant completely from Super Admin dashboard
app.delete('/api/superadmin/tenants/:id', superAdminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const cleanId = id.trim().toLowerCase();

    // Remove from local tenants file
    if (fs.existsSync(TENANTS_FILE)) {
      try {
        const list = JSON.parse(fs.readFileSync(TENANTS_FILE, 'utf-8'));
        delete list[cleanId];
        fs.writeFileSync(TENANTS_FILE, JSON.stringify(list, null, 2), 'utf-8');
      } catch (err) {
        console.error('Error removing from local tenants file:', err);
      }
    }

    // Remove local data file if it exists
    const dataFile = path.join(process.cwd(), `server_data_${cleanId}.json`);
    if (fs.existsSync(dataFile)) {
      try {
        fs.unlinkSync(dataFile);
      } catch (err) {
        console.error('Error removing local tenant data file:', err);
      }
    }

    // Remove config file if it exists
    if (fs.existsSync(TENANTS_CONFIG_FILE)) {
      try {
        const allConfigs = JSON.parse(fs.readFileSync(TENANTS_CONFIG_FILE, 'utf-8'));
        delete allConfigs[cleanId];
        fs.writeFileSync(TENANTS_CONFIG_FILE, JSON.stringify(allConfigs, null, 2), 'utf-8');
      } catch (err) {
        console.error('Error removing from local config file:', err);
      }
    }

    // Remove from Firestore
    if (db) {
      try {
        await deleteDoc(doc(db, 'tenants', cleanId));
        await deleteDoc(doc(db, 'tenants_config', cleanId));
        const docs = ['members', 'months', 'quotas', 'payments', 'dollarPurchases'];
        for (const docName of docs) {
          await deleteDoc(doc(db, 'tenants_data', cleanId, 'data', docName));
        }
      } catch (err) {
        console.error('Error removing tenant from Firestore:', err);
      }
    }

    res.json({ success: true, message: 'La promoción y toda su base de datos asociada han sido eliminadas permanentemente.' });
  } catch (err: any) {
    res.status(500).json({ error: `Error eliminando promoción: ${err.message}` });
  }
});

// Migrate legacy single-tenant data if it exists
async function migrateLegacySingleTenantData() {
  const legacyFile = path.join(process.cwd(), 'server_data.json');
  if (fs.existsSync(legacyFile)) {
    console.log('Detected legacy single-tenant data file. Migrating to tenant "original"...');
    try {
      const legacyData = JSON.parse(fs.readFileSync(legacyFile, 'utf-8'));
      const existingTenant = await findTenant('original');
      if (!existingTenant) {
        const newTenant: Tenant = {
          id: 'original',
          name: 'Promoción Original (Migrada)',
          passwordHash: 'admin', // default secure password for migrated tenant
          createdAt: new Date().toISOString(),
          licenseKey: 'TRIAL',
          expiresAt: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(), // 14 days trial
        };
        await saveTenant(newTenant);
        await saveServerData('original', legacyData);

        // Migrate SMTP and Telegram configurations if they exist
        const oldSmtpFile = path.join(process.cwd(), 'smtp_config.json');
        const oldTelegramFile = path.join(process.cwd(), 'telegram_config.json');
        
        const smtp = fs.existsSync(oldSmtpFile) ? JSON.parse(fs.readFileSync(oldSmtpFile, 'utf-8')) : { host: '', port: 587, secure: false, user: '', pass: '', fromName: 'Comité de Finanzas', fromEmail: '', enabled: false };
        const telegram = fs.existsSync(oldTelegramFile) ? JSON.parse(fs.readFileSync(oldTelegramFile, 'utf-8')) : { botToken: '', chatIdAllowed: '', enabled: false };

        await saveTenantConfig('original', { smtp, telegram, telegramLogs: [] });
        console.log('Successfully migrated legacy single-tenant data and config to tenant "original" with password "admin"');
      }
    } catch (err) {
      console.error('Error during legacy data migration:', err);
    }
  }
}

// Start multi-tenant active bots on startup
async function initAllActiveTelegramBots() {
  console.log('Initializing active Telegram Bots for all registered tenants...');
  let list: Record<string, Tenant> = {};

  try {
    if (fs.existsSync(TENANTS_FILE)) {
      list = JSON.parse(fs.readFileSync(TENANTS_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading tenants list from file on startup:', err);
  }

  if (db) {
    try {
      const tenantsSnap = await getDocs(collection(db, 'tenants'));
      tenantsSnap.forEach((doc) => {
        const d = doc.data() as Tenant;
        list[d.id] = d;
      });
    } catch (err) {
      console.error('Error reading tenants from Firestore on startup:', err);
    }
  }

  for (const tenantId of Object.keys(list)) {
    try {
      const config = await loadTenantConfig(tenantId);
      if (config && config.telegram && config.telegram.enabled && config.telegram.botToken) {
        if (process.env.NODE_ENV !== 'production' && !process.env.RENDER_EXTERNAL_URL) {
          console.log(`Starting Telegram Bot Poller for Tenant: ${tenantId}...`);
          startTenantTelegramBot(tenantId, config.telegram.botToken, config.telegram.chatIdAllowed);
        } else {
          const baseUrl = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL;
          if (baseUrl) {
             const webhookUrl = `${baseUrl}/api/telegram-webhook/${tenantId}`;
             console.log(`Registering Webhook on boot for Tenant: ${tenantId} -> ${webhookUrl}`);
             fetch(`https://api.telegram.org/bot${config.telegram.botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`)
               .then(res => res.json())
               .then(data => console.log(`[Boot Webhook Tenant: ${tenantId}] Result:`, data))
               .catch(err => console.error(`[Boot Webhook Tenant: ${tenantId}] Error:`, err.message));
          } else {
             console.log(`Skipping Telegram Poller for Tenant: ${tenantId} (Production, but no RENDER_EXTERNAL_URL provided. Assuming webhook is already active.)`);
          }
        }
      }
    } catch (err) {
      console.error(`Failed to load/initialize Telegram bot for tenant ${tenantId}:`, err);
    }
  }
}

// Setup Vite or Static File Serving
async function startServer() {
  // BACKUP GOOGLE DRIVE ENDPOINT
  app.post('/api/backup/drive', express.json({ limit: '50mb' }), async (req, res) => {
    try {
      const { fileName, fileContent } = req.body;
      
      if (!fileName || !fileContent) {
        return res.status(400).json({ error: 'Falta fileName o fileContent' });
      }

      // Check for headers that the proxy might inject if user authenticated via set_up_oauth
      const accessToken = req.headers['x-goog-oauth2-access-token'] || 
                          (req.headers.authorization ? req.headers.authorization.split('Bearer ')[1] : null);

      if (!accessToken) {
         return res.status(401).json({ error: 'No autorizado. Requiere sesión iniciada para respaldar en Google Drive.' });
      }

      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken as string });
      
      const drive = google.drive({ version: 'v3', auth: oauth2Client });
      
      const fileMetadata = {
        name: fileName,
        mimeType: 'application/json',
      };
      
      const media = {
        mimeType: 'application/json',
        body: fileContent
      };

      const file = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id',
      });
      
      res.json({ success: true, fileId: file.data.id });
    } catch (error: any) {
      console.error('Error uploading to Google Drive:', error);
      res.status(500).json({ error: 'Error al subir el respaldo a Google Drive', details: error.message });
    }
  });

  // TENANT GOOGLE DRIVE REFRESH TOKEN AUTH ENDPOINTS
  app.post('/api/tenant/google-drive-auth', express.json(), async (req, res) => {
    try {
      const tenantId = (req.headers['x-tenant-id'] as string) || req.body.tenantId || 'original';
      const { code, accessToken, refreshToken, autoBackupEnabled, userEmail } = req.body;

      let finalAccessToken = accessToken || '';
      let finalRefreshToken = refreshToken || '';

      const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "753906353358-ld8k47do0qkqfsnmidk4t50ojrbaihre.apps.googleusercontent.com";
      const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

      if (code) {
        try {
          const oauth2Client = new google.auth.OAuth2(
            GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET,
            'postmessage'
          );
          const { tokens } = await oauth2Client.getToken(code);
          if (tokens.access_token) finalAccessToken = tokens.access_token;
          if (tokens.refresh_token) finalRefreshToken = tokens.refresh_token;
        } catch (codeErr: any) {
          console.warn('[Google Drive Auth] Code exchange note:', codeErr.message);
        }
      }

      const config = await loadTenantConfig(tenantId);
      config.googleDrive = {
        accessToken: finalAccessToken || config.googleDrive?.accessToken || '',
        refreshToken: finalRefreshToken || config.googleDrive?.refreshToken || '',
        autoBackupEnabled: autoBackupEnabled !== false,
        lastAutoBackupDate: config.googleDrive?.lastAutoBackupDate || '',
        userEmail: userEmail || config.googleDrive?.userEmail || '',
        updatedAt: new Date().toISOString()
      };

      await saveTenantConfig(tenantId, config);
      res.json({ success: true, googleDrive: config.googleDrive });
    } catch (err: any) {
      console.error('Error saving Google Drive Auth for tenant:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/tenant/google-drive-status', async (req, res) => {
    try {
      const tenantId = (req.headers['x-tenant-id'] as string) || 'original';
      const config = await loadTenantConfig(tenantId);
      const gd = config.googleDrive;
      res.json({
        success: true,
        isConnected: !!(gd && (gd.refreshToken || gd.accessToken)),
        hasRefreshToken: !!(gd && gd.refreshToken),
        autoBackupEnabled: gd ? (gd.autoBackupEnabled !== false) : false,
        lastAutoBackupDate: gd?.lastAutoBackupDate || null,
        userEmail: gd?.userEmail || null,
        updatedAt: gd?.updatedAt || null
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/tenant/google-drive-disconnect', async (req, res) => {
    try {
      const tenantId = (req.headers['x-tenant-id'] as string) || 'original';
      const config = await loadTenantConfig(tenantId);
      config.googleDrive = { autoBackupEnabled: false, lastAutoBackupDate: '', refreshToken: '', accessToken: '' };
      await saveTenantConfig(tenantId, config);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);

    // Run background initializations after HTTP server binds port 3000
    migrateLegacySingleTenantData().catch((err) => {
      console.error('Migration error:', err);
    });

    initAllActiveTelegramBots().catch((tgErr) => {
      console.error('Failed to initialize multi-tenant Telegram Bots:', tgErr);
    });

    // Run Master Daily Backup Routine for SuperAdmin
    generateMasterDailySnapshot().catch((bErr) => {
      console.error('Master daily backup error:', bErr);
    });
    // Run Automated Tenant Google Drive Backups
    runTenantDailyDriveBackups().catch((dErr) => {
      console.error('Tenant Drive daily backup error:', dErr);
    });

    // Interval check every 12 hours
    setInterval(() => {
      generateMasterDailySnapshot().catch(err => console.error('Interval master backup error:', err));
      runTenantDailyDriveBackups().catch(err => console.error('Interval tenant drive backup error:', err));
    }, 12 * 3600 * 1000);
  });
}

startServer();
