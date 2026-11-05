# Vestano — Import & Export

## Mobile and tablet support

The import/export page uses a viewport-sized grid on phones, with readable stage text, larger navigation and journey controls, safe-area padding, a single-column enquiry form and a separate layout for short landscape screens. Phones use large Back/Next buttons and a native stage selector in place of six cramped stage tabs. The same controls work in the motion-free version. Services stack on narrow phones. The motion-free version grows with its content. `src/mobile.css` follows `brand.css` in the stylesheet order.

The warehouse places the viewer above its details on screens up to 900px wide, leaving a peek of the content below. Touch devices initially allow native vertical scrolling across the canvas. Select **Explore 3D** to enable orbit/pinch gestures, then **Scroll page** to resume scrolling; entering Walk inside or expanded view enables interaction immediately. Pausing touch control clears held movement and releases look capture. A viewpoint selector stays beside the viewer controls, with larger movement buttons and touch-specific instructions. Hold the arrows with one thumb and drag the scene with the other to walk and look around. Overview supports one-finger orbit, pinch zoom and two-finger pan. Expanded view also works when the browser cannot fullscreen an element. The overview camera fits the original floor/roof bounds to the current aspect ratio; user-adjusted views and walking positions survive orientation changes. Phone and touch-device rendering use capped pixel density and smaller shadow maps.

The source drawing, fixture positions, five counters, rice pallets, supermarket stock and blue floor are unchanged. Automated verification covers the camera frustum at phone, tablet and landscape proportions as well as the original CAD and stock locks. This update has not received a new browser or physical-phone visual pass because earlier browser access was declined.

## GitHub Pages

The production build is published from the root of the `gh-pages` branch. Repository settings must enable Pages with that branch as its source. The website uses relative asset paths so it can load beneath `/3d/` and on a local preview. After source changes, rebuild with `pnpm build` and update the published branch with the contents of `dist/`, including the original drawing and an empty `.nojekyll` file. Source changes alone do not replace the published build.

## Warehouse · Paravoor DWG walkthrough

### Delivery area

Both 3D warehouses now show the two eastern delivery bays beside the drawing's `DELIVERD AREA` / `DELIVERED AREA` notes. Source jamb caps locate the openings at **z = 39.665–44.665 m** and **44.865–49.865 m**, with their inner/frame edges at x = 30.976 / 31.176 m. The former continuous perimeter wall is split above these openings. Jambs, thresholds, numbered overhead signs, inset lane paint and outbound arrows make the delivery strip visible. In Warehouse 2 the second painted bay follows the actual diagonal receiving partition. Door clear height (3.4 m), headers and sign heights remain illustrative because the DWG supplies a 2D plan.

Choose **Delivery area · 2 bays** in the sidebar or **Go to** selector. Overview and Top view frame both bays, including after phone rotation; Walk inside places you in the clear delivery lane facing the openings. Source jambs block movement while the openings remain clear. The source DWGs, layout JSON/SVG files, every rack/pallet/work-table coordinate and the five first-warehouse counters are unchanged.

`node --experimental-strip-types scripts/audit-warehouse-delivery.mjs public/warehouse-2` projects the actual floor triangles and eye-height wall bounds onto the source plan in `deliverables/delivery-warehouse-2.png` (ignored). Pass `public/warehouse` for the first plan. Tests compare door endpoints/jambs with recovered source edges, check actual wall geometry and floor-label containment, and project both focused cameras at phone/desktop proportions. This is offline geometry verification; a new browser visual pass has not been performed.

### Warehouse 2 · revised DWG

**Warehouse 2** in both navigation bars opens `#warehouse-2`. It uses the newly supplied 5,675,520-byte drawing, SHA-256 `6d6ad0b844d5d77bfa8364879d79b54575c13314d1b1eb480e588e6c4307547b`. The original `#warehouse` route and its source assets remain separate. Switching warehouse routes remounts the viewer so the old geometry, movement state and pending fetch are disposed.

