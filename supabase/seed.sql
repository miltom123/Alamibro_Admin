-- =====================================================================
-- Ala Mi Bro · Datos iniciales (GENERADO por scripts/generar-seed.mjs)
-- No editar a mano: cambia src/data/catalogo.json y vuelve a generar.
-- Idempotente: se puede ejecutar varias veces.
-- =====================================================================

begin;

-- Categorías
insert into public.categorias (id, label, orden) values ('alitas', 'Alitas', 1)
  on conflict (id) do update set label = excluded.label, orden = excluded.orden;
insert into public.categorias (id, label, orden) values ('combos', 'Combos', 2)
  on conflict (id) do update set label = excluded.label, orden = excluded.orden;
insert into public.categorias (id, label, orden) values ('platos', 'Platos', 3)
  on conflict (id) do update set label = excluded.label, orden = excluded.orden;
insert into public.categorias (id, label, orden) values ('burgers', 'Burgers', 4)
  on conflict (id) do update set label = excluded.label, orden = excluded.orden;
insert into public.categorias (id, label, orden) values ('bebidas', 'Bebidas', 5)
  on conflict (id) do update set label = excluded.label, orden = excluded.orden;
insert into public.categorias (id, label, orden) values ('complementos', 'Complementos', 6)
  on conflict (id) do update set label = excluded.label, orden = excluded.orden;

-- Salsas
insert into public.salsas (id, nombre, tag, disponible, orden) values ('bbq', 'BBQ Ahumada', 'Top', true, 1)
  on conflict (id) do update set nombre = excluded.nombre, tag = excluded.tag, orden = excluded.orden;
insert into public.salsas (id, nombre, tag, disponible, orden) values ('buffalo', 'Buffalo Picante', 'Picante', true, 2)
  on conflict (id) do update set nombre = excluded.nombre, tag = excluded.tag, orden = excluded.orden;
insert into public.salsas (id, nombre, tag, disponible, orden) values ('acevichada', 'Acevichada', null, true, 3)
  on conflict (id) do update set nombre = excluded.nombre, tag = excluded.tag, orden = excluded.orden;
insert into public.salsas (id, nombre, tag, disponible, orden) values ('maracuya', 'Maracuyá', null, true, 4)
  on conflict (id) do update set nombre = excluded.nombre, tag = excluded.tag, orden = excluded.orden;
insert into public.salsas (id, nombre, tag, disponible, orden) values ('honey', 'Honey Mustard', null, true, 5)
  on conflict (id) do update set nombre = excluded.nombre, tag = excluded.tag, orden = excluded.orden;
insert into public.salsas (id, nombre, tag, disponible, orden) values ('rocoto', 'Rocoto Tacneño', 'Picante', true, 6)
  on conflict (id) do update set nombre = excluded.nombre, tag = excluded.tag, orden = excluded.orden;
insert into public.salsas (id, nombre, tag, disponible, orden) values ('teriyaki', 'Teriyaki', null, true, 7)
  on conflict (id) do update set nombre = excluded.nombre, tag = excluded.tag, orden = excluded.orden;
insert into public.salsas (id, nombre, tag, disponible, orden) values ('parmesano', 'Parmesano Ajo', null, true, 8)
  on conflict (id) do update set nombre = excluded.nombre, tag = excluded.tag, orden = excluded.orden;

-- Producto: Alitas Clásicas
insert into public.productos (id, categoria_id, nombre, descripcion, badge, imagen, icono, tile, es_promo_3x2, disponible, stock, orden)
values ('clasicas', 'alitas', 'Alitas Clásicas', 'Crocantes por fuera, jugosas por dentro. Bañadas en la salsa que elijas.', '3x2 L·J·D', '/img/bbq.webp', null, null, true, true, 40, 1)
on conflict (id) do update set categoria_id = excluded.categoria_id, nombre = excluded.nombre, descripcion = excluded.descripcion,
  badge = excluded.badge, imagen = excluded.imagen, icono = excluded.icono, tile = excluded.tile,
  es_promo_3x2 = excluded.es_promo_3x2, orden = excluded.orden;
insert into public.presentaciones (producto_id, clave, etiqueta, precio, unidades, tag, orden)
values ('clasicas', '6', '6 alitas', 18, 6, null, 1)
on conflict (producto_id, clave) do update set etiqueta = excluded.etiqueta, precio = excluded.precio,
  unidades = excluded.unidades, tag = excluded.tag, orden = excluded.orden;
insert into public.presentaciones (producto_id, clave, etiqueta, precio, unidades, tag, orden)
values ('clasicas', '12', '12 alitas', 32, 12, 'Más pedido', 2)
on conflict (producto_id, clave) do update set etiqueta = excluded.etiqueta, precio = excluded.precio,
  unidades = excluded.unidades, tag = excluded.tag, orden = excluded.orden;
insert into public.presentaciones (producto_id, clave, etiqueta, precio, unidades, tag, orden)
values ('clasicas', '18', '18 alitas', 45, 18, 'Mejor precio', 3)
on conflict (producto_id, clave) do update set etiqueta = excluded.etiqueta, precio = excluded.precio,
  unidades = excluded.unidades, tag = excluded.tag, orden = excluded.orden;
insert into public.grupos_opciones (producto_id, clave, titulo, corto, tipo, obligatorio, min, max, max_por_presentacion, aviso, texto_cero, orden)
values ('clasicas', 'salsas', 'Elige tus salsas', 'Salsas', 'multi', true, 1, null, '{1,2,3}'::int[], 'Elige al menos 1 salsa', null, 1)
on conflict (producto_id, clave) do update set titulo = excluded.titulo, corto = excluded.corto, tipo = excluded.tipo,
  obligatorio = excluded.obligatorio, min = excluded.min, max = excluded.max,
  max_por_presentacion = excluded.max_por_presentacion, aviso = excluded.aviso, texto_cero = excluded.texto_cero, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'bbq', 'BBQ Ahumada', 0, null, 'Top', 1
  from public.grupos_opciones g where g.producto_id = 'clasicas' and g.clave = 'salsas'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'buffalo', 'Buffalo Picante', 0, null, 'Picante', 2
  from public.grupos_opciones g where g.producto_id = 'clasicas' and g.clave = 'salsas'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'acevichada', 'Acevichada', 0, null, null, 3
  from public.grupos_opciones g where g.producto_id = 'clasicas' and g.clave = 'salsas'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'maracuya', 'Maracuyá', 0, null, null, 4
  from public.grupos_opciones g where g.producto_id = 'clasicas' and g.clave = 'salsas'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'honey', 'Honey Mustard', 0, null, null, 5
  from public.grupos_opciones g where g.producto_id = 'clasicas' and g.clave = 'salsas'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'rocoto', 'Rocoto Tacneño', 0, null, 'Picante', 6
  from public.grupos_opciones g where g.producto_id = 'clasicas' and g.clave = 'salsas'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'teriyaki', 'Teriyaki', 0, null, null, 7
  from public.grupos_opciones g where g.producto_id = 'clasicas' and g.clave = 'salsas'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'parmesano', 'Parmesano Ajo', 0, null, null, 8
  from public.grupos_opciones g where g.producto_id = 'clasicas' and g.clave = 'salsas'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.grupos_opciones (producto_id, clave, titulo, corto, tipo, obligatorio, min, max, max_por_presentacion, aviso, texto_cero, orden)
