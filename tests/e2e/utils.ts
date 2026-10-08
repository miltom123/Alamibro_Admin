import { expect, type Page } from "@playwright/test";
import type { Rol } from "../../src/lib/tipos";

/** Jueves 8 oct 2026, 8:30 PM en Lima: tienda abierta y día de 3x2. */
export const JUEVES_NOCHE = new Date("2026-10-09T01:30:00Z");

const ROL_LABEL: Record<Rol, string> = { admin: "Administrador", caja: "Caja", cocina: "Cocina" };

export async function entrar(page: Page, rol: Rol = "admin", usuario = "milton") {
  await page.clock.setFixedTime(JUEVES_NOCHE);
  await page.goto("/login");
  await page.getByRole("radio", { name: new RegExp(ROL_LABEL[rol]) }).click();
  await page.fill("#adm-user", usuario);
  await page.fill("#adm-pass", "1234");
  await page.getByRole("button", { name: "Entrar como " + ROL_LABEL[rol] }).click();
  await expect(page.getByRole("navigation", { name: "Secciones" })).toBeVisible();
}

export const nav = (page: Page) => page.getByRole("navigation", { name: "Secciones" }).getByRole("link");
export const ir = (page: Page, seccion: string) => nav(page).filter({ hasText: seccion }).click();
export const columna = (page: Page, titulo: string) => page.getByRole("region", { name: titulo, exact: true });
