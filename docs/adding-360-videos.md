# Adding a 360° Video to the Site

End-to-end workflow for taking an equirectangular (2:1) MP4, encoding it into
multi-resolution HLS, uploading it to Cloudflare R2, and publishing its page at
`ryanhuang.xyz/videos/<id>`.

## How the whole system fits together

```
source MP4 ──▶ encode-hls.sh ──▶ 2k/4k/6k(/8k) HLS renditions + master.m3u8
                                        │
                    upload-r2.sh ◀──────┘  (uploads each rendition as it
                        │                   finishes, then deletes it locally)
                        ▼
              R2 bucket "360-vids", public via
              https://pub-059f755fb61d49c49b6393e18992dd9e.r2.dev
                        │
                        ▼
        git push ──▶ site rebuild ──▶ /videos/<id> page + social thumbnail
```

### The frontend side

The Next.js site (`personal-site/`) is a **static export** (`output: "export"`
in production builds). Everything video-related is generated at build time
from R2:

| File | Role |
|------|------|
| `lib/video-library.ts` | Fetches `videos/catalog.json` and each video's `metadata.json` from R2 (60s revalidate) |
| `app/videos/page.tsx` | Gallery — one full-bleed row per catalog entry |
| `app/videos/[id]/page.tsx` | Video page — `generateStaticParams` creates one route per catalog entry |
| `app/videos/[id]/opengraph-image.tsx` | Renders the 1200×630 social thumbnail (poster + title overlay) at build time |
| `app/videos/[id]/twitter-image.tsx` | Re-exports the OG image for Twitter/X cards |
| `components/360-video-player.tsx` | Three.js sphere + hls.js playback, quality menu, mobile pinch/drag |
| `public/_headers` | Forces `Content-Type: image/png` on the generated social images (Cloudflare) |

Because pages are generated at build time, **every new video requires a
rebuild + redeploy** after its files land on R2. No code changes are needed —
the catalog drives everything.

### The player's expectations

`components/360-video-player.tsx` assumes:

- HLS with fMP4 segments (`init.mp4` + `segment_*.m4s` per rendition)
- A master playlist listing renditions lowest→highest so hls.js can adapt
- `metadata.json` `renditions[].height` values that match the actual encoded
  heights — the quality menu maps menu entries to hls.js levels by height
- CORS on the bucket allowing `GET`/`HEAD` from any origin (configured once in
  the Cloudflare dashboard; already done for `360-vids`)
- On mobile (`max-width: 48rem`) auto-quality is capped at ≤1920px height to
  save bandwidth; manual selection can still go higher

## Prerequisites

- `ffmpeg` / `ffprobe` (Homebrew build with libx264), `aws` CLI, `jq`
- R2 credentials in `/Users/ryanhuang/Documents/GitHub/personal-site/.env`:

```bash
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...        # object read/write only; cannot change bucket config
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=360-vids
R2_REGION=auto
```

- Disk space: with upload-then-delete cleanup, peak local usage is roughly
  **half the source file size**. Check with `df -h ~/Desktop`. Without 8K it's
  far less (the 8K rendition alone is ~half the total output).

## Step 1 — Inspect the source

```bash
ffprobe -v error \
  -show_entries format=duration,size:stream=codec_name,width,height,r_frame_rate \
  -of json "/path/to/source.mp4"
```

Check three things:

1. **Aspect ratio is 2:1** (e.g. 7680×3840). Anything else won't map onto the
   sphere correctly.
2. **Duration in seconds** — copy it into `metadata.json` (`durationSeconds`).
   The player shows this before playback starts.
3. **Frame rate** — the master playlist template hardcodes `FRAME-RATE=29.970`;
   update those lines if the source is 24/25/60 fps (it's informational for
   players, not used for decoding).

## Step 2 — Set up the working directory

Pick an ID (kebab-case — it becomes the URL slug) and a title:

```bash
VIDEO_ID="my-new-video"            # → ryanhuang.xyz/videos/my-new-video
WORKDIR="$HOME/Desktop/${VIDEO_ID//-/_}_hls"
mkdir -p "$WORKDIR"
```

