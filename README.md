# PDF TOC Tools

A browser-based PDF toolkit for managing bookmarks (table of contents), reordering pages, editing metadata, splitting by chapter, and merging multiple PDFs — all without uploading files to a server.

## Features

### Page Management
- **Thumbnail grid** — Browse all pages as visual thumbnails
- **Drag & drop reordering** — Rearrange pages by dragging within the grid
- **Multi-select** — Click, Shift+click for ranges, or drag a marquee rectangle to select multiple pages
- **Outline-based filtering** — Click any bookmark in the sidebar to show only the pages in that section

### Bookmark / TOC Editor
- View and edit the PDF's bookmark tree as JSON
- **Export** outlines as JSON, CSV, or Markdown
- **Import** outlines from JSON or CSV
- Apply the edited outline back into the PDF

### Bulk Split
- Split a PDF into separate files by chapter, driven by its bookmark hierarchy
- Choose the outline depth level to split at

### Metadata Editor
- Read and edit standard PDF metadata fields: title, author, subject, keywords, creator, producer, creation date, and modification date

### Multi-file Support
- Open multiple PDFs simultaneously in the sidebar
- Drag & drop to reorder files in the sidebar
- **Merge & download** — combine all loaded files (with their page orders) into a single PDF in one click

### Download Options
- Download the active file with the current page order applied
- Download only the selected pages as a new PDF
- Merge all loaded files and download as a combined PDF

## Tech Stack

| Layer | Library |
|---|---|
| UI Framework | React 19 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS v4 + shadcn/ui |
| PDF Rendering | pdfjs-dist |
| PDF Manipulation | pdf-lib |
| Drag & Drop | dnd-kit |
| Testing | Vitest + Testing Library |

## Getting Started

### Prerequisites

- Node.js 18+
- [pnpm](https://pnpm.io/) (recommended)

### Install & Run

```bash
# Install dependencies
pnpm install

# Start the development server
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

```bash
pnpm build
```

The production build is output to the `dist/` directory.

### Preview Production Build

```bash
pnpm preview
```

## Testing

```bash
# Run tests once
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

## Privacy

All PDF processing happens entirely in the browser. No files are ever uploaded to a remote server.