values ('clasicas', 'acomp', 'Elige tu acompañamiento', 'Acompañamiento', 'single', true, null, null, null, 'Elige tu acompañamiento', 'Incluido', 2)
on conflict (producto_id, clave) do update set titulo = excluded.titulo, corto = excluded.corto, tipo = excluded.tipo,
  obligatorio = excluded.obligatorio, min = excluded.min, max = excluded.max,
  max_por_presentacion = excluded.max_por_presentacion, aviso = excluded.aviso, texto_cero = excluded.texto_cero, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'papas', 'Papas fritas', 0, null, 'Favorito', 1
  from public.grupos_opciones g where g.producto_id = 'clasicas' and g.clave = 'acomp'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'camote', 'Camote frito', 0, null, null, 2
  from public.grupos_opciones g where g.producto_id = 'clasicas' and g.clave = 'acomp'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'chaufa', 'Arroz chaufa', 3, '/img/chaufa.webp', null, 3
  from public.grupos_opciones g where g.producto_id = 'clasicas' and g.clave = 'acomp'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'ensalada', 'Ensalada fresca', 0, null, null, 4
  from public.grupos_opciones g where g.producto_id = 'clasicas' and g.clave = 'acomp'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.grupos_opciones (producto_id, clave, titulo, corto, tipo, obligatorio, min, max, max_por_presentacion, aviso, texto_cero, orden)
values ('clasicas', 'bebida', '¿Le sumas una bebida?', 'Bebidas', 'qty', false, null, null, null, null, null, 3)
on conflict (producto_id, clave) do update set titulo = excluded.titulo, corto = excluded.corto, tipo = excluded.tipo,
  obligatorio = excluded.obligatorio, min = excluded.min, max = excluded.max,
  max_por_presentacion = excluded.max_por_presentacion, aviso = excluded.aviso, texto_cero = excluded.texto_cero, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'gaseosa', 'Gaseosa 500 ml', 4, null, null, 1
  from public.grupos_opciones g where g.producto_id = 'clasicas' and g.clave = 'bebida'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'chicha', 'Chicha morada (vaso)', 5, null, null, 2
  from public.grupos_opciones g where g.producto_id = 'clasicas' and g.clave = 'bebida'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'limonada', 'Limonada frozen', 6, '/img/limonada.webp', 'Refrescante', 3
  from public.grupos_opciones g where g.producto_id = 'clasicas' and g.clave = 'bebida'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'gaseosa1l', 'Gaseosa 1 L', 8, null, 'Para compartir', 4
  from public.grupos_opciones g where g.producto_id = 'clasicas' and g.clave = 'bebida'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.grupos_opciones (producto_id, clave, titulo, corto, tipo, obligatorio, min, max, max_por_presentacion, aviso, texto_cero, orden)
values ('clasicas', 'extras', 'Hazlo más bro', 'Agregados', 'qty', false, null, null, null, null, null, 4)
on conflict (producto_id, clave) do update set titulo = excluded.titulo, corto = excluded.corto, tipo = excluded.tipo,
  obligatorio = excluded.obligatorio, min = excluded.min, max = excluded.max,
  max_por_presentacion = excluded.max_por_presentacion, aviso = excluded.aviso, texto_cero = excluded.texto_cero, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'alitas3', '+3 alitas', 9, '/img/crispy.webp', 'Más pedido', 1
  from public.grupos_opciones g where g.producto_id = 'clasicas' and g.clave = 'extras'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'papas', 'Porción de papas', 5, null, null, 2
  from public.grupos_opciones g where g.producto_id = 'clasicas' and g.clave = 'extras'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'cheddar', 'Queso cheddar fundido', 4, null, null, 3
  from public.grupos_opciones g where g.producto_id = 'clasicas' and g.clave = 'extras'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'salsa', 'Pote de salsa extra', 2, null, null, 4
  from public.grupos_opciones g where g.producto_id = 'clasicas' and g.clave = 'extras'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;

-- Producto: Alitas Crispy Bro
insert into public.productos (id, categoria_id, nombre, descripcion, badge, imagen, icono, tile, es_promo_3x2, disponible, stock, orden)
values ('crispy', 'alitas', 'Alitas Crispy Bro', 'Empanizado extra crunchy con un toque de queso. Para los que aman el crocante.', '3x2 L·J·D', '/img/crispy.webp', null, null, true, true, 4, 2)
on conflict (id) do update set categoria_id = excluded.categoria_id, nombre = excluded.nombre, descripcion = excluded.descripcion,
  badge = excluded.badge, imagen = excluded.imagen, icono = excluded.icono, tile = excluded.tile,
  es_promo_3x2 = excluded.es_promo_3x2, orden = excluded.orden;
insert into public.presentaciones (producto_id, clave, etiqueta, precio, unidades, tag, orden)
values ('crispy', '6', '6 alitas', 20, 6, null, 1)
on conflict (producto_id, clave) do update set etiqueta = excluded.etiqueta, precio = excluded.precio,
  unidades = excluded.unidades, tag = excluded.tag, orden = excluded.orden;
insert into public.presentaciones (producto_id, clave, etiqueta, precio, unidades, tag, orden)
values ('crispy', '12', '12 alitas', 36, 12, 'Más pedido', 2)
on conflict (producto_id, clave) do update set etiqueta = excluded.etiqueta, precio = excluded.precio,
  unidades = excluded.unidades, tag = excluded.tag, orden = excluded.orden;
insert into public.presentaciones (producto_id, clave, etiqueta, precio, unidades, tag, orden)
values ('crispy', '18', '18 alitas', 50, 18, 'Mejor precio', 3)
on conflict (producto_id, clave) do update set etiqueta = excluded.etiqueta, precio = excluded.precio,
  unidades = excluded.unidades, tag = excluded.tag, orden = excluded.orden;
