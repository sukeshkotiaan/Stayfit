import sys

def main():
    # Read the backup file
    with open('src/App1-6-2026.jsx', 'r') as f:
        backup_lines = f.readlines()
        
    # Extract the contiguous block of missing functions
    # 4770 to 8199 (inclusive, 1-based index)
    missing_code = "".join(backup_lines[4769:8199])
    
    # Read the current App.jsx
    with open('src/App.jsx', 'r') as f:
        current_lines = f.readlines()
        
    # Find where the broken stuff starts
    # We saw it was around line 6917. Let's find "function App() {"
    app_idx = -1
    for i, line in enumerate(current_lines):
        if line.startswith("function App() {"):
            app_idx = i
            break
            
    if app_idx == -1:
        print("Error: Could not find function App()")
        sys.exit(1)
        
    # We need to remove the broken partial signatures that we added earlier
    # Let's find the line before the broken signatures.
    # The first broken one was `function AdminDietPlan`
    broken_start_idx = app_idx
    for i in range(app_idx - 1, -1, -1):
        if "// ══════════════════════════════════════════════════════════════════════════════" in current_lines[i] or "function AdminDietPlan" in current_lines[i]:
            broken_start_idx = i
            # Keep going up until we find the real code
        if "function WeeklyScheduleExpand" in current_lines[i]:
            # This is the last valid function before the missing block
            # But wait, did I have it? Yes!
            pass
            
    # Actually, we can just find the EXACT line where the broken stuff was inserted
    # It was inserted right before `function App() {` which was at line 6928 before I ran my broken script!
    # Let's just find the `function WeeklyScheduleExpand` end brace
    valid_end_idx = -1
    for i in range(app_idx - 1, -1, -1):
        if current_lines[i].startswith("function WeeklyScheduleExpand"):
            # find its closing brace
            bracket_count = 0
            for j in range(i, app_idx):
                for char in current_lines[j]:
                    if char == '{': bracket_count += 1
                    elif char == '}': bracket_count -= 1
                if bracket_count == 0 and '{' in current_lines[i]:
                    valid_end_idx = j
                    break
            break
            
    if valid_end_idx != -1:
        print(f"Found valid end at {valid_end_idx}")
        # Insert the missing code right after the valid end
        new_lines = current_lines[:valid_end_idx+1] + ["\n"] + [missing_code] + ["\n"] + current_lines[app_idx:]
    else:
        print("Could not find WeeklyScheduleExpand, just replacing right before App()")
        # If we can't find it safely, let's just use `git checkout src/App.jsx` in the bash directly
        pass
        
    with open('src/App.jsx', 'w') as f:
        f.writelines(new_lines)

if __name__ == '__main__':
    main()
