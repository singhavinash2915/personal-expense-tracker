# iOS Home Screen Widget — Xcode Setup Steps

The widget **source files are already created** in this folder. To turn them into
a working widget, you need to add a Widget Extension target in Xcode (one-time, ~5 minutes).

## One-Time Setup in Xcode

### 1. Add the Widget Extension target
1. Open `ios/App/App.xcworkspace` in Xcode
2. File → **New → Target…**
3. Select **Widget Extension**, click **Next**
4. Product Name: **`ExpenseFlowWidget`**
5. Bundle Identifier: `com.avinash.expenseflow.widget` (auto-filled)
6. UNCHECK "Include Configuration Intent"
7. Team: (your Apple developer team)
8. Click **Finish** → **Activate** if prompted

### 2. Replace generated files with ours
Xcode generated template files. **Replace** them with the ones we already created:
- Delete Xcode-generated `ExpenseFlowWidget.swift` → add our file from this folder
- Delete Xcode-generated `Info.plist` → add our file from this folder

### 3. Enable App Groups (BOTH targets)
You need to enable App Groups on **both** the main App target AND the Widget target
so they can share data.

**Main App target (App):**
1. Select the **App** target → **Signing & Capabilities** tab
2. Click **+ Capability** → add **App Groups**
3. Click **+** under App Groups → enter: `group.com.avinash.expenseflow`

**Widget target (ExpenseFlowWidget):**
1. Select the **ExpenseFlowWidget** target → **Signing & Capabilities** tab
2. Click **+ Capability** → add **App Groups**
3. Check the same group: `group.com.avinash.expenseflow`

### 4. Bridge Capacitor Preferences → App Group UserDefaults (iOS)
The `capacitor.config.ts` already sets `Preferences.group = 'group.com.avinash.expenseflow'`.
After running `npx cap sync ios`, Capacitor will write Preferences values to the shared
UserDefaults suite, which the widget reads.

### 5. Build & Run
- Select the **App** scheme and run it once (writes initial snapshot)
- Long-press home screen → + → search **ExpenseFlow** → add widget

## How it Works
```
Web App (React)
    ↓ writeWidgetSnapshot(state)
Capacitor Preferences plugin
    ↓ (iOS only, via App Group config)
UserDefaults(suiteName: "group.com.avinash.expenseflow")
    ↓ ExpenseSnapshot.load()
SwiftUI Widget View (small/medium)
```

## Refresh Cadence
- Widget refreshes at most every **30 minutes** (WidgetKit system policy)
- When you open the main app, the widget snapshot updates immediately in storage
- The widget itself will next redraw on its own schedule
- For immediate refresh, tap the widget (opens app, updates data, widget redraws on next cycle)

## Troubleshooting
- **Widget shows "Open app to sync"**: snapshot not yet written. Open app, wait 2 seconds, go back home.
- **Widget never updates**: Confirm App Group name matches EXACTLY in all 3 places:
  1. Main App entitlements
  2. Widget entitlements
  3. `capacitor.config.ts` → `plugins.Preferences.group`
- **Build error: missing entitlement**: Signing & Capabilities → ensure App Groups is added
  to BOTH targets.
