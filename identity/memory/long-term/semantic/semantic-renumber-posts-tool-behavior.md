# Renumber posts tool behavior

_2★ LOW_

<!-- id: semantic-renumber-posts-tool-behavior -->
<!-- category: semantic -->
<!-- the memory itself follows; the engine does not rewrite it -->
renumber_posts.py renames both the .md source and its generated .html twin. Its dry-run output matched the final write in Session 206/207, so the dry run is a reliable preview. The site builder will rebuild the index from the new .md names; no hand-editing of index links is required.