insert into public.grupos_opciones (producto_id, clave, titulo, corto, tipo, obligatorio, min, max, max_por_presentacion, aviso, texto_cero, orden)
values ('crispy', 'salsas', 'Elige tus salsas', 'Salsas', 'multi', true, 1, null, '{1,2,3}'::int[], 'Elige al menos 1 salsa', null, 1)
on conflict (producto_id, clave) do update set titulo = excluded.titulo, corto = excluded.corto, tipo = excluded.tipo,
  obligatorio = excluded.obligatorio, min = excluded.min, max = excluded.max,
  max_por_presentacion = excluded.max_por_presentacion, aviso = excluded.aviso, texto_cero = excluded.texto_cero, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'bbq', 'BBQ Ahumada', 0, null, 'Top', 1
  from public.grupos_opciones g where g.producto_id = 'crispy' and g.clave = 'salsas'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'buffalo', 'Buffalo Picante', 0, null, 'Picante', 2
  from public.grupos_opciones g where g.producto_id = 'crispy' and g.clave = 'salsas'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'acevichada', 'Acevichada', 0, null, null, 3
  from public.grupos_opciones g where g.producto_id = 'crispy' and g.clave = 'salsas'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'maracuya', 'Maracuyá', 0, null, null, 4
  from public.grupos_opciones g where g.producto_id = 'crispy' and g.clave = 'salsas'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'honey', 'Honey Mustard', 0, null, null, 5
  from public.grupos_opciones g where g.producto_id = 'crispy' and g.clave = 'salsas'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'rocoto', 'Rocoto Tacneño', 0, null, 'Picante', 6
  from public.grupos_opciones g where g.producto_id = 'crispy' and g.clave = 'salsas'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'teriyaki', 'Teriyaki', 0, null, null, 7
  from public.grupos_opciones g where g.producto_id = 'crispy' and g.clave = 'salsas'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'parmesano', 'Parmesano Ajo', 0, null, null, 8
  from public.grupos_opciones g where g.producto_id = 'crispy' and g.clave = 'salsas'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.grupos_opciones (producto_id, clave, titulo, corto, tipo, obligatorio, min, max, max_por_presentacion, aviso, texto_cero, orden)
values ('crispy', 'acomp', 'Elige tu acompañamiento', 'Acompañamiento', 'single', true, null, null, null, 'Elige tu acompañamiento', 'Incluido', 2)
on conflict (producto_id, clave) do update set titulo = excluded.titulo, corto = excluded.corto, tipo = excluded.tipo,
  obligatorio = excluded.obligatorio, min = excluded.min, max = excluded.max,
  max_por_presentacion = excluded.max_por_presentacion, aviso = excluded.aviso, texto_cero = excluded.texto_cero, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'papas', 'Papas fritas', 0, null, 'Favorito', 1
  from public.grupos_opciones g where g.producto_id = 'crispy' and g.clave = 'acomp'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'camote', 'Camote frito', 0, null, null, 2
  from public.grupos_opciones g where g.producto_id = 'crispy' and g.clave = 'acomp'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'chaufa', 'Arroz chaufa', 3, '/img/chaufa.webp', null, 3
  from public.grupos_opciones g where g.producto_id = 'crispy' and g.clave = 'acomp'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'ensalada', 'Ensalada fresca', 0, null, null, 4
  from public.grupos_opciones g where g.producto_id = 'crispy' and g.clave = 'acomp'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.grupos_opciones (producto_id, clave, titulo, corto, tipo, obligatorio, min, max, max_por_presentacion, aviso, texto_cero, orden)
values ('crispy', 'bebida', '¿Le sumas una bebida?', 'Bebidas', 'qty', false, null, null, null, null, null, 3)
on conflict (producto_id, clave) do update set titulo = excluded.titulo, corto = excluded.corto, tipo = excluded.tipo,
  obligatorio = excluded.obligatorio, min = excluded.min, max = excluded.max,
  max_por_presentacion = excluded.max_por_presentacion, aviso = excluded.aviso, texto_cero = excluded.texto_cero, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'gaseosa', 'Gaseosa 500 ml', 4, null, null, 1
  from public.grupos_opciones g where g.producto_id = 'crispy' and g.clave = 'bebida'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'chicha', 'Chicha morada (vaso)', 5, null, null, 2
  from public.grupos_opciones g where g.producto_id = 'crispy' and g.clave = 'bebida'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'limonada', 'Limonada frozen', 6, '/img/limonada.webp', 'Refrescante', 3
  from public.grupos_opciones g where g.producto_id = 'crispy' and g.clave = 'bebida'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'gaseosa1l', 'Gaseosa 1 L', 8, null, 'Para compartir', 4
  from public.grupos_opciones g where g.producto_id = 'crispy' and g.clave = 'bebida'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.grupos_opciones (producto_id, clave, titulo, corto, tipo, obligatorio, min, max, max_por_presentacion, aviso, texto_cero, orden)
values ('crispy', 'extras', 'Hazlo más bro', 'Agregados', 'qty', false, null, null, null, null, null, 4)
on conflict (producto_id, clave) do update set titulo = excluded.titulo, corto = excluded.corto, tipo = excluded.tipo,
  obligatorio = excluded.obligatorio, min = excluded.min, max = excluded.max,
  max_por_presentacion = excluded.max_por_presentacion, aviso = excluded.aviso, texto_cero = excluded.texto_cero, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'alitas3', '+3 alitas', 9, '/img/crispy.webp', 'Más pedido', 1
  from public.grupos_opciones g where g.producto_id = 'crispy' and g.clave = 'extras'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'papas', 'Porción de papas', 5, null, null, 2
  from public.grupos_opciones g where g.producto_id = 'crispy' and g.clave = 'extras'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'cheddar', 'Queso cheddar fundido', 4, null, null, 3
  from public.grupos_opciones g where g.producto_id = 'crispy' and g.clave = 'extras'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'salsa', 'Pote de salsa extra', 2, null, null, 4
  from public.grupos_opciones g where g.producto_id = 'crispy' and g.clave = 'extras'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;

-- Producto: Combo Bro
insert into public.productos (id, categoria_id, nombre, descripcion, badge, imagen, icono, tile, es_promo_3x2, disponible, stock, orden)
values ('combo', 'combos', 'Combo Bro', 'Alitas con papas fritas y arroz chaufa. El plato completo, estilo Ala Mi Bro.', 'Para compartir', '/img/combo.webp', null, null, false, true, 18, 3)
on conflict (id) do update set categoria_id = excluded.categoria_id, nombre = excluded.nombre, descripcion = excluded.descripcion,
  badge = excluded.badge, imagen = excluded.imagen, icono = excluded.icono, tile = excluded.tile,
  es_promo_3x2 = excluded.es_promo_3x2, orden = excluded.orden;
