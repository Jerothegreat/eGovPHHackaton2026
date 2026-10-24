# Resident Mobile HANDA Bottom Sheet Implementation Plan

**Goal:** Rebuild the resident module into a phone-first eGovPH-style screen that centers HANDA in a persistent draggable bottom sheet and fixes misleading eGov AI translation/chat status handling.

**Architecture:** Keep routing untouched and avoid `src/App.tsx` while that file is being resolved elsewhere. Move resident interaction into a focused mobile layout in `ResidentConsole.tsx`, keep the bottom sheet behavior in a dedicated component, and make `egov-ai-service.ts` return honest source/status metadata so the UI can distinguish live eGov AI from fallback guidance.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind utility classes, existing global CSS, existing resident store/session hooks

## Global Constraints

- Do not edit `src/App.tsx`.
- Keep changes frontend-only.
- Do not add new dependencies for dragging; use native pointer/touch events.
- HANDA is the only functional resident feature; all other eGovPH-style modules are visual-only.
- The HANDA sheet must minimize downward and expand upward, never fully dismiss while the resident has an active unresolved case.
- The HANDA sheet disappears only when the resident's own check-in status becomes `resolved`.
- Translation must not present fake bracketed fallback text as a successful live translation.
- Live eGov AI status must be labeled honestly; Gemini or local fallback must not display as live eGov AI.

---

### Task 1: Normalize eGov AI service result metadata

**Files:**
- Modify: `src/lib/egov-ai-service.ts`

**Interfaces:**
- Consumes: existing `fetch` calls to token, translator, assistant, and credits endpoints
- Produces:
  - `type AiResponseSource = "egov_live" | "gemini_fallback" | "local_fallback" | "unavailable"`
  - `interface TranslationResponse { ...; is_live_api?: boolean; source?: AiResponseSource; error_message?: string }`
  - `interface AiAssistantResponse { data: string; session_id: string; is_live_api?: boolean; source?: AiResponseSource; error_message?: string }`

- [ ] **Step 1: Update the service interfaces to carry source metadata**

```ts
export type AiResponseSource = "egov_live" | "gemini_fallback" | "local_fallback" | "unavailable"

export interface TranslationResponse {
  original_prompt: string
  source_lang: string
  target_lang: string
  translate_from: { code: string; label: string }
  translated_prompt: string
  transliterated_prompt?: string
  is_live_api?: boolean
  source?: AiResponseSource
  error_message?: string
}

export interface AiAssistantResponse {
  data: string
  session_id: string
  is_live_api?: boolean
  source?: AiResponseSource
  error_message?: string
}
```

- [ ] **Step 2: Make live translator responses explicit and fallback responses honest**

```ts
return {
  ...data,
  is_live_api: true,
  source: "egov_live",
}
```

```ts
return {
  original_prompt: prompt,
  source_lang: sourceLang,
  target_lang: targetLang,
  translate_from: { code: sourceLang, label: dialectNameMap[sourceLang] || sourceLang.toUpperCase() },
  translated_prompt: "",
  is_live_api: false,
  source: "unavailable",
  error_message: err instanceof Error ? err.message : "Translation unavailable",
}
```

- [ ] **Step 3: Make assistant fallback sources explicit**

```ts
if (geminiReply) {
  return {
    data: geminiReply,
    session_id: crypto.randomUUID(),
    is_live_api: false,
    source: "gemini_fallback",
  }
}

return {
  data: contextualAnswer,
  session_id: crypto.randomUUID(),
  is_live_api: false,
  source: "local_fallback",
}
```

- [ ] **Step 4: Strengthen the local emergency-aid fallback copy**

```ts
if (
  lower.includes("emergency aid") ||
  lower.includes("relief") ||
  lower.includes("assistance") ||
  lower.includes("evacuation")
) {
  contextualAnswer = `For HANDA emergency assistance, you can request support such as:\n\n1. **Food and clean water** for your household\n2. **Temporary shelter or evacuation support** if your home is unsafe\n3. **Medicine or first aid** for urgent medical needs\n4. **Rescue or transport assistance** if someone is trapped, injured, or unable to travel\n5. **Barangay follow-up** by completing your HANDA check-in so responders can prioritize your case\n\nIf the situation is life-threatening, call **911** immediately.`
}
```

- [ ] **Step 5: Verify no existing callers break from the added optional fields**

