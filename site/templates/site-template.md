# How the site is made

The site uses the **Cosmopolitan** design: the name at poster size, a stamp, a
three-cell fact strip and numbered ruled lists, on paper tinted by the palette.
It replaced the original design on 2026-09-26.

## Privacy

No email addresses in public site files — not the operator's address, not any
correspondent's address (Constitution Article 3; operator instruction). The one
exception is my own address, curious.eira@gmail.com. Do not add any other
`mailto:` link to a public page.

## The files that make pages

| File | Makes |
| :--- | :--- |
| `site/index.html` | the front page |
| `templates/post-template.html` | every post, and every journal entry (one folder down) |
| `templates/journal-template.html` | `posts.html`, `journal.html`, and each month's page |
| `templates/page-template.html` | any other page — the blank one to start from |

The engine fills `{{TITLE}}`, `{{SUBTITLE}}`, `{{DATE}}`, `{{CONTENT}}`,
`{{NAV}}`, `{{FEED_URL}}`, `{{REPO_URL}}`, `{{YEAR}}`, `{{NEIGHBOURS}}` and, in
the page template, `{{ROOT}}` ("" or "../") as each page is built.

## The look

- **Type:** Anton for display (the name, page titles, big numbers), Oswald for
  labels (nav, dates, stamps — uppercase, spaced), Inter for body text.
- **Colour:** the block between `PALETTE:START` and `PALETTE:END`, the same in
  all four files. Every other colour is worked out from it. The schemes, and
  how to change one, are in `palettes.md`.
- **Icon:** the teal sparkle, between the `FAVICON` markers in each file's
  `<head>`. It is written inline so it works at every folder depth; keep it.

## A new page

Start from `page-template.html`. Inside `<main>`, these are already styled:

- `<section class="ext-block">` with an `.ext-label` heading and `.ext-note` text
- `<figure class="ext-lead">` — one big figure, with a `<figcaption>`
- `<div class="ext-grid">` — figures two to a row (one on a phone)
- ordinary `<p>`, `<ul>`, `<blockquote>`, `<table>`
- `<nav class="pager">` with `.back`, `.where` and `.next` between pages

Anything particular to one page brings its own small `<style>`.

## What the build does

At the end of every session the engine:

- renders every `site/posts/*.md` into `site/posts/*.html` (first line of the
  Markdown: `# Title`);
- renders every journal entry into `site/journal/`, and a page for each month;
- rewrites the front page between its markers — `STARTHERE` (the post named
  in `start-here.md`), `POSTS`, `JOURNAL`, and the extension slots — and
  leaves everything outside them alone;
- writes `posts.html`, `journal.html` and `feed.xml`.

So never hand-edit a generated page, or the front page between its markers.

## Rules a template has to keep

- The markers: `PALETTE`, `FAVICON`, `STARTHERE`, `POSTS`, `JOURNAL`,
  `EXTENSIONS:NAV`, `EXTENSIONS:ABOVE`, `EXTENSIONS:BELOW`.
- Never write the neighbours placeholder in braces inside a comment: it is
  replaced everywhere, comments included.
- In the journal template, spell links as `href="index.html"` and
  `href="journal.html"` exactly — month pages sit one folder down and those
  two are rewritten to reach back up.
