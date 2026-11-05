# Kerala supermarket packaging images

Generated with the built-in imagegen tool on 2026-11-05. These are original illustrative Vestano package designs with realistic food imagery, not catalogue photographs of stocked brands. The supplied company logo and CAD files were not altered.

Final project assets:

- [Spices and breakfast packets](../public/warehouse-stock/kerala-spices-breakfast-v1.jpg): 1024 × 1024, 16 faces.
- [Pantry goods and snacks](../public/warehouse-stock/kerala-pantry-snacks-v1.jpg): 1024 × 1024, 16 faces.
- [Rice sacks and remaining labels](../public/warehouse-stock/kerala-rice-household-v1.jpg): 1024 × 768, 12 faces.

The generated PNG originals were resized and JPEG-encoded at quality 94 for delivery (1,598,874 bytes total). The 3D viewer combines the images into one 1024 × 4096 CanvasTexture. Row-major tile keys live in `src/warehouse/stockPackaging.ts`. Every original rack/pallet footprint and merchandise placement is preserved. Larger packet faces and repeated cylindrical labels make the pictures easier to see in the walkthrough. The offline atlas audit is `node --experimental-strip-types scripts/audit-kerala-packaging.mjs`; its output is not a WebGL screenshot.

## Final generation prompts

### Sheet 1

```text
Use case: product-mockup
Asset type: a production-ready 4-column by 4-row TEXTURE ATLAS for supermarket packet fronts in a 3D Kerala warehouse website, square 2048 x 2048 pixels.
Primary request: replace generic drawn labels with believable, original Kerala supermarket product packaging. Create sixteen different rectangular packet-front designs with professional printed packaging, rich photographic food imagery, realistic fine print, tiny green vegetarian symbol, subtle flexible-pouch creases and highlights. These are flat printable package faces, not photographs of floating bags.
Composition: EXACT uniform 4 x 4 grid, every tile exactly one quarter of image width and height, no gutters, no white margins, no labels or captions outside tiles. Each design fills its entire square tile edge-to-edge. Front orthographic view only, no perspective, no background scene, no visible shelf, no space between designs. All text and ingredient photos stay safely inside each tile. Use differing local retail design styles, coloured panels and original typography with subtle material texture; the food images are realistic photographs.
Small brand text "VESTANO" near top of each tile. Main product text MUST follow this exact left-to-right, top-to-bottom order:
Row 1: "CHILLI POWDER" (deep red pouch, red chillies and red spice); "TURMERIC POWDER" (golden yellow pouch, turmeric roots and powder); "CORIANDER POWDER" (green pouch, coriander seeds and spice); "CUMIN POWDER" (warm brown pouch, cumin seeds).
Row 2: "BLACK PEPPER" (forest green and black, peppercorns); "SAMBAR POWDER" (warm orange, appetising Kerala sambar bowl); "GARAM MASALA" (maroon and cream, whole aromatic spices); "GRAM FLOUR" (yellow and cream, golden gram flour).
Row 3: "PUTTU POWDER" (green and white, real steamed cylindrical puttu with grated coconut and black chickpea curry); "APPAM POWDER" (blue and white, lacy appam with coconut stew); "IDIYAPPAM POWDER" (yellow and white, white string hopper nests on banana leaf); "RICE FLOUR" (cream and green, white flour and rice).
Row 4: "WHEAT ATTA" (red and cream, wheat stalks and chapatis); "RAVA" (cream and orange, fine semolina and cooked upma); "BANANA CHIPS" (bright yellow and green, real golden Kerala banana chips); "PAPPADAM" (white and dark green, round fried pappadams).
Constraints: all 16 tiles equally sized and exactly aligned to the 4 x 4 grid. Kerala retail authenticity through specific foods and packaging, real photographic ingredient pictures, no vector food doodles. Original Vestano concept packaging, no existing brand logos. No prices, no net weights, no watermark.
```

### Sheet 2