Create the two scripts below in `$WORKDIR` (or copy them from a previous
video's folder, e.g. `~/Desktop/ruyuan_reservoir_with_grandma_hls/`, and edit
the variables at the top).

### `encode-hls.sh` — full template

```bash
#!/usr/bin/env bash

set -euo pipefail

INPUT="/path/to/source.mp4"                 # ← edit
OUTPUT="/Users/ryanhuang/Desktop/my_new_video_hls"   # ← edit
UPLOADED="$OUTPUT/.uploaded"

encode_rendition() {
  local name="$1"
  local width="$2"
  local height="$3"
  local crf="$4"
  local maxrate="$5"
  local bufsize="$6"
  local directory="$OUTPUT/$name"

  if [[ -f "$UPLOADED/$name" ]]; then
    printf '%s is already uploaded; skipping.\n' "$name"
    return
  fi

  if [[ -f "$directory/.complete" ]]; then
    printf '%s is already complete; skipping.\n' "$name"
    return
  fi

  mkdir -p "$directory"
  rm -f "$directory"/*.m4s "$directory"/init.mp4 "$directory"/index.m3u8
  printf 'Encoding %s (%sx%s)...\n' "$name" "$width" "$height"

  ffmpeg -y -loglevel warning -stats -stats_period 10 \
    -i "$INPUT" \
    -map 0:v:0 -map 0:a:0 \
    -vf "scale=${width}:${height}:flags=lanczos" \
    -c:v libx264 -preset slow -profile:v high -pix_fmt yuv420p \
    -crf "$crf" -maxrate "$maxrate" -bufsize "$bufsize" \
    -g 120 -keyint_min 120 -sc_threshold 0 \
    -force_key_frames "expr:gte(t,n_forced*4)" \
    -c:a aac -b:a 160k -ac 2 -ar 48000 \
    -hls_time 4 -hls_playlist_type vod \
    -hls_segment_type fmp4 -hls_flags independent_segments \
    -hls_fmp4_init_filename init.mp4 \
    -hls_segment_filename "$directory/segment_%04d.m4s" \
    "$directory/index.m3u8"

  touch "$directory/.complete"
}

encode_rendition "2k" 1920 960 19 8M 16M
encode_rendition "4k" 3840 1920 19 25M 50M
encode_rendition "6k" 5760 2880 19 50M 100M
# encode_rendition "8k" 7680 3840 19 90M 180M   # optional, see below

printf '%s\n' \
  '#EXTM3U' \
  '#EXT-X-VERSION:7' \
  '#EXT-X-INDEPENDENT-SEGMENTS' \
  '#EXT-X-STREAM-INF:BANDWIDTH=8160000,AVERAGE-BANDWIDTH=5000000,RESOLUTION=1920x960,FRAME-RATE=29.970' \
  '2k/index.m3u8' \
  '#EXT-X-STREAM-INF:BANDWIDTH=25160000,AVERAGE-BANDWIDTH=15000000,RESOLUTION=3840x1920,FRAME-RATE=29.970' \
  '4k/index.m3u8' \
  '#EXT-X-STREAM-INF:BANDWIDTH=50160000,AVERAGE-BANDWIDTH=35000000,RESOLUTION=5760x2880,FRAME-RATE=29.970' \
  '6k/index.m3u8' \
  > "$OUTPUT/master.m3u8"

printf 'Finished. Master playlist: %s/master.m3u8\n' "$OUTPUT"
```

Why these ffmpeg flags:

| Flag | Reason |
|------|--------|
| `-preset slow -crf 19` | Quality-first: better compression per bit than faster presets; CRF 19 is visually transparent for most content |
| `-maxrate/-bufsize` | Caps bitrate spikes so segments stream smoothly; bufsize = 2× maxrate |
| `-profile:v high -pix_fmt yuv420p` | Maximum decoder compatibility (mobile Safari included) |
| `-g 120 -keyint_min 120 -sc_threshold 0` | Fixed 4s GOP at 30fps; disables scene-cut keyframes so all renditions share keyframe positions |
| `-force_key_frames "expr:gte(t,n_forced*4)"` | Guarantees a keyframe exactly every 4s — required for clean 4s segments and instant quality switching |
| `-hls_time 4` | 4-second segments: good balance of startup latency vs request overhead |
| `-hls_segment_type fmp4` | fMP4 (CMAF) segments work with both hls.js (MSE) and native Safari HLS |
| `independent_segments` | Every segment starts with a keyframe; players can switch quality at any boundary |
| Software libx264 over VideoToolbox | Hardware encoding is far faster but visibly worse at the same bitrate; we chose quality |

