-- Allow INBOX as a 6th doc_slug (sprint 010 — receiving surface for external agents)

alter table public.docs_sections
    drop constraint if exists docs_sections_slug_check;

alter table public.docs_sections
    add constraint docs_sections_slug_check check (
        doc_slug in ('IDEAS', 'BUILD', 'CONTEXT', 'INSTRUCTIONS', 'MYSTORY', 'INBOX')
    );
