# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static course site ("رحلة Clean Architecture في Flutter") built with Next.js (App Router, `output: "export"`) + `next-mdx-remote`. All lesson content is MDX under `content/`; interactive parts are React components. The UI and content are written in Egyptian colloquial Arabic, RTL (`<html lang="ar" dir="rtl">`), mixing in English technical terms — match that voice when writing content. The README (in Arabic) is the authoring guide and is kept up to date; read it before adding content.

## Commands

```bash
npm run dev        # runs `index` first, then next dev on :3000
npm run build      # runs `index` first, then static export to out/
npm run preview    # serve out/
npm run typecheck  # tsc --noEmit — the only automated check; there are no tests or linter
npm run index      # regenerate public/search-index.json + public/cards.json and validate ids
npm run new -- lesson <unit-slug> <lesson-slug> "العنوان"   # scaffold from content/_templates
npm run new -- unit <slug> "العنوان"
```

Node 20+. On Windows the project path must be ASCII with no spaces.

## Architecture

**Content model (filesystem = structure).** `src/lib/course.ts` reads `content/units/<NN-unit>/`: `_unit.mdx` holds unit metadata/intro, every other `.mdx` is a lesson. The `NN-` prefix sets order and is stripped from slugs/URLs (`/course/<unit>/<lesson>/`). `99-practice.mdx` (frontmatter `type: "practice"`) is always the last lesson of a unit. Lessons with `draft: true` appear only when `NODE_ENV === "development"`. `src/lib/pages.ts` reads the standalone `content/review/*.mdx` and `content/resources/*.mdx` — each file becomes a tab on `/review/` or `/resources/`, ordered by frontmatter `order`.

**Rendering.** Pages are server components that call `renderMdx()` (`src/components/render.tsx`), which compiles MDX with the component map from `src/components/mdx.tsx`. Any new MDX component must be added to `mdxComponents` there. JS expressions are disabled in MDX: all props are strings (`n="1"`), and literal `{`/`}` in prose must be escaped. `Diagram` reads `content/diagrams/<name>.svg` at build time and inlines it so the SVG can use the site's CSS variables (light/dark); arrow markers come from `MarkerDefs` in the root layout. Labs are client components registered by name in `src/components/labs/index.tsx` and used as `<Lab name="..." />`.

**Metadata is extracted by regex, not by MDX parsing.** Both `course.ts` and `scripts/build-index.mjs` scan raw MDX text for `<Task id="...">`, `<Question id="...">`, `<LogBox id="...">`, `<ReviewQuestion>`, `<Level n=".." title="..">`, and `## / ###` headings. Keep these tags in that exact attribute form (`id` first, double quotes) or they silently drop out of progress tracking, flashcards, and search. `<Question id><Ask>..</Ask><Answer>..</Answer></Question>` must stay adjacent for card extraction. The glossary tab's markdown table rows are also turned into flashcards.

**Build-time index.** `scripts/build-index.mjs` (runs before every dev/build) writes `public/search-index.json` and `public/cards.json` (both gitignored, fetched client-side by `Search.tsx` and `Flashcards.tsx`) and **fails the build on duplicate Task/Question/LogBox ids**. Note it skips draft lessons regardless of environment, while `course.ts` shows them in dev.

**Client state is localStorage only.** There is no backend. `src/lib/storage.ts` provides `useStored` / `useStoredEntry` — a `useSyncExternalStore` store over localStorage that syncs all components on the same key (and across tabs). Keys live in `src/lib/keys.ts`; the theme is applied before paint by `themeScript` inlined in `<head>`. Server pages pass a body-less `Manifest` (`getManifest()`) to client components (sidebar, home progress, "my answers") so they can compute progress.

**Progress keys are permanent.** Task/Question/LogBox ids, lesson ids (`<unit>/<lesson>` derived from folder/file names minus the number prefix), and the `KEYS` values are what users' saved progress is keyed on. Renaming any of them resets that progress for existing users — renumbering files is safe, renaming slugs is not.

## Deployment

Static output in `out/` (`trailingSlash: true`, each page is `<dir>/index.html`). If served from a sub-path, add `basePath` in `next.config.ts` **and** update the hardcoded `fetch("/...json")` paths in `Search.tsx` and `Flashcards.tsx`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
