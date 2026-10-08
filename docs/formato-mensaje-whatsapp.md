# Formato del mensaje de WhatsApp

Es el **único contrato de texto** entre la web de pedidos y el panel admin: el admin lo lee con
"Pegar pedido de WhatsApp" como respaldo. Si cambias el formato, cambia también el parser del admin
y este documento. La prueba `tests/unit/reglas.test.ts` compara el mensaje generado con el ejemplo de abajo.

## Ejemplo (fase 1, sin código de pedido)

```text
*NUEVO PEDIDO – ALA MI BRO*

1. *2x Alitas Clásicas* – S/ 82.00
   12 alitas
   Salsas: Buffalo Picante, Acevichada
   Acompañamiento: Arroz chaufa
   1× Limonada frozen
2. *1x Papas Bro* – S/ 7.00

*Total referencial:* S/ 89.00

*Nombre:* Valeria Ticona
*Entrega:* Delivery
*Dirección:* Calle Zela 715, frente al parque
*Pago:* Plin
```

## Reglas

| Parte | Formato |
|---|---|
| Cabecera | `*NUEVO PEDIDO – ALA MI BRO*`. Desde la fase 2, cuando `crear-pedido` asigna código: `*PEDIDO AMB-01234 – ALA MI BRO*` |
| Línea | `N. *<cant>x <producto>* – S/ <total línea>` (guion largo `–`) |
| Detalle | 3 espacios + texto. Tamaño (si hay más de uno), `Grupo: opción`, salsas separadas por coma, extras como `<n>× <opción>`, `Nota: …` |
| Total | `*Total referencial:* S/ <total>` |
| Promo | `(Aplicar promo 3x2 en alitas)` solo si hoy es L/J/D y hay 3+ porciones de alitas con promo |
| Cliente | `*Nombre:*`, `*Entrega:*` (`Delivery` o `Recojo en local`), `*Dirección:*` (solo delivery), `*Pago:*` (`Yape`, `Plin`, `Efectivo`, `Tarjeta`) |

Montos siempre con dos decimales: `S/ 32.00`.
