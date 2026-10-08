-- =====================================================================
-- Ala Mi Bro · Funciones RPC del panel y de la Edge Function crear-pedido
-- Todas son SECURITY DEFINER y validan el rol adentro.
-- =====================================================================

-- ---------------------------------------------------------------------
-- cambiar_estado_pedido: mueve un pedido respetando las transiciones.
-- ---------------------------------------------------------------------
create or replace function public.cambiar_estado_pedido(p_id uuid, p_estado text)
returns public.pedidos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rol    text := public.rol_actual();
  v_pedido public.pedidos;
begin
  if v_rol is null then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select * into v_pedido from public.pedidos where id = p_id for update;
  if not found then
    raise exception 'Pedido no encontrado' using errcode = 'P0002';
  end if;

  if v_pedido.estado = p_estado then
    return v_pedido; -- sin cambios
  end if;

  if not public.transicion_permitida(v_pedido.estado, p_estado, v_pedido.modalidad, v_rol) then
    raise exception 'No se puede pasar el pedido de "%" a "%"', v_pedido.estado, p_estado
      using errcode = '22023';
  end if;

  update public.pedidos set estado = p_estado where id = p_id
  returning * into v_pedido;
  return v_pedido;
end;
$$;

-- ---------------------------------------------------------------------
-- registrar_venta_caja: venta en el local. Entra directo a cocina y
-- descuenta stock en la misma transacción. Devuelve el código AMB-#####.
--
-- p = {
--   "cliente": "Nombre", "telefono": "9xxxxxxxx", "modalidad": "salon|recojo|delivery",
--   "direccion": "", "pago": "Efectivo", "pagado": true, "nota": "",
--   "cupon": null, "descuento": 0,
--   "items": [{ "productoId": "clasicas", "presentacionId": "12", "nombre": "Alitas Clásicas",
--               "detalle": "12 alitas · Salsas: BBQ", "qty": 2, "total": 64, "salsas": ["bbq"] }]
-- }
-- (también acepta producto_id, presentacion_clave, cantidad y metodo_pago)
-- ---------------------------------------------------------------------
create or replace function public.registrar_venta_caja(p jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rol       text := public.rol_actual();
  v_items     jsonb := coalesce(p -> 'items', '[]'::jsonb);
  v_item      jsonb;
  v_orden     int := 0;
  v_subtotal  numeric(10,2) := 0;
  v_descuento numeric(10,2) := greatest(coalesce((p ->> 'descuento')::numeric, 0), 0);
  v_modalidad text := coalesce(nullif(p ->> 'modalidad', ''), 'salon');
  v_pedido    public.pedidos;
  v_prod     record;
begin
  if v_rol is null or v_rol not in ('admin', 'caja') then
    raise exception 'Solo admin o caja pueden registrar ventas' using errcode = '42501';
  end if;
  if jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) = 0 then
    raise exception 'La venta no tiene productos' using errcode = '22023';
  end if;
  if v_modalidad not in ('delivery', 'recojo', 'salon') then
    raise exception 'Modalidad inválida: %', v_modalidad using errcode = '22023';
  end if;

  -- Bloquear las filas de los productos vendidos para evitar sobreventa entre cajas.
  perform 1
     from public.productos pr
    where pr.id in (select coalesce(i ->> 'productoId', i ->> 'producto_id')
                      from jsonb_array_elements(v_items) i)
    order by pr.id
      for update;

  -- Validar productos, disponibilidad y stock.
  for v_prod in
    select t.pid, sum(t.qty)::int as n, pr.id as existe, pr.nombre, pr.disponible, pr.stock
      from (select coalesce(i ->> 'productoId', i ->> 'producto_id') as pid,
                   coalesce((i ->> 'qty')::int, (i ->> 'cantidad')::int, 1) as qty
              from jsonb_array_elements(v_items) i) t
      left join public.productos pr on pr.id = t.pid
     where t.pid is not null
     group by t.pid, pr.id, pr.nombre, pr.disponible, pr.stock
  loop
    if v_prod.existe is null then
      raise exception 'Producto no encontrado: %', v_prod.pid using errcode = '22023';
    end if;
    if not v_prod.disponible then
      raise exception '% no está disponible', v_prod.nombre using errcode = '22023';
    end if;
    if v_prod.stock < v_prod.n then
      raise exception 'Stock insuficiente de % (quedan %)', v_prod.nombre, v_prod.stock using errcode = '22023';
    end if;
  end loop;

  select coalesce(sum(coalesce((i ->> 'total')::numeric, 0)), 0)
    into v_subtotal
    from jsonb_array_elements(v_items) i;

  insert into public.pedidos (
    cliente_nombre, telefono, canal, modalidad, direccion, metodo_pago, pagado,
    estado, nota, cupon, descuento, subtotal, total, zona_id, stock_descontado
  ) values (
    coalesce(nullif(btrim(coalesce(p ->> 'cliente', p ->> 'cliente_nombre')), ''), 'Cliente en local'),
    nullif(btrim(coalesce(p ->> 'telefono', '')), ''),
    'caja',
    v_modalidad,
    coalesce(p ->> 'direccion', ''),
    coalesce(nullif(p ->> 'pago', ''), nullif(p ->> 'metodo_pago', ''), 'Efectivo'),
    coalesce((p ->> 'pagado')::boolean, false),
    'cocina',
    coalesce(p ->> 'nota', ''),
    nullif(upper(btrim(coalesce(p ->> 'cupon', ''))), ''),
    least(v_descuento, v_subtotal),
    v_subtotal,
    greatest(v_subtotal - v_descuento, 0),
    nullif(coalesce(p ->> 'zonaId', p ->> 'zona_id'), '')::uuid,
    true
  )
  returning * into v_pedido;

  for v_item in select * from jsonb_array_elements(v_items)
  loop
    insert into public.pedido_items (
      pedido_id, producto_id, presentacion_clave, nombre, detalle, cantidad, total, salsas, detalle_json, orden
    ) values (
      v_pedido.id,
      coalesce(v_item ->> 'productoId', v_item ->> 'producto_id'),
      coalesce(v_item ->> 'presentacionId', v_item ->> 'presentacion_clave'),
      coalesce(v_item ->> 'nombre', 'Producto'),
      coalesce(v_item ->> 'detalle', ''),
      coalesce((v_item ->> 'qty')::int, (v_item ->> 'cantidad')::int, 1),
      coalesce((v_item ->> 'total')::numeric, 0),
      coalesce(array(select jsonb_array_elements_text(v_item -> 'salsas')), '{}'),
      v_item,
      v_orden
    );
    v_orden := v_orden + 1;
  end loop;

  -- Descontar stock.
  update public.productos pr
     set stock = pr.stock - t.n
    from (select producto_id, sum(cantidad)::int as n
            from public.pedido_items
           where pedido_id = v_pedido.id and producto_id is not null
           group by producto_id) t
   where pr.id = t.producto_id;

  return v_pedido.codigo;