The rendition ladder:

| Rendition | Resolution | CRF | maxrate | Encode speed (M-series) | When to include |
|-----------|------------|-----|---------|------------------------|-----------------|
| 2k | 1920×960 | 19 | 8M | ~1× realtime | always |
| 4k | 3840×1920 | 19 | 25M | ~0.4× | always |
| 6k | 5760×2880 | 19 | 50M | ~0.17× | always |
| 8k | 7680×3840 | 19 | 90M | ~0.03–0.04× | optional — roughly **triples** total encode time and doubles output size |

To include 8K: uncomment its `encode_rendition` line, add its
`#EXT-X-STREAM-INF` + `8k/index.m3u8` lines to the master playlist block, add
`{ "name": "8k", "width": 7680, "height": 3840 }` to both metadata files, and
add `8k` to the upload loop.

### `upload-r2.sh` — full template

```bash
#!/usr/bin/env bash

set -euo pipefail

source "/Users/ryanhuang/Documents/GitHub/personal-site/.env"

export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
export AWS_DEFAULT_REGION="${R2_REGION:-auto}"

LOCAL="/Users/ryanhuang/Desktop/my_new_video_hls"    # ← edit
ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
BUCKET="s3://${R2_BUCKET_NAME}"
BASE="$BUCKET/videos/my-new-video"                   # ← edit (the VIDEO_ID)
UPLOADED="$LOCAL/.uploaded"

mkdir -p "$UPLOADED"

upload_rendition() {
  local name="$1"
  local source="$LOCAL/$name"
  local destination="$BASE/hls/$name"

  aws s3 sync "$source" "$destination" \
    --endpoint-url "$ENDPOINT" \
    --exclude "*" --include "*.m4s" \
    --content-type "video/iso.segment" \
    --cache-control "public,max-age=31536000,immutable" \
    --no-progress

  aws s3 cp "$source/init.mp4" "$destination/init.mp4" \
    --endpoint-url "$ENDPOINT" \
    --content-type "video/mp4" \
    --cache-control "public,max-age=31536000,immutable" \
    --no-progress

  aws s3 cp "$source/index.m3u8" "$destination/index.m3u8" \
    --endpoint-url "$ENDPOINT" \
    --content-type "application/vnd.apple.mpegurl" \
    --cache-control "public,max-age=60" \
    --no-progress
}

# Publish catalog, processing metadata, and poster immediately so the page
# can show "processing" state before renditions arrive.
aws s3 cp "$LOCAL/catalog.json" "$BUCKET/videos/catalog.json" \
  --endpoint-url "$ENDPOINT" \
  --content-type "application/json" \
  --cache-control "public,max-age=60" \
  --no-progress

aws s3 cp "$LOCAL/metadata.json" "$BASE/metadata.json" \
  --endpoint-url "$ENDPOINT" \
  --content-type "application/json" \
  --cache-control "public,max-age=60" \
  --no-progress

aws s3 cp "$LOCAL/poster.jpg" "$BASE/poster.jpg" \
  --endpoint-url "$ENDPOINT" \
  --content-type "image/jpeg" \
  --cache-control "public,max-age=31536000,immutable" \
  --no-progress

for name in 2k 4k 6k; do          # add 8k here if encoding it
  if [[ -f "$UPLOADED/$name" ]]; then
    printf '%s is already uploaded; skipping.\n' "$name"
    continue
  fi

  while [[ ! -f "$LOCAL/$name/.complete" ]]; do
    sleep 30
  done

  printf 'Uploading %s rendition...\n' "$name"
  upload_rendition "$name"
  touch "$UPLOADED/$name"
  rm -rf "$LOCAL/$name"
  printf 'Uploaded %s and removed its local files.\n' "$name"
done

while [[ ! -f "$LOCAL/master.m3u8" ]]; do
  sleep 10
done

aws s3 cp "$LOCAL/master.m3u8" "$BASE/hls/master.m3u8" \
  --endpoint-url "$ENDPOINT" \
  --content-type "application/vnd.apple.mpegurl" \
  --cache-control "public,max-age=60" \
  --no-progress

aws s3 cp "$LOCAL/metadata-complete.json" "$BASE/metadata.json" \
  --endpoint-url "$ENDPOINT" \
  --content-type "application/json" \
  --cache-control "public,max-age=60" \
  --no-progress

printf 'All renditions uploaded to %s\n' "$BASE"
```

