create table if not exists service_requests (
  id text primary key,
  user_id text not null,
  created_at timestamptz not null default now(),
  year text not null,
  make text not null,
  model text not null,
  mileage text not null default '',
  mileage_unsure boolean not null default false,
  lights text not null default '[]',
  issues text not null default '[]',
  followups text not null default '{}',
  note text not null default '',
  customer_name text not null,
  phone text not null,
  email text not null,
  reach text not null,
  appointment_date text not null default '',
  appointment_time text not null default '',
  status text not null default 'pending',
  arrival_date text,
  arrival_time text,
  decline_note text not null default '',
  staff_note text not null default '',
  decided_at timestamptz,
  notify_email text not null default 'not_configured',
  notify_sms text not null default 'not_configured'
);

create index if not exists service_requests_user_idx on service_requests (user_id);
create index if not exists service_requests_status_idx on service_requests (status, created_at desc);

create table if not exists request_photos (
  id text primary key,
  request_id text not null references service_requests (id) on delete cascade,
  user_id text not null,
  data_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists request_photos_request_idx on request_photos (request_id);