end;
$$;

-- ---------------------------------------------------------------------
-- ajustar_stock: suma o resta stock (nunca baja de 0). Devuelve el nuevo stock.
-- ---------------------------------------------------------------------
create or replace function public.ajustar_stock(p_producto text, p_delta int)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stock int;
begin
  if coalesce(public.rol_actual() in ('admin', 'caja'), false) is not true then
    raise exception 'Solo admin o caja pueden ajustar el stock' using errcode = '42501';
  end if;

  update public.productos
     set stock = greatest(stock + coalesce(p_delta, 0), 0)
   where id = p_producto
  returning stock into v_stock;

  if not found then
    raise exception 'Producto no encontrado: %', p_producto using errcode = 'P0002';
  end if;
  return v_stock;
end;
$$;

-- ---------------------------------------------------------------------
-- marcar_sin_respuesta: pedidos web en "nuevo" por más de 30 min → sin_respuesta.
-- La ejecuta pg_cron cada 5 minutos (si está disponible) o el panel (admin/caja).
-- ---------------------------------------------------------------------
create or replace function public.marcar_sin_respuesta(p_minutos int default 30)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rol text := public.rol_actual();
  v_n   int;
begin
  if v_rol is not null and v_rol not in ('admin', 'caja') then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  update public.pedidos
     set estado = 'sin_respuesta'
   where estado = 'nuevo'
     and canal = 'web'
     and creado_en < now() - make_interval(mins => p_minutos);
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- ---------------------------------------------------------------------
-- insertar_pedido_web: uso interno de la Edge Function crear-pedido (service role).
-- Inserta pedido + ítems + uso de cupón en una sola transacción.
-- ---------------------------------------------------------------------
create or replace function public.insertar_pedido_web(p_pedido jsonb, p_items jsonb, p_promo_id uuid default null)
returns table (id uuid, codigo text, total numeric)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pedido public.pedidos;
  v_item   jsonb;
  v_orden  int := 0;
