-- Schema para Prode 2026 en Supabase.
-- Ejecutar completo en el SQL Editor del proyecto.

create extension if not exists "pgcrypto";

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  full_name text not null unique,
  created_at timestamptz default now()
);

-- Evita duplicados que solo cambian mayúsculas/minúsculas, por ejemplo "Juan Pérez" y "juan pérez".
create unique index if not exists participants_full_name_lower_unique
  on participants (lower(full_name));

create table if not exists matches (
  id integer primary key,
  group_name text not null,
  team1 text not null,
  team2 text not null
);

create table if not exists predictions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid references participants(id) on delete cascade,
  match_id integer references matches(id) on delete cascade,
  goals1 integer not null check (goals1 >= 0),
  goals2 integer not null check (goals2 >= 0),
  created_at timestamptz default now(),
  unique(participant_id, match_id)
);

create table if not exists official_results (
  match_id integer primary key references matches(id) on delete cascade,
  goals1 integer not null check (goals1 >= 0),
  goals2 integer not null check (goals2 >= 0),
  is_locked boolean default false,
  updated_at timestamptz default now()
);

-- Migración para proyectos Supabase ya creados antes del bloqueo de partidos.
alter table official_results add column if not exists is_locked boolean default false;

insert into matches (id, group_name, team1, team2) values
  (1, 'Grupo A', 'México', 'Sudáfrica'),
  (2, 'Grupo A', 'Corea del Sur', 'República Checa'),
  (3, 'Grupo B', 'Canadá', 'Bosnia y Herzegovina'),
  (4, 'Grupo D', 'Estados Unidos', 'Paraguay'),
  (5, 'Grupo C', 'Haití', 'Escocia'),
  (6, 'Grupo D', 'Australia', 'Turquía'),
  (7, 'Grupo C', 'Brasil', 'Marruecos'),
  (8, 'Grupo B', 'Catar', 'Suiza'),
  (9, 'Grupo E', 'Costa de Marfil', 'Ecuador'),
  (10, 'Grupo E', 'Alemania', 'Curazao'),
  (11, 'Grupo F', 'Países Bajos', 'Japón'),
  (12, 'Grupo F', 'Suecia', 'Túnez'),
  (13, 'Grupo H', 'Arabia Saudita', 'Uruguay'),
  (14, 'Grupo H', 'España', 'Cabo Verde'),
  (15, 'Grupo G', 'Irán', 'Nueva Zelanda'),
  (16, 'Grupo G', 'Bélgica', 'Egipto'),
  (17, 'Grupo I', 'Francia', 'Senegal'),
  (18, 'Grupo I', 'Irak', 'Noruega'),
  (19, 'Grupo J', 'Argentina', 'Argelia'),
  (20, 'Grupo J', 'Austria', 'Jordania'),
  (21, 'Grupo L', 'Ghana', 'Panamá'),
  (22, 'Grupo L', 'Inglaterra', 'Croacia'),
  (23, 'Grupo K', 'Portugal', 'República Democrática del Congo'),
  (24, 'Grupo K', 'Uzbekistán', 'Colombia'),
  (25, 'Grupo A', 'República Checa', 'Sudáfrica'),
  (26, 'Grupo B', 'Suiza', 'Bosnia y Herzegovina'),
  (27, 'Grupo B', 'Canadá', 'Catar'),
  (28, 'Grupo A', 'México', 'Corea del Sur'),
  (29, 'Grupo C', 'Brasil', 'Haití'),
  (30, 'Grupo C', 'Escocia', 'Marruecos'),
  (31, 'Grupo D', 'Turquía', 'Paraguay'),
  (32, 'Grupo D', 'Estados Unidos', 'Australia'),
  (33, 'Grupo E', 'Alemania', 'Costa de Marfil'),
  (34, 'Grupo E', 'Ecuador', 'Curazao'),
  (35, 'Grupo F', 'Países Bajos', 'Suecia'),
  (36, 'Grupo F', 'Túnez', 'Japón'),
  (37, 'Grupo H', 'Uruguay', 'Cabo Verde'),
  (38, 'Grupo H', 'España', 'Arabia Saudita'),
  (39, 'Grupo G', 'Bélgica', 'Irán'),
  (40, 'Grupo G', 'Nueva Zelanda', 'Egipto'),
  (41, 'Grupo I', 'Noruega', 'Senegal'),
  (42, 'Grupo I', 'Francia', 'Irak'),
  (43, 'Grupo J', 'Argentina', 'Austria'),
  (44, 'Grupo J', 'Jordania', 'Argelia'),
  (45, 'Grupo L', 'Inglaterra', 'Ghana'),
  (46, 'Grupo L', 'Panamá', 'Croacia'),
  (47, 'Grupo K', 'Portugal', 'Uzbekistán'),
  (48, 'Grupo K', 'Colombia', 'República Democrática del Congo'),
  (49, 'Grupo C', 'Escocia', 'Brasil'),
  (50, 'Grupo C', 'Marruecos', 'Haití'),
  (51, 'Grupo B', 'Suiza', 'Canadá'),
  (52, 'Grupo B', 'Bosnia y Herzegovina', 'Catar'),
  (53, 'Grupo A', 'República Checa', 'México'),
  (54, 'Grupo A', 'Sudáfrica', 'Corea del Sur'),
  (55, 'Grupo E', 'Curazao', 'Costa de Marfil'),
  (56, 'Grupo E', 'Ecuador', 'Alemania'),
  (57, 'Grupo F', 'Japón', 'Suecia'),
  (58, 'Grupo F', 'Túnez', 'Países Bajos'),
  (59, 'Grupo D', 'Turquía', 'Estados Unidos'),
  (60, 'Grupo D', 'Paraguay', 'Australia'),
  (61, 'Grupo I', 'Noruega', 'Francia'),
  (62, 'Grupo I', 'Senegal', 'Irak'),
  (63, 'Grupo G', 'Egipto', 'Irán'),
  (64, 'Grupo G', 'Nueva Zelanda', 'Bélgica'),
  (65, 'Grupo H', 'Cabo Verde', 'Arabia Saudita'),
  (66, 'Grupo H', 'Uruguay', 'España'),
  (67, 'Grupo L', 'Panamá', 'Inglaterra'),
  (68, 'Grupo L', 'Croacia', 'Ghana'),
  (69, 'Grupo J', 'Argelia', 'Austria'),
  (70, 'Grupo J', 'Jordania', 'Argentina'),
  (71, 'Grupo K', 'Colombia', 'Portugal'),
  (72, 'Grupo K', 'República Democrática del Congo', 'Uzbekistán')
