import re

def extract_function(source, func_name):
    # Find start of function
    match = re.search(r"^function " + func_name + r"\(.*?\) \{", source, re.MULTILINE)
    if not match:
        print(f"Could not find {func_name}")
        return ""
    
    start_idx = match.start()
    
    # Track brackets to find end
    bracket_count = 0
    in_function = False
    
    for i in range(start_idx, len(source)):
        if source[i] == '{':
            bracket_count += 1
            in_function = True
        elif source[i] == '}':
            bracket_count -= 1
            
        if in_function and bracket_count == 0:
            return source[start_idx:i+1] + "\n\n"
            
    return ""

def main():
    with open('src/App1-6-2026.jsx', 'r') as f:
        source = f.read()
        
    funcs_to_extract = [
        "AdminDietPlan",
        "AdminUserList",
        "AdminPanel",
        "AdminCompetitions",
        "UserCompetitions",
        "UserCard",
        "AdminFeedbackTab",
        "AdminUserDataView"
    ]
    
    restored_code = ""
    for func in funcs_to_extract:
        code = extract_function(source, func)
        restored_code += code
        
    # Read current App.jsx
    with open('src/App.jsx', 'r') as f:
        app_source = f.read()
        
    # Insert restored code right before "function App() {"
    app_match = re.search(r"^function App\(\) \{", app_source, re.MULTILINE)
    if not app_match:
        print("Could not find App()")
        return
        
    insert_idx = app_match.start()
    
    new_app_source = app_source[:insert_idx] + restored_code + app_source[insert_idx:]
    
    with open('src/App.jsx', 'w') as f:
        f.write(new_app_source)
        
    print("Done restoring functions!")

if __name__ == '__main__':
    main()
