# Data Room MVP

Full-stack virtual data room MVP for secure due-diligence document sharing.

## Stack

- Frontend: React, TypeScript, Vite, Tailwind, shadcn-style Button primitive
- Backend: NestJS, PostgreSQL, Prisma
- Auth: email/password with JWT
- Storage: local blob-style filesystem storage under `backend/uploads`

For production, the `FilesService` storage boundary can be swapped for S3, Supabase Storage, or Vercel Blob without changing the data model.

## Features

- Email/password authentication
- Owner-scoped data rooms
- Member roles: `OWNER`, `EDITOR`, `VIEWER`
- Nested folders with breadcrumbs
- Folder create, rename, delete with subtree impact warning
- Multi-file upload with drag-and-drop and per-file progress
- PDF and image validation
- File preview, download, rename, move, delete
- Name conflict resolution inside folders
- Public read-only share links for data rooms, folders, and files
- Permissioned read-only shares for specific users
- Share revoke flow
- Light/dark theme

## Setup

### Backend

```bash
cd backend
npm install
cp .env.example .env # or create .env manually
npx prisma generate
npx prisma db push
npm run start:dev
```

Required backend env:

```bash
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
JWT_SECRET="replace-me"
PORT=3000
FRONTEND_URL="http://localhost:5173"
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Optional frontend env:

```bash
VITE_API_URL="http://127.0.0.1:3000"
```

## ERD

```mermaid
erDiagram
  User ||--o{ DataRoom : owns
  User ||--o{ DataRoomMember : has
  User ||--o{ File : uploads
  User ||--o{ Share : creates
  User ||--o{ Share : receives
  DataRoom ||--o{ DataRoomMember : grants
  DataRoom ||--o{ Folder : contains
  DataRoom ||--o{ Share : exposes
  Folder ||--o{ Folder : nests
  Folder ||--o{ File : contains

  User {
    string id PK
    string email
    string password
    string name
  }

  DataRoom {
    string id PK
    string name
    string description
    string ownerId FK
  }

  DataRoomMember {
    string id PK
    string dataRoomId FK
    string userId FK
    Role role
  }

  Folder {
    string id PK
    string name
    string dataRoomId FK
    string parentId FK
  }

  File {
    string id PK
    string name
    string originalName
    string mimeType
    int size
    int version
    string storageKey
    string folderId FK
    string uploadedById FK
  }

  Share {
    string id PK
    string dataRoomId FK
    ShareTargetType targetType
    string targetId
    ShareMode mode
    string token
    string createdById FK
    string recipientUserId FK
    datetime revokedAt
  }
```

## Design Decisions

- Data room membership is the main authorization boundary. Owners manage members and shares; editors manage content; viewers read only.
- Folders use an adjacency-list model with `parentId`, which is simple for MVP CRUD and can be optimized later with materialized paths or closure tables.
- Shares are polymorphic by `targetType + targetId`, allowing a single sharing flow for data rooms, folders, and files.
- File display names are unique per folder. Conflicts are resolved by appending ` (2)`, ` (3)`, etc. The original upload name remains stored for auditability.
- Upload storage is isolated behind service methods and records a `storageKey`, which keeps the database portable across storage providers.

## How It Scales

### Folder total size and item count

For the MVP, folder subtree counts are computed by collecting descendant folder IDs and aggregating matching files. At larger scale this should move to one of:

- cached counters on `Folder` updated transactionally on file/folder writes;
- materialized path or closure table for efficient subtree queries;
- background recalculation jobs for repair and analytics.

### One data room with 100,000 files

The current tree endpoint is convenient for small rooms. At 100,000 files it should become paginated and lazy:

- load folders and files separately;
- paginate files by `folderId, createdAt, id`;
- add cursor pagination for folder/file listings;
- keep indexes on `Folder(dataRoomId, parentId)`, `File(folderId, name)`, `File(uploadedById)`, and `Share(targetType, targetId)`;
- avoid returning the whole tree on every folder click.

### Extending sharing to viewer/editor roles

The current `Share` model can be extended with a `role` column using the existing `Role` enum or a dedicated `ShareRole` enum. Because shares already reference `targetType`, `targetId`, and optionally `recipientUserId`, per-user viewer/editor permissions can be added without remodeling the core `DataRoomMember`, `Folder`, or `File` tables.

## AI Usage

AI assistance was used to speed up implementation, UX iteration, test planning, and documentation drafting. The final architecture, validation passes, and local testing were reviewed and adjusted in the project codebase.

## Deployment

Required deliverables are public frontend and backend URLs. Recommended:

- Frontend: Vercel
- Backend: Render, Fly.io, Railway, or another Node host
- Database: Supabase Postgres
- File storage: Supabase Storage or S3-compatible storage

Before deployment, replace local filesystem storage with hosted blob storage and set production CORS through `FRONTEND_URL`.