The revised file includes multiple plan copies. The selected titled developmental ground-floor sheet uses the region recorded in `cad-source/warehouse-2/region.json`, with source centimetres converted to metres. The new model contains **171 rack bays, 58 rice pallets, eight work tables and 30 rice-bin compartments**, plus source-derived receiving/dispatch partitions, room walls and zone positions. The model retains the revised lower storage and receiving arrangement. Billing blocks elsewhere in the CAD file are outside this selected plan and are not added to it. Equipment heights, roof, finishes and representative stock remain illustrative interpretations of a 2D drawing.

The second drawing, its floor-plan extract and derived layout live in `public/warehouse-2/`. `src/warehouse/profiles.ts` maps the two routes to their own asset directory and cache revision. Shared 3D, orthographic Top view, Floor plan, touch controls and Walk inside work with the selected drawing's layout and collision geometry.

To regenerate the second model without overwriting the first:

```sh
node scripts/read-warehouse-dwg.mjs public/warehouse-2/paravoor.dwg cad-source/warehouse-2 public/warehouse-2
node scripts/inspect-warehouse-plan.mjs cad-source/warehouse-2 public/warehouse-2 cad-source/warehouse-2/region.json
node scripts/build-warehouse-2-data.mjs
node --experimental-strip-types scripts/audit-warehouse-racks.mjs public/warehouse-2 cad-source/warehouse-2
```

The geometry audit projects all **342 rack-top triangles** onto this drawing; the ignored diagnostic is `cad-source/warehouse-2/rack-plan-alignment.png`. Automated checks cover route/asset isolation, source-file hashes, every rack edge, pallet/table polyline bounds, rice stock, walking collision at the new partitions and finite generated geometry. Browser and physical-device visual verification have not been repeated under the earlier declined browser access.

Open **`http://127.0.0.1:5173/#warehouse`**, or choose **Warehouse** in the navbar. This is a separate lazy-loaded page; the import/export journey remains available through its navigation.

The supplied `paravoor.dwg` was parsed locally using LibreDWG WebAssembly. Its header and drawing note specify **centimetres**. The floor model uses recovered source coordinates, converted to metres, rather than a generic rectangular rack layout:

- **192 rack-bay footprints**: 164 aisle bays and 28 perimeter bays; **66 pallet positions**, **5 category display footprints**.
- Labelled receiving, billing and delivery areas; rice bins; toilets, exits and stairs.
- The angled northern wall, aisle spacing and ground-floor circulation.
- Detailed shelf posts, beams, metal decks, stocked cartons, pallet boards/feet, rice-bin banks, a billing/POS counter, service partitions, industrial columns, lights and a removable roof.

### Supermarket merchandise · original layout retained

Both warehouses now show an illustrative Kerala supermarket assortment. Racks are grouped into eight sections: spices/masala, breakfast flours, pulses/pantry, tea/coffee, snacks, oils/pickles, daily provisions and household care. The assortment includes puttu, appam and idiyappam powders, coconut oil, pappadam, banana chips, jaggery, pickle jars, coconut-milk tins and other groceries. Household goods stay in their own section. Coloured overhead section signs and the **See stocked racks** / **View rice pallets** shortcuts make the goods easier to find.

Every existing pallet remains rice-only. Matta, Jaya, Ponni and Kaima varieties are grouped by pallet, with alternating sack orientations, tighter vertical stacking, woven sack surfaces and printed top/side labels. All source rack/pallet coordinates, work tables, walls, counters and the blue floor retain their audited positions. Diagonal shelves fit cartons along their centreline when an axis-aligned packing grid cannot fit them.