insert into public.presentaciones (producto_id, clave, etiqueta, precio, unidades, tag, orden)
values ('combo', 'per', 'Personal', 26, null, null, 1)
on conflict (producto_id, clave) do update set etiqueta = excluded.etiqueta, precio = excluded.precio,
  unidades = excluded.unidades, tag = excluded.tag, orden = excluded.orden;
insert into public.presentaciones (producto_id, clave, etiqueta, precio, unidades, tag, orden)
values ('combo', 'duo', 'Dúo', 48, null, 'Más pedido', 2)
on conflict (producto_id, clave) do update set etiqueta = excluded.etiqueta, precio = excluded.precio,
  unidades = excluded.unidades, tag = excluded.tag, orden = excluded.orden;
insert into public.presentaciones (producto_id, clave, etiqueta, precio, unidades, tag, orden)
values ('combo', 'fam', 'Familiar', 85, null, null, 3)
on conflict (producto_id, clave) do update set etiqueta = excluded.etiqueta, precio = excluded.precio,
  unidades = excluded.unidades, tag = excluded.tag, orden = excluded.orden;
insert into public.grupos_opciones (producto_id, clave, titulo, corto, tipo, obligatorio, min, max, max_por_presentacion, aviso, texto_cero, orden)
values ('combo', 'salsas', 'Elige tus salsas', 'Salsas', 'multi', true, 1, null, '{1,2,3}'::int[], 'Elige al menos 1 salsa', null, 1)
on conflict (producto_id, clave) do update set titulo = excluded.titulo, corto = excluded.corto, tipo = excluded.tipo,
  obligatorio = excluded.obligatorio, min = excluded.min, max = excluded.max,
  max_por_presentacion = excluded.max_por_presentacion, aviso = excluded.aviso, texto_cero = excluded.texto_cero, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'bbq', 'BBQ Ahumada', 0, null, 'Top', 1
  from public.grupos_opciones g where g.producto_id = 'combo' and g.clave = 'salsas'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'buffalo', 'Buffalo Picante', 0, null, 'Picante', 2
  from public.grupos_opciones g where g.producto_id = 'combo' and g.clave = 'salsas'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'acevichada', 'Acevichada', 0, null, null, 3
  from public.grupos_opciones g where g.producto_id = 'combo' and g.clave = 'salsas'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'maracuya', 'Maracuyá', 0, null, null, 4
  from public.grupos_opciones g where g.producto_id = 'combo' and g.clave = 'salsas'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'honey', 'Honey Mustard', 0, null, null, 5
  from public.grupos_opciones g where g.producto_id = 'combo' and g.clave = 'salsas'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'rocoto', 'Rocoto Tacneño', 0, null, 'Picante', 6
  from public.grupos_opciones g where g.producto_id = 'combo' and g.clave = 'salsas'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'teriyaki', 'Teriyaki', 0, null, null, 7
  from public.grupos_opciones g where g.producto_id = 'combo' and g.clave = 'salsas'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'parmesano', 'Parmesano Ajo', 0, null, null, 8
  from public.grupos_opciones g where g.producto_id = 'combo' and g.clave = 'salsas'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.grupos_opciones (producto_id, clave, titulo, corto, tipo, obligatorio, min, max, max_por_presentacion, aviso, texto_cero, orden)
values ('combo', 'bebidaCombo', 'Bebida del combo', 'Bebida', 'single', true, null, null, null, 'Elige la bebida del combo', 'Incluida', 2)
on conflict (producto_id, clave) do update set titulo = excluded.titulo, corto = excluded.corto, tipo = excluded.tipo,
  obligatorio = excluded.obligatorio, min = excluded.min, max = excluded.max,
  max_por_presentacion = excluded.max_por_presentacion, aviso = excluded.aviso, texto_cero = excluded.texto_cero, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'gaseosa', 'Gaseosa 500 ml', 0, null, null, 1
  from public.grupos_opciones g where g.producto_id = 'combo' and g.clave = 'bebidaCombo'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'chicha', 'Chicha morada', 0, null, null, 2
  from public.grupos_opciones g where g.producto_id = 'combo' and g.clave = 'bebidaCombo'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'limonada', 'Limonada', 0, '/img/limonada.webp', null, 3
  from public.grupos_opciones g where g.producto_id = 'combo' and g.clave = 'bebidaCombo'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'jarra', 'Sube a jarra 1 L', 8, null, 'Upgrade', 4
  from public.grupos_opciones g where g.producto_id = 'combo' and g.clave = 'bebidaCombo'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.grupos_opciones (producto_id, clave, titulo, corto, tipo, obligatorio, min, max, max_por_presentacion, aviso, texto_cero, orden)
values ('combo', 'extras', 'Hazlo más bro', 'Agregados', 'qty', false, null, null, null, null, null, 3)
on conflict (producto_id, clave) do update set titulo = excluded.titulo, corto = excluded.corto, tipo = excluded.tipo,
  obligatorio = excluded.obligatorio, min = excluded.min, max = excluded.max,
  max_por_presentacion = excluded.max_por_presentacion, aviso = excluded.aviso, texto_cero = excluded.texto_cero, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'alitas3', '+3 alitas', 9, '/img/crispy.webp', 'Más pedido', 1
  from public.grupos_opciones g where g.producto_id = 'combo' and g.clave = 'extras'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'papas', 'Porción de papas', 5, null, null, 2
  from public.grupos_opciones g where g.producto_id = 'combo' and g.clave = 'extras'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'cheddar', 'Queso cheddar fundido', 4, null, null, 3
  from public.grupos_opciones g where g.producto_id = 'combo' and g.clave = 'extras'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'salsa', 'Pote de salsa extra', 2, null, null, 4
  from public.grupos_opciones g where g.producto_id = 'combo' and g.clave = 'extras'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;

-- Producto: Chaufa con Hot Dog
insert into public.productos (id, categoria_id, nombre, descripcion, badge, imagen, icono, tile, es_promo_3x2, disponible, stock, orden)
values ('chaufa', 'platos', 'Chaufa con Hot Dog', 'Arroz chaufa al wok con hot dog dorado. Un clásico que nunca falla.', null, '/img/chaufa.webp', null, null, false, true, 22, 4)
on conflict (id) do update set categoria_id = excluded.categoria_id, nombre = excluded.nombre, descripcion = excluded.descripcion,
  badge = excluded.badge, imagen = excluded.imagen, icono = excluded.icono, tile = excluded.tile,
  es_promo_3x2 = excluded.es_promo_3x2, orden = excluded.orden;
insert into public.presentaciones (producto_id, clave, etiqueta, precio, unidades, tag, orden)
values ('chaufa', 'u', 'Plato', 16, null, null, 1)
on conflict (producto_id, clave) do update set etiqueta = excluded.etiqueta, precio = excluded.precio,
  unidades = excluded.unidades, tag = excluded.tag, orden = excluded.orden;
