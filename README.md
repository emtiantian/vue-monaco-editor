# @emtt/vue-monaco-ide

English | [简体中文](README.zh-CN.md)

A Vue 3 component combining a Monaco code editor, file tree and tabs. It integrates Pyright for Python language services, supports cross-file TS/JS navigation, and provides optional Markdown and media previews. Its workbench UI uses ordinary CSS and inline icons, with no UI framework dependency.

Version 0.2.0 is a release candidate and has not been published in this preparation pass. No hosted demo is available yet; use `pnpm dev` for the local playground.

Repository: [github.com/emtiantian/vue-monaco-editor](https://github.com/emtiantian/vue-monaco-editor) · Demo: [GitHub Pages](https://emtiantian.github.io/vue-monaco-editor/)

## Installation

After publication:

```sh
pnpm add @emtt/vue-monaco-ide vue@^3.5 monaco-editor@~0.52.2 monaco-pyright-lsp@^0.1.7
```

Browser ESM only. Vue 3.5 is required by the generated declarations. Monaco 0.52.2 is the development baseline; older Monaco and Vue versions, SSR and CommonJS are not supported by this release contract. `vscode-languageserver` is installed as a runtime dependency. Development uses pnpm 10 and Node.js 22.

## Quick start

```vue
<script setup lang="ts">
import { VueMonacoEditor } from '@emtt/vue-monaco-ide'
import type { FileInput } from '@emtt/vue-monaco-ide'
import '@emtt/vue-monaco-ide/style.css'

const files: FileInput[] = [
  { path: '/src/main.ts', name: 'main.ts', content: 'export const answer = 42' },
  { path: '/README.md', name: 'README.md', content: '# Hello' },
]
</script>

<template>
  <VueMonacoEditor
    :files="files"
    default-open-path="/src/main.ts"
    :default-expanded-paths="['/src']"
    builtin-markdown-preview
    style="height: 600px"
    @save="({ path, content }) => console.log(path, content)"
  />
</template>
```

The CSS import is required. Alternatively, register the default plugin with `app.use(EditorPlugin, { locale: 'en-US' })`, importing `EditorPlugin` from the package. The default registered component name is `VueMonacoEditor`; `componentName` can override it.

## Workers

The default setup loads workers from jsDelivr. For production or restricted networks, provide bundled workers or URLs to hosted worker bundles:

JavaScript, TypeScript, JSON, Markdown, Python, CSS and HTML are included as the default language set. Other languages are loaded when a matching file is opened.

```ts
import EditorPlugin from '@emtt/vue-monaco-ide'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'

app.use(EditorPlugin, {
  workers: {
    getWorker(label) {
      if (label === 'typescript' || label === 'javascript') return new TsWorker()
      if (label === 'json') return new JsonWorker()
      return new EditorWorker()
    },
    pyrightWorkerUrl: '/workers/pyright/worker.js',
  },
})
```

This example assumes an existing Vue `app` and Vite's `?worker` support. Copy `monaco-pyright-lsp/dist/worker.js` to the indicated public location. Python workers are initialized when Python files are present. Python analysis requires additional loading time. Full browser Python/TS navigation and CDN connectivity still require manual acceptance testing.

`configureWorkers(options)` is also exported. Options include `workerUrls` for editor/typescript/json/css/html/yaml, `pyrightWorkerUrl`, `getWorker`, and `yamlSchemas`. Worker URLs must point to runnable bundles; copying a raw ESM entry alone may leave relative dependencies unresolved.

## YAML service

```ts
import { configureWorkers } from '@emtt/vue-monaco-ide'

configureWorkers({
  yamlSchemas: [{
    uri: 'https://example.com/config.schema.json',
    fileMatch: ['*.yaml'],
    schema: { type: 'object', properties: { name: { type: 'string' } } },
  }],
})
```

YAML validation, completion and hover are registered by the main entry and `monaco-yaml` is installed with the package. The service is loaded only when a YAML file is opened. Schema fetching is disabled: supply schema contents inline. `workerUrls.yaml: false` disables the worker; syntax highlighting remains available.

## Component API

| Prop | Default | Purpose |
| --- | --- | --- |
| `files: FileInput[]` | `[]` | Flat file list, updated by the host when replacing files |
| `defaultExpandedPaths: string[]` | `[]` | Initial expanded folders; also accepts asynchronous values |
| `defaultOpenPath: string \| null` | `null` | Initial active file; also accepts asynchronous values |
| `theme: string` | `'vs'` | Monaco theme, including `web-code-editor-light` and `web-code-editor-dark` |
| `loading: boolean` | `false` | Force loading overlay |
| `saveTime: string \| null` | `null` | Initial saved time display |
| `publishText: string` | localized Publish | Workbench action label |
| `serverHooks: WebCodeEditorServerHooks` | unset | Approve file operations before local mutation |
| `mediaPreview: boolean` | `true` | Preview image/PDF URLs |
| `builtinMarkdownPreview: boolean` | `false` | Enable built-in Markdown rendering |

```ts
interface FileInput {
  path: string
  name: string
  content?: string
  language?: string
  isDirectory?: boolean
  fileKind?: 'text' | 'image' | 'pdf' | 'binary'
  remoteUrl?: string
  savedContent?: string
}
```

`language` is inferred from the filename when omitted. `savedContent ?? content` defines the saved baseline for dirty tracking. Explicit file kind takes precedence over extension and content detection. Images/PDFs require `remoteUrl` to preview; other binary entries display a download action.

| Event | Payload |
| --- | --- |
| `save` | `{ path, content, name }` |
| `save-all` | Array of changed files, each `{ path, content, name }` |
| `change` | `{ path, content, name, isDirty }` |
| `open-file`, `close-file` | File path |
| `publish`, `refresh` | None |
| `ready` | `{ elapsedMs?: number }` |
| `worker-error` | `{ type: 'python' \| 'typescript', error }` |
| `operation-error` | `{ operation, path?, targetPath?, message?, code?, cause? }` | A server hook rejected or failed; local state is unchanged |
| `download` | `{ path, name, remoteUrl? }` |

The `preview` slot receives `{ file, content }` for Markdown. It takes precedence over the built-in renderer:

```vue
<VueMonacoEditor :files="files">
  <template #preview="{ content }">
    <YourMarkdownPreview :content="content" />
  </template>
</VueMonacoEditor>
```

The component ref exposes `save()`, `saveAll()`, `openFile(path)`, `closeFile(path)`, `getActiveFile()`, `getFiles()`, `setFileContent(path, content)` and `markFileSaved(path, content)`. Save requests emit `save`/`save-all` and leave dirty state unchanged; after persistence succeeds, call `markFileSaved` (or compatible `setFileContent`) to confirm it. Ctrl/Cmd+S and the manual Save button request the active file; Ctrl/Cmd+Shift+S requests all dirty files.

## Server integration

`serverHooks` supports asynchronous `createFile({ parentPath, name })`, `createDirectory({ parentPath, name })`, `rename({ path, newName, isDirectory })`, `remove({ path, isDirectory })` and `move({ sourcePath, targetFolderPath, isDirectory })`. Return `true` to apply the local operation, or `false`/throw to reject it. The host owns error reporting. Duplicate matching operations are ignored while a hook is pending.

Without hooks, operations are local. Avoid replacing the entire `files` prop while a hook is pending. Directory nesting is limited to 10 path segments. Folder downloads are not implemented. Persist save/download events in your own backend integration.

## Localization and appearance

Simplified Chinese is the default. Use plugin option `locale`, or switch dynamically:

```ts
import { setLocale, setMessages } from '@emtt/vue-monaco-ide'
setLocale('en-US') // aliases: en, zh
setMessages({ publish: 'Deploy' })
setMessages({}) // clear overrides
```

Locale and overrides are shared by instances using the same package module. CSS variables include `--vme-primary`, `--vme-accent`, `--vme-border`, `--vme-success`, and `--vme-warning`. Use `setFeedbackProvider({ toast, confirm })` to integrate host notifications; `confirm` returns `Promise<boolean>`.

## Utilities and limitations

The root export contains the editor, configuration helpers and public types. Import optional helpers from `@emtt/vue-monaco-ide/utils/file-kind`, `@emtt/vue-monaco-ide/utils/path`, `@emtt/vue-monaco-ide/utils/language`, or `@emtt/vue-monaco-ide/utils/markdown`.

The built-in Markdown preview supports headings, fenced code, lists, blockquotes, inline formatting and tables. It escapes HTML and restricts URL schemes. Raw HTML, indented code blocks, task lists, footnotes and math are not supported; use the preview slot for a different renderer. Large multi-file projects may consume substantial browser memory. Vite currently reports a large Monaco chunk and mixed static/dynamic language imports; this package does not guarantee that every unused language registration is removed. Each workbench has one editor area.

## Development and release

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm check
pnpm pack --pack-destination artifacts
```

CI checks, tests, builds and packs only. npm publication is a separate manual step using a verified tarball. See [release checklist](NEEDS_FROM_YOU.md), [contribution guide](CONTRIBUTING.md) and [changelog](CHANGELOG.md). Repository metadata must be confirmed before publication.

[MIT](LICENSE). Author: hao503106@163.com ([GitHub](https://github.com/emtiantian)).
