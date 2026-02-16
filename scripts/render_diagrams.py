from pathlib import Path
import subprocess
import re
import html

base = Path(r"c:\Users\Nico\Documents\NILA")
src_dir = base / "docs" / "diagrams" / "src"
out_dir = base / "docs" / "diagrams" / "out"
html_dir = base / "docs" / "diagrams"
chrome = Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")

if not chrome.exists():
    raise SystemExit("Chrome no encontrado")

html_tpl = """<!doctype html>
<html lang=\"es\">
<head>
  <meta charset=\"utf-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
  <style>
    body {{ margin: 0; background: #f4f7fb; font-family: Segoe UI, Arial, sans-serif; }}
    .wrap {{ width: 1800px; min-height: 1000px; padding: 40px; }}
    .title {{ font-size: 28px; font-weight: 700; color: #1a2046; margin-bottom: 14px; letter-spacing: .02em; }}
    .box {{ background: #fff; border: 1px solid #d5dfec; border-radius: 14px; padding: 20px; box-shadow: 0 8px 24px rgba(26, 32, 70, .08); }}
    .mermaid {{ font-size: 18px; }}
  </style>
  <script type=\"module\">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
    mermaid.initialize({{ startOnLoad: true, theme: 'base', themeVariables: {{ primaryColor: '#eef3fa', primaryTextColor:'#14263f', lineColor:'#26486f', fontFamily: 'Segoe UI' }} }});
    window.addEventListener('load', () => {{
      setTimeout(() => document.body.setAttribute('data-ready', '1'), 1200);
    }});
  </script>
</head>
<body>
  <div class=\"wrap\">
    <div class=\"title\">{title}</div>
    <div class=\"box\">
      <pre class=\"mermaid\">{diagram}</pre>
    </div>
  </div>
</body>
</html>
"""

for mmd in sorted(src_dir.glob("*.mmd")):
    title = mmd.stem.replace("-", " ").title()
    diagram = html.escape(mmd.read_text(encoding="utf-8"))
    page = html_tpl.format(title=title, diagram=diagram)
    html_path = html_dir / f"{mmd.stem}.html"
    html_path.write_text(page, encoding="utf-8")

    url = f"file:///{str(html_path).replace('\\', '/')}"
    png_path = out_dir / f"{mmd.stem}.png"
    svg_path = out_dir / f"{mmd.stem}.svg"

    subprocess.run([
        str(chrome), "--headless", "--disable-gpu", "--hide-scrollbars",
        "--window-size=1920,1080", f"--screenshot={png_path}",
        "--virtual-time-budget=12000", url
    ], check=False)

    dump = subprocess.run([
        str(chrome), "--headless", "--disable-gpu", "--dump-dom",
        "--virtual-time-budget=12000", url
    ], capture_output=True, text=True, check=False)

    dom = dump.stdout
    match = re.search(r"(<svg[^>]*>.*?</svg>)", dom, flags=re.DOTALL)
    if match:
        svg = match.group(1)
        svg_path.write_text(svg, encoding="utf-8")

print("done")