```text
Use case: product-mockup
Asset type: production-ready 4-column by 4-row TEXTURE ATLAS for product fronts in a realistic Kerala supermarket warehouse. Square 2048 x 2048 pixels.
Create sixteen original retail package FRONT PRINT designs with photographic food imagery and convincing Indian supermarket printed packaging. Small brand "VESTANO", large clear product name, polished retail colour blocking, tiny green vegetarian symbol on food goods, restrained fine print and subtle pouch/label surface texture.
Composition: EXACT 4 x 4 uniform grid, edge-to-edge square tiles, zero gutters, zero margin. These are flat unwrapped label/packet-front artwork, orthographic view, no floating products, no perspective, no scene, no white space around products. Each complete design occupies its entire tile. Photograph-style ingredients or prepared food dominate the bottom half of each tile. Distinct convincing designs rather than generic text cards.
Exact row-major order and main text:
Row 1: "PULSES" (cream/red, mixed dals in a clear photographic window); "CHICKPEAS" (burgundy/cream, dry chickpeas); "GREEN GRAM" (green/cream, green mung beans); "TOOR DAL" (yellow/red, yellow split dal).
Row 2: "SUGAR" (blue/white, crystalline sugar and a spoon); "IODISED SALT" (blue/white, salt crystals and a salt bowl); "JAGGERY" (brown/yellow, real golden jaggery balls); "TEA" (dark green/red, tea plantation leaf motif and hot tea).
Row 3: "COFFEE" (deep brown/gold, coffee beans and a Kerala steel coffee tumbler); "BISCUITS" (red/gold, crisp tea biscuits); "TOAST RUSK" (orange/cream, golden rusks and tea); "SNACK MIXTURE" (red/yellow, authentic Kerala savoury mixture with curry leaves).
Row 4: "NOODLES" (yellow/red, a bowl of cooked noodles); "COCONUT OIL" (white/green, real coconut halves and palms on a bottle-label design); "COOKING OIL" (gold/green, sunflower oil and seeds on a bottle-label design); "MANGO PICKLE" (red/cream, oily Kerala mango pickle pieces and mangoes on a jar-label design).
Constraints: identical tile dimensions, perfect grid alignment; readable correct main names; realistic food images, no vector doodles. No existing brand logos, prices, weights or watermark. Original Vestano retail concepts.
```

### Sheet 3

```text
Use case: product-mockup
Asset type: production-ready 4-column by 3-row TEXTURE ATLAS for rice sack printing and grocery labels in a Kerala supermarket 3D warehouse. Landscape 2048 x 1536 pixels. Each square tile is 512 x 512.
Create twelve original realistic printed package FRONT designs. EXACT uniform 4 columns x 3 rows, no gutters, no outer margins, each design fills its entire square tile edge to edge, perfectly aligned. Flat orthographic label artwork, no perspective, no floating product mockups or scene.
Row 1 must look like printed rice sacks: woven polypropylene fabric texture across each entire tile, realistic ink slightly absorbed into weave, subtle fabric folds. Small "VESTANO" brand at top, big rice variety name, Kerala regional rice mill packaging look, photographed grains/bowl in lower half:
Tile 1 "KERALA MATTA RICE" (tan woven sack, deep red printed border, red-brown matta rice grains).
Tile 2 "JAYA RICE" (cream woven sack, emerald green printed border, white long rice grains).
Tile 3 "PONNI RICE" (white woven sack, royal blue printed border, white rice grains).
Tile 4 "KAIMA RICE" (pale cream woven sack, warm brown/maroon printed border, short fragrant kaima rice grains).
Row 2:
Tile 1 "RICE" (tan sack printing, red-green panel, photograph of rice).
Tile 2 "PROVISIONS" (kraft brown corrugated carton-face print, green stamp graphic, pantry ingredients photograph and black barcode).
Tile 3 "COCONUT MILK" (white/green can label artwork, real coconut halves and creamy coconut milk).
Tile 4 "DRINKING WATER" (blue/white bottle label artwork, clear water splash and subtle mountains).
Row 3 household goods with original "VESTANO" brand:
Tile 1 "HOUSEHOLD CLEANER" (blue/teal plastic bottle label artwork, clean tiled floor photo).
Tile 2 "DETERGENT POWDER" (blue/purple packet artwork, fresh white cotton fabric photo).
Tile 3 "PAPER GOODS" (white/teal paper-roll wrap artwork, soft white paper texture and leaf motif).
Tile 4 "DISHWASH BAR" (green/yellow soap-wrapper artwork, lemons and shiny steel dishes photo).
Constraints: exactly twelve tiles in that order, all square and edge aligned. Main titles correct and readable, convincing printed materials and photography, no generic vector food doodles. No prices, no weights, no existing brand logos, no watermark.
```
