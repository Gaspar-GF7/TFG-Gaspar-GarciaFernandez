/**
 * Test de tiempo real con Socket.IO — dos contextos de navegador.
 *
 * Contexto A (observador): se queda quieto en /stock.
 * Contexto B (actor):      hace un POST al API para crear un movimiento.
 * Verificación: el stock en el contexto A cambia solo, sin recargar.
 */

import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHOTS_DIR = path.join(__dirname, '../screenshots');
if (!fs.existsSync(SHOTS_DIR)) fs.mkdirSync(SHOTS_DIR, { recursive: true });

const BASE      = 'http://localhost:8080';
const API       = 'http://localhost:3000/api';
const EMAIL     = 'admin@pyme.com';
const PASSWORD  = 'admin123';
// Item que vamos a modificar (id=1, Harina 000)
const ITEM_ID   = 1;
const ITEM_NAME = 'Harina 000';

async function login(page) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`, { timeout: 8000 });
}

async function getStockText(page) {
  // Busca la celda de stock del item en la tabla de /stock
  const row = page.locator('tr', { hasText: ITEM_NAME });
  const stockCell = row.locator('td').nth(2); // columna Stock
  return (await stockCell.textContent()).trim();
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  // ── Contexto A: observador ───────────────────────────────────────────────────
  const ctxA  = await browser.newContext();
  const pageA = await ctxA.newPage();

  console.log('[A] Login y navegación a /stock...');
  await login(pageA);
  await pageA.goto(`${BASE}/stock`);
  await pageA.waitForSelector(`tr:has-text("${ITEM_NAME}")`, { timeout: 8000 });

  const stockAntes = await getStockText(pageA);
  console.log(`[A] Stock ANTES: ${stockAntes}`);
  await pageA.screenshot({ path: `${SHOTS_DIR}/A_antes.png` });

  // ── Contexto B: actor ────────────────────────────────────────────────────────
  const ctxB  = await browser.newContext();
  const pageB = await ctxB.newPage();

  console.log('[B] Login...');
  await login(pageB);

  // Usamos page.request (corre en Node.js, sin restricciones CORS)
  console.log('[B] Obteniendo token via Playwright request...');
  const tokenRes = await pageB.request.post(`${API}/auth/login`, {
    data: { email: EMAIL, password: PASSWORD },
  });
  const { token } = await tokenRes.json();

  console.log('[B] Registrando movimiento de entrada (cantidad=50)...');
  const movReq = await pageB.request.post(`${API}/movimientos`, {
    data: {
      item_id:     ITEM_ID,
      tipo:        'entrada',
      cantidad:    50,
      observacion: 'Test Playwright tiempo real',
    },
    headers: { Authorization: `Bearer ${token}` },
  });
  const movRes = await movReq.json();

  console.log(`[B] Respuesta: stock_nuevo=${movRes.stock_nuevo}`);
  const stockEsperado = String(movRes.stock_nuevo);

  // ── Esperar actualización en Contexto A ──────────────────────────────────────
  console.log('[A] Esperando actualización en tiempo real (máx 5s)...');
  try {
    await pageA.waitForFunction(
      ({ itemName, expected }) => {
        const rows = document.querySelectorAll('tr');
        for (const row of rows) {
          if (row.textContent.includes(itemName)) {
            const cells = row.querySelectorAll('td');
            if (cells[2]) {
              const txt = cells[2].textContent.trim();
              return txt.includes(expected);
            }
          }
        }
        return false;
      },
      { itemName: ITEM_NAME, expected: stockEsperado },
      { timeout: 5000 }
    );

    const stockDespues = await getStockText(pageA);
    console.log(`[A] Stock DESPUÉS: ${stockDespues} ✅`);
    await pageA.screenshot({ path: `${SHOTS_DIR}/A_despues.png` });

    if (stockDespues.includes(stockEsperado)) {
      console.log('\n✅ TEST PASADO: el stock se actualizó en tiempo real sin recargar la página');
      console.log(`   ${ITEM_NAME}: ${stockAntes} → ${stockDespues}`);
      console.log(`   Screenshots: screenshots/A_antes.png  y  screenshots/A_despues.png`);
    } else {
      console.error(`\n❌ Stock esperado ${stockEsperado} pero se obtuvo ${stockDespues}`);
      process.exitCode = 1;
    }
  } catch {
    const stockDespues = await getStockText(pageA).catch(() => '(no encontrado)');
    console.error(`\n❌ TIMEOUT: El stock no se actualizó en 5s.`);
    console.error(`   Stock en pantalla: ${stockDespues}, esperado: ${stockEsperado}`);
    await pageA.screenshot({ path: `${SHOTS_DIR}/A_fallo.png` });
    process.exitCode = 1;
  }

  await browser.close();
})();
