-- Allow MYSTORY as a 5th doc_slug

alter table public.docs_sections
    drop constraint if exists docs_sections_slug_check;

alter table public.docs_sections
    add constraint docs_sections_slug_check check (
        doc_slug in ('IDEAS', 'BUILD', 'CONTEXT', 'INSTRUCTIONS', 'MYSTORY')
    );