insert into public.grupos_opciones (producto_id, clave, titulo, corto, tipo, obligatorio, min, max, max_por_presentacion, aviso, texto_cero, orden)
values ('chaufa', 'extrasPlato', 'Agrégale', 'Extras', 'qty', false, null, null, null, null, null, 1)
on conflict (producto_id, clave) do update set titulo = excluded.titulo, corto = excluded.corto, tipo = excluded.tipo,
  obligatorio = excluded.obligatorio, min = excluded.min, max = excluded.max,
  max_por_presentacion = excluded.max_por_presentacion, aviso = excluded.aviso, texto_cero = excluded.texto_cero, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'alitas3', '+3 alitas', 9, '/img/crispy.webp', 'Combínalo', 1
  from public.grupos_opciones g where g.producto_id = 'chaufa' and g.clave = 'extrasPlato'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'huevo', 'Huevo frito', 2, null, null, 2
  from public.grupos_opciones g where g.producto_id = 'chaufa' and g.clave = 'extrasPlato'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'hotdog', 'Hot dog extra', 3, null, null, 3
  from public.grupos_opciones g where g.producto_id = 'chaufa' and g.clave = 'extrasPlato'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'papas', 'Porción de papas', 5, null, null, 4
  from public.grupos_opciones g where g.producto_id = 'chaufa' and g.clave = 'extrasPlato'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.grupos_opciones (producto_id, clave, titulo, corto, tipo, obligatorio, min, max, max_por_presentacion, aviso, texto_cero, orden)
values ('chaufa', 'bebida', '¿Le sumas una bebida?', 'Bebidas', 'qty', false, null, null, null, null, null, 2)
on conflict (producto_id, clave) do update set titulo = excluded.titulo, corto = excluded.corto, tipo = excluded.tipo,
  obligatorio = excluded.obligatorio, min = excluded.min, max = excluded.max,
  max_por_presentacion = excluded.max_por_presentacion, aviso = excluded.aviso, texto_cero = excluded.texto_cero, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'gaseosa', 'Gaseosa 500 ml', 4, null, null, 1
  from public.grupos_opciones g where g.producto_id = 'chaufa' and g.clave = 'bebida'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'chicha', 'Chicha morada (vaso)', 5, null, null, 2
  from public.grupos_opciones g where g.producto_id = 'chaufa' and g.clave = 'bebida'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'limonada', 'Limonada frozen', 6, '/img/limonada.webp', 'Refrescante', 3
  from public.grupos_opciones g where g.producto_id = 'chaufa' and g.clave = 'bebida'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'gaseosa1l', 'Gaseosa 1 L', 8, null, 'Para compartir', 4
  from public.grupos_opciones g where g.producto_id = 'chaufa' and g.clave = 'bebida'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;

-- Producto: Chaufa Bro Especial
insert into public.productos (id, categoria_id, nombre, descripcion, badge, imagen, icono, tile, es_promo_3x2, disponible, stock, orden)
values ('lunes', 'platos', 'Chaufa Bro Especial', 'Nuestro chaufa servido con hot dog y papas. Ideal para acompañar tus alitas.', null, '/img/lunes.webp', null, null, false, true, 15, 5)
on conflict (id) do update set categoria_id = excluded.categoria_id, nombre = excluded.nombre, descripcion = excluded.descripcion,
  badge = excluded.badge, imagen = excluded.imagen, icono = excluded.icono, tile = excluded.tile,
  es_promo_3x2 = excluded.es_promo_3x2, orden = excluded.orden;
insert into public.presentaciones (producto_id, clave, etiqueta, precio, unidades, tag, orden)
values ('lunes', 'u', 'Plato', 18, null, null, 1)
on conflict (producto_id, clave) do update set etiqueta = excluded.etiqueta, precio = excluded.precio,
  unidades = excluded.unidades, tag = excluded.tag, orden = excluded.orden;
insert into public.grupos_opciones (producto_id, clave, titulo, corto, tipo, obligatorio, min, max, max_por_presentacion, aviso, texto_cero, orden)
values ('lunes', 'extrasPlato', 'Agrégale', 'Extras', 'qty', false, null, null, null, null, null, 1)
on conflict (producto_id, clave) do update set titulo = excluded.titulo, corto = excluded.corto, tipo = excluded.tipo,
  obligatorio = excluded.obligatorio, min = excluded.min, max = excluded.max,
  max_por_presentacion = excluded.max_por_presentacion, aviso = excluded.aviso, texto_cero = excluded.texto_cero, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'alitas3', '+3 alitas', 9, '/img/crispy.webp', 'Combínalo', 1
  from public.grupos_opciones g where g.producto_id = 'lunes' and g.clave = 'extrasPlato'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'huevo', 'Huevo frito', 2, null, null, 2
  from public.grupos_opciones g where g.producto_id = 'lunes' and g.clave = 'extrasPlato'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'hotdog', 'Hot dog extra', 3, null, null, 3
  from public.grupos_opciones g where g.producto_id = 'lunes' and g.clave = 'extrasPlato'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'papas', 'Porción de papas', 5, null, null, 4
  from public.grupos_opciones g where g.producto_id = 'lunes' and g.clave = 'extrasPlato'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.grupos_opciones (producto_id, clave, titulo, corto, tipo, obligatorio, min, max, max_por_presentacion, aviso, texto_cero, orden)
values ('lunes', 'bebida', '¿Le sumas una bebida?', 'Bebidas', 'qty', false, null, null, null, null, null, 2)
on conflict (producto_id, clave) do update set titulo = excluded.titulo, corto = excluded.corto, tipo = excluded.tipo,
  obligatorio = excluded.obligatorio, min = excluded.min, max = excluded.max,
  max_por_presentacion = excluded.max_por_presentacion, aviso = excluded.aviso, texto_cero = excluded.texto_cero, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'gaseosa', 'Gaseosa 500 ml', 4, null, null, 1
  from public.grupos_opciones g where g.producto_id = 'lunes' and g.clave = 'bebida'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'chicha', 'Chicha morada (vaso)', 5, null, null, 2
  from public.grupos_opciones g where g.producto_id = 'lunes' and g.clave = 'bebida'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'limonada', 'Limonada frozen', 6, '/img/limonada.webp', 'Refrescante', 3
  from public.grupos_opciones g where g.producto_id = 'lunes' and g.clave = 'bebida'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'gaseosa1l', 'Gaseosa 1 L', 8, null, 'Para compartir', 4
  from public.grupos_opciones g where g.producto_id = 'lunes' and g.clave = 'bebida'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;