Key decisions baked into the uploader:

- **Content types matter.** hls.js and Safari require
  `application/vnd.apple.mpegurl` for playlists; segments are
  `video/iso.segment`, the init file `video/mp4`.
- **Cache headers**: segments/init/poster are immutable (1 year) because their
  content never changes; playlists and JSON get `max-age=60` so updates
  propagate quickly.
- **Upload order is deliberate**: `master.m3u8` and the `complete` metadata go
  up **last**, after every rendition. The player treats a missing master
  playlist as "still processing", so nobody sees a broken video mid-upload.
- **Cleanup**: after each rendition uploads, its local folder is deleted and a
  marker dropped in `.uploaded/`. Peak disk usage stays near the size of the
  largest single rendition.

### Resume / crash safety

- `.complete` marker per rendition → encoder skips finished renditions on rerun
- `.uploaded/<name>` marker → uploader skips finished uploads on rerun
- Both scripts can be killed and rerun at any point; they pick up where they
  left off
- **Never edit a script while it is running.** Bash reads script files
  lazily; editing shifts byte offsets and the running process will
  misinterpret the file (this happened — the encoder died with
  `directory: unbound variable`). Kill both scripts, edit, rerun.

## Step 3 — Create the JSON files

Three files in `$WORKDIR`. The site and player read all of them.

**`metadata.json`** — uploaded immediately, status `processing`:

```json
{
  "id": "my-new-video",
  "title": "My New Video",
  "type": "video",
  "projection": "equirectangular",
  "aspectRatio": "2:1",
  "durationSeconds": 1092.326,
  "status": "processing",
  "posterPath": "poster.jpg",
  "hlsPath": "hls/master.m3u8",
  "renditions": [
    { "name": "2k", "width": 1920, "height": 960 },
    { "name": "4k", "width": 3840, "height": 1920 },
    { "name": "6k", "width": 5760, "height": 2880 }
  ]
}
```

- `durationSeconds`: from ffprobe (step 1)
- `renditions`: must exactly match what you encode — heights are how the
  player's quality menu maps to hls.js levels
- `title`: shown in the gallery, the player header, the page `<title>`, and
  rendered onto the social thumbnail

**`metadata-complete.json`** — identical but `"status": "complete"`. The
uploader swaps it in as the final step.

