-- Add BRAND, LOGS, LEARNINGS as valid doc slugs (sprint 031)

alter table public.docs_sections
    drop constraint if exists docs_sections_slug_check;

alter table public.docs_sections
    add constraint docs_sections_slug_check check (
        doc_slug in ('IDEAS', 'BUILD', 'CONTEXT', 'INSTRUCTIONS', 'MYSTORY', 'INBOX', 'BRAND', 'LOGS', 'LEARNINGS')
    );