Forty product families plus four rice variants now use **photographic packaging images** instead of drawn text cards and food icons. Three local JPEG sheets (about 1.6 MB total) provide original Vestano concept artwork with Kerala dishes, ingredient photographs, printed pouch surfaces and woven rice-sack printing. Larger printed faces cover the packet fronts; complete bottle/jar labels repeat around the circumference so the product picture stays together from different aisles. The final images and the built-in imagegen prompts are documented in [docs/kerala-packaging.md](docs/kerala-packaging.md).

The images load into one 1024×4096 texture, with render invalidation on each completed download and a disposal guard when switching warehouses. Product bodies share meshes by package shape, with per-instance colours and label tiles. The assortment retains 29 stock mesh batches; measured scene mesh counts, including the delivery correction, are 163 for Warehouse and 158 for Warehouse 2. Unit checks cover image files/dimensions/download budget, tile coverage, out-of-order image loading, redraw/disposal, regional assortment, rotated rice geometry within pallet bounds and shader integration. These are CPU and source-level checks, not a GPU performance measurement.

Run `node --experimental-strip-types scripts/audit-kerala-packaging.mjs` for an offline preview of the actual photographic atlas image placements. It writes an ignored PNG/SVG in `deliverables/`, embeds the local JPEGs and needs no system fonts. Packaging is original illustrative Vestano artwork; it does not represent actual inventory, SKUs or pricing.

The original DWG is retained unchanged. The layout and floor-plan extract include **all five billing counters**: four distinct placed `billing` blocks (after deduplicating overlaid INSERTs) and one exploded model-space counter. `scripts/extract-billing-counters.mjs` resolves the block transforms and fits the fifth counter to its source edge. Those five source footprints drive the 3D worktops, terminals, mirrored cashier chairs, numbered labels and walking collision bounds. The billing viewpoint covers the complete row.

The rack extraction now uses adjacent CAD crossbars and actual side segments, preserving small drafting gaps and eliminating the former skipped/overlapping bays. `scripts/extract-rack-footprints.mjs` recovers 164 aisle bays and 28 sloping perimeter bays. Each bay retains its source entity handles, and the perimeter shelves use their actual quadrilateral outlines. The two previously guessed shelf runs are removed; D RACK hatch lines are shown in their source positions as floor markings. Category labels follow the drawing's left-to-right order. Pallet, category-display, perimeter and billing-counter coordinates, the original DWG and the source plan SVG are unchanged. Only the corrected rack baseline and derived layout hash were updated in the coordinate locks.

Tests verify every rack edge against the deduplicated source edges in `tests/fixtures/warehouse-rack-source.json`, all five lower bays in every aisle, absence of overlapping racks, and merchandise containment in sloping shelves. Run `node --experimental-strip-types scripts/audit-warehouse-racks.mjs` to project all 384 top-deck triangles from the generated 3D geometry onto the original CAD extract. Its diagnostic image is saved to the ignored `cad-source/rack-plan-alignment.png`. This checks generated geometry without a browser or WebGL.

All **66 existing pallets carry stacked rice sacks**. The four rack tiers and perimeter shelves contain supermarket packets: chilli, turmeric, coriander, cumin and pepper powders; wheat flour, rice flour, gram flour and semolina; pulses, sugar, salt, tea, coffee, biscuits, noodles and other groceries. Cooking oils, water and household/paper goods occupy their related rack sections. Category displays also show the powder and packet assortment. Rice-bin contents retain their procedural grain finish. Package shapes include rounded sacks, sealed packets, ridged bottles, caps, detergent handles and paper-roll cores. Generated Vestano packaging is illustrative artwork rather than photographs of actual inventory; no real product catalogue, SKU or package-weight claims are supplied.

The warehouse floor has a **blue epoxy finish**, subtle grain/joints, white receiving/delivery/rice-pallet legends and the existing yellow circulation markings. Its geometry and all five billing-counter positions are unchanged. Automated checks enforce rice-only pallet stock, the requested powder packets on racks, package clearances and the blue floor material.