-- Producto: Burger Bro
insert into public.productos (id, categoria_id, nombre, descripcion, badge, imagen, icono, tile, es_promo_3x2, disponible, stock, orden)
values ('burger', 'burgers', 'Burger Bro', 'Carne a la parrilla, queso cheddar, tocino crocante, lechuga y tomate en pan brioche.', 'Nuevo', '/img/burger.webp', null, null, false, true, 12, 6)
on conflict (id) do update set categoria_id = excluded.categoria_id, nombre = excluded.nombre, descripcion = excluded.descripcion,
  badge = excluded.badge, imagen = excluded.imagen, icono = excluded.icono, tile = excluded.tile,
  es_promo_3x2 = excluded.es_promo_3x2, orden = excluded.orden;
insert into public.presentaciones (producto_id, clave, etiqueta, precio, unidades, tag, orden)
values ('burger', 'u', 'Sola', 20, null, null, 1)
on conflict (producto_id, clave) do update set etiqueta = excluded.etiqueta, precio = excluded.precio,
  unidades = excluded.unidades, tag = excluded.tag, orden = excluded.orden;
insert into public.presentaciones (producto_id, clave, etiqueta, precio, unidades, tag, orden)
values ('burger', 'c', 'Con papas', 25, null, 'Recomendado', 2)
on conflict (producto_id, clave) do update set etiqueta = excluded.etiqueta, precio = excluded.precio,
  unidades = excluded.unidades, tag = excluded.tag, orden = excluded.orden;
insert into public.grupos_opciones (producto_id, clave, titulo, corto, tipo, obligatorio, min, max, max_por_presentacion, aviso, texto_cero, orden)
values ('burger', 'quitar', '¿Le quitamos algo?', 'Sin', 'multi', false, 0, 4, null, null, '', 1)
on conflict (producto_id, clave) do update set titulo = excluded.titulo, corto = excluded.corto, tipo = excluded.tipo,
  obligatorio = excluded.obligatorio, min = excluded.min, max = excluded.max,
  max_por_presentacion = excluded.max_por_presentacion, aviso = excluded.aviso, texto_cero = excluded.texto_cero, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'cebolla', 'Sin cebolla', 0, null, null, 1
  from public.grupos_opciones g where g.producto_id = 'burger' and g.clave = 'quitar'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'tomate', 'Sin tomate', 0, null, null, 2
  from public.grupos_opciones g where g.producto_id = 'burger' and g.clave = 'quitar'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'lechuga', 'Sin lechuga', 0, null, null, 3
  from public.grupos_opciones g where g.producto_id = 'burger' and g.clave = 'quitar'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'pepinillos', 'Sin pepinillos', 0, null, null, 4
  from public.grupos_opciones g where g.producto_id = 'burger' and g.clave = 'quitar'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.grupos_opciones (producto_id, clave, titulo, corto, tipo, obligatorio, min, max, max_por_presentacion, aviso, texto_cero, orden)
values ('burger', 'extrasBurger', 'Hazla más bro', 'Extras', 'qty', false, null, null, null, null, null, 2)
on conflict (producto_id, clave) do update set titulo = excluded.titulo, corto = excluded.corto, tipo = excluded.tipo,
  obligatorio = excluded.obligatorio, min = excluded.min, max = excluded.max,
  max_por_presentacion = excluded.max_por_presentacion, aviso = excluded.aviso, texto_cero = excluded.texto_cero, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'carne', 'Doble carne', 7, null, 'Recomendado', 1
  from public.grupos_opciones g where g.producto_id = 'burger' and g.clave = 'extrasBurger'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'tocino', 'Tocino extra', 3, null, null, 2
  from public.grupos_opciones g where g.producto_id = 'burger' and g.clave = 'extrasBurger'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'huevo', 'Huevo frito', 2, null, null, 3
  from public.grupos_opciones g where g.producto_id = 'burger' and g.clave = 'extrasBurger'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'alitas3', '+3 alitas', 9, '/img/crispy.webp', null, 4
  from public.grupos_opciones g where g.producto_id = 'burger' and g.clave = 'extrasBurger'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.grupos_opciones (producto_id, clave, titulo, corto, tipo, obligatorio, min, max, max_por_presentacion, aviso, texto_cero, orden)
values ('burger', 'bebida', '¿Le sumas una bebida?', 'Bebidas', 'qty', false, null, null, null, null, null, 3)
on conflict (producto_id, clave) do update set titulo = excluded.titulo, corto = excluded.corto, tipo = excluded.tipo,
  obligatorio = excluded.obligatorio, min = excluded.min, max = excluded.max,
  max_por_presentacion = excluded.max_por_presentacion, aviso = excluded.aviso, texto_cero = excluded.texto_cero, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'gaseosa', 'Gaseosa 500 ml', 4, null, null, 1
  from public.grupos_opciones g where g.producto_id = 'burger' and g.clave = 'bebida'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'chicha', 'Chicha morada (vaso)', 5, null, null, 2
  from public.grupos_opciones g where g.producto_id = 'burger' and g.clave = 'bebida'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'limonada', 'Limonada frozen', 6, '/img/limonada.webp', 'Refrescante', 3
  from public.grupos_opciones g where g.producto_id = 'burger' and g.clave = 'bebida'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'gaseosa1l', 'Gaseosa 1 L', 8, null, 'Para compartir', 4
  from public.grupos_opciones g where g.producto_id = 'burger' and g.clave = 'bebida'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;

-- Producto: Bebidas heladas
insert into public.productos (id, categoria_id, nombre, descripcion, badge, imagen, icono, tile, es_promo_3x2, disponible, stock, orden)
values ('limonada', 'bebidas', 'Bebidas heladas', 'Bien heladas para acompañar el picante. Limonada, chicha morada o maracuyá.', null, '/img/limonada.webp', null, null, false, true, 30, 7)
on conflict (id) do update set categoria_id = excluded.categoria_id, nombre = excluded.nombre, descripcion = excluded.descripcion,
  badge = excluded.badge, imagen = excluded.imagen, icono = excluded.icono, tile = excluded.tile,
  es_promo_3x2 = excluded.es_promo_3x2, orden = excluded.orden;
insert into public.presentaciones (producto_id, clave, etiqueta, precio, unidades, tag, orden)
values ('limonada', 'v', 'Vaso', 6, null, null, 1)
on conflict (producto_id, clave) do update set etiqueta = excluded.etiqueta, precio = excluded.precio,
  unidades = excluded.unidades, tag = excluded.tag, orden = excluded.orden;
insert into public.presentaciones (producto_id, clave, etiqueta, precio, unidades, tag, orden)
values ('limonada', 'j', 'Jarra 1 L', 15, null, 'Para compartir', 2)
on conflict (producto_id, clave) do update set etiqueta = excluded.etiqueta, precio = excluded.precio,
  unidades = excluded.unidades, tag = excluded.tag, orden = excluded.orden;
