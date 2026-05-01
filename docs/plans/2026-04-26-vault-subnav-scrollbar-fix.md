# Fix vertical scrollbar in Vault sub-nav

## Context

After the learn-area design refresh ([2026-04-26 plan](./2026-04-26-learn-area-design-refresh.md)), the Vault page's tab strip (Browse / Series / Bookmarks / Watch Later / Notes) shows a small unwanted vertical scrollbar on the right edge. It's caused by my edit to [components/vault/VaultSubNav.tsx](../../components/vault/VaultSubNav.tsx): the `<nav>` uses `overflow-x-auto` so the tabs can scroll horizontally on small screens, but Chrome enables Y-axis scrollbar too whenever the inline content is even 1px taller than the container — which happens here because the active tab's `border-b-2` lives at the bottom edge of the row.

## Change

One file, one className edit.

[components/vault/VaultSubNav.tsx:32](../../components/vault/VaultSubNav.tsx#L32)

```diff
-<nav className="flex items-center gap-5 overflow-x-auto border-b border-border-default">
+<nav className="flex items-center gap-5 overflow-x-auto overflow-y-hidden border-b border-border-default">
```

Adding `overflow-y-hidden` explicitly clips any Y overflow without affecting horizontal scroll behavior.

## Verification

- Reload `/learn/vault` — vertical scrollbar gone, tabs unchanged otherwise.
- Resize browser window narrow enough to force horizontal overflow — confirm horizontal scroll still works (drag/swipe scrolls the tab list).
- Check `/learn/vault/series`, `/learn/vault/bookmarks` etc. since they share the same component.

## Progress log

| Step | Status |
|------|--------|
| Add `overflow-y-hidden` to VaultSubNav | not started |