`src/warehouse/stockPlan.ts` generates merchandise within each existing storage envelope with edge clearance and non-overlapping rows/layers. `stockModels.ts` uses reusable product geometry and instanced meshes to keep thousands of visible packages from creating thousands of draw calls. Rack base plates and display tops fit inside their original footprints. The walkthrough disposes instance buffers on unmount. Tests cover all five billing counters, unchanged storage coordinates, source-file locks, package containment, coverage of all storage supports/tiers, non-overlap, model bounds and finite instance transforms. A new browser visual/performance pass remains outstanding under the earlier declined browser access.

Choose **Overview** to orbit/zoom/pan, **Top view** for a true orthographic view aligned with the drawing, **Walk inside** for an eye-height view, or **Floor plan** for a vector extract of the DWG. Top view retains drawing orientation and scale at every shelf height; drag to pan and pinch/scroll to zoom. In walk mode use **WASD/arrows**, drag to look, or select **Mouse look** for pointer lock; **Esc** releases it. Shift increases walking speed. Touch movement buttons are provided. The minimap follows your position. Zone shortcuts resolve to free standing positions; movement uses the corrected rack polygons plus pallet/facility collision checks. Roof, camera reset and fullscreen controls are available. The original DWG can be downloaded from the header.

**Model limits:** the source is a 2D development plan. Equipment heights, ceiling, finishes, stock appearance and small fixture details are illustrative. Some perimeter closures are inferred; this is a spatial study, not a dimension-certified construction model. The SVG is an extract of line/polyline geometry and floor labels; embedded sheets and every CAD object type are not recreated. The original DWG is retained unchanged for reference. The 3D page has not received a new browser visual pass because earlier browser access was declined.

The renderer reuses Three.js; there are no new browser runtime dependencies. `@mlightcad/libredwg-web` (GPL-3.0) and `@resvg/resvg-wasm` (MPL-2.0) are development tools for local extraction/inspection and are **not imported into the site bundle**. Their upstream licences remain with those tools. Only the user's drawing and derived layout are served. To regenerate, install development dependencies and run these commands in order:

```sh
node scripts/read-warehouse-dwg.mjs public/warehouse/paravoor.dwg
node scripts/inspect-warehouse-plan.mjs
node scripts/build-warehouse-data.mjs
```

Large intermediate JSON and diagnostic PNG files are ignored. The production assets are `public/warehouse/layout.json`, `floor-plan.svg`, and `paravoor.dwg`. The warehouse code lives in `src/warehouse/`; its route is selected by `src/main.tsx`. Tests cover source units/footprints, free zone locations, collision/tunnelling, geometry batching and finite vertices, floor texturing, and roof/wall mode state. These tests do not emulate WebGL or claim browser visual verification.

A standalone, merge-ready React / TypeScript page with a real Three.js logistics journey. The import story now follows rack equipment from **China to Kochi, Kerala**, as specified by the user. It uses the supplied original logo (`public/vestano-logo.png`) and its blue-and-gold identity. No existing website files were replaced.

The Chinese side has representative high-roof container tractors, factory cladding, industrial buildings and packed rack components. Kerala has a distinct locally styled orange commercial trailer lorry, palms, tiled-roof commercial buildings, assembled rack bays and warehouse delivery. Vehicles and districts are illustrative, without asserting a particular vehicle make, factory address or Chinese departure port. Export mode retains its separate Kerala-to-international story.

The main warehouses now also have separate regional structures. China uses a steel-clad manufacturing hall with glazed sawtooth roof monitors, side windows, silos and a gatehouse; the surrounding district has factory sheds, fencing and multi-storey office blocks. Kerala uses a cream warehouse with a detailed terracotta pitched roof, rainwater pipes, shaded frontage and a tiled office annex; the surrounding district has lower shopfronts, verandah columns, rooftop tanks and dense palms. The old repeated generic skyline is removed. Geometry batching for both architecture variants was checked independently in Node, in addition to the build and timeline checks.