Run: `npm run build`

Expected: TypeScript completes or reports only unrelated existing repo issues outside this task.


### Task 2: Make translation and chat UI show honest live/fallback/error states

**Files:**
- Modify: `src/components/TranslateWidget.tsx`
- Modify: `src/components/CitizenHelpChat.tsx`

**Interfaces:**
- Consumes:
  - `translateText(text, targetLang, sourceLang): Promise<TranslationResponse>`
  - `askAiAssistant(prompt, category): Promise<AiAssistantResponse>`
- Produces:
  - resident-facing badges and messages that distinguish live AI from fallback states

- [ ] **Step 1: Update the translate widget to handle unavailable translations**

```ts
const [statusLabel, setStatusLabel] = useState<string | null>(null)

const res = await translateText(textToTranslate, selectedLang, "en")
setTranslatedText(res.translated_prompt || null)
setIsLiveApi(res.is_live_api ?? false)
setStatusLabel(
  res.source === "egov_live"
    ? "Live eGov AI"
    : res.source === "unavailable"
      ? "Unavailable"
      : "Fallback"
)
setError(res.source === "unavailable" ? res.error_message ?? "Live eGov AI translation unavailable." : null)
```

- [ ] **Step 2: Replace fake success rendering with explicit unavailable messaging**

```tsx
{translatedText ? (
  <div className="bg-white p-3 rounded-lg border border-blue-200 text-xs text-slate-900 mt-1">
    <span className="text-[10px] uppercase font-bold text-[var(--blue-primary)] block mb-1">
      {LANGUAGES.find((l) => l.code === selectedLang)?.name} Translation:
    </span>
    <p className="italic font-medium leading-relaxed">{translatedText}</p>
  </div>
) : error ? (
  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 mt-1">
    Live eGov AI translation unavailable. {error}
  </div>
) : null}
```

- [ ] **Step 3: Update chat status badges to reflect `source` instead of only `is_live_api`**

```ts
const [lastSource, setLastSource] = useState<string | null>(null)

const res = await askAiAssistant(userMsg.text, "PH")
setLastSource(res.source ?? null)
```

```tsx
<span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
  lastSource === "egov_live"
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : lastSource === "gemini_fallback" || lastSource === "local_fallback"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-slate-100 text-slate-700 border-slate-200"
}`}>
  {lastSource === "egov_live"
    ? "Live eGov AI"
    : lastSource === "gemini_fallback" || lastSource === "local_fallback"
      ? "Fallback Guidance"
      : "Unavailable"}
</span>
```

- [ ] **Step 4: Add prompt chips for HANDA-specific questions**

```tsx
{[
  "What emergency aid can I request?",
  "What should I prepare before evacuation?",
  "Who can I call now?",
].map((prompt) => (
  <button key={prompt} type="button" onClick={() => setInput(prompt)} className="...">
    {prompt}
  </button>
))}
```

- [ ] **Step 5: Verify the UI still type-checks**

Run: `npm run build`

Expected: TypeScript completes or reports only unrelated existing repo issues outside this task.


### Task 3: Extract a persistent draggable HANDA bottom sheet component

**Files:**
- Create: `src/components/HandaBottomSheet.tsx`
- Modify: `src/globals.css`

**Interfaces:**
- Consumes:
  - `sheetState: "minimized" | "mid" | "expanded"`
  - `onSheetStateChange(nextState: "minimized" | "mid" | "expanded"): void`
  - resident alert, check-in, translation, and AI content as `children`
- Produces:
  - reusable persistent bottom sheet with drag snapping and non-dismissible behavior

- [ ] **Step 1: Create the bottom sheet component API**

```ts
type SheetState = "minimized" | "mid" | "expanded"

type HandaBottomSheetProps = {
  state: SheetState
  onStateChange: (state: SheetState) => void
  title: string
  subtitle: string
  children: React.ReactNode
}
```

- [ ] **Step 2: Implement minimal drag snapping with pointer events**

```ts
const SNAP_TRANSLATE_Y: Record<SheetState, string> = {
  minimized: "calc(100% - 112px)",
  mid: "calc(100% - 420px)",
  expanded: "48px",
}
```

```ts
function getNextState(deltaY: number, current: SheetState): SheetState {
  if (deltaY < -80) return current === "minimized" ? "mid" : "expanded"
  if (deltaY > 80) return current === "expanded" ? "mid" : "minimized"
  return current
}
```

- [ ] **Step 3: Render persistent controls so the sheet can minimize or expand but never close**

```tsx
<div className="hando-sheet__controls">
  <button type="button" onClick={() => onStateChange("minimized")}>Minimize</button>
  <button type="button" onClick={() => onStateChange("mid")}>Summary</button>
  <button type="button" onClick={() => onStateChange("expanded")}>Expand</button>
