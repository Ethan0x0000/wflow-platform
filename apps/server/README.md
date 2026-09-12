# wflow Temporal Host

A TypeScript reference host that runs the `wflow-core` engine on Temporal and
exposes a REST API for the workflow UI. It persists host projections in SQLite.

From the repository root:

```bash
pnpm install
pnpm dev:server
```

The API listens on `127.0.0.1:2048`. Start a UI with `pnpm dev:web` (Vue, port
3000) or `pnpm dev:react` (React, port 3001).

Without `TEMPORAL_ADDRESS`, the host starts a local Temporal development server
with persistent storage. `WFLOW_DEMO=1` is required for the bundled demo
authentication adapter and is set by the dev script; integrate your own
authentication and adapters for production.

The engine itself lives in the standalone [wflow-core](https://github.com/Ethan0x0000/wflow-core)
repository and is consumed here as a git dependency. See `docs/architecture.md`
and `docs/sdk-guide.md` for design and integration details.