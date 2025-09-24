### What you want to add
A “fold tabset” button in every tabset’s header so that:
- Folded state: the tabset collapses to just its header (tab strip + an unfold icon), the content area is hidden (height ~ 0).
- Unfolded state: the tabset returns to its previous size.

FlexLayout doesn’t ship a built-in “collapse tabset” action, but you can implement it cleanly using custom header rendering plus `Actions.updateNodeAttributes(...)` to temporarily clamp the tabset’s height and then restore it.

Below is a drop-in pattern that works with `flexlayout-react`’s public API.

---

### Key idea
- Use `onRenderTabSet` to inject a leading button in the tabset header.
- On fold:
    - Save the current `weight` (and optionally `minHeight/maxHeight`) into the tabset’s `config` so you can restore it later.
    - Shrink the tabset by setting `minHeight` and `maxHeight` to the tab strip height (around 28–32px depending on theme), and reduce its `weight` so its row gives it essentially only header height.
- On unfold:
    - Restore `weight/minHeight/maxHeight` from `config`.

This approach renders only the tabset header while the content gets zero height, which is exactly the “folded” visual.

---

### Minimal implementation (TypeScript/React)
Assuming you already have a `model` and a `<Layout />` from `flexlayout-react`:

```tsx
import * as React from 'react';
import { Layout, Actions, TabSetNode } from 'flexlayout-react';

// Pick a tab strip height that matches your theme (28–32 typical)
const TABSTRIP_PX = 30;

function foldTabset(model: any, tabSetNode: TabSetNode) {
  const id = tabSetNode.getId();
  const cfg = { ...(tabSetNode.getConfig?.() ?? {}) };

  if (cfg.folded) return; // already folded

  // Persist current sizing so we can restore later
  cfg.folded = true;
  cfg.prev = {
    weight: (tabSetNode as any).getWeight?.() ?? tabSetNode.getAttribute?.('weight'),
    minHeight: tabSetNode.getAttribute?.('minHeight'),
    maxHeight: tabSetNode.getAttribute?.('maxHeight'),
  };

  // Clamp height to the header and make its weight tiny so row gives it minimal space
  model.doAction(
    Actions.updateNodeAttributes(id, {
      config: cfg,
      minHeight: TABSTRIP_PX,
      maxHeight: TABSTRIP_PX,
      // small weight so siblings get the extra space
      weight: 1,
      // optional UX: disable dropping into a folded set
      enableDrop: false,
    })
  );
}

function unfoldTabset(model: any, tabSetNode: TabSetNode) {
  const id = tabSetNode.getId();
  const cfg = { ...(tabSetNode.getConfig?.() ?? {}) };
  if (!cfg.folded) return;

  const prev = cfg.prev ?? {};

  model.doAction(
    Actions.updateNodeAttributes(id, {
      config: { ...cfg, folded: false, prev: undefined },
      minHeight: prev.minHeight ?? 0,
      maxHeight: prev.maxHeight ?? 99999,
      weight: prev.weight ?? 100,
      enableDrop: true,
    })
  );
}

export function MyLayout({ model, factory }: { model: any; factory: any }) {
  return (
    <Layout
      model={model}
      factory={factory}
      onRenderTabSet={(tabSetNode, renderValues) => {
        // Render a leading icon on the far-left of the tabset header
        const folded = !!tabSetNode.getConfig?.()?.folded;
        renderValues.leading = (
          <button
            key="fold-toggle"
            title={folded ? 'Unfold tabset' : 'Fold tabset'}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 14,
              padding: '2px 6px',
            }}
            onMouseDown={(e) => e.stopPropagation()} // prevent header drag
            onClick={(e) => {
              e.stopPropagation();
              if (folded) {
                unfoldTabset(model, tabSetNode);
              } else {
                foldTabset(model, tabSetNode);
              }
            }}
          >
            {folded ? '▾' : '▸'}
          </button>
        );
      }}
    />
  );
}
```

Notes:
- The code relies on `Actions.updateNodeAttributes` to set `minHeight/maxHeight` and `weight` on the tabset. This keeps things purely within FlexLayout’s model (no DOM hacks required).
- `renderValues.leading` places the toggle button at the left of the header (this version of the typings exposes `leading` and `stickyButtons`, not left/right variants). If your flexlayout-react version exposes `stickyButtonsLeft`, you can push the button there instead.
- The body content effectively disappears because the content area receives zero height once the tabset is clamped to the header height.

---

### Optional polish
- Prevent tab interactions while folded:
    - Add `enableDrag: false` and `enableDivide: false` in folded state via the same `updateNodeAttributes` call if you want a purely static header while folded.
- Visually indicate folded header:
    - Use `classNameTabStrip` (per-tabset) or `classNameMapper` (global) to apply a specific class when `config.folded` is true. Since `classNameMapper` doesn’t receive the node, a common trick is to set `classNameTabStrip: 'tabstrip--folded'` on the tabset with another `updateNodeAttributes` update when folding, then remove it on unfold.
- Persist folding across reloads:
    - Because we stash the flag in the node’s `config`, it will be serialized by `model.toJson()` and restored by `Model.fromJson()`.

Example augment for class name:
```ts
Actions.updateNodeAttributes(id, {
  config: cfg,
  classNameTabStrip: 'tabstrip--folded',
  minHeight: TABSTRIP_PX,
  maxHeight: TABSTRIP_PX,
  weight: 1,
});
```
Then in CSS you could slightly tint the folded tabset header if desired.

---

### Edge cases and behavior
- Maximized tabsets: If a tabset is maximized, you may want to ignore folding or first restore from maximized state (via `Actions.maximizeToggle`).
- Rows/weights: Setting `weight: 1` on the folded tabset is enough in most layouts. If you need finer control you can also call `Actions.adjustWeights(parentRowId, weights[])`, but it’s usually unnecessary.
- Header height value: Themes differ by a few pixels. If you need exact matching, you can measure the header once (via a ref) and store that in model attributes, but a constant 28–32px generally suffices.

---

### Summary
By combining `onRenderTabSet` for the UI and `Actions.updateNodeAttributes` for sizing, you can implement a reliable fold/unfold behavior:
- Fold: set a tiny `weight` and clamp `minHeight=maxHeight=<tabstrip>`; mark `config.folded=true`.
- Unfold: restore prior `weight/minHeight/maxHeight` from `config.prev` and clear `folded`.

This gives a tabset that collapses to only its header (tab names + unfold button) and expands back on demand, without deleting any tabs or relying on DOM tweaks.