// Runs tix_test.ts under Node (>= 22.18, which strips TypeScript types
// natively) when Deno is not installed:  node _shared/run_tests_node.mjs
// It provides a minimal `Deno.test` shim backed by node:test and then imports
// the test file, which registers its cases through that shim.
import { test } from 'node:test';

if (typeof globalThis.Deno === 'undefined') {
  globalThis.Deno = {
    test(nameOrDef, fn) {
      if (typeof nameOrDef === 'object' && nameOrDef !== null) {
        const { name, fn: defFn } = nameOrDef;
        return test(name, defFn);
      }
      return test(nameOrDef, fn);
    },
  };
}

await import('./tix_test.ts');
