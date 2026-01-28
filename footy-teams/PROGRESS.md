# Progress Log

## Latest session

- Added dev auth bypass for local testing.
- Fixed NextAuth route exports and server action directives.
- Group creation: day-of-week dropdown, required fields, inline errors.
- New session: manual player add UI, member picker with search, WhatsApp paste still supported.
- Team builder: drag/drop fixes, bib/non-bib buttons, layout tweaks.
- Session overview: shirt formation view with SVG kit, numbers on shirts, names below.
- Shirt numbers: stored on GroupPlayer, unique per group; assign on publish; editable in Members.
- Admin controls: edit participants on session overview (collapsible).
- Admin delete session: trash icon on group page with confirm.
- Seeded test users and added to "Monday Football".
- Tests: fixed non-deterministic team balance test assertion.
- Session scores: admin-only final score dialog per fixture; confirmation when overwriting scores.
- Points persistence: added SessionStat table, score saves recompute stats (no double counting).
- League tables now use SessionStat; added backfill script + npm run prisma:backfill-stats.
- League: tie ranks show "-", no hash; movement indicators with triangles and first-session up/down.
- League: metric dropdown (total/weighted/win/weighted win/MoTM), full-row links to player pages.
- Player page: new /groups/[groupId]/players/[playerId] graph with Observable Plot + metric dropdown.
- League graph: multi-player line chart with legend, hover line/legend highlighting, no tooltip.
- Charts: axis formatting, gridlines, hover points, fonts, and layout polish.
- MoTM: admin open/close voting, ranked ballot (3-2-1), per-session via session button.
- MoTM leaderboard: now combined into league metric "MoTM points" (1 point per session winner).
- Dev user switcher in top bar (DEV_AUTH_BYPASS only) to swap between seeded users.
- Invites: add rotate/disable actions and normalize invite codes on join.
- Members: restrict shirt number edits to admins or the member themselves.
- Invites: require confirmation before joining from an invite link.
- Members: show a popup when a shirt number is already taken, including the current holder.
- Invites: auto-assign the next available shirt number when someone joins.
- Shirt numbers: allow 100-999 once a group passes 99 members; show suggested number on invite confirm.
- Members: show a welcome popup with the assigned shirt number after joining; invite page shows number for existing members.
- Popups: use a shared popup card component and show the welcome message on the group page after joining.
- Nicknames: add per-group nickname field, enforce unique nickname per group, and allow admins/self to edit on Members page.
- Session: add nickname toggle in Teams view and export teams image (phone ratio) for sharing.
- Export: inline kit colours + number colours in the exported image so shirts render correctly.
- Export: set explicit SVG fill colors to avoid black shirts in saved images.
- Auth0 migration plan saved in AUTH0_PLAN.md (switch from Google/Apple to Auth0 hub).

## Notes / Next steps

- Potential updates (backlog)
  - Per-group nicknames (admin/self edit, unique per group, toggle in session view).
- Consider adding member management UI (invite/add/remove).
- Improve shirt number UI/flow as needed.
- Run prisma migrate dev for the nickname fields.
- Run prisma migrate dev for session-stats and motm-ranked if not done.
- Backfill stats: npm run prisma:backfill-stats.