insert into public.grupos_opciones (producto_id, clave, titulo, corto, tipo, obligatorio, min, max, max_por_presentacion, aviso, texto_cero, orden)
values ('limonada', 'sabor', 'Elige el sabor', 'Sabor', 'single', true, null, null, null, 'Elige el sabor', '', 1)
on conflict (producto_id, clave) do update set titulo = excluded.titulo, corto = excluded.corto, tipo = excluded.tipo,
  obligatorio = excluded.obligatorio, min = excluded.min, max = excluded.max,
  max_por_presentacion = excluded.max_por_presentacion, aviso = excluded.aviso, texto_cero = excluded.texto_cero, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'limonada', 'Limonada', 0, '/img/limonada.webp', null, 1
  from public.grupos_opciones g where g.producto_id = 'limonada' and g.clave = 'sabor'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'chicha', 'Chicha morada', 0, null, null, 2
  from public.grupos_opciones g where g.producto_id = 'limonada' and g.clave = 'sabor'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'maracuya', 'Maracuyá', 0, null, null, 3
  from public.grupos_opciones g where g.producto_id = 'limonada' and g.clave = 'sabor'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'frozen', 'Limonada frozen', 2, null, 'Top', 4
  from public.grupos_opciones g where g.producto_id = 'limonada' and g.clave = 'sabor'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.grupos_opciones (producto_id, clave, titulo, corto, tipo, obligatorio, min, max, max_por_presentacion, aviso, texto_cero, orden)
values ('limonada', 'picar', '¿Algo para picar?', 'Para picar', 'qty', false, null, null, null, null, null, 2)
on conflict (producto_id, clave) do update set titulo = excluded.titulo, corto = excluded.corto, tipo = excluded.tipo,
  obligatorio = excluded.obligatorio, min = excluded.min, max = excluded.max,
  max_por_presentacion = excluded.max_por_presentacion, aviso = excluded.aviso, texto_cero = excluded.texto_cero, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'alitas3', '+3 alitas', 9, '/img/crispy.webp', 'Más pedido', 1
  from public.grupos_opciones g where g.producto_id = 'limonada' and g.clave = 'picar'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;
insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, 'papas', 'Papas Bro', 7, null, null, 2
  from public.grupos_opciones g where g.producto_id = 'limonada' and g.clave = 'picar'
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;

-- Producto: Papas Bro
insert into public.productos (id, categoria_id, nombre, descripcion, badge, imagen, icono, tile, es_promo_3x2, disponible, stock, orden)
values ('papasbro', 'complementos', 'Papas Bro', 'Papas fritas crocantes con sal de la casa.', null, null, 'fries', '#B5121B', false, true, 25, 8)
on conflict (id) do update set categoria_id = excluded.categoria_id, nombre = excluded.nombre, descripcion = excluded.descripcion,
  badge = excluded.badge, imagen = excluded.imagen, icono = excluded.icono, tile = excluded.tile,
  es_promo_3x2 = excluded.es_promo_3x2, orden = excluded.orden;
insert into public.presentaciones (producto_id, clave, etiqueta, precio, unidades, tag, orden)
values ('papasbro', 'u', 'Porción', 7, null, null, 1)
on conflict (producto_id, clave) do update set etiqueta = excluded.etiqueta, precio = excluded.precio,
  unidades = excluded.unidades, tag = excluded.tag, orden = excluded.orden;

-- Producto: Papas con cheddar
insert into public.productos (id, categoria_id, nombre, descripcion, badge, imagen, icono, tile, es_promo_3x2, disponible, stock, orden)
values ('papascheddar', 'complementos', 'Papas con cheddar', 'Papas bañadas en queso cheddar fundido y tocino.', null, null, 'fries', '#9A5A00', false, true, 20, 9)
on conflict (id) do update set categoria_id = excluded.categoria_id, nombre = excluded.nombre, descripcion = excluded.descripcion,
  badge = excluded.badge, imagen = excluded.imagen, icono = excluded.icono, tile = excluded.tile,
  es_promo_3x2 = excluded.es_promo_3x2, orden = excluded.orden;
insert into public.presentaciones (producto_id, clave, etiqueta, precio, unidades, tag, orden)
values ('papascheddar', 'u', 'Porción', 10, null, null, 1)
on conflict (producto_id, clave) do update set etiqueta = excluded.etiqueta, precio = excluded.precio,
  unidades = excluded.unidades, tag = excluded.tag, orden = excluded.orden;

-- Producto: 3 alitas extra
insert into public.productos (id, categoria_id, nombre, descripcion, badge, imagen, icono, tile, es_promo_3x2, disponible, stock, orden)
values ('alitas3', 'complementos', '3 alitas extra', 'Tres alitas para el antojo, en la salsa de la casa.', null, '/img/crispy.webp', null, null, false, true, 40, 10)
on conflict (id) do update set categoria_id = excluded.categoria_id, nombre = excluded.nombre, descripcion = excluded.descripcion,
  badge = excluded.badge, imagen = excluded.imagen, icono = excluded.icono, tile = excluded.tile,
  es_promo_3x2 = excluded.es_promo_3x2, orden = excluded.orden;
insert into public.presentaciones (producto_id, clave, etiqueta, precio, unidades, tag, orden)
values ('alitas3', 'u', 'Porción', 9, null, null, 1)
on conflict (producto_id, clave) do update set etiqueta = excluded.etiqueta, precio = excluded.precio,
  unidades = excluded.unidades, tag = excluded.tag, orden = excluded.orden;

-- Producto: Gaseosa 500 ml
insert into public.productos (id, categoria_id, nombre, descripcion, badge, imagen, icono, tile, es_promo_3x2, disponible, stock, orden)
values ('gaseosa', 'complementos', 'Gaseosa 500 ml', 'Bien helada.', null, null, 'drink', '#7A2E12', false, true, 3, 11)
on conflict (id) do update set categoria_id = excluded.categoria_id, nombre = excluded.nombre, descripcion = excluded.descripcion,
  badge = excluded.badge, imagen = excluded.imagen, icono = excluded.icono, tile = excluded.tile,
  es_promo_3x2 = excluded.es_promo_3x2, orden = excluded.orden;
insert into public.presentaciones (producto_id, clave, etiqueta, precio, unidades, tag, orden)
values ('gaseosa', 'u', 'Botella', 4, null, null, 1)
on conflict (producto_id, clave) do update set etiqueta = excluded.etiqueta, precio = excluded.precio,
  unidades = excluded.unidades, tag = excluded.tag, orden = excluded.orden;