**`catalog.json`** — fetch the live one and append the new entry (never
hand-recreate it; you'd drop existing videos):

```bash
curl -s https://pub-059f755fb61d49c49b6393e18992dd9e.r2.dev/videos/catalog.json | jq .
```

```json
{
  "videos": [
    { "id": "new-apartment-china", "metadataPath": "new-apartment-china/metadata.json" },
    { "id": "my-new-video", "metadataPath": "my-new-video/metadata.json" }
  ]
}
```

Validate all three: `jq empty "$WORKDIR"/*.json`

## Step 4 — Generate the poster

```bash
ffmpeg -y -ss 00:00:05 -i "/path/to/source.mp4" \
  -frames:v 1 -vf "scale=2400:1200:flags=lanczos" -q:v 2 \
  "$WORKDIR/poster.jpg"
```

- `-ss 00:00:05` — seek; scrub to a different timestamp if the 5s frame is bad
  (people mid-blink, camera operator's hand, etc.). Open the JPEG and check.
- 2400×1200 keeps the 2:1 ratio; used as the player background before
  playback, the gallery row image, and the base layer of the social thumbnail.

## Step 5 — Run encode and upload in parallel

```bash
chmod +x "$WORKDIR/encode-hls.sh" "$WORKDIR/upload-r2.sh"
bash -n "$WORKDIR/encode-hls.sh" && bash -n "$WORKDIR/upload-r2.sh"   # syntax check

"$WORKDIR/encode-hls.sh" &    # encoder: 2k → 4k → 6k (→ 8k)
"$WORKDIR/upload-r2.sh" &     # uploader: publishes poster/metadata now,
                              # then uploads each rendition as it completes
```

### Monitoring

```bash
# Encode progress: ffmpeg prints time= (source position) every 10s.
# progress % ≈ time / durationSeconds
tail -f <encoder log>

# What's uploaded so far
ls "$WORKDIR/.uploaded"

# Disk headroom (should stay roughly flat thanks to cleanup)
df -h ~/Desktop && du -sh "$WORKDIR"
```

Timing rule of thumb (M-series MacBook, `-preset slow`, 30fps source):
`encode hours ≈ duration_minutes × (0.017 + 0.042 + 0.10 [+ 0.5 for 8k])`.
An 18-minute video through 6K is ~3 hours; with 8K it's 10+.

## Step 6 — Verify on R2

```bash
BASE="https://pub-059f755fb61d49c49b6393e18992dd9e.r2.dev/videos/my-new-video"

curl -s "$BASE/metadata.json" | jq .status          # "complete"
curl -s "$BASE/hls/master.m3u8"                     # lists every rendition
curl -s "$BASE/hls/2k/index.m3u8" | head -5         # per-rendition playlist
curl -s -o /dev/null -w '%{http_code}\n' "$BASE/poster.jpg"          # 200
curl -s https://pub-059f755fb61d49c49b6393e18992dd9e.r2.dev/videos/catalog.json | jq .
```

Optional full playback check before deploying: run the dev server
(`npm run dev` in `personal-site/`) and open
`http://localhost:3000/videos/my-new-video`.

## Step 7 — Build and deploy the page

No code changes are needed — the build discovers the video from the catalog
and generates the gallery row, the page, the sitemap entry, and the social
thumbnail.

```bash
cd /Users/ryanhuang/Documents/GitHub/personal-site/personal-site
npm run build
```

Confirm the build output lists the new routes:

```
├ ● /videos/[id]
├   ├ /videos/new-apartment-china
├   └ /videos/my-new-video          ← must appear
├ ● /videos/[id]/opengraph-image
│   └ /videos/my-new-video/opengraph-image
```

If the new video is missing, the Next.js fetch cache served a stale catalog:

```bash
rm -rf .next/cache && npm run build
```

Then deploy (any commit works; the build runs in CI):

```bash
git add -A
git commit -m "add my-new-video"
git push
```

Live URLs once the Cloudflare deployment finishes:

- Page: `https://ryanhuang.xyz/videos/my-new-video`
- Social thumbnail: `https://ryanhuang.xyz/videos/my-new-video/opengraph-image`

iMessage/social previews use the generated thumbnail (poster + title overlay).
Platforms cache previews per-URL — if you shared the link before deploying,
append `?v=2` to bust their cache when testing.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "This film is still processing or temporarily unavailable" | `master.m3u8` not on R2 yet — it uploads only after all renditions | Wait, or check the uploader is still running |
| New video missing from `npm run build` output | Stale Next.js fetch cache | `rm -rf personal-site/.next/cache` and rebuild |
| Encoder dies with `unbound variable` | A script was edited while running | Mark finished renditions (`touch $WORKDIR/<name>/.complete`), rerun both scripts |
| Disk filling up | Uploader not running, so cleanup isn't happening | Start/restart `upload-r2.sh`; it deletes each rendition after upload |
| Quality menu shows options that don't play | `renditions` in metadata doesn't match encoded heights | Fix metadata.json, re-upload it |
| Playback fails cross-origin (CORS errors in console) | Bucket CORS policy missing/changed | Re-add GET/HEAD allow-all CORS on `360-vids` in the Cloudflare dashboard (API keys can't do it) |
| Upload denied (`AccessDenied`) | Keys are object-scoped | Bucket-level settings must be changed in the dashboard |
