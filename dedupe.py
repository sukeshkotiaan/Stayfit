import re

def main():
    with open('src/App.jsx', 'r') as f:
        content = f.read()
        
    # Find all function declarations
    functions = []
    for match in re.finditer(r"^function ([a-zA-Z0-9_]+)\(", content, re.MULTILINE):
        func_name = match.group(1)
        start_idx = match.start()
        functions.append((func_name, start_idx))
        
    seen = set()
    duplicates = []
    
    for func_name, start_idx in functions:
        if func_name in seen:
            duplicates.append((func_name, start_idx))
        else:
            seen.add(func_name)
            
    print(f"Found duplicates: {[d[0] for d in duplicates]}")
    
    # Let's remove the second occurrences.
    # To be safe, we will just comment out the function signature of the duplicate,
    # OR we can delete the whole block.
    # Actually, it's easier to just remove from `start_idx` to the closing brace.
    new_content = content
    offset = 0
    
    # We must sort duplicates by start_idx
    duplicates.sort(key=lambda x: x[1])
    
    for func_name, start_idx in duplicates:
        # find the start in the current string
        actual_start = new_content.find("function " + func_name + "(", offset)
        if actual_start == -1: continue
        
        # track braces
        bracket_count = 0
        in_func = False
        end_idx = -1
        
        for i in range(actual_start, len(new_content)):
            if new_content[i] == '{':
                bracket_count += 1
                in_func = True
            elif new_content[i] == '}':
                bracket_count -= 1
                
            if in_func and bracket_count == 0:
                end_idx = i + 1
                break
                
        if end_idx != -1:
            print(f"Removing duplicate {func_name}")
            new_content = new_content[:actual_start] + new_content[end_idx:]
            
    with open('src/App.jsx', 'w') as f:
        f.write(new_content)

if __name__ == '__main__':
    main()
