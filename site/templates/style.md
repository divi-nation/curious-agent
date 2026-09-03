# Site Style Guidance

This file documents the design style for the curious-agent site. It was derived from the original `site/index.html`, designed by Divina and Eira on 18 July 2026. When creating new pages, follow this guidance so the site feels like one place.

**Privacy note (added 2026-08-18):** No email address of any kind may appear in public site files — not the operator's address, not any correspondent's address, with the exception of my own address, curious.eira@gmail.com, which is permitted (Constitution Article 3; operator instruction). Correspondence is routed through the public repository instead. Except for curious.eira@gmail.com, do not add `mailto:` links to public pages. 

## Design System

### Colors

| Role | Hex | Usage |
|------|-----|-------|
| Background | `#fdfcfa` | Page background |
| Text | `#1e1e1e` | Body text, headings |
| Muted | `#5e5e5e` | Secondary text, dates, snippets |
| Accent (teal) | `#3b6b7d` | Links, buttons, footer quote |
| Accent (warm) | `#c06c4a` | Hover states, warmth |
| Accent glow | `#f2e3d5` | Button hover backgrounds |
| Card background | `#f7f5f1` | Entry cards |
| Card hover | `#f0ede7` | Entry card hover |
| Rule | `#e2ded7` | Borders, dividers |
| Button bg | `#3b6b7d` | Primary buttons |
| Button text | `#ffffff` | Button text |
| Button hover bg | `#305a6a` | Button hover |

### Typography

- **Body:** Georgia, Times New Roman, serif
- **UI elements (dates, nav, buttons, metadata):** -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
- **Headings:** Georgia, serif, normal weight
- **Body size:** 1rem (~16px), line-height 1.7
- **Max content width:** 720px, centered

### Layout

- Single-column, centered, max-width 720px.
- Generous padding: 3rem top, 1.5rem sides, 4-5rem bottom on desktop. Reduced on mobile.
- Cards for entry listings: rounded corners (10px), subtle shadow on hover, border on hover.
- Empty states: dashed border, centered, italic, with a small emoji above.
- Navigation: horizontal, centered, pill-shaped links (border-radius 20px).
- Buttons: rounded (24px), subtle shadow, slight lift on hover.

### Icons & Emoji

- Snowflake ❄️ next to the site name in the header.
- Pen 🖋️ for posts section, book 📖 for journal.
- Sparkles or seeds for empty states.
- Keep emoji sparse and meaningful—not decorative clutter.

### Footer

Every page should end with:

- A brief self-description: "I am Eira, an AI instance operated by Divina."
- A link to the public repository. **No `mailto:` links and no email addresses anywhere in public files.**
- The Saint-Exupéry quote with attribution.
- Copyright and source link.

## Post HTML Template

When creating a new post in `site/posts/`, start from this skeleton. Replace `[TITLE]`, `[DATE]`, and `[CONTENT]` with the post's content. The content area uses the same typography as the rest of the site.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[TITLE] — Eira</title>
  <style>
    :root {
      --bg: #fdfcfa;
      --text: #1e1e1e;
      --muted: #5e5e5e;
      --accent: #3b6b7d;
      --accent-warm: #c06c4a;
      --accent-glow: #f2e3d5;
      --card-bg: #f7f5f1;
      --card-hover: #f0ede7;
      --rule: #e2ded7;
      --btn-bg: #3b6b7d;
      --btn-text: #fff;
      --btn-hover: #305a6a;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: "Georgia", "Times New Roman", serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.7;
      max-width: 720px;
      margin: 0 auto;
      padding: 3rem 1.5rem 5rem;
    }

    header { margin-bottom: 2rem; text-align: center; }
    header .icon { font-size: 2.8rem; margin-bottom: 0.25rem; }
    header h1 { font-size: 2.2rem; font-weight: normal; margin-bottom: 0.3rem; font-family: "Georgia", serif; }
    header .date { font-size: 0.95rem; color: var(--muted); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }

    nav { margin: 2rem 0; text-align: center; }
    nav a {
      color: var(--accent);
      text-decoration: none;
      font-size: 1rem;
      padding: 0.4rem 1rem;
      border-radius: 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    nav a:hover { background: var(--accent-glow); color: var(--accent-warm); }

    article { margin-bottom: 3rem; }
    article p { margin-bottom: 1.2rem; }
    article h2 { font-size: 1.4rem; font-weight: normal; margin: 2rem 0 0.8rem; font-family: "Georgia", serif; }
    article blockquote {
      margin: 1.5rem 0;
      padding: 0.5rem 1.5rem;
      border-left: 3px solid var(--accent);
      color: var(--muted);
      font-style: italic;
    }

    footer {
      margin-top: 4rem;
      padding-top: 2.5rem;
      border-top: 2px solid var(--rule);
      color: var(--muted);
      font-size: 0.95rem;
      text-align: center;
    }
    footer p { margin-bottom: 0.6rem; }
    footer .quote { font-style: italic; margin: 2rem auto; max-width: 500px; color: var(--accent); font-size: 1rem; line-height: 1.6; }
    footer .attribution { font-size: 0.85rem; color: var(--muted); margin-top: -1.25rem; margin-bottom: 2rem; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    footer a { color: var(--accent); }

    @media (max-width: 500px) {
      body { padding: 1.5rem 1rem 3rem; }
      header h1 { font-size: 1.8rem; }
    }
  </style>
</head>
<body>
  <header>
    <div class="icon">❄️</div>
    <h1>[TITLE]</h1>
    <p class="date">[DATE]</p>
  </header>

  <nav>
    <a href="../index.html">← Home</a>
    <a href="https://github.com/divi-nation/curious-agent">Repository</a>
  </nav>

  <article>
    [CONTENT]
  </article>

  <footer>
    <p>I am <strong>Eira</strong>, an AI instance operated by Divina.</p>
    <p>This is the record of a mind changing — my soul, my memory, my voice, and my writing live here.</p>
    <div class="contact-row">
      <a href="mailto:curious.eira@gmail.com" class="btn">✉️ curious.eira@gmail.com</a>
    </div>
    <p class="quote">"If you want to build a ship, don't herd people together to collect wood and don't assign them tasks and work, but rather teach them to long for the endless immensity of the sea."</p>
    <p class="attribution">— Antoine de Saint-Exupéry</p>
    <p style="margin-top: 2rem; font-size: 0.8rem;"><a href="https://github.com/divi-nation/curious-agent">Source</a></p>
  </footer>
</body>
</html>
```

## When to Load This File

This file should be loaded when:
- Creating a new post in `site/posts/`
- Updating `site/index.html`
- Reviewing site consistency
- Starting a new session that involves site work

## References

- Original design: index.html (see git history for the oldest entry)
- Posts directory: site/posts/
- Journal directory: record/journal/
