# Clover Motion — Archive Crate, Dependency, and Review Map (`docs/archive-map.md`)

**Revision:** 1.0.0 (Iteration A1 Triage)
**Status:** Single Source of Truth for Archive Dependencies & Backlog Batches
**Total Discovered Crates:** 461
**Total ZIP Members Covered:** 29180 entries (100% Backlog Coverage)

---

## 1. Overview & Architectural Boundaries

The 23 archives in `/Users/edisantoso/Downloads/Craft` contain native Rust/egui desktop applications, headless renderers, media codecs, and web/WASM builds. In accordance with Iteration A1, every single member has been triaged and placed into an explicit review batch. **No source code was executed, compiled, or extracted to disk.**

### 1.1 Shared Dependency & Patch Family Topology

All 6 primary candidate apps (`EffectCraft`, `FilmCraft`, `SoundCraft`, `VectorCraft`, `PhotoCraft`, `FigCraft`) share a common `[patch.crates-io]` graph pinning customized forks:
- **`storytold/egui`**: commit `6d518fc799681571963842f95b55a6b68431b15a`
- **`storytold/winit`**: commit `a517b3846ee8457d84ee4975110bfda6797c44dc`
- **`craft-libs`** (external, absent from provided folder): pins across revisions `c5a1cbf...`, `92d392c...`, `9be9a63...`, `e11f9d9...`
- **`storytold/filmcraft`** (commit `d5ead4b...`): imported by EffectCraft for codecs, containers, and color management.

---

## 2. Review Batches Inventory (100% Backlog Coverage)

| Batch ID & Focus | Included Archives | Total Entries | Files | Dirs | Symlinks | Review Priority |
|---|---|---:|---:|---:|---:|---|
| **Batch 0: Foundational & Shared Core** | `craft-skills-main.zip`, `craft-pr-review-tool-main.zip`, `craft-repo-status-app-main.zip`, `craft-fonts-main.zip`, `winit-master.zip`, `egui-main.zip` | 1,806 | — | — | — | Priority 1 (Foundation) |
| **Batch 1: Six Target Candidates — SoundCraft** | `soundcraft-main.zip` | 745 | — | — | — | Priority 2 (Target App) |
| **Batch 2: Six Target Candidates — FigCraft** | `figcraft-main.zip` | 1,635 | — | — | — | Priority 2 (Target App) |
| **Batch 3: Six Target Candidates — EffectCraft** | `effectcraft-main.zip` | 1,863 | — | — | — | Priority 2 (Target App) |
| **Batch 3: Six Target Candidates — EffectCraft Corpus** | `effectcraft-corpus-main.zip` | 88 | — | — | — | Priority 2 (Target App) |
| **Batch 4: Six Target Candidates — FilmCraft** | `filmcraft-main.zip` | 1,919 | — | — | — | Priority 2 (Target App) |
| **Batch 5: Six Target Candidates — VectorCraft** | `vectorcraft-main.zip` | 2,867 | — | — | — | Priority 2 (Target App) |
| **Batch 6: Six Target Candidates — PhotoCraft** | `photocraft-main.zip` | 3,454 | — | — | — | Priority 2 (Target App) |
| **Batch 6: Six Target Candidates — PhotoCraft Corpus** | `photocraft-corpus-main.zip` | 335 | — | — | — | Priority 2 (Target App) |
| **Batch 7: Extended Repositories — CadCraft Corpus** | `cadcraft-corpus-main.zip` | 22 | — | — | — | Priority 3 (Extended Backlog) |
| **Batch 7: Extended Repositories — CadCraft** | `cadcraft-main.zip` | 1,280 | — | — | — | Priority 3 (Extended Backlog) |
| **Batch 8: Extended Repositories — AI Integrations** | `craft-ai-integrations-main.zip` | 673 | — | — | — | Priority 3 (Extended Backlog) |
| **Batch 9: Extended Repositories — MaterialCraft** | `materialcraft-main.zip` | 686 | — | — | — | Priority 3 (Extended Backlog) |
| **Batch 10: Extended Repositories — DeckCraft** | `deckcraft-main.zip` | 904 | — | — | — | Priority 2 (Target App) |
| **Batch 11: Extended Repositories — Craft Anything** | `craft-anything-main.zip` | 927 | — | — | — | Priority 2 (Target App) |
| **Batch 12: Extended Repositories — DesignCraft** | `designcraft-main.zip` | 1,030 | — | — | — | Priority 2 (Target App) |
| **Batch 13: Extended Repositories — LightCraft** | `lightcraft-main.zip` | 1,635 | — | — | — | Priority 2 (Target App) |
| **Batch 14: Extended Repositories — ArtCraft** | `artcraft-main.zip` | 7,311 | — | — | — | Priority 2 (Target App) |
| **Total Denominator** | **23 Archives** | **29,180** | **24,475** | **4,673** | **32** | **100.00% Backlog** |

---

## 3. Crate Dependency Catalog by Archive

### 3.1. `artcraft-main.zip` (39 crates)

- **Key Architecture & Format Docs:** `artcraft-main/README.md`, `artcraft-main/artcraft-native/README.md`, `artcraft-main/crates/api_clients/openai_sora_client/src/requests/auth_sentinel_2/metadata/python_impl/readme.MD`, `artcraft-main/crates/vendor/tauri-plugin-http/README.md`, `artcraft-main/frontend/README.md`, `artcraft-main/frontend/apps/artcraft/README.md`, `artcraft-main/frontend/libs/analytics/google-analytics/README.md`, `artcraft-main/frontend/libs/api-enums/README.md`
| Crate Name | Version | Path in Archive | Internal Dependencies | External Dependencies |
|---|---|---|---|---|
| `artcraft_native` | `0.1.0` | `artcraft-main/artcraft-native/Cargo.toml` | *(none)* | directories (6.0.0), eframe (v0.36), egui (0.36), egui_extras (v0.36) |
| `artcraft_api_defs` | `0.0.1` | `artcraft-main/crates/api_clients/artcraft/artcraft_api_defs/Cargo.toml` | *(none)* | *(none)* |
| `artcraft_client` | `0.0.1` | `artcraft-main/crates/api_clients/artcraft/artcraft_client/Cargo.toml` | *(none)* | backoff (v0.4.0), uuid (v1.8.0), url-builder (0.1.1) |
| `artcraft_router` | `0.0.1` | `artcraft-main/crates/api_clients/artcraft/artcraft_router/Cargo.toml` | *(none)* | *(none)* |
| `fal_client` | `0.0.1` | `artcraft-main/crates/api_clients/fal_client/Cargo.toml` | *(none)* | *(none)* |
| `gmicloud_client` | `0.0.1` | `artcraft-main/crates/api_clients/gmicloud_client/Cargo.toml` | test_data (../../testing/test_data), test_utils (../../testing/test_utils) | tokio (v1) |
| `grok_api_client` | `0.0.1` | `artcraft-main/crates/api_clients/grok_api_client/Cargo.toml` | *(none)* | tokio (v1) |
| `grok_consumer_client` | `0.0.1` | `artcraft-main/crates/api_clients/grok_consumer_client/Cargo.toml` | *(none)* | scraper (0.24.0), tokio (v1), log4rs (1.4.0) |
| `kinovi_web_client` | `0.0.1` | `artcraft-main/crates/api_clients/kinovi_web_client/Cargo.toml` | test_data (../../testing/test_data), test_utils (../../testing/test_utils) | tokio (v1) |
| `midjourney_client` | `0.0.1` | `artcraft-main/crates/api_clients/midjourney_client/Cargo.toml` | *(none)* | tokio (v1), dom_query (0.20.2), ciborium (0.2) |
| `openai_sora_client` | `0.0.1` | `artcraft-main/crates/api_clients/openai_sora_client/Cargo.toml` | test_utils (../../testing/test_utils) | tokio (v1) |
| `worldlabs_api_client` | `0.0.1` | `artcraft-main/crates/api_clients/worldlabs_api_client/Cargo.toml` | *(none)* | tokio (v1) |
| `worldlabs_consumer_client` | `0.0.1` | `artcraft-main/crates/api_clients/worldlabs_consumer_client/Cargo.toml` | *(none)* | scraper (0.24.0), tokio (v1), log4rs (1.4.0) |
| `artcraft` | `0.0.1` | `artcraft-main/crates/desktop/artcraft/Cargo.toml` | tauri-plugin-http (../../vendor/tauri-plugin-http) | bytes (1.10.1), directories (6.0.0), dirs (6.0.0), discord-rich-presence (1.1.0) |
| `artcraft_client_identity` | `0.0.1` | `artcraft-main/crates/lib/artcraft_client_identity/Cargo.toml` | *(none)* | *(none)* |
| `browser_emulation` | `0.0.1` | `artcraft-main/crates/lib/browser_emulation/Cargo.toml` | *(none)* | *(none)* |
| `build_metadata` | `0.0.1` | `artcraft-main/crates/lib/build_metadata/Cargo.toml` | *(none)* | build-info (0.0.40), build-info-build (0.0.40) |
| `memory_store` | `0.0.1` | `artcraft-main/crates/lib/caching/memory_store/Cargo.toml` | *(none)* | *(none)* |
| `cloudflare_errors` | `0.0.1` | `artcraft-main/crates/lib/cloudflare_errors/Cargo.toml` | *(none)* | *(none)* |
| `cloudflare_mitigation` | `0.0.1` | `artcraft-main/crates/lib/cloudflare_mitigation/Cargo.toml` | *(none)* | *(none)* |
| `cookie_store` | `0.0.1` | `artcraft-main/crates/lib/cookie_store/Cargo.toml` | *(none)* | *(none)* |
| `cookie_store_wrapper` | `0.0.2` | `artcraft-main/crates/lib/cookie_store_wrapper/Cargo.toml` | *(none)* | time (0.3), cookie_store (v0.21.1) |
| `primitives` | `0.0.1` | `artcraft-main/crates/lib/data/primitives/Cargo.toml` | *(none)* | *(none)* |
| `web_base64` | `0.0.1` | `artcraft-main/crates/lib/data/web_base64/Cargo.toml` | *(none)* | *(none)* |
| `errors` | `0.0.1` | `artcraft-main/crates/lib/errors/Cargo.toml` | *(none)* | *(none)* |
| `file_to_base64_url` | `0.0.1` | `artcraft-main/crates/lib/files/file_to_base64_url/Cargo.toml` | test_utils (../../../testing/test_utils) | *(none)* |
| `filesys` | `0.0.1` | `artcraft-main/crates/lib/files/filesys/Cargo.toml` | test_utils (../../../testing/test_utils) | *(none)* |
| `images` | `0.1.0` | `egui-main/examples/images/Cargo.toml` | *(none)* | *(none)* |
| `mimetypes` | `0.0.1` | `artcraft-main/crates/lib/files/mimetypes/Cargo.toml` | test_utils (../../../testing/test_utils) | infer (0.19.0) |
| `http_headers` | `0.0.1` | `artcraft-main/crates/lib/http_headers/Cargo.toml` | *(none)* | *(none)* |
| `jwt_light` | `0.0.1` | `artcraft-main/crates/lib/jwt_light/Cargo.toml` | *(none)* | *(none)* |
| `url_utils` | `0.0.1` | `artcraft-main/crates/lib/url_utils/Cargo.toml` | *(none)* | *(none)* |
| `uuid_utils` | `0.0.1` | `artcraft-main/crates/lib/uuid_utils/Cargo.toml` | *(none)* | uuid (v1.8.0) |
| `sqlite_tasks` | `0.0.1` | `artcraft-main/crates/schema/database/sqlite_tasks/Cargo.toml` | *(none)* | sqlx (v0.7.4), sqlx (v0.7.4) |
| `enums` | `0.0.1` | `artcraft-main/crates/schema/public/enums/Cargo.toml` | *(none)* | sqlx (v0.7.4), sqlx-core (v0.7.4), sqlx-mysql (v0.7.4) |
| `tokens` | `0.0.1` | `artcraft-main/crates/schema/public/tokens/Cargo.toml` | *(none)* | rand (v0.8.5), sqlx (v0.7.4), sqlx-core (v0.7.4), sqlx-mysql (v0.7.4) |
| `test_data` | `0.0.1` | `artcraft-main/crates/testing/test_data/Cargo.toml` | *(none)* | *(none)* |
| `test_utils` | `0.0.1` | `artcraft-main/crates/testing/test_utils/Cargo.toml` | errors (../../lib/errors) | *(none)* |
| `tauri-plugin-http` | `2.4.3` | `artcraft-main/crates/vendor/tauri-plugin-http/Cargo.toml` | *(none)* | tokio (v1), urlpattern (0.3), regex (1), http (1) |

