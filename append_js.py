
# Read current HTML
with open('/home/claude/betancur-os-v2/index.html', 'r') as f:
    html = f.read()

# Remove closing tags so we can insert JS before them
if html.endswith('</div>\n'):
    html = html[:-len('</div>\n')]
    
# JS is written to a separate file to avoid argument limits
import os
js_file = '/home/claude/betancur-os-v2/js_payload.js'
if os.path.exists(js_file):
    with open(js_file, 'r') as f:
        js = f.read()
    complete = html + '\n' + js + '\n</div>\n'
    with open('/home/claude/betancur-os-v2/index.html', 'w') as f:
        f.write(complete)
    print(f"Done. Total: {len(complete):,} bytes")
else:
    print("ERROR: js_payload.js not found")
