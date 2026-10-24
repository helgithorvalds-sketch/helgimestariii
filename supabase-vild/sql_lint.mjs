#!/usr/bin/env node
// Tiny static checker for the VILD migrations (no database needed):
//   * dollar-quoted blocks ($$ … $$, $tag$ … $tag$) are balanced
//   * parentheses are balanced outside strings / comments / dollar quotes
//   * every "create table" has a comment and "enable row level security"
//   * lists the objects each file creates
// Usage: node supabase-vild/sql_lint.mjs [files…]   (default: migrations/*.sql + seed/seed.sql)
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const files = args.length
  ? args
  : [
      ...readdirSync(join(here, 'migrations')).filter((f) => f.endsWith('.sql')).sort().map((f) => join(here, 'migrations', f)),
      join(here, 'seed', 'seed.sql'),
    ];

/** Strip comments, string literals and dollar-quoted bodies; return the skeleton plus the dollar-tag stack result. */
function scan(sql) {
  let out = '';
  let i = 0;
  const stack = []; // open dollar tags
  let line = 1;
  const errors = [];
  while (i < sql.length) {
    const ch = sql[i];
    if (ch === '\n') line++;
    if (stack.length) {
      // inside a dollar-quoted body: only the matching close tag matters (nested tags allowed)
      const m = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i));
      if (m) {
        const tag = m[0];
        if (tag === stack[stack.length - 1]) stack.pop();
        else stack.push(tag);
        i += tag.length;
        continue;
      }
      i++;
      continue;
    }
    if (ch === '-' && sql[i + 1] === '-') {
      const end = sql.indexOf('\n', i);
      i = end === -1 ? sql.length : end;
      continue;
    }
    if (ch === '/' && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2);
      if (end === -1) { errors.push(`line ${line}: unterminated /* comment`); break; }
      line += sql.slice(i, end).split('\n').length - 1;
      i = end + 2;
      continue;
    }
    if (ch === "'") {
      let j = i + 1;
      for (;;) {
        const q = sql.indexOf("'", j);
        if (q === -1) { errors.push(`line ${line}: unterminated string`); return { out, stack, errors }; }
        if (sql[q + 1] === "'") { j = q + 2; continue; }
        line += sql.slice(i, q).split('\n').length - 1;
        i = q + 1;
        break;
      }
      out += "''";
      continue;
    }
    const m = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i));
    if (m) {
      stack.push(m[0]);
      out += ' $BODY$ ';
      i += m[0].length;
      continue;
    }
    out += ch;
    i++;
  }
  return { out, stack, errors };
}

let failed = false;
for (const file of files) {
  const sql = readFileSync(file, 'utf8');
  const { out, stack, errors } = scan(sql);
  const problems = [...errors];
  if (stack.length) problems.push(`unbalanced dollar quotes: still open ${stack.join(' ')}`);
  let depth = 0;
  for (const ch of out) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (depth < 0) { problems.push('unbalanced parentheses (extra ")")'); break; }
  }
  if (depth > 0) problems.push(`unbalanced parentheses (${depth} unclosed)`);

  const tables = [...out.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(public\.\w+)/gi)].map((m) => m[1]);
  const views = [...out.matchAll(/create\s+(?:or\s+replace\s+)?view\s+(public\.\w+)/gi)].map((m) => m[1]);
  const functions = [...out.matchAll(/create\s+(?:or\s+replace\s+)?function\s+(public\.\w+)/gi)].map((m) => m[1]);
  const triggers = [...out.matchAll(/create\s+trigger\s+(\w+)/gi)].map((m) => m[1]);
  const policies = [...out.matchAll(/create\s+policy\s+"([^"]+)"/gi)].map((m) => m[1]);
  const indexes = [...out.matchAll(/create\s+(?:unique\s+)?index\s+(?:if\s+not\s+exists\s+)?(\w+)/gi)].map((m) => m[1]);
  const comments = new Set([...sql.matchAll(/comment\s+on\s+table\s+(public\.\w+)/gi)].map((m) => m[1]));
  const rls = new Set([...out.matchAll(/alter\s+table\s+(public\.\w+)\s+enable\s+row\s+level\s+security/gi)].map((m) => m[1]));
  for (const t of tables) {
    if (!comments.has(t)) problems.push(`${t}: no "comment on table"`);
    if (!rls.has(t)) problems.push(`${t}: row level security not enabled`);
  }
  const unprefixed = [...tables, ...views, ...functions].filter((n) => !/^public\.vild_/.test(n));
  if (unprefixed.length) problems.push(`objects without the vild_ prefix: ${unprefixed.join(', ')}`);

  console.log(`${basename(file)}: ${tables.length} tables, ${views.length} views, ${functions.length} functions, ${triggers.length} triggers, ${policies.length} policies, ${indexes.length} indexes`);
  if (tables.length) console.log(`  tables:    ${tables.map((t) => t.replace('public.', '')).join(', ')}`);
  if (views.length) console.log(`  views:     ${views.map((t) => t.replace('public.', '')).join(', ')}`);
  if (functions.length) console.log(`  functions: ${functions.map((t) => t.replace('public.', '')).join(', ')}`);
  for (const p of problems) console.log(`  PROBLEM: ${p}`);
  if (problems.length) failed = true;
}
if (failed) {
  console.log('sql_lint: problems found');
  process.exit(1);
}
console.log('sql_lint: ok');