The updated camera uses shape-preserving cubic interpolation with continuous velocity across waypoints. Frame-rate-independent damping softens wheel/trackpad input while retaining reversible scroll control. The container uses the supplied logo as a locally hosted decal.

Ship loading and unloading have separate choreography and camera treatments. Loading uses the quay gantry's straight trolley traverse, with an elevated view of pickup and a sea-side view of placement. Unloading uses a different rotating harbour crane: a fixed-length lattice boom luffs and slews while the spreader swivels to keep the container aligned. The load lifts clear of the vessel, follows a curved arc and lowers onto the stationary trailer. The instruction/process cards have been removed at the user's request. Only the route map appears in that upper-right position for 2.5 seconds on entry to the port-loading, ocean or arrival stage, then disappears. Re-entering a stage or changing direction restarts its brief display; timers are cancelled on stage exit or unmount. This is illustrative choreography, not a claim about equipment at a specific real terminal. Seven tests include actual crane geometry alignment (boom tip, cable and hook), curved unload clearance and stationary-lorry handoffs. Updated browser visual verification remains outstanding under the earlier declined browser access.

## Run

Requires Node.js 22.12+ and pnpm.

```sh
pnpm install
pnpm dev
```

Open the Local URL printed by Vite, normally `http://127.0.0.1:5173/`.

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm preview
```

`dist/` contains the static production build. Serve it over HTTP rather than opening its HTML directly from disk. No backend, secrets, account or external asset server is required.

Build tools use `esbuild-wasm` and `@rollup/wasm-node` through pnpm overrides because Windows application control blocked newly downloaded native binaries in this environment. This changes only the build tooling; the browser uses normal WebGL. Dependency versions are recorded in `pnpm-lock.yaml`.

## Merge into the existing website

1. Copy `src/components/`, `src/journey/`, `src/scene/`, `src/App.tsx`, `src/styles.css`, `src/brand.css`, `src/mobile.css`, `public/vestano-logo.png`, and `public/fonts/` into the target project. Preserve the original website's header, footer and routing.
2. Add the runtime dependencies: `react`, `react-dom`, `three`, and `gsap`. For a TypeScript project, include `@types/three` if it is not already present. Reuse existing compatible installations.
3. Import `src/styles.css`, then `src/brand.css` and `src/mobile.css` with the page. All feature selectors are scoped under `.vestano-trade-page`; `src/standalone.css` contains the preview's document reset and should **not** be copied into the existing site's global styles.
4. Mount the component in the real Import & Export route and supply the real contact paths:

```tsx
import VestanoImportExport from './App';
import './styles.css';
import './brand.css';
import './mobile.css';

<VestanoImportExport
  withShell={false}
  quoteHref="/your-existing-quote-route"
  contactHref="/your-existing-contact-route"
