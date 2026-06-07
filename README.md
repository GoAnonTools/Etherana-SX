# Etherana SX

**Etherana SX** is a local-first workspace for search, knowledge, useful outputs, small apps, automations, and encrypted backups.

It is designed to stay simple: powerful enough to organize real work, but clear enough to use without feeling overloaded.

![Etherana SX Welcome](/Etherana_SX_Welcome.png)

## What Etherana SX does

Etherana SX helps you turn questions, research, notes, files, and repeated work into organized outputs.

You can search, discover articles, save useful results, organize projects into Spaces, run small tools, create your own Custom Apps, automate repeated tasks, and back up your workspace with an encrypted `.goanon` vault.

## Core principles

* **Local-first**: your workspace is designed for private local use.
* **Simple by default**: every section has a clear purpose.
* **Powerful without overload**: features are connected, but the interface stays understandable.
* **Reusable work**: save outputs, move them into Spaces, reuse apps, and automate repeated tasks.
* **Portable backup**: export and restore your workspace with encrypted `.goanon` vault files.

## Main features

### Search

Ask questions, research topics, and work with normal search results or the AI agent flow.

### Discover

Browse topic-based articles across categories like tech, finance, art, sports, and entertainment.

Discover includes safer thumbnail handling, relevance filtering, caching, stale fallback, and empty-result rescue fallback so topics do not return blank pages when sources are weak.

### Spaces

Spaces are project workspaces.

Use them to keep together:

* conversations
* files
* notes
* links
* outputs
* automations
* project instructions

### Apps

Apps are small reusable tools for common writing, thinking, and generation tasks.

Built-in Small Apps can generate outputs, preview them, edit before saving, copy, print, export to PDF, save to Outputs, or save to a Space.

### Custom Apps

Custom Apps let you build your own simple tools.

A Custom App can include:

* a title and description
* flexible text fields
* multiline inputs
* prompt templates
* variable helpers
* JSON import/export
* duplicate/edit/delete actions

Custom Apps appear in the Apps catalog and run through the same AppRunner flow as built-in apps.

### Automations

Automations are reusable AI tasks.

They support:

* Manual mode
* Auto-run mode
* Active/Paused status
* schedule type and time
* next-run calculation
* runner tick endpoint
* manual run endpoint
* run history
* output saving
* duplicate cleanup

### Outputs

Outputs are saved generated results.

You can:

* filter outputs
* open detail pages
* edit title and content
* copy formatted content
* download Markdown
* print or export to PDF
* move outputs into Spaces
* delete outputs

### Vault

Vault provides encrypted workspace backup.

It supports:

* encrypted `.goanon` export
* recovery phrase protection
* import and restore
* selected Space export
* local-first backup workflow

### Help

Etherana SX includes a local Help page at `/help`.

The Help page explains how the workspace is organized, what each section does, and how to start simply.

## Included by default

Etherana SX includes **Gemma 4 4B** as the default local model so the workspace can be tried without configuring an external provider first.

Optional providers can be added later if you want stronger models or different AI services.

## Languages and appearance

Etherana SX includes an English/French interface foundation.

Current translated areas include:

* Sidebar
* Settings / Preferences
* Search
* Discover
* Library
* Spaces
* Apps
* Custom Apps builder
* Automations
* Outputs
* Vault
* Help

The interface also supports the main dark theme and the warmer Amber theme.

## Installation

### Requirements

* Node.js 18+
* npm
* SQLite
* Docker optional, but recommended for the local search backend

### Install dependencies

```bash
npm install
```

### Run the full local development stack

```bash
npm run dev
```

This starts the local development environment using the project scripts.

Open:

```txt
http://localhost:3000
```

### Stop local Docker services

```bash
npm run dev:down
```

### Run only the Next.js web app

```bash
npm run dev:web
```

Use this when you do not need the Docker-powered local services.

## Build

Run the production build:

```bash
npm run build
```

Run TypeScript checks:

```bash
npx tsc --noEmit --pretty false
```

## Useful scripts

```bash
npm run dev
npm run dev:web
npm run dev:down
npm run build
npm run start
npm run format:write
```

## Local-first security note

Etherana SX is designed for local personal use.

Do not expose the app directly to the public internet unless you add proper authentication, network protection, and deployment hardening.

Some features may call configured AI providers or local services depending on your setup.

## Project status

Current checkpoint:

```txt
V1 polished stable
```

Current V1 state:

* Search works
* Discover is stable
* Spaces are stable
* Apps and Custom Apps V1 are complete
* Automations V1 is complete
* Outputs are centralized and editable
* Vault `.goanon` backup is working
* Help onboarding is available
* English/French UI foundation is in place
* Empty states have been checked
* TypeScript and production build pass

## Roadmap

The next phase should stay focused on polish, not overload.

Possible V1.1 directions:

* better first-run onboarding card
* more empty-state polish after real usage
* Discover French sources after proper SearXNG testing
* more automation templates
* Custom Apps sharing polish
* per-Space AI memory and rules improvements
* better knowledge and file handling

## License

© 2026 GoAnon | GoAnon.pro

Licensed under the Apache License, Version 2.0. See the `LICENSE` file for details.

---

Direct your curiosity. Build your future.