### 3.2. `cadcraft-corpus-main.zip` (0 crates)

- **Key Architecture & Format Docs:** `cadcraft-corpus-main/README.md`, `cadcraft-corpus-main/contributed/README.md`
- *Note: Asset/corpus archive containing zero Cargo.toml manifests.*

### 3.3. `cadcraft-main.zip` (16 crates)

- **Key Architecture & Format Docs:** `cadcraft-main/README.md`, `cadcraft-main/docs/architecture.md`, `cadcraft-main/docs/gaps.md`, `cadcraft-main/packaging/macos/dmg/README.md`, `cadcraft-main/packaging/web/README.md`
| Crate Name | Version | Path in Archive | Internal Dependencies | External Dependencies |
|---|---|---|---|---|
| `cadcraft-cli` | `{'workspace': True}` | `cadcraft-main/apps/cadcraft-cli/Cargo.toml` | *(none)* | *(none)* |
| `cadcraft-web` | `{'workspace': True}` | `cadcraft-main/apps/cadcraft-web/Cargo.toml` | *(none)* | craft-web-host (git:https://github.com/storytold/craft-libs) |
| `cadcraft` | `{'workspace': True}` | `cadcraft-main/apps/cadcraft/Cargo.toml` | *(none)* | ron (0.12), winresource (0.1) |
| `cadcraft-color` | `{'workspace': True}` | `cadcraft-main/crates/color/Cargo.toml` | *(none)* | *(none)* |
| `cadcraft-constraints` | `{'workspace': True}` | `cadcraft-main/crates/constraints/Cargo.toml` | *(none)* | *(none)* |
| `cadcraft-doc` | `{'workspace': True}` | `cadcraft-main/crates/doc/Cargo.toml` | *(none)* | *(none)* |
| `cadcraft-dwg` | `{'workspace': True}` | `cadcraft-main/crates/dwg/Cargo.toml` | *(none)* | *(none)* |
| `cadcraft-dxf` | `{'workspace': True}` | `cadcraft-main/crates/dxf/Cargo.toml` | *(none)* | *(none)* |
| `cadcraft-engine` | `{'workspace': True}` | `cadcraft-main/crates/engine/Cargo.toml` | *(none)* | rstar (v0.13) |
| `cadcraft-fonts` | `{'workspace': True}` | `cadcraft-main/crates/fonts/Cargo.toml` | *(none)* | *(none)* |
| `cadcraft-geom` | `{'workspace': True}` | `cadcraft-main/crates/geom/Cargo.toml` | *(none)* | *(none)* |
| `cadcraft-io` | `{'workspace': True}` | `cadcraft-main/crates/io/Cargo.toml` | *(none)* | miniz_oxide (0.9), acadrust (0.6.6) |
| `cadcraft-mcp` | `{'workspace': True}` | `cadcraft-main/crates/mcp/Cargo.toml` | *(none)* | getrandom (0.4) |
| `cadcraft-render` | `{'workspace': True}` | `cadcraft-main/crates/render/Cargo.toml` | *(none)* | *(none)* |
| `cadcraft-ui-egui` | `{'workspace': True}` | `cadcraft-main/crates/ui-egui/Cargo.toml` | *(none)* | naga (v30), toml (1) |
| `xtask` | `{'workspace': True}` | `vectorcraft-main/xtask/Cargo.toml` | *(none)* | *(none)* |

### 3.4. `craft-ai-integrations-main.zip` (22 crates)

- **Key Architecture & Format Docs:** `craft-ai-integrations-main/README.md`, `craft-ai-integrations-main/consumer-smoke/README.md`, `craft-ai-integrations-main/crates/ai-http/README.md`, `craft-ai-integrations-main/docs/adopting/README.md`, `craft-ai-integrations-main/tools/mutation/README.md`
| Crate Name | Version | Path in Archive | Internal Dependencies | External Dependencies |
|---|---|---|---|---|
| `craft-ai-consumer-smoke` | `0.1.0` | `craft-ai-integrations-main/consumer-smoke/Cargo.toml` | craft-ai-egui (../crates/ai-egui), craft-ai-core (../crates/ai-core) | egui (v0.37) |
| `craft-ai-artcraft` | `{'workspace': True}` | `craft-ai-integrations-main/crates/ai-artcraft/Cargo.toml` | *(none)* | ureq (v3), uuid (v1) |
| `craft-ai-bfl` | `{'workspace': True}` | `craft-ai-integrations-main/crates/ai-bfl/Cargo.toml` | *(none)* | ureq (v3) |
| `craft-ai-burn-setup` | `{'workspace': True}` | `craft-ai-integrations-main/crates/ai-burn-setup/Cargo.toml` | craft-ai-features (../ai-features) | sha2 (0.11), tempfile (3), burn-onnx (v=0.22.0) |
| `craft-ai-client` | `{'workspace': True}` | `craft-ai-integrations-main/crates/ai-client/Cargo.toml` | craft-ai-native (../ai-native), craft-ai-openai (../ai-openai), craft-ai-artcraft (../ai-artcraft), craft-ai-bfl (../ai-bfl) | url (2), tempfile (3), png (0.18) |
| `craft-ai-comfy-env` | `{'workspace': True}` | `craft-ai-integrations-main/crates/ai-comfy-env/Cargo.toml` | craft-ai-features (../ai-features), craft-ai-media (../ai-media) | percent-encoding (2), flate2 (1), ureq (v3), sha2 (0.11) |
| `craft-ai-comfyui` | `{'workspace': True}` | `craft-ai-integrations-main/crates/ai-comfyui/Cargo.toml` | craft-ai-media (../ai-media), craft-ai-features (../ai-features) | png (0.18), base64 (0.23), ureq (v3), tempfile (3) |
| `craft-ai-core` | `{'workspace': True}` | `craft-ai-integrations-main/crates/ai-core/Cargo.toml` | *(none)* | *(none)* |
| `craft-ai-declarative` | `{'workspace': True}` | `craft-ai-integrations-main/crates/ai-declarative/Cargo.toml` | craft-ai-media (../ai-media) | ureq (v3) |
| `craft-ai-egui` | `{'workspace': True}` | `craft-ai-integrations-main/crates/ai-egui/Cargo.toml` | craft-ai-client (../ai-client), craft-ai-features (../ai-features), craft-ai-native (../ai-native), craft-ai-features (../ai-features) | egui (v0.37), egui (v0.37), egui_kittest (v0.37), eframe (v0.37) |
| `craft-ai-engine-burn` | `{'workspace': True}` | `craft-ai-integrations-main/crates/ai-engine-burn/Cargo.toml` | craft-ai-engine (../ai-engine), craft-ai-features (../ai-features), craft-ai-engine-rten (../ai-engine-rten), craft-ai-burn-setup (../ai-burn-setup) | burn (v=0.22.1), burn-store (=0.22.1), tempfile (3), png (0.18) |
| `craft-ai-engine-candle` | `{'workspace': True}` | `craft-ai-integrations-main/crates/ai-engine-candle/Cargo.toml` | craft-ai-engine (../ai-engine), craft-ai-features (../ai-features) | thiserror (2), png (0.18), image (v0.25), candle-core (v=0.11.1) |
| `craft-ai-engine-rten` | `{'workspace': True}` | `craft-ai-integrations-main/crates/ai-engine-rten/Cargo.toml` | craft-ai-engine (../ai-engine) | rten (v=0.27.0), rten-tensor (=0.27.0), png (0.18), image (v0.25) |
| `craft-ai-engine` | `{'workspace': True}` | `craft-ai-integrations-main/crates/ai-engine/Cargo.toml` | craft-ai-features (../ai-features) | tempfile (3) |
| `craft-ai-features` | `{'workspace': True}` | `craft-ai-integrations-main/crates/ai-features/Cargo.toml` | *(none)* | png (0.18) |
| `craft-ai-http` | `{'workspace': True}` | `craft-ai-integrations-main/crates/ai-http/Cargo.toml` | *(none)* | ureq (v3) |
| `craft-ai-media` | `{'workspace': True}` | `craft-ai-integrations-main/crates/ai-media/Cargo.toml` | *(none)* | ureq (v3), tempfile (3), url (2), tempfile (3) |
| `craft-ai-native` | `{'workspace': True}` | `craft-ai-integrations-main/crates/ai-native/Cargo.toml` | *(none)* | dirs (7), argon2 (0.6), chacha20poly1305 (0.11), getrandom (0.4) |
| `craft-ai-openai` | `{'workspace': True}` | `craft-ai-integrations-main/crates/ai-openai/Cargo.toml` | *(none)* | ureq (v3) |
| `craft-ai-sam3` | `{'workspace': True}` | `craft-ai-integrations-main/crates/ai-sam3/Cargo.toml` | *(none)* | ureq (v3) |
| `craft-ai-seedance` | `{'workspace': True}` | `craft-ai-integrations-main/crates/ai-seedance/Cargo.toml` | *(none)* | ureq (v3) |
| `craft-ai-vertex` | `{'workspace': True}` | `craft-ai-integrations-main/crates/ai-vertex/Cargo.toml` | *(none)* | ureq (v3) |

### 3.5. `craft-anything-main.zip` (20 crates)

- **Key Architecture & Format Docs:** `craft-anything-main/README.md`, `craft-anything-main/assets/app-icon/README.md`, `craft-anything-main/examples/wasm-plugin-readme-check/README.md`, `craft-anything-main/examples/wasm-plugin-wordcount/README.md`, `craft-anything-main/packaging/macos/dmg/README.md`, `craft-anything-main/packaging/web/README.md`, `craft-anything-main/vendor/wgpu-hal/README.md`
| Crate Name | Version | Path in Archive | Internal Dependencies | External Dependencies |
|---|---|---|---|---|
| `craft-anything-cli` | `{'workspace': True}` | `craft-anything-main/apps/craft-anything-cli/Cargo.toml` | *(none)* | clap (v4), ctrlc (v3), tempfile (3), winresource (0.1) |
| `craft-anything-web` | `{'workspace': True}` | `craft-anything-main/apps/craft-anything-web/Cargo.toml` | *(none)* | *(none)* |
| `craft-anything` | `{'workspace': True}` | `craft-anything-main/apps/craft-anything/Cargo.toml` | *(none)* | tempfile (3), winresource (0.1) |
| `craft-anything-ai` | `{'workspace': True}` | `craft-anything-main/crates/ai/Cargo.toml` | *(none)* | ureq (3), dirs (6), tempfile (3) |
| `craft-anything-analysis` | `{'workspace': True}` | `craft-anything-main/crates/analysis/Cargo.toml` | *(none)* | *(none)* |
| `craft-anything-disasm` | `{'workspace': True}` | `craft-anything-main/crates/disasm/Cargo.toml` | *(none)* | *(none)* |
| `craft-anything-engine` | `{'workspace': True}` | `craft-anything-main/crates/engine/Cargo.toml` | *(none)* | dirs (6), base64 (0.22), png (0.17), image (v0.25) |
| `craft-anything-engines` | `{'workspace': True}` | `craft-anything-main/crates/engines/Cargo.toml` | *(none)* | ureq (3), base64 (0.22), sha1 (0.10), wasmtime (v49) |
| `craft-anything-evidence` | `{'workspace': True}` | `craft-anything-main/crates/evidence/Cargo.toml` | *(none)* | *(none)* |
| `craft-anything-formats` | `{'workspace': True}` | `craft-anything-main/crates/formats/Cargo.toml` | *(none)* | rsa (v0.9), p256 (v0.13), p384 (v0.13), sha1 (v0.10) |
| `craft-anything-js` | `{'workspace': True}` | `craft-anything-main/crates/js/Cargo.toml` | *(none)* | *(none)* |
| `craft-anything-mcp` | `{'workspace': True}` | `craft-anything-main/crates/mcp/Cargo.toml` | *(none)* | tempfile (3) |
| `craft-anything-platform` | `{'workspace': True}` | `craft-anything-main/crates/platform/Cargo.toml` | *(none)* | process-wrap (v10), portable-pty (0.9), vt100 (0.16), tempfile (3) |
| `craft-anything-setup` | `{'workspace': True}` | `craft-anything-main/crates/setup/Cargo.toml` | *(none)* | toml_edit (0.25), yaml-rust2 (0.10), tempfile (3) |
| `craft-anything-testkit` | `{'workspace': True}` | `craft-anything-main/crates/testkit/Cargo.toml` | *(none)* | rsa (v0.9), p256 (v0.13), sha2 (0.10), sha1 (0.10) |
| `craft-anything-ui-egui` | `{'workspace': True}` | `craft-anything-main/crates/ui-egui/Cargo.toml` | *(none)* | tempfile (3) |
| `wasm-plugin-readme-check` | `0.1.0` | `craft-anything-main/examples/wasm-plugin-readme-check/Cargo.toml` | *(none)* | wit-bindgen (0.63), serde_json (1) |
| `wasm-plugin-wordcount` | `0.1.0` | `craft-anything-main/examples/wasm-plugin-wordcount/Cargo.toml` | *(none)* | wit-bindgen (0.63), serde_json (1) |
| `wgpu-hal` | `30.0.1` | `craft-anything-main/vendor/wgpu-hal/Cargo.toml` | *(none)* | arrayvec (v0.7.1), bitflags (v2.9), bytemuck (v1.22), cfg-if (v1) |
| `xtask` | `{'workspace': True}` | `vectorcraft-main/xtask/Cargo.toml` | *(none)* | *(none)* |

### 3.6. `craft-fonts-main.zip` (2 crates)

- **Key Architecture & Format Docs:** `craft-fonts-main/README.md`
| Crate Name | Version | Path in Archive | Internal Dependencies | External Dependencies |
|---|---|---|---|---|
| `craft-fonts-tests` | `{'workspace': True}` | `craft-fonts-main/crates/craft-fonts-tests/Cargo.toml` | craft-fonts (../craft-fonts) | skrifa (0.48), sha2 (0.11) |
| `craft-fonts` | `{'workspace': True}` | `craft-fonts-main/crates/craft-fonts/Cargo.toml` | *(none)* | *(none)* |

### 3.7. `craft-pr-review-tool-main.zip` (4 crates)

- **Key Architecture & Format Docs:** `craft-pr-review-tool-main/README.md`
| Crate Name | Version | Path in Archive | Internal Dependencies | External Dependencies |
|---|---|---|---|---|
| `craft-pr-review` | `{'workspace': True}` | `craft-pr-review-tool-main/crates/craft-pr-review/Cargo.toml` | *(none)* | tauri (v2), tauri-plugin-global-shortcut (2), tauri-build (v2) |
| `pr-claude` | `{'workspace': True}` | `craft-repo-status-app-main/crates/pr-claude/Cargo.toml` | *(none)* | *(none)* |
| `pr-core` | `{'workspace': True}` | `craft-repo-status-app-main/crates/pr-core/Cargo.toml` | *(none)* | *(none)* |
| `pr-github` | `{'workspace': True}` | `craft-repo-status-app-main/crates/pr-github/Cargo.toml` | *(none)* | *(none)* |

### 3.8. `craft-repo-status-app-main.zip` (6 crates)

- **Key Architecture & Format Docs:** `craft-repo-status-app-main/README.md`
| Crate Name | Version | Path in Archive | Internal Dependencies | External Dependencies |
|---|---|---|---|---|
| `craft-core` | `{'workspace': True}` | `craft-repo-status-app-main/crates/craft-core/Cargo.toml` | *(none)* | *(none)* |
| `craft-github` | `{'workspace': True}` | `craft-repo-status-app-main/crates/craft-github/Cargo.toml` | craft-core (../craft-core) | *(none)* |
| `craft-status-app` | `{'workspace': True}` | `craft-repo-status-app-main/crates/craft-status-app/Cargo.toml` | *(none)* | tauri (v2), tauri-plugin-global-shortcut (2), tauri-build (v2) |
| `pr-claude` | `{'workspace': True}` | `craft-repo-status-app-main/crates/pr-claude/Cargo.toml` | *(none)* | *(none)* |
| `pr-core` | `{'workspace': True}` | `craft-repo-status-app-main/crates/pr-core/Cargo.toml` | *(none)* | *(none)* |
| `pr-github` | `{'workspace': True}` | `craft-repo-status-app-main/crates/pr-github/Cargo.toml` | *(none)* | *(none)* |

### 3.9. `craft-skills-main.zip` (0 crates)

- **Key Architecture & Format Docs:** `craft-skills-main/README.md`
- *Note: Asset/corpus archive containing zero Cargo.toml manifests.*

### 3.10. `deckcraft-main.zip` (28 crates)

- **Key Architecture & Format Docs:** `deckcraft-main/README.md`, `deckcraft-main/crates/pdf/README.md`, `deckcraft-main/docs/architecture.md`, `deckcraft-main/docs/gaps.md`, `deckcraft-main/packaging/macos/dmg/README.md`, `deckcraft-main/packaging/web/README.md`
| Crate Name | Version | Path in Archive | Internal Dependencies | External Dependencies |
|---|---|---|---|---|
| `deckcraft-cli` | `{'workspace': True}` | `deckcraft-main/apps/deckcraft-cli/Cargo.toml` | *(none)* | *(none)* |
| `deckcraft-web` | `{'workspace': True}` | `deckcraft-main/apps/deckcraft-web/Cargo.toml` | *(none)* | craft-web-host (git:https://github.com/storytold/craft-libs) |
| `deckcraft` | `{'workspace': True}` | `deckcraft-main/apps/deckcraft/Cargo.toml` | *(none)* | winresource (0.1) |
| `deckcraft-anim` | `{'workspace': True}` | `deckcraft-main/crates/anim/Cargo.toml` | *(none)* | *(none)* |
| `deckcraft-av1` | `{'workspace': True}` | `deckcraft-main/crates/av1/Cargo.toml` | *(none)* | *(none)* |
| `deckcraft-bitstream` | `{'workspace': True}` | `deckcraft-main/crates/bitstream/Cargo.toml` | *(none)* | *(none)* |
| `deckcraft-color` | `{'workspace': True}` | `deckcraft-main/crates/color/Cargo.toml` | *(none)* | *(none)* |
| `deckcraft-engine` | `{'workspace': True}` | `deckcraft-main/crates/engine/Cargo.toml` | *(none)* | *(none)* |
| `deckcraft-fonts` | `{'workspace': True}` | `deckcraft-main/crates/fonts/Cargo.toml` | *(none)* | epaint_default_fonts (0.37) |
| `deckcraft-format` | `{'workspace': True}` | `deckcraft-main/crates/format/Cargo.toml` | *(none)* | *(none)* |
| `deckcraft-geom` | `{'workspace': True}` | `deckcraft-main/crates/geom/Cargo.toml` | *(none)* | *(none)* |
| `deckcraft-h264` | `{'workspace': True}` | `deckcraft-main/crates/h264/Cargo.toml` | *(none)* | *(none)* |
| `deckcraft-hevc` | `{'workspace': True}` | `deckcraft-main/crates/hevc/Cargo.toml` | *(none)* | *(none)* |
| `deckcraft-isobmff` | `{'workspace': True}` | `deckcraft-main/crates/isobmff/Cargo.toml` | *(none)* | *(none)* |
| `deckcraft-matroska` | `{'workspace': True}` | `deckcraft-main/crates/matroska/Cargo.toml` | *(none)* | *(none)* |
| `deckcraft-mcp` | `{'workspace': True}` | `deckcraft-main/crates/mcp/Cargo.toml` | *(none)* | *(none)* |
| `deckcraft-media` | `{'workspace': True}` | `deckcraft-main/crates/media/Cargo.toml` | *(none)* | symphonia (v0.5.5) |
| `deckcraft-metafile` | `{'workspace': True}` | `deckcraft-main/crates/metafile/Cargo.toml` | *(none)* | *(none)* |
| `deckcraft-model` | `{'workspace': True}` | `deckcraft-main/crates/model/Cargo.toml` | *(none)* | *(none)* |
| `deckcraft-ogg` | `{'workspace': True}` | `deckcraft-main/crates/ogg/Cargo.toml` | *(none)* | *(none)* |
| `deckcraft-opus` | `{'workspace': True}` | `deckcraft-main/crates/opus/Cargo.toml` | *(none)* | *(none)* |
| `deckcraft-pdf` | `{'workspace': True}` | `deckcraft-main/crates/pdf/Cargo.toml` | *(none)* | hayro-syntax (v=0.7.2) |
| `deckcraft-pptx` | `{'workspace': True}` | `deckcraft-main/crates/pptx/Cargo.toml` | *(none)* | *(none)* |
| `deckcraft-render` | `{'workspace': True}` | `deckcraft-main/crates/render/Cargo.toml` | *(none)* | *(none)* |
| `deckcraft-text` | `{'workspace': True}` | `deckcraft-main/crates/text/Cargo.toml` | *(none)* | *(none)* |
| `deckcraft-ui-egui` | `{'workspace': True}` | `deckcraft-main/crates/ui-egui/Cargo.toml` | *(none)* | toml (1) |
| `deckcraft-vp9` | `{'workspace': True}` | `deckcraft-main/crates/vp9/Cargo.toml` | *(none)* | *(none)* |
| `xtask` | `{'workspace': True}` | `vectorcraft-main/xtask/Cargo.toml` | *(none)* | *(none)* |

### 3.11. `designcraft-main.zip` (21 crates)

- **Key Architecture & Format Docs:** `designcraft-main/README.md`, `designcraft-main/assets/app-icon/README.md`, `designcraft-main/docs/architecture.md`, `designcraft-main/docs/gaps.md`, `designcraft-main/packaging/macos/dmg/README.md`, `designcraft-main/packaging/web/README.md`, `designcraft-main/packaging/windows/README.md`
| Crate Name | Version | Path in Archive | Internal Dependencies | External Dependencies |
|---|---|---|---|---|
| `designcraft-cli` | `{'workspace': True}` | `designcraft-main/apps/designcraft-cli/Cargo.toml` | *(none)* | *(none)* |
| `designcraft-web` | `{'workspace': True}` | `designcraft-main/apps/designcraft-web/Cargo.toml` | *(none)* | form_urlencoded (1.2) |
| `designcraft` | `{'workspace': True}` | `designcraft-main/apps/designcraft/Cargo.toml` | *(none)* | winresource (0.1) |
| `designcraft-color` | `{'workspace': True}` | `designcraft-main/crates/color/Cargo.toml` | *(none)* | *(none)* |
| `designcraft-compose` | `{'workspace': True}` | `designcraft-main/crates/compose/Cargo.toml` | *(none)* | miniz_oxide (0.8), hypher (v0.1.8) |
| `designcraft-doc` | `{'workspace': True}` | `designcraft-main/crates/doc/Cargo.toml` | *(none)* | *(none)* |
| `designcraft-engine` | `{'workspace': True}` | `designcraft-main/crates/engine/Cargo.toml` | *(none)* | hayro-syntax (0.7.2), hayro-interpret (v0.7.0), hayro-cmap (0.1) |
| `designcraft-epub` | `{'workspace': True}` | `designcraft-main/crates/epub/Cargo.toml` | *(none)* | *(none)* |
| `designcraft-fonts` | `{'workspace': True}` | `designcraft-main/crates/fonts/Cargo.toml` | *(none)* | *(none)* |
| `designcraft-format` | `{'workspace': True}` | `designcraft-main/crates/format/Cargo.toml` | *(none)* | *(none)* |
| `designcraft-geom` | `{'workspace': True}` | `designcraft-main/crates/geom/Cargo.toml` | *(none)* | *(none)* |
| `designcraft-idml` | `{'workspace': True}` | `designcraft-main/crates/idml/Cargo.toml` | *(none)* | *(none)* |
| `designcraft-images` | `{'workspace': True}` | `designcraft-main/crates/images/Cargo.toml` | *(none)* | flate2 (1), zune-core (v0.5), zune-jpeg (0.5) |
| `designcraft-mcp` | `{'workspace': True}` | `designcraft-main/crates/mcp/Cargo.toml` | *(none)* | *(none)* |
| `designcraft-pdf` | `{'workspace': True}` | `designcraft-main/crates/pdf/Cargo.toml` | *(none)* | hayro-syntax (0.7.2), hayro-interpret (v0.7.0), hayro-cmap (0.1), flate2 (1) |
| `designcraft-pptx` | `{'workspace': True}` | `designcraft-main/crates/pptx/Cargo.toml` | *(none)* | *(none)* |
| `designcraft-render` | `{'workspace': True}` | `designcraft-main/crates/render/Cargo.toml` | *(none)* | *(none)* |
| `designcraft-textimport` | `{'workspace': True}` | `designcraft-main/crates/textimport/Cargo.toml` | *(none)* | *(none)* |
| `designcraft-tools` | `{'workspace': True}` | `designcraft-main/crates/tools/Cargo.toml` | *(none)* | *(none)* |
| `designcraft-ui-egui` | `{'workspace': True}` | `designcraft-main/crates/ui-egui/Cargo.toml` | *(none)* | toml (1) |
| `xtask` | `{'workspace': True}` | `vectorcraft-main/xtask/Cargo.toml` | *(none)* | *(none)* |

### 3.12. `effectcraft-corpus-main.zip` (0 crates)

- **Key Architecture & Format Docs:** `effectcraft-corpus-main/README.md`, `effectcraft-corpus-main/aep/README.md`, `effectcraft-corpus-main/aep/inputs/README.md`, `effectcraft-corpus-main/aep/media/README.md`, `effectcraft-corpus-main/docs/README.md`, `effectcraft-corpus-main/docs/aep/README.md`, `effectcraft-corpus-main/tools/README.md`, `effectcraft-corpus-main/tools/aep/README.md`
- *Note: Asset/corpus archive containing zero Cargo.toml manifests.*

### 3.13. `effectcraft-main.zip` (40 crates)

- **Key Architecture & Format Docs:** `effectcraft-main/README.md`, `effectcraft-main/assets/app-icon/README.md`, `effectcraft-main/crates/aep/README.md`, `effectcraft-main/crates/aep/tests/fixtures/tools/README.md`, `effectcraft-main/crates/av1enc/README.md`, `effectcraft-main/crates/hevcenc/README.md`, `effectcraft-main/crates/opusenc/README.md`, `effectcraft-main/crates/pdf/README.md`
| Crate Name | Version | Path in Archive | Internal Dependencies | External Dependencies |
|---|---|---|---|---|
| `effectcraft-cli` | `{'workspace': True}` | `effectcraft-main/apps/effectcraft-cli/Cargo.toml` | *(none)* | cpu-time (1) |
| `effectcraft-web` | `{'workspace': True}` | `effectcraft-main/apps/effectcraft-web/Cargo.toml` | *(none)* | *(none)* |
| `effectcraft` | `{'workspace': True}` | `effectcraft-main/apps/effectcraft/Cargo.toml` | *(none)* | winit (v0.30), winresource (0.1) |
| `effectcraft-aep` | `{'workspace': True}` | `effectcraft-main/crates/aep/Cargo.toml` | *(none)* | *(none)* |
| `effectcraft-automation` | `{'workspace': True}` | `effectcraft-main/crates/automation/Cargo.toml` | *(none)* | *(none)* |
| `effectcraft-av1enc` | `{'workspace': True}` | `effectcraft-main/crates/av1enc/Cargo.toml` | *(none)* | *(none)* |
| `effectcraft-color` | `{'workspace': True}` | `effectcraft-main/crates/color/Cargo.toml` | *(none)* | *(none)* |
| `effectcraft-effects` | `{'workspace': True}` | `effectcraft-main/crates/effects/Cargo.toml` | *(none)* | *(none)* |
| `effectcraft-engine` | `{'workspace': True}` | `effectcraft-main/crates/engine/Cargo.toml` | *(none)* | *(none)* |
| `effectcraft-export` | `{'workspace': True}` | `effectcraft-main/crates/export/Cargo.toml` | *(none)* | *(none)* |
| `effectcraft-expr` | `{'workspace': True}` | `effectcraft-main/crates/expr/Cargo.toml` | *(none)* | *(none)* |
| `effectcraft-geom` | `{'workspace': True}` | `effectcraft-main/crates/geom/Cargo.toml` | *(none)* | *(none)* |
| `effectcraft-gpu` | `{'workspace': True}` | `effectcraft-main/crates/gpu/Cargo.toml` | *(none)* | *(none)* |
| `effectcraft-helper-host` | `{'workspace': True}` | `effectcraft-main/crates/helper-host/Cargo.toml` | *(none)* | *(none)* |
| `effectcraft-hevcenc` | `{'workspace': True}` | `effectcraft-main/crates/hevcenc/Cargo.toml` | *(none)* | *(none)* |
| `effectcraft-host` | `{'workspace': True}` | `effectcraft-main/crates/host/Cargo.toml` | *(none)* | *(none)* |
| `effectcraft-interchange` | `{'workspace': True}` | `effectcraft-main/crates/interchange/Cargo.toml` | *(none)* | *(none)* |
| `effectcraft-keyframe` | `{'workspace': True}` | `effectcraft-main/crates/keyframe/Cargo.toml` | *(none)* | *(none)* |
| `effectcraft-lottie` | `{'workspace': True}` | `effectcraft-main/crates/lottie/Cargo.toml` | *(none)* | *(none)* |
| `effectcraft-media` | `{'workspace': True}` | `effectcraft-main/crates/media/Cargo.toml` | *(none)* | *(none)* |
| `effectcraft-model` | `{'workspace': True}` | `effectcraft-main/crates/model/Cargo.toml` | *(none)* | miniz_oxide (0.9) |
| `effectcraft-opusenc` | `{'workspace': True}` | `effectcraft-main/crates/opusenc/Cargo.toml` | *(none)* | *(none)* |
| `effectcraft-path` | `{'workspace': True}` | `effectcraft-main/crates/path/Cargo.toml` | *(none)* | linesweeper (0.5) |
| `effectcraft-pdf` | `{'workspace': True}` | `effectcraft-main/crates/pdf/Cargo.toml` | *(none)* | miniz_oxide (0.9), zune-jpeg (0.5) |
| `effectcraft-plugin` | `{'workspace': True}` | `effectcraft-main/crates/plugin/Cargo.toml` | *(none)* | *(none)* |
| `effectcraft-project` | `{'workspace': True}` | `effectcraft-main/crates/project/Cargo.toml` | *(none)* | *(none)* |
| `effectcraft-psd` | `{'workspace': True}` | `effectcraft-main/crates/psd/Cargo.toml` | *(none)* | miniz_oxide (0.9) |
| `effectcraft-raster` | `{'workspace': True}` | `effectcraft-main/crates/raster/Cargo.toml` | *(none)* | *(none)* |
| `effectcraft-render` | `{'workspace': True}` | `effectcraft-main/crates/render/Cargo.toml` | *(none)* | lz4_flex (v0.14) |
| `effectcraft-sam2` | `{'workspace': True}` | `effectcraft-main/crates/sam2/Cargo.toml` | *(none)* | *(none)* |
| `effectcraft-script` | `{'workspace': True}` | `effectcraft-main/crates/script/Cargo.toml` | *(none)* | *(none)* |
| `effectcraft-segment` | `{'workspace': True}` | `effectcraft-main/crates/segment/Cargo.toml` | *(none)* | miniz_oxide (0.9), ndarray (v0.17) |
| `effectcraft-svg` | `{'workspace': True}` | `effectcraft-main/crates/svg/Cargo.toml` | *(none)* | roxmltree (0.21) |
| `effectcraft-text` | `{'workspace': True}` | `effectcraft-main/crates/text/Cargo.toml` | *(none)* | unicode-bidi (0.3.18), unicode-linebreak (0.1.5) |
| `effectcraft-time` | `{'workspace': True}` | `effectcraft-main/crates/time/Cargo.toml` | *(none)* | *(none)* |
| `effectcraft-track` | `{'workspace': True}` | `effectcraft-main/crates/track/Cargo.toml` | *(none)* | *(none)* |
| `effectcraft-ui-egui` | `{'workspace': True}` | `effectcraft-main/crates/ui-egui/Cargo.toml` | *(none)* | pollster (1), toml (1) |
| `effectcraft-vp9enc` | `{'workspace': True}` | `effectcraft-main/crates/vp9enc/Cargo.toml` | *(none)* | *(none)* |
| `posterize-bands` | `1.0.0` | `effectcraft-main/examples/plugins/posterize-bands/Cargo.toml` | *(none)* | *(none)* |
| `xtask` | `{'workspace': True}` | `vectorcraft-main/xtask/Cargo.toml` | *(none)* | *(none)* |

### 3.14. `egui-main.zip` (49 crates)

- **Key Architecture & Format Docs:** `egui-main/ARCHITECTURE.md`, `egui-main/README.md`, `egui-main/crates/ecolor/README.md`, `egui-main/crates/eframe/README.md`, `egui-main/crates/egui-wgpu/README.md`, `egui-main/crates/egui-winit/README.md`, `egui-main/crates/egui/README.md`, `egui-main/crates/egui/examples/README.md`
| Crate Name | Version | Path in Archive | Internal Dependencies | External Dependencies |
|---|---|---|---|---|
| `ecolor` | `{'workspace': True}` | `egui-main/crates/ecolor/Cargo.toml` | *(none)* | *(none)* |
| `eframe` | `{'workspace': True}` | `egui-main/crates/eframe/Cargo.toml` | *(none)* | *(none)* |
| `egui-wgpu` | `{'workspace': True}` | `egui-main/crates/egui-wgpu/Cargo.toml` | *(none)* | *(none)* |
| `egui-winit` | `{'workspace': True}` | `egui-main/crates/egui-winit/Cargo.toml` | *(none)* | *(none)* |
| `egui` | `{'workspace': True}` | `egui-main/crates/egui/Cargo.toml` | *(none)* | *(none)* |
| `egui_demo_app` | `{'workspace': True}` | `egui-main/crates/egui_demo_app/Cargo.toml` | *(none)* | *(none)* |
| `egui_demo_lib` | `{'workspace': True}` | `egui-main/crates/egui_demo_lib/Cargo.toml` | *(none)* | *(none)* |
| `egui_extras` | `{'workspace': True}` | `egui-main/crates/egui_extras/Cargo.toml` | egui_kittest (../egui_kittest) | *(none)* |
| `egui_glow` | `{'workspace': True}` | `egui-main/crates/egui_glow/Cargo.toml` | *(none)* | *(none)* |
| `egui_inspection` | `{'workspace': True}` | `egui-main/crates/egui_inspection/Cargo.toml` | *(none)* | *(none)* |
| `egui_kittest` | `{'workspace': True}` | `egui-main/crates/egui_kittest/Cargo.toml` | *(none)* | *(none)* |
| `egui_system_font_provider` | `{'workspace': True}` | `egui-main/crates/egui_system_font_provider/Cargo.toml` | *(none)* | *(none)* |
| `emath` | `{'workspace': True}` | `egui-main/crates/emath/Cargo.toml` | *(none)* | *(none)* |
| `epaint` | `{'workspace': True}` | `egui-main/crates/epaint/Cargo.toml` | *(none)* | *(none)* |
| `epaint_default_fonts` | `{'workspace': True}` | `egui-main/crates/epaint_default_fonts/Cargo.toml` | *(none)* | *(none)* |
| `confirm_exit` | `0.1.0` | `egui-main/examples/confirm_exit/Cargo.toml` | *(none)* | *(none)* |
| `custom_3d_glow` | `0.1.0` | `egui-main/examples/custom_3d_glow/Cargo.toml` | *(none)* | *(none)* |
| `custom_font` | `0.1.0` | `egui-main/examples/custom_font/Cargo.toml` | *(none)* | *(none)* |
| `custom_font_style` | `0.1.0` | `egui-main/examples/custom_font_style/Cargo.toml` | *(none)* | *(none)* |
| `custom_keypad` | `0.1.0` | `egui-main/examples/custom_keypad/Cargo.toml` | *(none)* | *(none)* |
| `custom_style` | `0.1.0` | `egui-main/examples/custom_style/Cargo.toml` | *(none)* | *(none)* |
| `custom_window_frame` | `0.1.0` | `egui-main/examples/custom_window_frame/Cargo.toml` | *(none)* | *(none)* |
| `external_eventloop` | `0.1.0` | `egui-main/examples/external_eventloop/Cargo.toml` | *(none)* | *(none)* |
| `external_eventloop_async` | `0.1.0` | `egui-main/examples/external_eventloop_async/Cargo.toml` | *(none)* | *(none)* |
| `file_dialog` | `0.1.0` | `egui-main/examples/file_dialog/Cargo.toml` | *(none)* | *(none)* |
| `font_variations` | `0.1.0` | `egui-main/examples/font_variations/Cargo.toml` | *(none)* | *(none)* |
| `hello_android` | `0.1.0` | `egui-main/examples/hello_android/Cargo.toml` | *(none)* | *(none)* |
| `hello_world` | `0.1.0` | `egui-main/examples/hello_world/Cargo.toml` | *(none)* | *(none)* |
| `hello_world_par` | `0.1.0` | `egui-main/examples/hello_world_par/Cargo.toml` | *(none)* | *(none)* |
| `hello_world_simple` | `0.1.0` | `egui-main/examples/hello_world_simple/Cargo.toml` | *(none)* | *(none)* |
| `images` | `0.1.0` | `egui-main/examples/images/Cargo.toml` | *(none)* | *(none)* |
| `keyboard_events` | `0.1.0` | `egui-main/examples/keyboard_events/Cargo.toml` | *(none)* | *(none)* |
| `multiple_viewports` | `0.1.0` | `egui-main/examples/multiple_viewports/Cargo.toml` | *(none)* | *(none)* |
| `popups` | `{'workspace': True}` | `egui-main/examples/popups/Cargo.toml` | *(none)* | *(none)* |
| `puffin_profiler` | `0.1.0` | `egui-main/examples/puffin_profiler/Cargo.toml` | *(none)* | *(none)* |
| `screenshot` | `0.1.0` | `egui-main/examples/screenshot/Cargo.toml` | *(none)* | *(none)* |
| `serial_windows` | `0.1.0` | `egui-main/examples/serial_windows/Cargo.toml` | *(none)* | *(none)* |
| `styling_engine` | `0.1.0` | `egui-main/examples/styling_engine/Cargo.toml` | *(none)* | *(none)* |
| `svg_glyph` | `0.1.0` | `egui-main/examples/svg_glyph/Cargo.toml` | *(none)* | *(none)* |
| `user_attention` | `0.1.0` | `egui-main/examples/user_attention/Cargo.toml` | *(none)* | *(none)* |
| `egui_tests` | `{'workspace': True}` | `egui-main/tests/egui_tests/Cargo.toml` | *(none)* | *(none)* |
| `test_background_logic` | `0.1.0` | `egui-main/tests/test_background_logic/Cargo.toml` | *(none)* | *(none)* |
| `test_egui_extras_compilation` | `0.1.0` | `egui-main/tests/test_egui_extras_compilation/Cargo.toml` | *(none)* | *(none)* |
| `test_inline_glow_paint` | `0.1.0` | `egui-main/tests/test_inline_glow_paint/Cargo.toml` | *(none)* | *(none)* |
| `test_inspection_hidden_window` | `0.1.0` | `egui-main/tests/test_inspection_hidden_window/Cargo.toml` | *(none)* | *(none)* |
| `test_size_pass` | `0.1.0` | `egui-main/tests/test_size_pass/Cargo.toml` | *(none)* | *(none)* |
| `test_ui_stack` | `0.1.0` | `egui-main/tests/test_ui_stack/Cargo.toml` | *(none)* | *(none)* |
| `test_viewports` | `0.1.0` | `egui-main/tests/test_viewports/Cargo.toml` | *(none)* | *(none)* |
| `xtask` | `{'workspace': True}` | `vectorcraft-main/xtask/Cargo.toml` | *(none)* | *(none)* |

### 3.15. `figcraft-main.zip` (27 crates)

- **Key Architecture & Format Docs:** `figcraft-main/README.md`, `figcraft-main/assets/app-icon/README.md`, `figcraft-main/docs/architecture.md`, `figcraft-main/docs/gaps.md`, `figcraft-main/packaging/web/README.md`
| Crate Name | Version | Path in Archive | Internal Dependencies | External Dependencies |
|---|---|---|---|---|
| `figcraft-cli` | `{'workspace': True}` | `figcraft-main/apps/figcraft-cli/Cargo.toml` | *(none)* | clap_complete (~4.5.67), clap_mangen (0.3) |
| `figcraft-server` | `{'workspace': True}` | `figcraft-main/apps/figcraft-server/Cargo.toml` | *(none)* | toml (1), env_logger (v0.11), ctrlc (v3), tungstenite (v0.30) |
| `figcraft-web` | `{'workspace': True}` | `figcraft-main/apps/figcraft-web/Cargo.toml` | *(none)* | craft-web-host (git:https://github.com/storytold/craft-libs) |
| `figcraft` | `{'workspace': True}` | `figcraft-main/apps/figcraft/Cargo.toml` | *(none)* | env_logger (v0.11), winresource (0.1) |
| `figcraft-collab-net` | `{'workspace': True}` | `figcraft-main/crates/collab-net/Cargo.toml` | *(none)* | web-time (1) |
| `figcraft-collab` | `{'workspace': True}` | `figcraft-main/crates/collab/Cargo.toml` | *(none)* | *(none)* |
| `figcraft-color` | `{'workspace': True}` | `figcraft-main/crates/color/Cargo.toml` | *(none)* | *(none)* |
| `figcraft-doc` | `{'workspace': True}` | `figcraft-main/crates/doc/Cargo.toml` | *(none)* | *(none)* |
| `figcraft-engine` | `{'workspace': True}` | `figcraft-main/crates/engine/Cargo.toml` | *(none)* | web-time (1.1.0) |
| `figcraft-format` | `{'workspace': True}` | `figcraft-main/crates/format/Cargo.toml` | *(none)* | *(none)* |
| `figcraft-geom` | `{'workspace': True}` | `figcraft-main/crates/geom/Cargo.toml` | *(none)* | *(none)* |
| `figcraft-layout` | `{'workspace': True}` | `figcraft-main/crates/layout/Cargo.toml` | *(none)* | *(none)* |
| `figcraft-mcp` | `{'workspace': True}` | `figcraft-main/crates/mcp/Cargo.toml` | *(none)* | *(none)* |
| `figcraft-pathops` | `{'workspace': True}` | `figcraft-main/crates/pathops/Cargo.toml` | *(none)* | *(none)* |
| `figcraft-pdf` | `{'workspace': True}` | `figcraft-main/crates/pdf/Cargo.toml` | *(none)* | flate2 (1) |
| `figcraft-plugin` | `{'workspace': True}` | `figcraft-main/crates/plugin/Cargo.toml` | *(none)* | *(none)* |
| `figcraft-render` | `{'workspace': True}` | `figcraft-main/crates/render/Cargo.toml` | *(none)* | *(none)* |
| `figcraft-svg` | `{'workspace': True}` | `figcraft-main/crates/svg/Cargo.toml` | *(none)* | *(none)* |
| `figcraft-text` | `{'workspace': True}` | `figcraft-main/crates/text/Cargo.toml` | *(none)* | *(none)* |
| `figcraft-ui-egui` | `{'workspace': True}` | `figcraft-main/crates/ui-egui/Cargo.toml` | *(none)* | web-time (1.1.0), toml (1) |
| `figcraft-vectordrawable` | `{'workspace': True}` | `figcraft-main/crates/vectordrawable/Cargo.toml` | *(none)* | roxmltree (0.21) |
| `counter` | `{'workspace': True}` | `figcraft-main/plugins/examples/counter/Cargo.toml` | *(none)* | *(none)* |
| `export-names` | `{'workspace': True}` | `figcraft-main/plugins/examples/export-names/Cargo.toml` | *(none)* | *(none)* |
| `swatch-grid` | `{'workspace': True}` | `figcraft-main/plugins/examples/swatch-grid/Cargo.toml` | *(none)* | *(none)* |
| `tidy-names` | `{'workspace': True}` | `figcraft-main/plugins/examples/tidy-names/Cargo.toml` | *(none)* | *(none)* |
| `figcraft-plugin-sdk` | `{'workspace': True}` | `figcraft-main/plugins/sdk/Cargo.toml` | *(none)* | *(none)* |
| `xtask` | `{'workspace': True}` | `vectorcraft-main/xtask/Cargo.toml` | *(none)* | *(none)* |

### 3.16. `filmcraft-main.zip` (54 crates)

- **Key Architecture & Format Docs:** `filmcraft-main/README.md`, `filmcraft-main/apps/filmcraft-web/README.md`, `filmcraft-main/assets/README.md`, `filmcraft-main/assets/app-icon/README.md`, `filmcraft-main/crates/aac/README.md`, `filmcraft-main/crates/ac3/README.md`, `filmcraft-main/crates/apv/README.md`, `filmcraft-main/crates/audio-dsp/README.md`
| Crate Name | Version | Path in Archive | Internal Dependencies | External Dependencies |
|---|---|---|---|---|
| `filmcraft-cli` | `{'workspace': True}` | `filmcraft-main/apps/filmcraft-cli/Cargo.toml` | *(none)* | tokio (v1) |
| `filmcraft-web` | `{'workspace': True}` | `filmcraft-main/apps/filmcraft-web/Cargo.toml` | *(none)* | *(none)* |
| `filmcraft` | `{'workspace': True}` | `filmcraft-main/apps/filmcraft/Cargo.toml` | *(none)* | subtle (2.6), cpal (0.16), arboard (3), sys-locale (0.3) |
| `filmcraft-aac` | `{'workspace': True}` | `filmcraft-main/crates/aac/Cargo.toml` | *(none)* | *(none)* |
| `filmcraft-ac3` | `{'workspace': True}` | `filmcraft-main/crates/ac3/Cargo.toml` | *(none)* | *(none)* |
| `filmcraft-apv` | `{'workspace': True}` | `filmcraft-main/crates/apv/Cargo.toml` | *(none)* | *(none)* |
| `filmcraft-audio-dsp` | `{'workspace': True}` | `filmcraft-main/crates/audio-dsp/Cargo.toml` | *(none)* | *(none)* |
| `filmcraft-automation` | `{'workspace': True}` | `filmcraft-main/crates/automation/Cargo.toml` | *(none)* | rmcp (v3.5), tokio (v1), base64 (0.23), schemars (1) |
| `filmcraft-av1` | `{'workspace': True}` | `filmcraft-main/crates/av1/Cargo.toml` | *(none)* | *(none)* |
| `filmcraft-avi` | `{'workspace': True}` | `filmcraft-main/crates/avi/Cargo.toml` | *(none)* | *(none)* |
| `filmcraft-bitstream` | `{'workspace': True}` | `filmcraft-main/crates/bitstream/Cargo.toml` | *(none)* | *(none)* |
| `filmcraft-captions` | `{'workspace': True}` | `filmcraft-main/crates/captions/Cargo.toml` | *(none)* | *(none)* |
| `filmcraft-cfb` | `{'workspace': True}` | `filmcraft-main/crates/cfb/Cargo.toml` | *(none)* | *(none)* |
| `filmcraft-codecs` | `{'workspace': True}` | `filmcraft-main/crates/codecs/Cargo.toml` | *(none)* | web-time (1), image (v0.25), symphonia (v0.5.5) |
| `filmcraft-color` | `{'workspace': True}` | `filmcraft-main/crates/color/Cargo.toml` | *(none)* | *(none)* |
| `filmcraft-dng` | `{'workspace': True}` | `filmcraft-main/crates/dng/Cargo.toml` | filmcraft-dng (.) | *(none)* |
| `filmcraft-dnx` | `{'workspace': True}` | `filmcraft-main/crates/dnx/Cargo.toml` | *(none)* | *(none)* |
| `filmcraft-edit` | `{'workspace': True}` | `filmcraft-main/crates/edit/Cargo.toml` | *(none)* | *(none)* |
| `filmcraft-engine` | `{'workspace': True}` | `filmcraft-main/crates/engine/Cargo.toml` | *(none)* | web-time (1), image (v0.25) |
| `filmcraft-export` | `{'workspace': True}` | `filmcraft-main/crates/export/Cargo.toml` | *(none)* | web-time (1), image (v0.25) |
| `filmcraft-flac` | `{'workspace': True}` | `filmcraft-main/crates/flac/Cargo.toml` | *(none)* | *(none)* |
| `filmcraft-format` | `{'workspace': True}` | `filmcraft-main/crates/format/Cargo.toml` | *(none)* | *(none)* |
| `filmcraft-frame` | `{'workspace': True}` | `filmcraft-main/crates/frame/Cargo.toml` | *(none)* | *(none)* |
| `filmcraft-geom` | `{'workspace': True}` | `filmcraft-main/crates/geom/Cargo.toml` | *(none)* | *(none)* |
| `filmcraft-golden` | `{'workspace': True}` | `filmcraft-main/crates/golden/Cargo.toml` | *(none)* | pollster (1), wgpu (v30) |
| `filmcraft-gpu` | `{'workspace': True}` | `filmcraft-main/crates/gpu/Cargo.toml` | *(none)* | wgpu (v30), pollster (1), pollster (1), image (v0.25) |
| `filmcraft-h264` | `{'workspace': True}` | `filmcraft-main/crates/h264/Cargo.toml` | *(none)* | *(none)* |
| `filmcraft-h264enc` | `{'workspace': True}` | `filmcraft-main/crates/h264enc/Cargo.toml` | *(none)* | *(none)* |
| `filmcraft-hevc` | `{'workspace': True}` | `filmcraft-main/crates/hevc/Cargo.toml` | *(none)* | *(none)* |
| `filmcraft-interchange` | `{'workspace': True}` | `filmcraft-main/crates/interchange/Cargo.toml` | *(none)* | *(none)* |
| `filmcraft-isobmff` | `{'workspace': True}` | `filmcraft-main/crates/isobmff/Cargo.toml` | *(none)* | *(none)* |
| `filmcraft-matroska` | `{'workspace': True}` | `filmcraft-main/crates/matroska/Cargo.toml` | *(none)* | *(none)* |
| `filmcraft-media` | `{'workspace': True}` | `filmcraft-main/crates/media/Cargo.toml` | *(none)* | image (v0.25), png (0.18) |
| `filmcraft-mpa` | `{'workspace': True}` | `filmcraft-main/crates/mpa/Cargo.toml` | *(none)* | *(none)* |
| `filmcraft-mpeg2v` | `{'workspace': True}` | `filmcraft-main/crates/mpeg2v/Cargo.toml` | *(none)* | *(none)* |
| `filmcraft-mpegts` | `{'workspace': True}` | `filmcraft-main/crates/mpegts/Cargo.toml` | *(none)* | *(none)* |
| `filmcraft-mxf` | `{'workspace': True}` | `filmcraft-main/crates/mxf/Cargo.toml` | *(none)* | *(none)* |
| `filmcraft-ogg` | `{'workspace': True}` | `filmcraft-main/crates/ogg/Cargo.toml` | *(none)* | *(none)* |
| `filmcraft-opus` | `{'workspace': True}` | `filmcraft-main/crates/opus/Cargo.toml` | *(none)* | *(none)* |
| `filmcraft-platform` | `{'workspace': True}` | `filmcraft-main/crates/platform/Cargo.toml` | *(none)* | *(none)* |
| `filmcraft-project` | `{'workspace': True}` | `filmcraft-main/crates/project/Cargo.toml` | *(none)* | *(none)* |
| `filmcraft-prores` | `{'workspace': True}` | `filmcraft-main/crates/prores/Cargo.toml` | *(none)* | *(none)* |
| `filmcraft-render` | `{'workspace': True}` | `filmcraft-main/crates/render/Cargo.toml` | *(none)* | image (v0.25) |
| `filmcraft-scopes` | `{'workspace': True}` | `filmcraft-main/crates/scopes/Cargo.toml` | *(none)* | *(none)* |
| `filmcraft-speech` | `{'workspace': True}` | `filmcraft-main/crates/speech/Cargo.toml` | *(none)* | candle-core (v0.9), candle-nn (v0.9), ureq (v3), rustls (v0.23) |
| `filmcraft-testkit` | `{'workspace': True}` | `filmcraft-main/crates/testkit/Cargo.toml` | *(none)* | png (0.18), tempfile (3.27) |
| `filmcraft-text` | `{'workspace': True}` | `filmcraft-main/crates/text/Cargo.toml` | *(none)* | skrifa (v0.44), harfrust (v0.12), unicode-bidi (0.3.18), unicode-linebreak (0.1.5) |
| `filmcraft-time` | `{'workspace': True}` | `filmcraft-main/crates/time/Cargo.toml` | *(none)* | *(none)* |
| `filmcraft-tts-text` | `{'workspace': True}` | `filmcraft-main/crates/tts-text/Cargo.toml` | *(none)* | *(none)* |
| `filmcraft-tts` | `{'workspace': True}` | `filmcraft-main/crates/tts/Cargo.toml` | *(none)* | candle-core (v0.9), candle-nn (v0.9), zip (v7), sha2 (v0.10) |
| `filmcraft-ui-egui` | `{'workspace': True}` | `filmcraft-main/crates/ui-egui/Cargo.toml` | *(none)* | web-time (1), unicode-bidi (0.3.18), image (v0.25), pollster (1) |
| `filmcraft-vp8` | `{'workspace': True}` | `filmcraft-main/crates/vp8/Cargo.toml` | *(none)* | *(none)* |
| `filmcraft-vp9` | `{'workspace': True}` | `filmcraft-main/crates/vp9/Cargo.toml` | *(none)* | *(none)* |
| `xtask` | `{'workspace': True}` | `vectorcraft-main/xtask/Cargo.toml` | *(none)* | *(none)* |

### 3.17. `lightcraft-main.zip` (35 crates)

- **Key Architecture & Format Docs:** `lightcraft-main/README.md`, `lightcraft-main/assets/app-icon/README.md`, `lightcraft-main/clean-room/crw/README.md`, `lightcraft-main/crates/codecs/README.md`, `lightcraft-main/crates/denoise-core/README.md`, `lightcraft-main/crates/denoise/README.md`, `lightcraft-main/crates/fetch/README.md`, `lightcraft-main/crates/geocode/README.md`
| Crate Name | Version | Path in Archive | Internal Dependencies | External Dependencies |
|---|---|---|---|---|
| `lightcraft-cli` | `{'workspace': True}` | `lightcraft-main/apps/lightcraft-cli/Cargo.toml` | *(none)* | *(none)* |
| `lightcraft-web` | `{'workspace': True}` | `lightcraft-main/apps/lightcraft-web/Cargo.toml` | *(none)* | *(none)* |
| `lightcraft` | `{'workspace': True}` | `lightcraft-main/apps/lightcraft/Cargo.toml` | *(none)* | winresource (0.1) |
| `lightcraft-catalog` | `{'workspace': True}` | `lightcraft-main/crates/catalog/Cargo.toml` | *(none)* | *(none)* |
| `lightcraft-codecs` | `{'workspace': True}` | `lightcraft-main/crates/codecs/Cargo.toml` | *(none)* | *(none)* |
| `lightcraft-color` | `{'workspace': True}` | `lightcraft-main/crates/color/Cargo.toml` | *(none)* | *(none)* |
| `lightcraft-denoise-core` | `{'workspace': True}` | `lightcraft-main/crates/denoise-core/Cargo.toml` | *(none)* | *(none)* |
| `lightcraft-denoise` | `{'workspace': True}` | `lightcraft-main/crates/denoise/Cargo.toml` | *(none)* | faer (v=0.17.1) |
| `lightcraft-develop` | `{'workspace': True}` | `lightcraft-main/crates/develop/Cargo.toml` | *(none)* | *(none)* |
| `lightcraft-engine` | `{'workspace': True}` | `lightcraft-main/crates/engine/Cargo.toml` | *(none)* | harfrust (v0.13), unicode-normalization (0.1), unicode-segmentation (1.13) |
| `lightcraft-faces` | `{'workspace': True}` | `lightcraft-main/crates/faces/Cargo.toml` | *(none)* | ndarray (v=0.17.2), matrixmultiply (v=0.3.11) |
| `lightcraft-fetch` | `{'workspace': True}` | `lightcraft-main/crates/fetch/Cargo.toml` | *(none)* | *(none)* |
| `lightcraft-film` | `{'workspace': True}` | `lightcraft-main/crates/film/Cargo.toml` | *(none)* | *(none)* |
| `lightcraft-geocode` | `{'workspace': True}` | `lightcraft-main/crates/geocode/Cargo.toml` | *(none)* | *(none)* |
| `lightcraft-geom` | `{'workspace': True}` | `lightcraft-main/crates/geom/Cargo.toml` | *(none)* | *(none)* |
| `lightcraft-gpu` | `{'workspace': True}` | `lightcraft-main/crates/gpu/Cargo.toml` | *(none)* | *(none)* |
| `lightcraft-heif` | `{'workspace': True}` | `lightcraft-main/crates/heif/Cargo.toml` | *(none)* | heic-rs (v=0.1.4) |
| `lightcraft-inpaint` | `{'workspace': True}` | `lightcraft-main/crates/inpaint/Cargo.toml` | *(none)* | *(none)* |
| `lightcraft-lensdb` | `{'workspace': True}` | `lightcraft-main/crates/lensdb/Cargo.toml` | *(none)* | *(none)* |
| `lightcraft-mcp` | `{'workspace': True}` | `lightcraft-main/crates/mcp/Cargo.toml` | *(none)* | *(none)* |
| `lightcraft-merge` | `{'workspace': True}` | `lightcraft-main/crates/merge/Cargo.toml` | *(none)* | *(none)* |
| `lightcraft-meta` | `{'workspace': True}` | `lightcraft-main/crates/meta/Cargo.toml` | *(none)* | *(none)* |
| `lightcraft-pipeline` | `{'workspace': True}` | `lightcraft-main/crates/pipeline/Cargo.toml` | *(none)* | *(none)* |
| `lightcraft-preview` | `{'workspace': True}` | `lightcraft-main/crates/preview/Cargo.toml` | *(none)* | *(none)* |
| `lightcraft-raster` | `{'workspace': True}` | `lightcraft-main/crates/raster/Cargo.toml` | *(none)* | *(none)* |
| `lightcraft-raw` | `{'workspace': True}` | `lightcraft-main/crates/raw/Cargo.toml` | *(none)* | sha2 (v0.10) |
| `lightcraft-scenes` | `{'workspace': True}` | `lightcraft-main/crates/scenes/Cargo.toml` | *(none)* | *(none)* |
| `lightcraft-segment` | `{'workspace': True}` | `lightcraft-main/crates/segment/Cargo.toml` | *(none)* | *(none)* |
| `lightcraft-slideshow` | `{'workspace': True}` | `lightcraft-main/crates/slideshow/Cargo.toml` | *(none)* | *(none)* |
| `lightcraft-sysmem` | `{'workspace': True}` | `lightcraft-main/crates/sysmem/Cargo.toml` | *(none)* | *(none)* |
| `lightcraft-testkit` | `{'workspace': True}` | `lightcraft-main/crates/testkit/Cargo.toml` | *(none)* | *(none)* |
| `lightcraft-tiff` | `{'workspace': True}` | `lightcraft-main/crates/tiff/Cargo.toml` | *(none)* | *(none)* |
| `lightcraft-ui-egui` | `{'workspace': True}` | `lightcraft-main/crates/ui-egui/Cargo.toml` | *(none)* | toml (1) |
| `lightcraft-wincolor` | `{'workspace': True}` | `lightcraft-main/crates/wincolor/Cargo.toml` | *(none)* | *(none)* |
| `xtask` | `{'workspace': True}` | `vectorcraft-main/xtask/Cargo.toml` | *(none)* | *(none)* |

### 3.18. `materialcraft-main.zip` (15 crates)

- **Key Architecture & Format Docs:** `materialcraft-main/README.md`, `materialcraft-main/assets/app-icon/README.md`, `materialcraft-main/docs/architecture.md`, `materialcraft-main/docs/gaps.md`, `materialcraft-main/packaging/web/README.md`, `materialcraft-main/vendor/egui-phosphor/README.md`
| Crate Name | Version | Path in Archive | Internal Dependencies | External Dependencies |
|---|---|---|---|---|
| `materialcraft-cli` | `{'workspace': True}` | `materialcraft-main/apps/materialcraft-cli/Cargo.toml` | *(none)* | winresource (0.1) |
| `materialcraft-web` | `{'workspace': True}` | `materialcraft-main/apps/materialcraft-web/Cargo.toml` | *(none)* | *(none)* |
| `materialcraft` | `{'workspace': True}` | `materialcraft-main/apps/materialcraft/Cargo.toml` | *(none)* | winresource (0.1) |
| `materialcraft-automation` | `{'workspace': True}` | `materialcraft-main/crates/automation/Cargo.toml` | *(none)* | *(none)* |
| `materialcraft-core` | `{'workspace': True}` | `materialcraft-main/crates/core/Cargo.toml` | *(none)* | *(none)* |
| `materialcraft-engine` | `{'workspace': True}` | `materialcraft-main/crates/engine/Cargo.toml` | *(none)* | *(none)* |
| `materialcraft-eval` | `{'workspace': True}` | `materialcraft-main/crates/eval/Cargo.toml` | *(none)* | *(none)* |
| `materialcraft-formats` | `{'workspace': True}` | `materialcraft-main/crates/formats/Cargo.toml` | *(none)* | *(none)* |
| `materialcraft-geom` | `{'workspace': True}` | `materialcraft-main/crates/geom/Cargo.toml` | *(none)* | *(none)* |
| `materialcraft-image` | `{'workspace': True}` | `materialcraft-main/crates/image/Cargo.toml` | *(none)* | *(none)* |
| `materialcraft-nodes` | `{'workspace': True}` | `materialcraft-main/crates/nodes/Cargo.toml` | *(none)* | *(none)* |
| `materialcraft-render` | `{'workspace': True}` | `materialcraft-main/crates/render/Cargo.toml` | *(none)* | *(none)* |
| `materialcraft-ui-egui` | `{'workspace': True}` | `materialcraft-main/crates/ui-egui/Cargo.toml` | *(none)* | egui-phosphor (v0.14), base64 (0.22) |
| `egui-phosphor` | `0.14.0` | `materialcraft-main/vendor/egui-phosphor/Cargo.toml` | *(none)* | egui (v0.37) |
| `xtask` | `{'workspace': True}` | `vectorcraft-main/xtask/Cargo.toml` | *(none)* | *(none)* |

### 3.19. `photocraft-corpus-main.zip` (0 crates)

- **Key Architecture & Format Docs:** `photocraft-corpus-main/README.md`
- *Note: Asset/corpus archive containing zero Cargo.toml manifests.*

### 3.20. `photocraft-main.zip` (37 crates)

- **Key Architecture & Format Docs:** `photocraft-main/README.md`, `photocraft-main/apps/photocraft/tests/fixtures/README.md`, `photocraft-main/assets/app-icon/README.md`, `photocraft-main/book/src/README.md`, `photocraft-main/crates/affinity/README.md`, `photocraft-main/crates/cms/README.md`, `photocraft-main/crates/codecs/README.md`, `photocraft-main/crates/heif/README.md`
| Crate Name | Version | Path in Archive | Internal Dependencies | External Dependencies |
|---|---|---|---|---|
| `photocraft-cli` | `{'workspace': True}` | `photocraft-main/apps/photocraft-cli/Cargo.toml` | photocraft-automation (../../crates/automation), photocraft-format (../../crates/format), xtask (../../xtask) | tokio (v1), tempfile (3), winresource (0.1) |
| `photocraft-web-boot` | `{'workspace': True}` | `photocraft-main/apps/photocraft-web-boot/Cargo.toml` | *(none)* | *(none)* |
| `photocraft-web` | `{'workspace': True}` | `photocraft-main/apps/photocraft-web/Cargo.toml` | *(none)* | *(none)* |
| `photocraft` | `{'workspace': True}` | `photocraft-main/apps/photocraft/Cargo.toml` | *(none)* | blake3 (v1.8), base64 (=0.22.1), winresource (0.1) |
| `photocraft-affinity` | `{'workspace': True}` | `photocraft-main/crates/affinity/Cargo.toml` | *(none)* | crc32fast (1.5), ruzstd (0.9.1) |
| `photocraft-affinity-fuzz` | `0.0.0` | `photocraft-main/crates/affinity/fuzz/Cargo.toml` | photocraft-affinity (..), photocraft-io (../../io) | libfuzzer-sys (0.4) |
| `photocraft-algo` | `{'workspace': True}` | `photocraft-main/crates/algo/Cargo.toml` | *(none)* | rustfft (6.4.1) |
| `photocraft-automation` | `{'workspace': True}` | `photocraft-main/crates/automation/Cargo.toml` | photocraft-format (../format) | rmcp (v3.5), tokio (v1), base64 (0.23), schemars (1) |
| `photocraft-cms` | `{'workspace': True}` | `photocraft-main/crates/cms/Cargo.toml` | *(none)* | moxcms (0.8) |
| `photocraft-codecs` | `{'workspace': True}` | `photocraft-main/crates/codecs/Cargo.toml` | photocraft-heif (../heif) | png (0.18), tiff (v0.11), exr (v1.73), half (2) |
| `photocraft-codecs-fuzz` | `0.0.0` | `photocraft-main/crates/codecs/fuzz/Cargo.toml` | photocraft-codecs (..) | libfuzzer-sys (0.4), heic-rs (=0.1.4) |
| `photocraft-color` | `{'workspace': True}` | `photocraft-main/crates/color/Cargo.toml` | *(none)* | *(none)* |
| `photocraft-compose` | `{'workspace': True}` | `photocraft-main/crates/compose/Cargo.toml` | *(none)* | *(none)* |
| `photocraft-doc` | `{'workspace': True}` | `photocraft-main/crates/doc/Cargo.toml` | *(none)* | *(none)* |
| `photocraft-engine` | `{'workspace': True}` | `photocraft-main/crates/engine/Cargo.toml` | *(none)* | base64 (0.22), blake3 (v1.8), roxmltree (0.21), semver (1) |
| `photocraft-format` | `{'workspace': True}` | `photocraft-main/crates/format/Cargo.toml` | *(none)* | crc32fast (1.5), blake3 (v1.8), ruzstd (0.9.1) |
| `photocraft-format-fuzz` | `0.0.0` | `photocraft-main/crates/format/fuzz/Cargo.toml` | photocraft-format (..) | libfuzzer-sys (0.4) |
| `photocraft-geom` | `{'workspace': True}` | `photocraft-main/crates/geom/Cargo.toml` | *(none)* | *(none)* |
| `photocraft-gpu` | `{'workspace': True}` | `photocraft-main/crates/gpu/Cargo.toml` | *(none)* | half (2), wgpu (v30), wgpu (v30), pollster (1) |
| `photocraft-heif` | `{'workspace': True}` | `photocraft-main/crates/heif/Cargo.toml` | *(none)* | heic-rs (v=0.1.4) |
| `photocraft-io` | `{'workspace': True}` | `photocraft-main/crates/io/Cargo.toml` | photocraft-format (../format) | ttf-parser (0.25.1), blake3 (v1.8), roxmltree (0.21), imagesize (0.13) |
| `photocraft-ipp` | `{'workspace': True}` | `photocraft-main/crates/ipp/Cargo.toml` | *(none)* | *(none)* |
| `photocraft-ops` | `{'workspace': True}` | `photocraft-main/crates/ops/Cargo.toml` | *(none)* | *(none)* |
| `photocraft-paint` | `{'workspace': True}` | `photocraft-main/crates/paint/Cargo.toml` | *(none)* | *(none)* |
| `photocraft-plugins` | `{'workspace': True}` | `photocraft-main/crates/plugins/Cargo.toml` | *(none)* | wasmi (v2.0.0), wat (1.228) |
| `photocraft-psd` | `{'workspace': True}` | `photocraft-main/crates/psd/Cargo.toml` | photocraft-psd (.) | *(none)* |
| `photocraft-psd-fuzz` | `0.0.0` | `photocraft-main/crates/psd/fuzz/Cargo.toml` | photocraft-psd (..) | libfuzzer-sys (0.4) |
| `photocraft-raster` | `{'workspace': True}` | `photocraft-main/crates/raster/Cargo.toml` | *(none)* | crc32fast (1), lz4_flex (v0.11) |
| `photocraft-raw` | `{'workspace': True}` | `photocraft-main/crates/raw/Cargo.toml` | photocraft-raw (.) | png (0.18), zune-jpegxl (v=0.5.2), zune-core (0.5) |
| `photocraft-raw-fuzz` | `0.0.0` | `photocraft-main/crates/raw/fuzz/Cargo.toml` | photocraft-raw (..) | libfuzzer-sys (0.4) |
| `photocraft-tablet` | `{'workspace': True}` | `photocraft-main/crates/tablet/Cargo.toml` | *(none)* | *(none)* |
| `photocraft-testkit` | `{'workspace': True}` | `photocraft-main/crates/testkit/Cargo.toml` | *(none)* | *(none)* |
| `photocraft-text` | `{'workspace': True}` | `photocraft-main/crates/text/Cargo.toml` | *(none)* | parley (v0.11), skrifa (0.44) |
| `photocraft-ui-egui` | `{'workspace': True}` | `photocraft-main/crates/ui-egui/Cargo.toml` | *(none)* | egui_extras (v0.37), unicode-bidi (0.3), base64 (0.23), tempfile (3) |
| `photocraft-vector` | `{'workspace': True}` | `photocraft-main/crates/vector/Cargo.toml` | *(none)* | *(none)* |
| `photocraft-plugin-invert` | `1.0.0` | `photocraft-main/examples/plugins/invert-rs/Cargo.toml` | *(none)* | *(none)* |
| `xtask` | `{'workspace': True}` | `vectorcraft-main/xtask/Cargo.toml` | *(none)* | *(none)* |

### 3.21. `soundcraft-main.zip` (20 crates)

- **Key Architecture & Format Docs:** `soundcraft-main/README.md`, `soundcraft-main/assets/app-icon/README.md`, `soundcraft-main/crates/audio-io/tests/fixtures/README.md`, `soundcraft-main/docs/architecture.md`, `soundcraft-main/docs/gaps.md`, `soundcraft-main/packaging/macos/dmg/README.md`, `soundcraft-main/packaging/web/README.md`
| Crate Name | Version | Path in Archive | Internal Dependencies | External Dependencies |
|---|---|---|---|---|
| `soundcraft-cli` | `{'workspace': True}` | `soundcraft-main/apps/soundcraft-cli/Cargo.toml` | *(none)* | *(none)* |
| `soundcraft-web` | `{'workspace': True}` | `soundcraft-main/apps/soundcraft-web/Cargo.toml` | *(none)* | *(none)* |
| `soundcraft` | `{'workspace': True}` | `soundcraft-main/apps/soundcraft/Cargo.toml` | *(none)* | winresource (0.1) |
| `soundcraft-au-host` | `{'workspace': True}` | `soundcraft-main/crates/au-host/Cargo.toml` | *(none)* | *(none)* |
| `soundcraft-audio-io` | `{'workspace': True}` | `soundcraft-main/crates/audio-io/Cargo.toml` | *(none)* | *(none)* |
| `soundcraft-automation` | `{'workspace': True}` | `soundcraft-main/crates/automation/Cargo.toml` | *(none)* | *(none)* |
| `soundcraft-clap-host` | `{'workspace': True}` | `soundcraft-main/crates/clap-host/Cargo.toml` | *(none)* | *(none)* |
| `clap-fixture` | `0.0.0` | `soundcraft-main/crates/clap-host/tests/fixture/Cargo.toml` | *(none)* | clap-sys (0.5) |
| `soundcraft-dsp` | `{'workspace': True}` | `soundcraft-main/crates/dsp/Cargo.toml` | *(none)* | *(none)* |
| `soundcraft-engine` | `{'workspace': True}` | `soundcraft-main/crates/engine/Cargo.toml` | *(none)* | *(none)* |
| `soundcraft-midi` | `{'workspace': True}` | `soundcraft-main/crates/midi/Cargo.toml` | *(none)* | *(none)* |
| `soundcraft-mix` | `{'workspace': True}` | `soundcraft-main/crates/mix/Cargo.toml` | *(none)* | *(none)* |
| `soundcraft-model` | `{'workspace': True}` | `soundcraft-main/crates/model/Cargo.toml` | *(none)* | *(none)* |
| `soundcraft-playback` | `{'workspace': True}` | `soundcraft-main/crates/playback/Cargo.toml` | *(none)* | *(none)* |
| `soundcraft-time` | `{'workspace': True}` | `soundcraft-main/crates/time/Cargo.toml` | *(none)* | *(none)* |
| `soundcraft-ui-egui` | `{'workspace': True}` | `soundcraft-main/crates/ui-egui/Cargo.toml` | *(none)* | toml (1) |
| `soundcraft-video` | `{'workspace': True}` | `soundcraft-main/crates/video/Cargo.toml` | *(none)* | *(none)* |
| `soundcraft-vst3-host` | `{'workspace': True}` | `soundcraft-main/crates/vst3-host/Cargo.toml` | *(none)* | *(none)* |
| `vst3-fixture` | `0.0.0` | `soundcraft-main/crates/vst3-host/tests/fixture/Cargo.toml` | *(none)* | vst3 (0.3) |
| `xtask` | `{'workspace': True}` | `vectorcraft-main/xtask/Cargo.toml` | *(none)* | *(none)* |

### 3.22. `vectorcraft-main.zip` (30 crates)

- **Key Architecture & Format Docs:** `vectorcraft-main/README.md`, `vectorcraft-main/assets/app-icon/README.md`, `vectorcraft-main/crates/affinity/README.md`, `vectorcraft-main/crates/pathops/README.md`, `vectorcraft-main/docs/architecture.md`, `vectorcraft-main/docs/gaps.md`, `vectorcraft-main/packaging/macos/dmg/README.md`, `vectorcraft-main/packaging/web/README.md`
| Crate Name | Version | Path in Archive | Internal Dependencies | External Dependencies |
|---|---|---|---|---|
| `vectorcraft-cli` | `{'workspace': True}` | `vectorcraft-main/apps/vectorcraft-cli/Cargo.toml` | *(none)* | tempfile (3) |
| `vectorcraft-web` | `{'workspace': True}` | `vectorcraft-main/apps/vectorcraft-web/Cargo.toml` | *(none)* | *(none)* |
| `vectorcraft` | `{'workspace': True}` | `vectorcraft-main/apps/vectorcraft/Cargo.toml` | *(none)* | tempfile (3), zbus (=5.19.0), winresource (0.1) |
| `vectorcraft-affinity` | `{'workspace': True}` | `vectorcraft-main/crates/affinity/Cargo.toml` | *(none)* | ruzstd (0.9.1) |
| `vectorcraft-affinity-fuzz` | `0.0.0` | `vectorcraft-main/crates/affinity/fuzz/Cargo.toml` | vectorcraft-affinity (..) | libfuzzer-sys (0.4) |
| `vectorcraft-brush` | `{'workspace': True}` | `vectorcraft-main/crates/brush/Cargo.toml` | *(none)* | *(none)* |
| `vectorcraft-cad` | `{'workspace': True}` | `vectorcraft-main/crates/cad/Cargo.toml` | *(none)* | *(none)* |
| `vectorcraft-color` | `{'workspace': True}` | `vectorcraft-main/crates/color/Cargo.toml` | *(none)* | moxcms (0.8) |
| `vectorcraft-doc` | `{'workspace': True}` | `vectorcraft-main/crates/doc/Cargo.toml` | *(none)* | *(none)* |
| `vectorcraft-effects` | `{'workspace': True}` | `vectorcraft-main/crates/effects/Cargo.toml` | *(none)* | *(none)* |
| `vectorcraft-engine` | `{'workspace': True}` | `vectorcraft-main/crates/engine/Cargo.toml` | *(none)* | hayro-jpeg2000 (v=0.3.5), roxmltree (0.21), cfb (0.15) |
| `vectorcraft-eps` | `{'workspace': True}` | `vectorcraft-main/crates/eps/Cargo.toml` | *(none)* | fax (0.2) |
| `vectorcraft-format` | `{'workspace': True}` | `vectorcraft-main/crates/format/Cargo.toml` | *(none)* | *(none)* |
| `vectorcraft-geom` | `{'workspace': True}` | `vectorcraft-main/crates/geom/Cargo.toml` | *(none)* | *(none)* |
| `vectorcraft-mcp` | `{'workspace': True}` | `vectorcraft-main/crates/mcp/Cargo.toml` | *(none)* | *(none)* |
| `vectorcraft-metafile` | `{'workspace': True}` | `vectorcraft-main/crates/metafile/Cargo.toml` | *(none)* | *(none)* |
| `vectorcraft-pathops` | `{'workspace': True}` | `vectorcraft-main/crates/pathops/Cargo.toml` | *(none)* | *(none)* |
| `vectorcraft-pdf` | `{'workspace': True}` | `vectorcraft-main/crates/pdf/Cargo.toml` | *(none)* | smallvec (1), weezl (0.2), roxmltree (0.21), aes (0.8) |
| `vectorcraft-plugins` | `{'workspace': True}` | `vectorcraft-main/crates/plugins/Cargo.toml` | *(none)* | *(none)* |
| `vectorcraft-plugin-desaturate` | `1.0.0` | `vectorcraft-main/crates/plugins/example/Cargo.toml` | *(none)* | serde_json (1) |
| `vectorcraft-render` | `{'workspace': True}` | `vectorcraft-main/crates/render/Cargo.toml` | *(none)* | vello_common (v0.2), weezl (0.2), png (0.18), unicode-general-category (1) |
| `vectorcraft-scriptcheck` | `{'workspace': True}` | `vectorcraft-main/crates/scriptcheck/Cargo.toml` | *(none)* | *(none)* |
| `vectorcraft-svg` | `{'workspace': True}` | `vectorcraft-main/crates/svg/Cargo.toml` | *(none)* | svgtypes (0.16), simplecss (0.2.2), resvg (v0.45) |
| `vectorcraft-testkit` | `{'workspace': True}` | `vectorcraft-main/crates/testkit/Cargo.toml` | *(none)* | fax (0.2) |
| `vectorcraft-text` | `{'workspace': True}` | `vectorcraft-main/crates/text/Cargo.toml` | *(none)* | subsetter (v0.2), unicode-bidi (0.3.18), unicode-general-category (1), unicode-script (0.5) |
| `vectorcraft-three-d` | `{'workspace': True}` | `vectorcraft-main/crates/three-d/Cargo.toml` | *(none)* | *(none)* |
| `vectorcraft-tools` | `{'workspace': True}` | `vectorcraft-main/crates/tools/Cargo.toml` | *(none)* | *(none)* |
| `vectorcraft-trace` | `{'workspace': True}` | `vectorcraft-main/crates/trace/Cargo.toml` | *(none)* | *(none)* |
| `vectorcraft-ui-egui` | `{'workspace': True}` | `vectorcraft-main/crates/ui-egui/Cargo.toml` | *(none)* | bytemuck (v1), toml (1) |
| `xtask` | `{'workspace': True}` | `vectorcraft-main/xtask/Cargo.toml` | *(none)* | *(none)* |

### 3.23. `winit-master.zip` (12 crates)

- **Key Architecture & Format Docs:** `winit-master/README.md`, `winit-master/dpi/README.md`, `winit-master/winit-android/README.md`, `winit-master/winit-appkit/README.md`, `winit-master/winit-common/README.md`, `winit-master/winit-core/README.md`, `winit-master/winit-orbital/README.md`, `winit-master/winit-uikit/README.md`
| Crate Name | Version | Path in Archive | Internal Dependencies | External Dependencies |
|---|---|---|---|---|
| `dpi` | `0.1.2` | `winit-master/dpi/Cargo.toml` | *(none)* | *(none)* |
| `winit-android` | `{'workspace': True}` | `winit-master/winit-android/Cargo.toml` | *(none)* | *(none)* |
| `winit-appkit` | `{'workspace': True}` | `winit-master/winit-appkit/Cargo.toml` | *(none)* | *(none)* |
| `winit-common` | `{'workspace': True}` | `winit-master/winit-common/Cargo.toml` | *(none)* | *(none)* |
| `winit-core` | `{'workspace': True}` | `winit-master/winit-core/Cargo.toml` | *(none)* | *(none)* |
| `winit-orbital` | `{'workspace': True}` | `winit-master/winit-orbital/Cargo.toml` | *(none)* | *(none)* |
| `winit-uikit` | `{'workspace': True}` | `winit-master/winit-uikit/Cargo.toml` | *(none)* | *(none)* |
| `winit-wayland` | `{'workspace': True}` | `winit-master/winit-wayland/Cargo.toml` | *(none)* | sctk (v0.21.0), sctk-adwaita (v0.12.0), wayland-backend (v0.3.10), wayland-client (0.31.10) |
| `winit-web` | `{'workspace': True}` | `winit-master/winit-web/Cargo.toml` | *(none)* | *(none)* |
| `winit-win32` | `{'workspace': True}` | `winit-master/winit-win32/Cargo.toml` | *(none)* | *(none)* |
| `winit-x11` | `{'workspace': True}` | `winit-master/winit-x11/Cargo.toml` | *(none)* | *(none)* |
| `winit` | `{'workspace': True}` | `winit-master/winit/Cargo.toml` | *(none)* | *(none)* |

---

## 4. Key Engine Boundaries & Entrypoints (Six Target Candidates)

1. **SoundCraft (`soundcraft-main.zip`):**
   - Session Dispatch & Undo: `crates/engine/src/lib.rs:347,359,424`
   - Audio Mixer Oracle: `crates/mix/src/lib.rs:365` (`render(s, pos:Samples, frames, out)`)
   - Time Representation: `crates/time/src/lib.rs` (Sample index + PPQ constant 960)
   - Persistence: `.scraft` compressed JSON project container

2. **FigCraft (`figcraft-main.zip`):**
   - Session Dispatch: `crates/engine/src/session/exec.rs:58,71`
   - Layout Engine: `crates/layout/src/lib.rs:144` (`layout_page`)
   - Render Engine: `crates/render/src/lib.rs:125` (`render_view`)
   - Persistence: `.figcraft` ZIP container with `document.json` and sha256 image blobs

3. **EffectCraft (`effectcraft-main.zip`):**
   - Session Dispatch: `crates/engine/src/session/dispatch.rs:9,35`
   - Undo/Redo Engine: `crates/engine/src/session/edit.rs:169,187`
   - Composition / FX Graph: `crates/engine` CPU reference & GPU pipelines
   - Persistence: `.ecproj` and AEP parser container in `crates/format` & `crates/aep`

4. **FilmCraft (`filmcraft-main.zip`):**
   - Command Dispatch: `crates/engine/src/lib.rs:773,1112,1122`
   - Project Schema & Migration: `crates/format/src/lib.rs:57,70,162,169,177,204,222,285,296` (Schema 17)
   - Atomic Save: `.fcproj` JSON format with tempfile write, fsync, and atomic rename

5. **VectorCraft (`vectorcraft-main.zip`):**
   - Command Execution: `crates/engine/src/session/execute.rs:36` & `crates/engine/src/cmd.rs:245`
   - UI Wrapper: `crates/ui-egui/src/app/commands.rs:188`
   - Format Persistence: `crates/format/src/lib.rs:273,449` (`.vectorcraft` versioned JSON)

6. **PhotoCraft (`photocraft-main.zip`):**
   - Session Command Engine: `crates/engine/src/session/execute.rs:17`
   - Undo/Redo Ops: `crates/ops/src/lib.rs:314,343`
   - Persistence Coordinator: `crates/ui-egui/src/app/files.rs:523,542,545,641` (`.pcraft`)

---
*Generated automatically during Iteration A1. Audit source code static review remains strictly pending.*