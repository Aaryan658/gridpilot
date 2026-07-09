import os

file_path = r'd:\GRID\frontend\src\app\dashboard\page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# I want to slice out the sidebar and change the layout wrapper.
# I will find "  return (" and "      <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>"
# And then replace it.

start_idx = content.find('  return (')
end_idx = content.find('      <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>')

if start_idx != -1 and end_idx != -1:
    new_wrapper = '''  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
        {/* We moved the sidebar out to the layout component, so we just render the main content here! */}
        <div style={{ padding: 0, overflowY: "auto" }}>
'''
    content = content[:start_idx] + new_wrapper + content[end_idx + len('      <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>'):]

    # At the bottom, remove the extra closing div
    # It used to be 3 closing divs, now it's just 2.
    # The original end was:
    #       </div>
    #     </div>
    #   );
    # }
    content = content.replace('      </div>\n    </div>\n  );\n}', '    </div>\n  );\n}')
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("FAILED TO FIND INDICES")
