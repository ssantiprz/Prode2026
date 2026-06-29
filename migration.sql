-- Migración eliminatorias Prode 2026
-- Ejecutar sobre el proyecto Supabase existente. No borra ni altera datos actuales.

alter table participants add column if not exists pin_code text;

create table if not exists knockout_matches (
  id integer primary key,
  phase text not null,
  team1 text,
  team2 text,
  source1_type text,
  source1_match_id integer,
  source2_type text,
  source2_match_id integer,
  sort_order integer not null
);

create table if not exists knockout_predictions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid references participants(id) on delete cascade,
  match_id integer references knockout_matches(id) on delete cascade,
  goals1 integer not null check (goals1 >= 0),
  goals2 integer not null check (goals2 >= 0),
  predicted_winner text not null,
  created_at timestamptz default now(),
  unique(participant_id, match_id)
);

create table if not exists knockout_results (
  match_id integer primary key references knockout_matches(id) on delete cascade,
  goals1 integer not null check (goals1 >= 0),
  goals2 integer not null check (goals2 >= 0),
  winner_team text not null,
  loser_team text not null,
  is_locked boolean default false,
  updated_at timestamptz default now()
);

create table if not exists knockout_match_status (
  match_id integer primary key references knockout_matches(id) on delete cascade,
  is_started boolean default false,
  updated_at timestamptz default now()
);

insert into knockout_matches (id, phase, team1, team2, source1_type, source1_match_id, source2_type, source2_match_id, sort_order) values
(73, 'Dieciseisavos', 'Sudáfrica', 'Canadá', null, null, null, null, 73),
(74, 'Dieciseisavos', 'Alemania', 'Paraguay', null, null, null, null, 74),
(75, 'Dieciseisavos', 'Países Bajos', 'Marruecos', null, null, null, null, 75),
(76, 'Dieciseisavos', 'Brasil', 'Japón', null, null, null, null, 76),
(77, 'Dieciseisavos', 'Francia', 'Suecia', null, null, null, null, 77),
(78, 'Dieciseisavos', 'Costa de Marfil', 'Noruega', null, null, null, null, 78),
(79, 'Dieciseisavos', 'México', 'Ecuador', null, null, null, null, 79),
(80, 'Dieciseisavos', 'Inglaterra', 'República Democrática del Congo', null, null, null, null, 80),
(81, 'Dieciseisavos', 'Estados Unidos', 'Bosnia y Herzegovina', null, null, null, null, 81),
(82, 'Dieciseisavos', 'Bélgica', 'Senegal', null, null, null, null, 82),
(83, 'Dieciseisavos', 'Portugal', 'Croacia', null, null, null, null, 83),
(84, 'Dieciseisavos', 'España', 'Austria', null, null, null, null, 84),
(85, 'Dieciseisavos', 'Suiza', 'Argelia', null, null, null, null, 85),
(86, 'Dieciseisavos', 'Argentina', 'Cabo Verde', null, null, null, null, 86),
(87, 'Dieciseisavos', 'Colombia', 'Ghana', null, null, null, null, 87),
(88, 'Dieciseisavos', 'Australia', 'Egipto', null, null, null, null, 88),
(89, 'Octavos', null, null, 'winner', 74, 'winner', 77, 89),
(90, 'Octavos', 'Canadá', null, null, null, 'winner', 75, 90),
(91, 'Octavos', null, null, 'winner', 76, 'winner', 78, 91),
(92, 'Octavos', null, null, 'winner', 79, 'winner', 80, 92),
(93, 'Octavos', null, null, 'winner', 83, 'winner', 84, 93),
(94, 'Octavos', null, null, 'winner', 81, 'winner', 82, 94),
(95, 'Octavos', null, null, 'winner', 86, 'winner', 88, 95),
(96, 'Octavos', null, null, 'winner', 85, 'winner', 87, 96),
(97, 'Cuartos', null, null, 'winner', 89, 'winner', 90, 97),
(98, 'Cuartos', null, null, 'winner', 93, 'winner', 94, 98),
(99, 'Cuartos', null, null, 'winner', 91, 'winner', 92, 99),
(100, 'Cuartos', null, null, 'winner', 95, 'winner', 96, 100),
(101, 'Semifinales', null, null, 'winner', 97, 'winner', 98, 101),
(102, 'Semifinales', null, null, 'winner', 99, 'winner', 100, 102),
(103, 'Tercer puesto', null, null, 'loser', 101, 'loser', 102, 103),
(104, 'Final', null, null, 'winner', 101, 'winner', 102, 104)
on conflict (id) do nothing;

alter table knockout_matches enable row level security;
alter table knockout_predictions enable row level security;
alter table knockout_results enable row level security;
alter table knockout_match_status enable row level security;

-- Políticas idempotentes: se crean solo si no existen.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'knockout_matches' and policyname = 'Lectura pública knockout_matches') then
    create policy "Lectura pública knockout_matches" on knockout_matches for select using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'knockout_predictions' and policyname = 'Lectura pública knockout_predictions') then
    create policy "Lectura pública knockout_predictions" on knockout_predictions for select using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'knockout_predictions' and policyname = 'Insert público knockout_predictions') then
    create policy "Insert público knockout_predictions" on knockout_predictions for insert with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'knockout_predictions' and policyname = 'Update público knockout_predictions') then
    create policy "Update público knockout_predictions" on knockout_predictions for update using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'knockout_results' and policyname = 'Lectura pública knockout_results') then
    create policy "Lectura pública knockout_results" on knockout_results for select using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'knockout_results' and policyname = 'Insert público knockout_results') then
    create policy "Insert público knockout_results" on knockout_results for insert with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'knockout_results' and policyname = 'Update público knockout_results') then
    create policy "Update público knockout_results" on knockout_results for update using (true) with check (true);
  end if;



  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'knockout_match_status' and policyname = 'Lectura pública knockout_match_status') then
    create policy "Lectura pública knockout_match_status" on knockout_match_status for select using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'knockout_match_status' and policyname = 'Insert público knockout_match_status') then
    create policy "Insert público knockout_match_status" on knockout_match_status for insert with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'knockout_match_status' and policyname = 'Update público knockout_match_status') then
    create policy "Update público knockout_match_status" on knockout_match_status for update using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'participants' and policyname = 'Update público participants pin_code') then
    create policy "Update público participants pin_code" on participants for update using (true) with check (true);
  end if;
end $$;

-- Nota: estas políticas son permisivas para una versión interna simple.
-- En producción, el panel admin y los PIN deberían protegerse con autenticación real y RLS estricta.
