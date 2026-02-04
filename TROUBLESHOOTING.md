# Troubleshooting - Pulse Page Only Shows Sidebar

## Issue
User reports: "I can only see the side panel and nothing else" on http://localhost:3000/pulse

## Diagnosis Steps

### 1. Check Browser Console (F12)
Press F12 in your browser and look for:
- **Red error messages** (not the favicon/React DevTools ones)
- **Failed network requests** in the Network tab
- **JavaScript errors** in the Console tab

### 2. Check if Content is Hidden
Right-click on the page → Inspect Element → Look for:
```html
<main class="ml-64 p-8">
  <!-- Should see content here -->
</main>
```

If you see a "Loading..." message, the page is stuck fetching data.

### 3. Check Backend API
Open a new tab and go to: http://localhost:8000/projects

**Expected:** JSON response like `[]` or `[{...}]`
**If you get an error:** Backend is not responding

### 4. Check Network Tab
1. Open F12 → Network tab
2. Refresh the page
3. Look for requests to:
   - `/projects` - Should return 200 OK
   - `/tasks` - Should return 200 OK

## Quick Fixes

### Fix 1: Clear Browser Cache
```
Ctrl + Shift + Delete → Clear cache → Reload page
```

### Fix 2: Check if Backend is Running
```powershell
netstat -ano | findstr ":8000"
```
If nothing shows, backend is not running. Restart it:
```powershell
cd apps/agents
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

### Fix 3: Hard Refresh Frontend
```
Ctrl + Shift + R (or Ctrl + F5)
```

### Fix 4: Check Browser Width
The sidebar is 256px wide (w-64 = 16rem). If your browser window is too narrow, the main content might be pushed off-screen.

**Try:** Maximize your browser window or zoom out (Ctrl + -)

## What to Report

Please tell me:
1. **Browser console errors** (F12 → Console tab) - screenshot or copy the red errors
2. **Network tab status** (F12 → Network tab) - do you see requests to `/projects` and `/tasks`?
3. **What happens when you go to** http://localhost:8000/projects directly?
4. **Browser width** - Is your window maximized?

## Expected Behavior

When working correctly, you should see:
- Sidebar on the left (✅ you see this)
- Main content area with:
  - "The Pulse" heading
  - Project tabs (Project Alpha, Project Beta, Infrastructure)
  - AI Agent Control Panel
  - Task board with 4 columns (Done, Active, Backlog, Gap)
  - Statistics cards
  - Velocity chart
