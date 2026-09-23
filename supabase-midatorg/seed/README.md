# Miðatorg — demo seed

`seed.sql` fills an otherwise empty Miðatorg schema with demo data so the UI has
something to show: six demo users, eight venues, twenty events (`source = 'seed'`,
18 upcoming and 2 past), ~26 active listings, 16 active requests, four completed
deals (three of them rated both ways) and two weeks of price history for eight
events. Four upcoming events deliberately have no listings, so the waitlist /
empty state can be seen.

- Seed users' emails end in `@seed.midatorg.local` (anna, bjarki, gudrun, kari,
  soley, thorir). Their passwords are random and thrown away; they are not meant
  for logging in. Use `test_users.sql` for password-login test accounts
  (`…@test.midatorg.local`).
- The file is one transaction (`begin;` … `commit;`) that sets the `mt.internal`
  flag first, so the guard triggers accept the direct inserts. Paste it whole
  into the Supabase SQL editor or run it through the Supabase MCP `execute_sql`.
- It refuses to run when seed users already exist. Ids are looked up by email
  and title, never hard-coded.

## Removing all seed data

```sql
delete from auth.users where email like '%@seed.midatorg.local';
delete from mt_events where source = 'seed';
```

Profiles, listings, requests, deals, ratings, notifications and price snapshots
cascade from those two deletes. Venues carry no seed marker and are left in
place (imported events may share them); drop them by name if you want a
completely clean slate.