begin
  insert into public.pedidos (
    cliente_nombre, telefono, canal, modalidad, direccion, metodo_pago, pagado, estado,
    nota, cupon, descuento, subtotal, total, zona_id, ip_hash
  ) values (
    coalesce(p_pedido ->> 'cliente_nombre', ''),
    nullif(p_pedido ->> 'telefono', ''),
    'web',
    p_pedido ->> 'modalidad',
    coalesce(p_pedido ->> 'direccion', ''),
    coalesce(p_pedido ->> 'metodo_pago', 'Efectivo'),
    false,
    'nuevo',
    coalesce(p_pedido ->> 'nota', ''),
    nullif(p_pedido ->> 'cupon', ''),
    coalesce((p_pedido ->> 'descuento')::numeric, 0),
    (p_pedido ->> 'subtotal')::numeric,
    (p_pedido ->> 'total')::numeric,
    nullif(p_pedido ->> 'zona_id', '')::uuid,
    nullif(p_pedido ->> 'ip_hash', '')
  )
  returning * into v_pedido;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.pedido_items (
      pedido_id, producto_id, presentacion_clave, nombre, detalle, cantidad, total, salsas, detalle_json, orden
    ) values (
      v_pedido.id,
      v_item ->> 'producto_id',
      v_item ->> 'presentacion_clave',
      v_item ->> 'nombre',
      coalesce(v_item ->> 'detalle', ''),
      (v_item ->> 'cantidad')::int,
      (v_item ->> 'total')::numeric,
      coalesce(array(select jsonb_array_elements_text(v_item -> 'salsas')), '{}'),
      v_item -> 'detalle_json',
      v_orden
    );
    v_orden := v_orden + 1;
  end loop;

  if p_promo_id is not null then
    insert into public.cupon_usos (promo_id, pedido_id, telefono)
    values (p_promo_id, v_pedido.id, v_pedido.telefono);
  end if;

  return query select v_pedido.id, v_pedido.codigo, v_pedido.total;
end;
$$;

-- ---------------------------------------------------------------------
-- Permisos de ejecución
-- ---------------------------------------------------------------------
revoke execute on function public.cambiar_estado_pedido(uuid, text) from public, anon;
revoke execute on function public.registrar_venta_caja(jsonb) from public, anon;
revoke execute on function public.ajustar_stock(text, int) from public, anon;
revoke execute on function public.marcar_sin_respuesta(int) from public, anon;
revoke execute on function public.insertar_pedido_web(jsonb, jsonb, uuid) from public, anon, authenticated;

grant execute on function public.cambiar_estado_pedido(uuid, text) to authenticated, service_role;
grant execute on function public.registrar_venta_caja(jsonb) to authenticated, service_role;
grant execute on function public.ajustar_stock(text, int) to authenticated, service_role;
grant execute on function public.marcar_sin_respuesta(int) to authenticated, service_role;
grant execute on function public.insertar_pedido_web(jsonb, jsonb, uuid) to service_role;
