create table if not exists channels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  handle text not null,
  url text not null,
  purpose text,
  published boolean not null default true,
  sort_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table channels enable row level security;
create policy "Public read published channels" on channels for select using (published = true);
create policy "Service role full access" on channels using (true) with check (true);

insert into channels (name, handle, url, purpose, published, sort_order) values
('LinkedIn', 'elz-fintech', 'https://www.linkedin.com/in/elz-fintech/', 'Work history and recruiter discovery', true, 1),
('YouTube', '@whatelzai', 'https://www.youtube.com/@whatelzai', 'Project demos, walked through', true, 2),
('Instagram', 'whatelz.ai', 'https://www.instagram.com/whatelz.ai/', 'Tech explanations, bite-sized', true, 3),
('Medium', '@whatelz.ai', 'https://medium.com/@whatelz.ai', 'Long-form articles', true, 4);
