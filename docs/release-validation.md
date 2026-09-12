# Release validation — 2026-09-12

Candidate: `@emtt/vue-monaco-ide@0.2.0`; not published.

- ESLint, vue-tsc (including tests), and 8 Vitest/Vue Test Utils behavior tests passed.
- Library and playground production builds passed.
- Actual pnpm tarball: 54 allowlisted files, 175629 bytes. All exports exist and all dist files match the independently installed final archive. pnpm strips development-only package manager/prepack fields during packing.
- Independent consumer: Vue 3.5.41, Monaco 0.52.2, monaco-pyright-lsp 0.1.7, TypeScript 5.8.3, Vite 6.4.3; no source aliases.
- Without monaco-yaml: strict TypeScript (skipLibCheck: false) and Vite build passed.
- With monaco-yaml 5.4.0 and /yaml side-effect import: strict TypeScript and Vite build passed. YAML registration and component CSS retained in production output.
- Final tarball was reinstalled after documentation updates and declaration cleanup; strict TypeScript passed again.
- SHA256: `b3fa7fc05ed794a429e2831d5e0e2822fbe7cefd65b8ec2e1faccbad06d78420`.
- Build warnings: large Monaco chunk and mixed static/dynamic language imports.
- No full browser LSP/Worker acceptance test or hosted demo performed.
- Registry package query returned 404; identity returned 401. Actual repository URL remains unconfirmed, and placeholder metadata has been removed.

See [release checklist](../NEEDS_FROM_YOU.md). Metadata/code changes require a new tarball and verification before publication.
