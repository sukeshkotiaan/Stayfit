import sys

def main():
    with open('src/App1-6-2026.jsx', 'r') as f:
        backup = f.readlines()
        
    ranges = [
        (4770, 5195), # AdminDietPlan
        (5196, 5235), # AdminUserList
        (5236, 5395), # AdminPanel
        (5396, 5682), # AdminCompetitions
        (5683, 5918), # UserCompetitions
        (5919, 6609), # UserCard
        (6665, 6770), # AdminFeedbackTab
        (8184, 8199)  # AdminUserDataView
    ]
    
    missing_code = ""
    for start, end in ranges:
        # 1-based to 0-based
        missing_code += "".join(backup[start-1:end]) + "\n"
        
    with open('src/App.jsx', 'r') as f:
        current = f.readlines()
        
    # Find `function App() {`
    app_idx = -1
    for i, line in enumerate(current):
        if line.startswith("function App() {"):
            app_idx = i
            break
            
    if app_idx == -1:
        print("Error: Could not find function App()")
        sys.exit(1)
        
    new_lines = current[:app_idx] + [missing_code] + current[app_idx:]
    
    with open('src/App.jsx', 'w') as f:
        f.writelines(new_lines)
        
    print("Done restoring accurately!")

if __name__ == '__main__':
    main()
