# Social Post Preview: design

Date: 2026-10-21
Status: ready for approval
Prototype: Cursor canvas `social-post-preview-prototype.canvas.tsx` (throwaway; reference for layout and behavior, not code to port)

## Why

Lisa's team approves social posts before they go out. Today they review loose files and copy. This tool lets Lisa assemble a post once, see how it will look on Instagram and on X, and send the team a single link that shows exactly that. Nobody posts to a social network from this tool; the link is for approval and feedback, and feedback happens wherever the team already talks (Slack, text).

Success: Lisa can go from "I have photos, clips, and copy" to "here's the link" in a couple of minutes, and the team sees something close enough to the real post that crop, caption cut-off, and slide order surprises are caught before publishing.

## Goals

- Build a post from media plus per-platform text, and preview it as an Instagram feed post and as an X post.
- Create a named share link that opens a view-only page with just the mockups.
- Keep every share link in a Share history list where Lisa can copy, edit, view, or delete it.
- Reuse photos from the image uploader and clips from the video clipper, and allow new uploads.
- Block sharing when the post breaks a platform rule, with a message that says exactly what to fix.

## Non-goals

- Publishing or scheduling to any platform.
- Comments, approvals, or any feedback UI on the share page.
- Other platforms (LinkedIn, TikTok, Threads, ...). The design should make adding one later straightforward, but none are built.
- Instagram Reels full-screen view, Stories, or profile grid previews.
- Logins or per-user access control (see Constraints).
- Version history of a post. Editing replaces what the link shows.

## Anti-goals

- A share page that leaks Lisa's internal link names, the editor, or other posts.
- A preview that looks "close" but crops differently from the real platform in the common cases (single photo, carousel, single Reel). If the preview lies about crops, the tool fails even if it works.
- Hard-coding DealBook (handles, avatar) into tool code. Tool code stays workspace-agnostic (AGENTS.md).

## Users and flow

1. Lisa opens `/social-post-preview`.
2. **Editor tab** (left column top to bottom, preview column on the right):
   1. **Platforms:** Instagram and X toggles, both on by default for every new post. Turning one off hides its whole input group, its preview, and its checks.
   2. **Media:** the selected items, then a right-aligned line with the inferred type and count, then two buttons: **Upload media** and **Choose from uploads**.
   3. **Instagram group** (only when Instagram is on): Caption, then Crop, or Cover frame for a single video.
   4. **X group** (only when X is on): Post text, then Crop (only for a single photo).
   5. Fix-before-sharing warning (if any), then **Create share link** / **Save changes to link**.
   6. Preview column: Instagram mockup, then X mockup, each only for platforms that are on.
3. **Create share link** asks for a name (required, private to Lisa), saves the post, and shows the URL with **Copy link** and **See what the team sees**.
4. **Share history tab:** every link, newest first, with thumbnail, name, platforms, post type, last updated, and actions: Copy link, Edit, Team view, Delete (two-click confirm).
5. **Edit** loads the post into the editor with a banner ("Editing *name*. Saving updates the same link.") and a **Start a new post** action. **Save changes to link** updates what the same URL shows.
6. **Share page** `/preview/<id>`: view-only, phone-first, just the platform mockups plus a small "Preview for review · view only · updated <time>" line. A deleted or unknown id shows "This preview is no longer available."

## Post model

### Media and inferred type

Lisa never picks a post type. It is inferred from the selected media:

| Selection | Instagram type |
|-----------|----------------|
| 1 photo | Single image |
| 1 video | Single video (Reel) |
| 2+ items, any mix | Carousel |

