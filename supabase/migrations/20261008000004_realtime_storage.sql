-- =====================================================================
-- Ala Mi Bro · Realtime, Storage y tarea programada
-- Cada bloque está protegido para que la migración no falle en entornos
-- de prueba sin esos esquemas (por ejemplo, PGlite en scripts/probar-sql.mjs).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Realtime: el panel escucha los cambios de pedidos e ítems.
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables
                    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pedidos') then
      execute 'alter publication supabase_realtime add table public.pedidos';
    end if;
    if not exists (select 1 from pg_publication_tables
                    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pedido_items') then
      execute 'alter publication supabase_realtime add table public.pedido_items';
    end if;
  else
    raise notice 'Publicación supabase_realtime no encontrada: se omite Realtime';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Storage: bucket "productos" (lectura pública, escritura solo admin).
-- ---------------------------------------------------------------------
do $$
begin
  if to_regclass('storage.buckets') is null or to_regclass('storage.objects') is null then
    raise notice 'Esquema storage no encontrado: se omite el bucket productos';
    return;
  end if;

  insert into storage.buckets (id, name, public)
  values ('productos', 'productos', true)
  on conflict (id) do update set public = true;

  execute 'drop policy if exists "productos: lectura pública" on storage.objects';
  execute 'drop policy if exists "productos: admin sube" on storage.objects';
  execute 'drop policy if exists "productos: admin edita" on storage.objects';
  execute 'drop policy if exists "productos: admin borra" on storage.objects';

  execute $p$create policy "productos: lectura pública" on storage.objects
    for select to anon, authenticated using (bucket_id = 'productos')$p$;
  execute $p$create policy "productos: admin sube" on storage.objects
    for insert to authenticated
    with check (bucket_id = 'productos' and (select public.rol_actual()) = 'admin')$p$;
  execute $p$create policy "productos: admin edita" on storage.objects
    for update to authenticated
    using (bucket_id = 'productos' and (select public.rol_actual()) = 'admin')
    with check (bucket_id = 'productos' and (select public.rol_actual()) = 'admin')$p$;
  execute $p$create policy "productos: admin borra" on storage.objects
    for delete to authenticated
    using (bucket_id = 'productos' and (select public.rol_actual()) = 'admin')$p$;
end;
$$;

-- ---------------------------------------------------------------------
-- pg_cron: cada 5 minutos marca como "sin_respuesta" los pedidos web sin confirmar.
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    raise notice 'pg_cron no disponible: llama a public.marcar_sin_respuesta() desde el panel';
    return;
  end if;
  begin
    create extension if not exists pg_cron;
    execute $c$select cron.schedule('alamibro-sin-respuesta', '*/5 * * * *',
                                     'select public.marcar_sin_respuesta(30)')$c$;
  exception when others then
    raise notice 'No se pudo programar pg_cron (%): llama a public.marcar_sin_respuesta() desde el panel', sqlerrm;
  end;
end;
$$;
