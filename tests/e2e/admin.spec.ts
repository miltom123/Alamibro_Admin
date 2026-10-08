import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { JUEVES_NOCHE, columna, entrar, ir, nav } from "./utils";

const mensajeLanding = readFileSync("docs/formato-mensaje-whatsapp.md", "utf8").split("```text\n")[1].split("\n```")[0];

test.describe("Login y roles", () => {
  test("validación, rol Cocina y cerrar sesión", async ({ page }) => {
    await page.clock.setFixedTime(JUEVES_NOCHE);
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    await page.getByRole("button", { name: /Entrar como/ }).click();
    await expect(page.getByRole("alert")).toContainText("Revisa tu usuario");

    await entrar(page, "cocina", "juan");
    await expect(nav(page)).toHaveCount(1);
    await expect(nav(page).first()).toContainText("Pedidos");
    await expect(page.getByRole("button", { name: "+ Nuevo pedido" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Pegar pedido de WhatsApp" })).toHaveCount(0);
    // Cocina no acepta pedidos (lo hace caja), pero sí los marca listos
    await expect(columna(page, "Nuevos").getByRole("button", { name: "Aceptar" })).toHaveCount(0);
    await expect(columna(page, "En cocina").getByRole("button", { name: "Marcar listo" }).first()).toBeVisible();
    // Una URL fuera de su rol lo devuelve a Pedidos
    await page.goto("/reportes");
    await expect(page).toHaveURL(/\/pedidos$/);

    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page.locator("#adm-user")).toBeVisible();
  });

  test("Caja ve Pedidos, Caja y Clientes", async ({ page }) => {
    await entrar(page, "caja", "rosa");
    await expect(nav(page)).toHaveText([/Pedidos/, /Caja/, /Clientes/]);
  });
});

test("flujo completo del administrador", async ({ page, context }) => {
  const errores: string[] = [];
  page.on("pageerror", (e) => errores.push(e.message));
  await context.route("https://wa.me/**", (r) => r.abort());
  await entrar(page);
  await expect(nav(page)).toHaveCount(9);

  // Inicio: periodo
  await expect(page.getByText("Hoy es día de 3x2 en alitas")).toBeVisible();
  await page.getByRole("button", { name: "Semana", exact: true }).click();
  await expect(page.getByText("Ventas por día")).toBeVisible();
  await page.getByRole("button", { name: "Mes", exact: true }).click();
  await expect(page.getByText("Ventas por semana")).toBeVisible();

  // ---------- Pedidos ----------
  await ir(page, "Pedidos");
  const milton = columna(page, "Nuevos").locator("article").filter({ hasText: "Milton Flores" });
  await milton.getByRole("button", { name: "Aceptar" }).click();
  await expect(columna(page, "En cocina").locator("article").filter({ hasText: "Milton Flores" })).toBeVisible();
  const miltonCocina = columna(page, "En cocina").locator("article").filter({ hasText: "Milton Flores" });
  await miltonCocina.getByRole("button", { name: /por verificar/ }).click();
  await expect(miltonCocina).toContainText("Yape verificado");

  // Pegar el mensaje de la landing
  await page.getByRole("button", { name: "Pegar pedido de WhatsApp" }).click();
  const dlg = page.getByRole("dialog", { name: "Pegar pedido de WhatsApp" });
  await dlg.locator("textarea").fill(mensajeLanding);
  await expect(dlg).toContainText("Detectado: 2 producto(s) · Valeria Ticona · Delivery · S/ 89.00");
  await dlg.getByRole("button", { name: "Crear pedido" }).click();
  await expect(dlg).toHaveCount(0);
  const valeria = page.locator("article").filter({ hasText: "Valeria Ticona" });
  await expect(columna(page, "Nuevos").locator("article").filter({ hasText: "Valeria Ticona" })).toBeVisible();
  await expect(valeria).toContainText("Calle Zela 715");
  await expect(valeria).toContainText("Arroz chaufa");
  await expect(valeria).toContainText("S/ 89.00");
  await expect(valeria).toContainText("Plin · por verificar");
  for (const paso of ["Aceptar", "Marcar listo", "Enviar con moto", "Entregado"]) {
    await valeria.getByRole("button", { name: paso, exact: true }).click();
    await expect(valeria.getByRole("button", { name: paso, exact: true })).toHaveCount(0);
  }
  await expect(columna(page, "Entregados").locator("article").filter({ hasText: "Valeria Ticona" })).toBeVisible();
  await expect(valeria.getByRole("button", { name: "Enviar encuesta" })).toBeVisible();
  await expect(valeria.getByRole("link", { name: "Avisar al cliente por WhatsApp" })).toHaveAttribute("href", /wa\.me\/51900099988\?text=Hola%20Valeria/);

  // Pegar dos veces un pedido que ya vino con código no lo duplica
  await page.getByRole("button", { name: "Pegar pedido de WhatsApp" }).click();
  const codigoValeria = (await valeria.locator("span").first().innerText()).trim();
  await dlg.locator("textarea").fill(mensajeLanding.replace("*NUEVO PEDIDO – ALA MI BRO*", `*PEDIDO ${codigoValeria} – ALA MI BRO*`));
  await expect(dlg).toContainText("ya está registrado");
  await dlg.getByRole("button", { name: "Cerrar" }).click();

  // Búsqueda
  await page.fill("#adm-search", "burger");
  const visibles = page.locator("article");
  await expect(visibles.first()).toBeVisible();
  for (const t of await visibles.allInnerTexts()) expect(t).toMatch(/Burger/);
  await page.fill("#adm-search", "");

  // ---------- Caja ----------
  await ir(page, "Caja");
  await page.getByRole("button", { name: "Agregar Alitas Clásicas 12 alitas" }).click();
  const ticket = page.getByRole("complementary", { name: "Ticket" });
  await expect(ticket.getByRole("button", { name: "Rocoto Tacneño" })).toBeDisabled();
  await page.getByRole("button", { name: "Registrar y enviar a cocina" }).click();
  await expect(page.getByRole("status")).toContainText("Elige las salsas de Alitas Clásicas");
  await ticket.getByRole("button", { name: "BBQ Ahumada" }).click();
  await ticket.getByRole("button", { name: "Buffalo Picante" }).click();
  await ticket.getByRole("button", { name: "Maracuyá" }).click(); // máx 2 → reemplaza BBQ
  await expect(ticket.getByRole("button", { name: "BBQ Ahumada" })).toHaveAttribute("aria-pressed", "false");
  await page.getByLabel("Recibido (S/)").fill("50");
  await expect(ticket).toContainText("S/ 18.00"); // vuelto 50 − 32
  await page.getByLabel("Cliente / mesa").fill("Mesa 7");
  await page.getByRole("button", { name: "Registrar y enviar a cocina" }).click();
  await expect(page.getByRole("status")).toContainText("enviado a cocina");
  await expect(ticket).toContainText("Toca un tamaño para agregar productos.");

  // ---------- Carta ----------
  await ir(page, "Carta");
  // 40 iniciales − 1 (Milton, al aceptarlo) − 2 (Valeria, pegado y aceptado) − 1 (venta de caja)
  await expect(page.getByLabel("Stock de Alitas Clásicas", { exact: true })).toHaveText("36");
  await page.getByRole("switch", { name: "Disponible Alitas Crispy Bro" }).click();
  await expect(page.getByRole("switch", { name: "Disponible Alitas Crispy Bro" })).toHaveAttribute("aria-checked", "false");
  const precio = page.getByLabel("Precio Burger Bro Sola");
  await precio.fill("22");
  await precio.press("Enter");
  await page.getByRole("tab", { name: "Salsas" }).click();
  await page.getByRole("switch", { name: "Disponible Rocoto Tacneño" }).click();
  await expect(page.getByRole("switch", { name: "Disponible Rocoto Tacneño" })).toHaveAttribute("aria-checked", "true");

  await ir(page, "Pedidos");
  await expect(columna(page, "En cocina").locator("article").filter({ hasText: "Mesa 7" })).toBeVisible();
  await ir(page, "Caja");
  await expect(page.getByRole("button", { name: "Agregar Alitas Crispy Bro 6 alitas" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Agregar Burger Bro Sola" })).toContainText("S/ 22.00");

  // ---------- Promos ----------
  await ir(page, "Promos");
  await page.getByRole("button", { name: "Crear y publicar" }).click();
  await expect(page.getByRole("alert")).toContainText("Ponle un nombre a la promo");
  await page.getByLabel("Nombre visible").fill("Martes de combos");
  await page.getByLabel("Código de cupón (opcional)").fill("bromartes");
  await expect(page.getByText("BROMARTES", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Crear y publicar" }).click();
  await expect(page.getByText("Martes de combos · BROMARTES")).toBeVisible();

  // ---------- Clientes ----------
  await ir(page, "Clientes");
  const vip = page.getByRole("button", { name: /^VIP/ });
  const nVip = Number((await vip.innerText()).replace(/\D/g, ""));
  await vip.click();
  await expect(page.locator("tbody tr")).toHaveCount(nVip);
  for (const t of await page.locator("tbody tr").allInnerTexts()) expect(t).toContain("VIP");
  await page.getByRole("button", { name: /Preparar envío/ }).click();
  const enviar = page.getByRole("link", { name: "Enviar" }).first();
  await expect(enviar).toHaveAttribute("href", /text=Hola%20\w+/);
  await enviar.click();
  await expect(page.getByText(`1 de ${nVip} enviados`)).toBeVisible();
  for (const pg of context.pages()) if (pg !== page) await pg.close();

  // ---------- Reseñas, reportes, ajustes ----------
  await ir(page, "Reseñas");
  await expect(page.getByText("Las alitas BBQ llegaron crocantes")).toBeVisible();
  await page.getByRole("switch", { name: /Comentario libre/ }).click();
  await expect(page.getByRole("switch", { name: /Comentario libre/ })).toHaveAttribute("aria-checked", "false");

  await ir(page, "Reportes");
  const csv = decodeURIComponent((await page.getByRole("link", { name: /Pedidos del turno/ }).getAttribute("href"))!);
  expect(csv).toContain("Valeria Ticona");
  expect(csv).toContain("Mesa 7");
  await expect(page.getByText("OPORTUNIDADES PARA PROBAR")).toBeVisible();

  await ir(page, "Ajustes");
  await page.getByRole("switch", { name: /Recibir pedidos/ }).click();
  await expect(page.getByRole("button", { name: "Tienda cerrada" })).toBeVisible();
  await page.getByLabel("Costo Pocollay").fill("7");
  await page.getByLabel("Costo Pocollay").blur();

  await ir(page, "Inicio");
  await expect(page.getByText("Stock bajo: Gaseosa 500 ml")).toBeVisible();
  await expect(page.getByText(/Salsa agotada/)).toHaveCount(0);

  // Los datos persisten al recargar (modo demo en el navegador)
  await page.reload();
  await expect(page.getByRole("button", { name: "Tienda cerrada" })).toBeVisible();

  expect(errores).toEqual([]);
});

test("tiempo real: un pedido creado en otra pestaña aparece y suena", async ({ page, context }) => {
  await entrar(page);
  await ir(page, "Pedidos");
  // La sesión demo es por pestaña: la otra pestaña entra con su propio usuario (como otro turno de caja).
  const otra = await context.newPage();
  await entrar(otra, "caja", "rosa");
  await otra.getByRole("button", { name: "Pegar pedido de WhatsApp" }).click();
  await otra.getByRole("dialog").locator("textarea").fill(mensajeLanding.replace("Valeria Ticona", "Bro de Prueba"));
  await otra.getByRole("button", { name: "Crear pedido" }).click();
  await expect(columna(page, "Nuevos").locator("article").filter({ hasText: "Bro de Prueba" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("de la web");
});

test("móvil 390 px: sin scroll horizontal y menú deslizable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await entrar(page);
  for (const s of ["inicio", "pedidos", "caja", "carta", "promos", "clientes", "resenas", "reportes", "ajustes"]) {
    await page.goto("/" + s);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(sw, s).toBeLessThanOrEqual(392);
  }
});
