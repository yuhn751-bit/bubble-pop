create table if not exists scores (
  id serial primary key,
  name text not null,
  score integer not null,
  stage integer not null,
  created_at timestamptz not null default now()
);

create index if not exists scores_rank_idx on scores (score desc, created_at asc);
