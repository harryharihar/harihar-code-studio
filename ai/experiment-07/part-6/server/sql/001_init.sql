-- Part 4: everything the agent must not forget lives here.
-- Run it as many times as you like: every statement is "if not exists".

-- Every run: the planner, the executor (and Part 1's agent). Its status, what it spent, and its checkpoint.
create table if not exists runs (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'agent',          -- agent | plan | execute
  goal text not null,
  status text not null default 'running',      -- running | done | failed | interrupted
  usage jsonb not null default '{"steps":0,"tokens":0,"seconds":0}',
  checkpoint jsonb,                            -- short-term memory: the model conversation, saved after every finished step
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The timeline the phone shows: one row per thing the agent did.
create table if not exists run_events (
  run_id uuid not null references runs(id) on delete cascade,
  seq int not null,
  kind text not null,
  title text not null,
  detail text not null default '',
  at timestamptz not null default now(),
  primary key (run_id, seq)
);

-- A plan the AI made, waiting for the user's yes.
create table if not exists plans (
  id uuid primary key references runs(id) on delete cascade,
  plan jsonb not null,                         -- the whole plan, exactly as the AI made it
  plan_order jsonb not null,                   -- task ids in the order they will be done
  fixed jsonb not null default '[]',
  notes jsonb not null default '[]',           -- the memory notes the planner read
  accepted boolean not null default false
);

-- The accepted plan's things to order, and the order the agent placed for each.
-- This is the order list: if an order is here, it is never placed (or paid for) twice.
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  position serial,
  run_id uuid not null,
  ref text not null default '',
  title text not null,
  kind text not null default 'other',
  day text not null,
  cost int not null default 0,
  minutes int not null default 0,
  depends_on jsonb not null default '[]',
  notes text not null default '',
  done boolean not null default false,
  purchase jsonb,                              -- the order: shop, item, price, order id. null until ordered
  verified boolean not null default false
);

-- Small settings, like the budget of the accepted plan.
create table if not exists settings (
  key text primary key,
  value jsonb not null
);

-- Long-term memory: short notes about the user that every future plan reads.
create table if not exists memory (
  id uuid primary key default gen_random_uuid(),
  content text not null unique,
  created_at timestamptz not null default now()
);

-- ─── Part 5: the human in the loop ───
-- A task nobody approved in time is skipped: it is never ordered without you.
alter table tasks add column if not exists skipped boolean not null default false;

-- One question to the user: "May I order this?" It pauses the run until it is answered or expires.
create table if not exists approvals (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references runs(id) on delete cascade,
  task_ref text not null,
  task_title text not null,
  kind text not null,
  shop text not null,
  item text not null,
  price int not null,
  reason text not null,                        -- which rule asked: "₹1,200 is above your limit of ₹1,000"
  status text not null default 'pending',      -- pending | approved | rejected | expired
  note text not null default '',               -- what the user told the agent
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  expires_at timestamptz not null
);

-- "Yes to similar orders until …": a kind of task (or any, when null) up to a price.
create table if not exists grants (
  id uuid primary key default gen_random_uuid(),
  kind text,
  max_price int not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
)
