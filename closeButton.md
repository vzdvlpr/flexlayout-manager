### Goal
Add a “close tabset” button in the left corner of each tabset’s header in `flexlayout-react` so clicking it closes the entire tabset.

### How it works in flexlayout-react
- You can customize a tabset’s header via the `onRenderTabSet` prop on `Layout`.
- You can inject custom buttons into the header using `renderValues.stickyButtonsLeft` (left side) or `renderValues.stickyButtonsRight` (right side).
- There isn’t a built-in “delete tabset” action; the usual pattern is to delete all tabs in the tabset. If the tabset is configured with `enableDeleteWhenEmpty: true`, it disappears automatically when emptied.

### Changes to make
1) Ensure tabsets are deletable when they become empty.
2) Add a left-corner close button via `onRenderTabSet` that deletes all tabs in that tabset.

---

### 1) Mark tabsets as deletable when empty
In your `Panel.toJson()` (file: `/Users/vasiliyzaycev/projects/tnt/flexlayout-manager/src/App.tsx`), add `enableDeleteWhenEmpty: true` to the returned tabset JSON.

Current (around lines 46–59):
```ts
  toJson() {
    return {
      type: 'tabset',
      id: this.id,
      name: this.title,
      children: this.tabs.map((t) => ({
        type: 'tab',
        id: t.id,
        name: t.name,
        component: t.component,
        config: t.config,
      })),
    };
  }
```

Change to:
```ts
  toJson() {
    return {
      type: 'tabset',
      id: this.id,
      name: this.title,
      enableDeleteWhenEmpty: true, // <- allow removal when last tab is deleted
      children: this.tabs.map((t) => ({
        type: 'tab',
        id: t.id,
        name: t.name,
        component: t.component,
        config: t.config,
      })),
    };
  }
```

### 2) Inject a close button on the left of each tabset header
Add `onRenderTabSet` to your `<Layout />` (around lines 173–187). The button iterates over the tabset’s tabs and deletes them, which removes the tabset due to step 1.

```tsx
      <Layout
        model={model}
        factory={factory}
        onRenderTabSet={(tabSetNode, renderValues) => {
          // Add a close button at the far-left of the tabset header
          renderValues.stickyButtonsLeft.push(
            <button
              key="close-tabset"
              title="Close tabset"
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: 14,
                padding: '2px 6px',
              }}
              onMouseDown={(e) => e.stopPropagation()} // avoid starting a drag
              onClick={(e) => {
                e.stopPropagation();
                const tabs = [...tabSetNode.getChildren()]; // clone because we mutate while iterating
                tabs.forEach((t) => {
                  model.doAction(Actions.deleteTab(t.getId()));
                });
              }}
            >
              ×
            </button>
          );
        }}
        onAction={(action: any) => {
          console.log(action);
          return action;
        }}
      />
```

Notes:
- `onMouseDown` and `stopPropagation()` prevent header drag from initiating when the button is pressed.
- You don’t need to call `setModel` when performing `model.doAction(...)` here; `Layout` updates itself on actions.
- The button’s visual can be adjusted (use an icon, change size/colors) as needed.

### Optional: hide per-tab close buttons
If you want users to close only via the tabset close button, you can disable tab close per tab by setting `enableClose: false` in each tab’s JSON, e.g. in `Panel.toJson()` when mapping `children`:

```ts
children: this.tabs.map((t) => ({
  type: 'tab',
  id: t.id,
  name: t.name,
  component: t.component,
  config: t.config,
  enableClose: false, // optional: remove per-tab close icon
})),
```

### That’s it
With these two small changes, every tabset will show an “×” button at the left of its header that closes the entire tabset in one click.