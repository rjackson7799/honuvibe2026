-- Add source_page column to track where inquiries originate
alter table applications add column if not exists source_page text default 'apply'
  check (source_page in ('apply', 'build'));

-- Add desired_outcome column if not present
alter table applications add column if not exists desired_outcome text;
