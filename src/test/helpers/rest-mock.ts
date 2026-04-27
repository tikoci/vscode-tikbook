/**
 * REST mock helper for unit tests.
 *
 * Wraps `axios-mock-adapter` so tests can stub RouterOS REST traffic without
 * touching a real router. Installed against the **default axios instance**, so
 * any `axios.create()` calls (including the per-call client built inside
 * `RouterRestClient.httpClient`) inherit the mock adapter via `axios.defaults`.
 *
 * Usage:
 *
 *   import { installRestMock } from '../helpers/rest-mock'
 *
 *   suite('something', () => {
 *     const mock = installRestMock()
 *     setup(() => mock.reset())
 *
 *     test('runs a script', async () => {
 *       mock.onPost('/execute').reply(200, { ret: 'hello\n' })
 *       // ... open notebook, execute cell, assert output ...
 *     })
 *   })
 *
 * Pair with recorded fixtures under `src/test/fixtures/rest/` for the
 * record-replay model — see docs/testing-layout.md.
 */

import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'

// `suiteTeardown` is a mocha TDD global (typed via @types/mocha); do not
// import it as a named export — that resolves to the BDD `after` function.

/**
 * Install a mock adapter against the default axios instance for the lifetime
 * of the calling suite. The returned adapter is `.reset()` between tests is
 * the caller's responsibility (call it in `setup()`); the adapter itself is
 * `.restore()`'d in `suiteTeardown` so unrelated suites are not affected.
 *
 * Defaults:
 * - All requests pass-through is **disabled** — anything not explicitly mocked
 *   throws a network error, which is what you want for hermetic tests.
 */
export function installRestMock(): MockAdapter {
  const mock = new MockAdapter(axios)

  suiteTeardown(() => {
    mock.restore()
  })

  return mock
}

/**
 * Convenience: stub the `/execute` endpoint (used by the notebook kernel's
 * `client.run()` path) to return a single string response.
 *
 * RouterOS wraps single-script execute responses in `{ ret: "..." }`.
 */
export function mockExecuteResponse(mock: MockAdapter, output: string): void {
  mock.onPost('/execute').reply(200, { ret: output })
}