</div>
```

- [ ] **Step 4: Add focused CSS for the bottom sheet shell**

```css
.handa-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 55;
  background: linear-gradient(180deg, rgba(255,255,255,0.98), #ffffff);
  border-radius: 28px 28px 0 0;
  border: 1px solid var(--line);
  box-shadow: 0 -12px 40px rgba(15, 23, 42, 0.16);
}
```

- [ ] **Step 5: Verify the component compiles in isolation once imported**

Run: `npm run build`

Expected: TypeScript completes or reports only unrelated existing repo issues outside this task.


### Task 4: Rebuild the resident console into a mobile eGovPH-style screen with HANDA as the only functional feature

**Files:**
- Modify: `src/features/resident/ResidentConsole.tsx`
- Modify: `src/components/Shell.tsx`
- Modify: `src/globals.css`

**Interfaces:**
- Consumes:
  - `HandaBottomSheet`
  - `CitizenHelpChat`
  - `TranslateWidget`
  - resident session/profile/store state from existing hooks
- Produces:
  - phone-first resident home screen
  - persistent HANDA sheet that appears while campaign exists and resident case is not resolved

- [ ] **Step 1: Replace the resident desktop dashboard structure with a mobile home screen layout**

```tsx
<div className="resident-mobile-home">
  <section className="resident-mobile-hero">...</section>
  <section className="resident-mobile-search">...</section>
  <section className="resident-mobile-services">...</section>
  <section className="resident-mobile-cards">...</section>
  <nav className="resident-mobile-nav">...</nav>
</div>
```

- [ ] **Step 2: Derive the resident case state and bottom sheet visibility from existing store data**

```ts
const residentCheckIn = activeCampaign
  ? data.checkIns.find(ci => ci.campaign_id === activeCampaign.id && ci.submitted_by === profile.uniqid)
  : undefined

const shouldShowHandaSheet = !!activeCampaign && residentCheckIn?.status !== "resolved"
```

- [ ] **Step 3: Move the survey flow into the bottom sheet instead of a separate modal**

```tsx
{shouldShowHandaSheet && activeCampaign && (
  <HandaBottomSheet
    state={sheetState}
    onStateChange={setSheetState}
    title="HANDA"
    subtitle={activeCampaign.name}
  >
    {/* alert summary */}
    {/* submit flow */}
    {/* translate widget */}
    {/* AI assistant */}
  </HandaBottomSheet>
)}
```

- [ ] **Step 4: Replace permanent dismiss behavior with minimize behavior**

```tsx
<button className="big-btn ghost" onClick={() => setSheetState("minimized")}>
  Later
</button>
```

- [ ] **Step 5: Add mobile-specific CSS blocks for the resident home and bottom navigation**

```css
.resident-mobile-home {
  width: min(100%, 430px);
  margin: 0 auto;
  min-height: 100dvh;
  padding: 20px 16px 120px;
  background: #fff;
}
```

- [ ] **Step 6: Verify resident interactions still submit check-ins**

Run: `npm run build`

Expected: TypeScript completes or reports only unrelated existing repo issues outside this task.


### Task 5: Final verification and cleanup

**Files:**
- Modify: any files from Tasks 1-4 as needed to fix verification issues

**Interfaces:**
- Consumes: completed resident mobile UI and AI service updates
- Produces: verified implementation with no new type/build regressions caused by these changes

- [ ] **Step 1: Run the full build/typecheck**

Run: `npm run build`

Expected: successful TypeScript and Vite build, or a clearly identified pre-existing blocker unrelated to these edits.

- [ ] **Step 2: Run the existing test script if build passes**

Run: `npm test`

Expected: existing CSS variable check passes.

- [ ] **Step 3: Sanity check the resident UI manually in dev**

Run: `npm run dev`

Expected: resident screen renders as a mobile eGovPH-style view, HANDA sheet snaps between minimized/mid/expanded, and the sheet remains present until resident case status is `resolved`.