-- Producto: Limonada frozen
insert into public.productos (id, categoria_id, nombre, descripcion, badge, imagen, icono, tile, es_promo_3x2, disponible, stock, orden)
values ('frozen', 'complementos', 'Limonada frozen', 'Refrescante y frapeada.', null, '/img/limonada.webp', null, null, false, true, 20, 12)
on conflict (id) do update set categoria_id = excluded.categoria_id, nombre = excluded.nombre, descripcion = excluded.descripcion,
  badge = excluded.badge, imagen = excluded.imagen, icono = excluded.icono, tile = excluded.tile,
  es_promo_3x2 = excluded.es_promo_3x2, orden = excluded.orden;
insert into public.presentaciones (producto_id, clave, etiqueta, precio, unidades, tag, orden)
values ('frozen', 'u', 'Vaso', 8, null, null, 1)
on conflict (producto_id, clave) do update set etiqueta = excluded.etiqueta, precio = excluded.precio,
  unidades = excluded.unidades, tag = excluded.tag, orden = excluded.orden;

-- Producto: Pote de salsa
insert into public.productos (id, categoria_id, nombre, descripcion, badge, imagen, icono, tile, es_promo_3x2, disponible, stock, orden)
values ('salsapote', 'complementos', 'Pote de salsa', 'Tu salsa favorita para bañar todo.', null, null, 'sauce', '#8E0F10', false, true, 20, 13)
on conflict (id) do update set categoria_id = excluded.categoria_id, nombre = excluded.nombre, descripcion = excluded.descripcion,
  badge = excluded.badge, imagen = excluded.imagen, icono = excluded.icono, tile = excluded.tile,
  es_promo_3x2 = excluded.es_promo_3x2, orden = excluded.orden;
insert into public.presentaciones (producto_id, clave, etiqueta, precio, unidades, tag, orden)
values ('salsapote', 'u', 'Pote', 2, null, null, 1)
on conflict (producto_id, clave) do update set etiqueta = excluded.etiqueta, precio = excluded.precio,
  unidades = excluded.unidades, tag = excluded.tag, orden = excluded.orden;

-- Agregados (pestaña Agregados del admin)
insert into public.agregados (id, nombre, precio, disponible, orden) values ('papas', 'Porción de papas', 5, true, 1)
  on conflict (id) do update set nombre = excluded.nombre, precio = excluded.precio, orden = excluded.orden;
insert into public.agregados (id, nombre, precio, disponible, orden) values ('cheddar', 'Queso cheddar fundido', 4, true, 2)
  on conflict (id) do update set nombre = excluded.nombre, precio = excluded.precio, orden = excluded.orden;
insert into public.agregados (id, nombre, precio, disponible, orden) values ('salsa', 'Pote de salsa extra', 2, true, 3)
  on conflict (id) do update set nombre = excluded.nombre, precio = excluded.precio, orden = excluded.orden;
insert into public.agregados (id, nombre, precio, disponible, orden) values ('carne', 'Doble carne', 7, true, 4)
  on conflict (id) do update set nombre = excluded.nombre, precio = excluded.precio, orden = excluded.orden;
insert into public.agregados (id, nombre, precio, disponible, orden) values ('tocino', 'Tocino extra', 3, true, 5)
  on conflict (id) do update set nombre = excluded.nombre, precio = excluded.precio, orden = excluded.orden;
insert into public.agregados (id, nombre, precio, disponible, orden) values ('huevo', 'Huevo frito', 2, true, 6)
  on conflict (id) do update set nombre = excluded.nombre, precio = excluded.precio, orden = excluded.orden;
insert into public.agregados (id, nombre, precio, disponible, orden) values ('chaufa', 'Arroz chaufa (acomp.)', 3, true, 7)
  on conflict (id) do update set nombre = excluded.nombre, precio = excluded.precio, orden = excluded.orden;

-- Zonas de delivery
update public.zonas_delivery set costo = 3, orden = 1 where nombre = 'Cercado de Tacna';
insert into public.zonas_delivery (nombre, costo, orden)
  select 'Cercado de Tacna', 3, 1 where not exists (select 1 from public.zonas_delivery where nombre = 'Cercado de Tacna');
update public.zonas_delivery set costo = 5, orden = 2 where nombre = 'Gregorio Albarracín';
insert into public.zonas_delivery (nombre, costo, orden)
  select 'Gregorio Albarracín', 5, 2 where not exists (select 1 from public.zonas_delivery where nombre = 'Gregorio Albarracín');
update public.zonas_delivery set costo = 5, orden = 3 where nombre = 'Ciudad Nueva';
insert into public.zonas_delivery (nombre, costo, orden)
  select 'Ciudad Nueva', 5, 3 where not exists (select 1 from public.zonas_delivery where nombre = 'Ciudad Nueva');
update public.zonas_delivery set costo = 6, orden = 4 where nombre = 'Pocollay';
insert into public.zonas_delivery (nombre, costo, orden)
  select 'Pocollay', 6, 4 where not exists (select 1 from public.zonas_delivery where nombre = 'Pocollay');

-- Ajustes de la tienda
insert into public.ajustes_tienda (id, tienda_abierta, abre, cierra, whatsapp, yape, plin, direccion, encuesta)
values (1, true, '17:00', '23:30', '51960394794', '', '', 'Av. San Martín 1115 – Tacna', '[{"id":"estrellas","label":"Calificación de 1 a 5 estrellas","activa":true},{"id":"origen","label":"¿Dónde nos conociste?","activa":true},{"id":"mejorar","label":"¿Qué podemos mejorar?","activa":true},{"id":"comentario","label":"Comentario libre","activa":true}]'::jsonb)
on conflict (id) do nothing;

-- Promos
insert into public.promos (nombre, tipo, valor, dias, desde, hasta, alcance, codigo_cupon, activa)
  select '3x2 en alitas', '3x2', null, '{1,4,0}'::int[], '17:00', '23:30', 'Alitas', null, true
  where not exists (select 1 from public.promos where nombre = '3x2 en alitas');
insert into public.promos (nombre, tipo, valor, dias, desde, hasta, alcance, codigo_cupon, activa)
  select 'Combo Dúo a S/ 42', 'precio', 42, '{2}'::int[], '17:00', '20:00', 'Combos', null, false
  where not exists (select 1 from public.promos where nombre = 'Combo Dúo a S/ 42');
insert into public.promos (nombre, tipo, valor, dias, desde, hasta, alcance, codigo_cupon, activa)
  select 'Gracias por tu reseña', 'monto', 3, '{0,1,2,3,4,5,6}'::int[], '17:00', '23:30', 'Toda la carta', 'GRACIASBRO', true
  where not exists (select 1 from public.promos where nombre = 'Gracias por tu reseña');

commit;
