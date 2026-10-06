"""
MkDocs Hook for Atom Visualisation 3D
1. Normalizes hardcoded /atom-visualisation/ links on the homepage and language switchers
   into relative links so that the documentation works flawlessly both on local preview
   (http://localhost:8080/, mkdocs serve) and on GitHub Pages (https://lowcoders.github.io/atom-visualisation/).
2. Generates the /hu/ directory with seamless redirects to ensure that /hu/ is always accessible.
"""

import os
import re
from pathlib import Path


def on_post_page(output, page, config):
    url = page.url or ""

    # Determine relative depth
    if url == "" or url == ".":
        # Root Hungarian index page
        output = re.sub(r'href="/atom-visualisation/"', 'href="./"', output)
        output = re.sub(r'href="/atom-visualisation/en/"', 'href="en/"', output)
        output = re.sub(r'href="/atom-visualisation/app/"', 'href="app/"', output)
    elif url == "en/" or url == "en":
        # English index page
        output = re.sub(r'href="/atom-visualisation/"', 'href="../"', output)
        output = re.sub(r'href="/atom-visualisation/en/"', 'href="./"', output)
        output = re.sub(r'href="/atom-visualisation/app/"', 'href="../app/"', output)
    elif url.startswith("en/"):
        # English subpages (e.g. en/physics/)
        depth = len([part for part in url.strip("/").split("/") if part])
        prefix = "../" * depth
        output = re.sub(r'href="/atom-visualisation/app/"', f'href="{prefix}app/"', output)
    else:
        # Hungarian subpages (e.g. physics/, guide/)
        depth = len([part for part in url.strip("/").split("/") if part])
        prefix = "../" * depth
        output = re.sub(r'href="/atom-visualisation/app/"', f'href="{prefix}app/"', output)

    return output


def _create_redirect_html(target_url, title="Átirányítás..."):
    return f"""<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0; url={target_url}">
  <link rel="canonical" href="{target_url}">
  <title>{title}</title>
</head>
<body>
  <p>Átirányítás a magyar nyelvű tartalomhoz... <a href="{target_url}">Kattintson ide, ha nem irányít át automatikusan</a>.</p>
</body>
</html>
"""


def on_post_build(config):
    site_dir = Path(config.site_dir)
    if not site_dir.exists():
        return

    hu_dir = site_dir / "hu"
    hu_dir.mkdir(parents=True, exist_ok=True)

    # Create hu/index.html redirecting to root (../)
    (hu_dir / "index.html").write_text(_create_redirect_html("../", "Kvantum- és Atomvizualizáció 3D"), encoding="utf-8")

    # For any top-level sections (physics, guide, unified, installation), create hu/section/index.html redirecting to ../../section/
    for section in ["physics", "guide", "unified", "installation"]:
        section_dir = hu_dir / section
        section_dir.mkdir(parents=True, exist_ok=True)
        (section_dir / "index.html").write_text(
            _create_redirect_html(f"../../{section}/", f"{section.capitalize()} - Kvantum- és Atomvizualizáció 3D"),
            encoding="utf-8"
        )