on conflict (id) do update set
  group_name = excluded.group_name,
  team1 = excluded.team1,
  team2 = excluded.team2;

create or replace function seed_matches()
returns void
language sql
as $$
  insert into matches (id, group_name, team1, team2) values
  (1, 'Grupo A', 'México', 'Sudáfrica'),
  (2, 'Grupo A', 'Corea del Sur', 'República Checa'),
  (3, 'Grupo B', 'Canadá', 'Bosnia y Herzegovina'),
  (4, 'Grupo D', 'Estados Unidos', 'Paraguay'),
  (5, 'Grupo C', 'Haití', 'Escocia'),
  (6, 'Grupo D', 'Australia', 'Turquía'),
  (7, 'Grupo C', 'Brasil', 'Marruecos'),
  (8, 'Grupo B', 'Catar', 'Suiza'),
  (9, 'Grupo E', 'Costa de Marfil', 'Ecuador'),
  (10, 'Grupo E', 'Alemania', 'Curazao'),
  (11, 'Grupo F', 'Países Bajos', 'Japón'),
  (12, 'Grupo F', 'Suecia', 'Túnez'),
  (13, 'Grupo H', 'Arabia Saudita', 'Uruguay'),
  (14, 'Grupo H', 'España', 'Cabo Verde'),
  (15, 'Grupo G', 'Irán', 'Nueva Zelanda'),
  (16, 'Grupo G', 'Bélgica', 'Egipto'),
  (17, 'Grupo I', 'Francia', 'Senegal'),
  (18, 'Grupo I', 'Irak', 'Noruega'),
  (19, 'Grupo J', 'Argentina', 'Argelia'),
  (20, 'Grupo J', 'Austria', 'Jordania'),
  (21, 'Grupo L', 'Ghana', 'Panamá'),
  (22, 'Grupo L', 'Inglaterra', 'Croacia'),
  (23, 'Grupo K', 'Portugal', 'República Democrática del Congo'),
  (24, 'Grupo K', 'Uzbekistán', 'Colombia'),
  (25, 'Grupo A', 'República Checa', 'Sudáfrica'),
  (26, 'Grupo B', 'Suiza', 'Bosnia y Herzegovina'),
  (27, 'Grupo B', 'Canadá', 'Catar'),
  (28, 'Grupo A', 'México', 'Corea del Sur'),
  (29, 'Grupo C', 'Brasil', 'Haití'),
  (30, 'Grupo C', 'Escocia', 'Marruecos'),
  (31, 'Grupo D', 'Turquía', 'Paraguay'),
  (32, 'Grupo D', 'Estados Unidos', 'Australia'),
  (33, 'Grupo E', 'Alemania', 'Costa de Marfil'),
  (34, 'Grupo E', 'Ecuador', 'Curazao'),
  (35, 'Grupo F', 'Países Bajos', 'Suecia'),
  (36, 'Grupo F', 'Túnez', 'Japón'),
  (37, 'Grupo H', 'Uruguay', 'Cabo Verde'),
  (38, 'Grupo H', 'España', 'Arabia Saudita'),
  (39, 'Grupo G', 'Bélgica', 'Irán'),
  (40, 'Grupo G', 'Nueva Zelanda', 'Egipto'),
  (41, 'Grupo I', 'Noruega', 'Senegal'),
  (42, 'Grupo I', 'Francia', 'Irak'),
  (43, 'Grupo J', 'Argentina', 'Austria'),
  (44, 'Grupo J', 'Jordania', 'Argelia'),
  (45, 'Grupo L', 'Inglaterra', 'Ghana'),
  (46, 'Grupo L', 'Panamá', 'Croacia'),
  (47, 'Grupo K', 'Portugal', 'Uzbekistán'),
  (48, 'Grupo K', 'Colombia', 'República Democrática del Congo'),
  (49, 'Grupo C', 'Escocia', 'Brasil'),
  (50, 'Grupo C', 'Marruecos', 'Haití'),
  (51, 'Grupo B', 'Suiza', 'Canadá'),
  (52, 'Grupo B', 'Bosnia y Herzegovina', 'Catar'),
  (53, 'Grupo A', 'República Checa', 'México'),
  (54, 'Grupo A', 'Sudáfrica', 'Corea del Sur'),
  (55, 'Grupo E', 'Curazao', 'Costa de Marfil'),
  (56, 'Grupo E', 'Ecuador', 'Alemania'),
  (57, 'Grupo F', 'Japón', 'Suecia'),
  (58, 'Grupo F', 'Túnez', 'Países Bajos'),
  (59, 'Grupo D', 'Turquía', 'Estados Unidos'),
  (60, 'Grupo D', 'Paraguay', 'Australia'),
  (61, 'Grupo I', 'Noruega', 'Francia'),
  (62, 'Grupo I', 'Senegal', 'Irak'),
  (63, 'Grupo G', 'Egipto', 'Irán'),
  (64, 'Grupo G', 'Nueva Zelanda', 'Bélgica'),
  (65, 'Grupo H', 'Cabo Verde', 'Arabia Saudita'),
  (66, 'Grupo H', 'Uruguay', 'España'),
  (67, 'Grupo L', 'Panamá', 'Inglaterra'),
  (68, 'Grupo L', 'Croacia', 'Ghana'),
  (69, 'Grupo J', 'Argelia', 'Austria'),
  (70, 'Grupo J', 'Jordania', 'Argentina'),
  (71, 'Grupo K', 'Colombia', 'Portugal'),
  (72, 'Grupo K', 'República Democrática del Congo', 'Uzbekistán')
  on conflict (id) do update set
    group_name = excluded.group_name,
    team1 = excluded.team1,
    team2 = excluded.team2;
$$;

alter table participants enable row level security;
alter table matches enable row level security;
alter table predictions enable row level security;
alter table official_results enable row level security;

drop policy if exists "Public read participants" on participants;
create policy "Public read participants" on participants
  for select using (true);

drop policy if exists "Public insert participants" on participants;
create policy "Public insert participants" on participants
  for insert with check (true);

drop policy if exists "Public read matches" on matches;
create policy "Public read matches" on matches
  for select using (true);

drop policy if exists "Public read predictions" on predictions;
create policy "Public read predictions" on predictions
  for select using (true);

drop policy if exists "Public insert predictions" on predictions;
create policy "Public insert predictions" on predictions
  for insert with check (true);

drop policy if exists "Public read official_results" on official_results;
create policy "Public read official_results" on official_results
  for select using (true);

-- Versión interna simple: se permite insert/update/upsert público de resultados oficiales.
-- En producción, el admin debería protegerse con autenticación real y políticas RLS estrictas.
drop policy if exists "Public insert official_results" on official_results;
create policy "Public insert official_results" on official_results
  for insert with check (true);

drop policy if exists "Public update official_results" on official_results;
create policy "Public update official_results" on official_results
  for update using (true) with check (true);
