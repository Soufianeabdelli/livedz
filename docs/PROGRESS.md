# PINCASTING (LiveDZ) - PROGRESS NOTES

Repo: github.com/Soufianeabdelli/livedz
Stack: Next.js 16.4.6 (Cache Components), Prisma 7.10.1, PostgreSQL in Docker, Vitest, Windows PowerShell 5.1
Restore point: tag v0.1-before-redesign (= master 4580ee5)
Working branch: feature/glass-theme (not merged to master yet)
Last confirmed commit: 962ebaf (page dictionary). Check: 34 test files, 224 tests, 25 routes.
Phone test URL: http://192.168.1.15:3000/design/glass (Wi-Fi IP of the PC; 172.26.160.1 is WSL)

## DONE (all committed and pushed)
- Host remote, TikTok-safe overlay, /go/[slug] bio link, state API (merged to master earlier)
- Emerald theme and base UI components (src/components/ui)
- Glass theme from the approved HTML design: theme-glass.css, glass.tsx, light mode (data-mode="light")
- Language buttons AR/FR/EN and half-moon theme button, using server actions (src/app/prefs-actions.ts)
- 69 wilayas with Arabic names, 108 moved communes (src/lib/countries/dz/regions-2026.ts, communes.ts, with tests)
- Commune dropdown loads per wilaya (design/glass/actions.ts). DB has 1541 communes, matches dzship
- getDeliveryQuote (src/lib/delivery-quote.ts): returns null when seller set no price, saved 0 = free on purpose
- Dictionaries with tests: src/lib/i18n-store.ts and src/lib/i18n-page.ts (Arabic as \u escapes)
- Dev: allowedDevOrigins in next.config.ts for phone testing

## SENT BUT RESULT NOT SEEN (check git log and git status first)
- Color and size picker: variant-groups.ts (+test), components/ui/variant-chips.tsx, /design/variants
  Expected after it: 35 test files, 231 tests. If git log does not show it, tell me.

## NEXT (in order)
1. Block 3: real /go/[slug] page: code box (01, #01, 1), real products, VariantChips, AR/FR/EN + half-moon,
   delivery buttons with seller price or "confirmed by the seller", submit via existing processOrderForm (POST)
2. Block 4: cleanup buyer pages: title "PinCasting" only, remove merchant links and fake browser bar (q/[token]),
   translate success.tsx and messages.ts (French only, "pointure" shows on dresses)
3. Seller side: delivery price table per wilaya (+ import from courier), seller home (stats and chart from real data)
4. Phase B product images: Product.imageUrl, https only, 4:3 hero, then Cloudinary upload (strip GPS/EXIF)
5. Later: dashboard shell and PWA, booking form, multi-currency (priceDzd rename), more countries

## OPEN DECISIONS
- Product names: add nameAr and nameFr to Product? (no answer yet; for now one name)
- One size per order for now (multi-item orders need a schema change)
- Check Arabic wording on screen (example: "Order now" vs "Confirm order")
- Light mode not yet checked on a real phone
- Arabic as default locale only for new store pages (DEFAULT_LOCALE stays "en")

## KNOWN ISSUES
- getDeliveryFee (old) returns 0 when no price set -> orders would ship "free". Use getDeliveryQuote on the customer page
  and flag those orders for the seller.
- 2 dev servers fight for port 3000: stop ports 3000/3001 before npm run dev
- Preview pages: /design, /design/glass, /design/variants use sample data only

## RULES WE LEARNED
- Code blocks: English, plain ASCII, @' ... '@ here-strings, [System.IO.File] UTF-8 no BOM. Never Get-Content/Set-Content on source files
- Never node -e or tsx -e with double quotes in PowerShell
- Every block stops with STOP: if branch, Docker or anchors are wrong; commits only if npm run check passes
- Keep blocks short, long ones get cut off. Press Ctrl+C if the terminal shows >> after a cut block
- Stop npm run dev before npm run check (shared .next folder). Never stop the database container
- Never docker compose down -v, never git push --force, never migrate reset
- After a schema change: npm run db:migrate, then restart the dev server
- TikTok: no QR, links or phone numbers on the overlay in TikTok mode; do not use TikTok name in the product UI
- TikTok Pixel off by default; customer phone numbers never in URLs (POST only)

## HOW TO CONTINUE TOMORROW
1. Start Docker Desktop, wait for Engine running
2. Paste this file to Leo and say what you want next (suggested: check variants block, then Block 3)
3. Send: git branch --show-current, git status -s, git log --oneline -5