/>
```

Those paths are examples: replace them with verified routes from the target website. Add its Import & Export navigation link there. With `withShell={false}`, the preview header and footer are omitted.

For Next.js App Router, load the page inside a client-only wrapper using `next/dynamic` with `ssr: false` because the standalone entry reads browser motion preferences. Keep it inside a client component. Confirm the target framework's stylesheet rules before importing the CSS. Retain the supplied Vestano logo and adapt typography to the host website when integrating.

By default both CTA buttons open an accessible local enquiry dialog. It validates fields and downloads a UTF-8 shipment brief. It **does not submit an enquiry or send email**. Providing `quoteHref` / `contactHref` replaces those buttons with real links. There is no invented contact address or dead `/contact` link.

## Animation and files

| File | Purpose |
| --- | --- |
| `src/App.tsx` | Page, direction controls, native sticky viewport, ScrollTrigger, services, accessible fallback and optional preview shell |
| `src/journey/timeline.ts` | Pure deterministic transforms for every scroll position, handoff, wheel distance and camera keyframe |
| `src/journey/content.ts` | Separate import/export narrative, source, departure, arrival and destination labels |
| `src/components/LogisticsScene.tsx` | Lazy WebGL setup, resizing, render-on-change, loading/error handling and disposal |
| `src/scene/assets.ts` | Corrugated ISO containers, articulated trucks, gantries, commercial vessel, warehouses and palms |
| `src/scene/world.ts` | Connected origin yard, two terminals, ocean, last-mile road, water shader, wake, light and scene updates |
| `src/components/RouteOverlay.tsx` | Illustrative route with import/export direction and scroll-driven progress |
| `src/components/Enquiry.tsx` | Native modal, validation, local brief download and real-route integration props |
| `tests/timeline.test.ts` | Carrier attachment, stationary loading, transform continuity, backward determinism and loading-bay manoeuvre |

The 740svh desktop / 640svh mobile track uses a native sticky viewport rather than a JavaScript scroll lock. ScrollTrigger measures absolute progress. All major motion, sea displacement, cloud drift and wake are functions of that progress; nothing plays through a fixed-duration video or timer. Stage buttons provide keyboard navigation. Reversing scroll reverses the same transforms without changing parents or spawning replacement containers.

The blue Vestano container is a single mesh group: yard pickup → origin trailer → quay crane → supported upper vessel tier → destination crane → second trailer → customer bay. Vehicles remain stationary through loading. The final tractor turns, then reverses its trailer towards the warehouse.

Import begins at a representative Chinese manufacturing yard and ends in Kerala. Export begins in Kerala and ends at a representative international customer. Labels, vehicles, road lanes, foliage and route direction change together. Port artwork and sailing paths are illustrative; no particular Chinese city or port, exact shipping lane, terminal reconstruction or Vestano-owned factory is claimed.

## Assets and performance

- All 3D models, corrugation, industrial details, signs, lighting and water are procedural local code. There are no downloaded model licensing requirements or broken remote model URLs.
- These are carefully built procedural models, **not photogrammetry or photoreal production CAD assets**. More detailed models can replace the asset constructors while retaining the same dimensions, pivot points and timeline. Keep the shipment's upper vessel slot clear if replacing the ship.
- DM Sans and Manrope variable fonts are hosted in `public/fonts/`; their SIL Open Font License files are included. Georgia is a system font fallback for the italic display text. No runtime Google Fonts request is made.
- The Three.js scene loads in its own chunk. Static industrial geometry is merged by material. Pixel ratio is capped at 1.7 desktop / 1.25 mobile. Mobile has a wider camera and fewer yard stacks.
- Rendering pauses while the document is hidden and when progress, viewport and direction are unchanged. Geometry, materials, textures, shadow resources, observers, listeners, render loops and ScrollTrigger instances are disposed on unmount.
- `prefers-reduced-motion` skips the WebGL chunk and presents all six steps. “View without motion” selects the same static experience; unsupported WebGL also falls back. No horizontal page scrolling is needed.

## Verification

TypeScript, ESLint, deterministic timeline tests and production build were run. Browser checks cover desktop/mobile rendering, crane transfer during real scrolling, backward seeking, import/export switching, stage navigation, loading-bay arrival, menu anchors, six-step motion-free view, canvas disposal and the enquiry download. A 390×844 mobile viewport was checked for horizontal overflow. Earlier browser console checks returned no errors. The browser permission gate declined further interaction during the last visual pass, so the final surface textures / roof details and latest crane composition were subsequently checked in code and the build, without another visual pass.

The China-to-Kerala brand and regional-scene update passed TypeScript, ESLint, five deterministic tests (including continuous camera velocity), production build and HTTP checks for the page and logo. A new browser visual pass was not performed because earlier browser access was declined.

Device-specific GPU performance and photoreal asset quality should be assessed on the target site's supported devices before release. The host website's routes, service availability and contact submission remain integration inputs, as agreed when building this page separately.