- Carousel order is set by drag and drop, with up/down buttons as a keyboard and fallback path. Order is shared by both platforms.
- Removing items back down to one switches the type back automatically.
- **Upload media** accepts photos and videos and uploads them to the public Blob store (see Storage). New uploads are added to the post and appear in Choose from uploads afterwards.
- **Choose from uploads** opens a picker with two tabs: **Images** (public store `images/`, from the image uploader) and **Clips** (public store `clips/`, from the video clipper and from this tool's video uploads). Each row shows thumbnail, name or label, Blob path, shape, and duration for clips. Click toggles membership in the post.

### Per-platform fields

- **Instagram:** caption (one caption for the whole post; Instagram has no per-slide captions), crop for photos and carousels (Square 1:1, Portrait 4:5, Landscape 1.91:1; default 4:5), cover frame for a single video.
- **X:** post text (separate from the Instagram caption), with a **Copy Instagram caption** shortcut shown when Instagram is on and the texts differ. Crop for a single photo only: Original, Wide 16:9, Square 1:1 (default Original). With 2 to 4 items, X uses its own grid crop, and X videos can't be cropped, so the control is hidden.

### Stored post (shape, not exact code)

```ts
type SocialPost = {
  id: string;              // unguessable, URL-safe
  name: string;            // private to Lisa; never sent to the share page
  profileId: string;       // e.g. "dealbook"; resolves handles and avatar
  platforms: ("instagram" | "x")[];
  media: {
    pathname: string;      // images/<id>/<file> or clips/<uuid>/<file>
    url: string;           // public Blob URL
    kind: "image" | "video";
    width: number;         // measured in the browser when added
    height: number;
    durationSeconds?: number;
  }[];                     // ordered
  instagram: { caption: string; crop: "1:1" | "4:5" | "1.91:1"; coverSeconds?: number };
  x: { text: string; crop: "original" | "wide" | "square" };
  createdAt: string;       // ISO
  updatedAt: string;       // ISO
};
```

- Type is derived from `media`, not stored.
- Inputs for a platform that is off are kept, so toggling a platform back on restores them.
- **Missing fields get defaults when a post loads** (empty text, default crops, both platforms on). The prototype crashed on exactly this when a field was added, and real saved posts will outlive schema changes.
- If a referenced media blob was deleted later (for example in the image uploader), the editor and share page show a "media no longer available" placeholder in its slot rather than failing.

## Previews

Both mockups are drawn by the app with real media, not screenshots, and labeled so nobody mistakes them for live posts.

**Account (both platforms):** comes from a per-workspace profile, not tool code. For DealBook: Instagram `nytdealbook`, X name `DealBook` and handle `@dealbook`, and the NYT "T" logo as the avatar. The header shows the handle followed by a muted "(preview)".

**Instagram feed card:**
- Header: avatar and `nytdealbook (preview)`. No overflow menu.
- Media: cropped to the chosen ratio; in a carousel every slide, including videos, uses the same crop. Carousel has arrows, an `n/N` counter, and dots. Single video renders as a feed Reel at 9:16 starting at the cover frame. Wide or square videos are center-cropped to fill 9:16, like a full Reel, with no crop control; the preview should make that crop visible so the team can judge whether the subject survives it.
- Action row: like, comment, share, bookmark (non-functional icons).
- Caption: handle in bold, then text; hashtags and @mentions in link color; truncated after 2 lines or 125 characters with a tappable "... more".

**X card:**
- Avatar, `DealBook (preview) @dealbook · now`.
- Text with hashtags and @mentions in link color. Characters past 280 are highlighted, as in X's composer.
- Media: 1 item at its own shape (clamped between 4:5 and 16:9) or the chosen X crop for a single photo; 2, 3, and 4 items use X's split layouts. Items past 4 are not shown, with a note.
- Action row: reply, repost, like, views, share (non-functional icons).

The canvas prototype is the visual reference. Exact proportions should be checked against real posts during the build.

## Checks (block sharing)

One problem: the problem is the callout title and the fix is the body. Several: "N things to fix before sharing" with one line each. Only checks for platforms that are on apply.

| Check | Applies when | Message (title / fix) |
|-------|--------------|-----------------------|
| No platform | both off | Needs a platform / Turn on Instagram, X, or both under Platforms. |
| No media | Instagram on | Needs media / Instagram posts need a photo or video... |
| Empty caption | Instagram on | Needs an Instagram caption / Write it in the Instagram section. |
| Empty X text | X on | Needs X post text / Write it in the X section, or copy the Instagram caption... |
| X text > 280 | X on | Too long for X / N characters, M over X's 280 limit... |
| > 4 media | X on | Too much media for X / ... Remove M, or turn off X. |
| Any video > 2:20 | X on | Video is too long for X / "<name>" runs m:ss; X allows 2:20... |
| Single video > 3:00 | Instagram on | Video is too long for a Reel / ... trim it in the video clipper. |
| > 20 items | Instagram on | Too many slides / ... Remove M. |
| Caption > 2,200 | Instagram on | Caption is too long / N characters, M over... |
| > 30 hashtags | Instagram on | Too many hashtags / N hashtags; Instagram allows 30... |

Visible counters: right-aligned under each text box ("n / 2200" for Instagram, "n / 280" for X). No hashtag counter is shown; the hashtag check still runs.

Limits are X's non-Premium limits and Instagram's current documented limits. Keep them in one constants module so they can be changed in one place.

## Storage

Everything lives in the **public** `media-utils-clips-public` Blob store, so the share page can show media without signing URLs. Per AGENTS.md, every public-store call passes `publicBlobToken()` explicitly, and `handleUpload` (not `handleUploadPresigned`) is used for public client uploads.

- **Posts:** `previews/<id>/`, one folder per post, matching the one-folder-per-asset layout. Each save writes a new `post-<timestamp>.json` and deletes older ones in the folder; readers list the folder and take the newest. This avoids serving a stale CDN copy after an edit, which overwriting a single public file would risk.
- **Delete:** removes the `previews/<id>/` folder. It never deletes media, since the image uploader and clipper still use it.
- **Photo uploads:** the same path, types, and 50 MB limit as the image uploader (`images/<id>/<file>`), reusing `lib/images.ts`.
- **Video uploads:** public `clips/<uuid>/<file>.mp4`, so they appear under Clips and match the existing `isClipPathname` check unchanged. MP4 only. Size cap: 1 GB (builder may adjust; the public store is not meant for raw multi-GB sources, which belong in the clipper's private store).
- **Formats every browser can show:** previews, measurement, and the share page all rely on the browser, and teammates may open links in Chrome or on Android. v1 accepts only JPG, PNG, WebP, and GIF photos and MP4 videos. HEIC photos already in `images/` (the image uploader accepts them) appear in Choose from uploads as disabled rows marked "HEIC can't be previewed in every browser. Upload a JPG instead." MOV uploads are rejected with "Export as MP4, or run it through the video clipper." No server-side conversion in v1.
- **Listing clips:** there is no clip listing today. Add one alongside `listPublicImages()` that also reads existing label sidecars, so picker rows can show labels.
- **Media metadata** (width, height, duration) is measured in the browser when media is added and stored on the post, so the share page and checks don't have to probe files.

## Constraints

- Next.js 16 with breaking changes: read `node_modules/next/dist/docs/` before writing routes or pages (AGENTS.md).
- Register the tool in `lib/tools.ts` with slug `social-post-preview`, title "Social Post Preview", page `app/social-post-preview/page.tsx`, components in `components/social-post-preview/`.
- Share page route: `app/preview/[id]/page.tsx`, rendered on the server. It must not include the post name or any editor code in what it sends to the browser.
- Share links use the production custom domain: `https://media-utils.com/preview/<id>`. Vercel SSO protection on this project is "all except custom domains", so that domain is reachable without a Vercel login, but `*.vercel.app` URLs are not. Build share URLs from the custom domain, not from the request host, so a link copied while working on a preview deployment still opens for the team.
- The app has no login of its own. Like the existing tools, the editor and history on `media-utils.com` are reachable by anyone who knows the URL. That is acceptable for now; adding auth is out of scope, but nothing here should make it harder later.
- Share page: `noindex`, and unguessable ids (at least 12 random URL-safe characters).
- **Account profiles:** workspace data (account names, handles, avatar) lives in a committed module under `workspaces/dealbook/` (for example `workspaces/dealbook/social-profile.ts` with the avatar image beside it; `workspaces/dealbook/media/` is gitignored, so not there). Tool code reads profiles through a small lookup in `lib/` and never imports DealBook directly. v1 has one profile, `dealbook`, used as the default with no picker or env var. Each saved post stores `profileId`, so existing links keep their account when more workspaces are added; posts without it load as `dealbook`.
- Tests: Vitest for `lib/**` and route handlers with `@vercel/blob` mocked, matching existing patterns. At minimum: type inference, every check in the table, load-time defaults, newest-version selection, delete leaves media untouched, HEIC/MOV rejection, profile fallback.
- `pnpm check` passes. pnpm only.

## Decided in conversation

- Instagram first, then X added. Both previews by default, each can be turned off, and turning X off removes all X controls.
- Post type inferred from media. No type picker.
- Carousel can mix photos and videos, up to 20, ordered by drag and drop.
- Single video means an Instagram Reel shown in the feed. Cover frame picker for single videos only. Wide and square single videos are center-cropped to fill 9:16.
- Crop: Instagram has 1:1, 4:5, 1.91:1. X has its own separate crop (Original, Wide, Square) for single photos.
- X gets its own post text, separate from the Instagram caption.
- Share links are view-only, named (name private), and updating a post updates the same link.
- Share history tab to find, copy, edit, view, and delete links.
- Media: upload, or choose from existing Blob uploads (images and clips).
- Account shown: Instagram `nytdealbook`, X `DealBook` / `@dealbook`, NYT "T" avatar, with "(preview)" after the handle.
- Layout: Platforms, Media, Instagram group, X group. Counts right-aligned under inputs. No hashtag counter, no helper text under crop or caption.

## My calls (check these)

- Instagram caption and X text are required when their platform is on. Instagram allows no caption, but a review link without one is likely a mistake.
- Video uploads go to `clips/` in the public store, MP4 only. The 1 GB cap is a guess.
- Only formats every browser can show (no HEIC, no MOV) and no server-side conversion in v1.
- One built-in `dealbook` profile with no picker; each post remembers its profile.
- One JSON file per save, newest wins, so edits show up right away despite CDN caching.
- The 125-character / 2-line Instagram truncation and X's grid proportions are approximations, to be checked against real posts.
- Share URLs always use `media-utils.com`.

## Left to the builder

- Component structure, styling within the existing shadcn/Tailwind setup, and the drag-and-drop implementation.
- How the editor tab and history tab are routed (tabs on one page vs subroutes).
- Exact upload progress UI, empty states, and error copy for network failures.
- How the cover frame is captured and shown (for example a media-fragment start time or a generated poster).

## Follow-ups (not in v1)

- Feedback on the share page (approve / request changes / comments).
- More platforms.
- Per-slide alt text and people tags.
- Auth for the editor.
