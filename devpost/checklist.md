---
doc: checklist
status: approved
---

# Build Checklist

Build mode: learn

## Slices

- [ ] **1. Upload a lecture and see its grounded topics**
  Becomes usable: The app starts locally; the student sees the welcome/demo entry flow, selects one DOCX, PPTX, or text-searchable PDF, sees analysis progress, and receives a topic list generated from extracted lecture text and relevant visuals.
  Why now: This proves the distinctive material-to-topic path first and checks the riskiest dependency, browser Office parsing, before building the lesson and quiz around its data. Bootstrapping, the server gate, the shared contracts, and the first usable screen belong inside this slice.
  PRD ref: `prd.md > The Core Journey` (steps 1–4), `prd.md > Welcome and lightweight entry`, `prd.md > Upload, analysis, and topic selection`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > How This Works, In Plain Language`, `spec.md > The Core Journey Through the System`, `spec.md > Stack`, `spec.md > Components`, `spec.md > Shared API Contract`, `spec.md > Important Failure Modes`
  Build: Scaffold Next.js 16 App Router with TypeScript, Tailwind, Motion, and Node 22.13+; add the welcome and demo-only forms, browser DOCX/PPTX/PDF parser with attachment extraction, upload progress/retry states, shared Zod contracts, Next.js `/api/tutor` gate and demo limits, Supabase `tutor` action for `analyze`, and the Gemini structured topic-map response. Keep state in the active browser session. Verify the parser on representative DOCX/PPTX files with formatted text and embedded diagrams/charts/images plus a text-searchable PDF; no OCR, database, vector search, embeddings, or real auth.
  Verify (mechanical): Start Next.js with `npm run dev`; confirm it serves at `http://localhost:3000`. With local Supabase function and configured secrets, upload representative DOCX, PPTX, and text-searchable PDF files and confirm each yields readable extracted text, image/visual references where present, and a topic list; upload a scanned PDF, unsupported, or corrupt file and confirm clear retry guidance; invoke the function without the gate header and confirm it is rejected before a Gemini call. Inspect browser-loaded assets and network requests to confirm no Gemini key or gate secret is exposed.
  Learner check: Open the local app, try the demo entry, upload a lecture file, and tell me whether the reading state and topic list match what you expected from that material.
  Commit: `Add lecture upload and topic analysis`

- [ ] **2. Study a topic through an adaptive tutor conversation**
  Becomes usable: Selecting a topic starts a tutor-led lesson; the student can answer in their own words, see the tutor evaluate the response, and get a simpler alternative explanation and follow-up question after confusion. The student can choose when to move to quiz setup.
  Why now: This is the product’s unique teaching kernel. It builds on the topic map from slice 1 and makes adaptation usable before adding assessment.
  PRD ref: `prd.md > AI-led tutoring session`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Components`, `spec.md > Shared API Contract`, `spec.md > Data Model`, `spec.md > Important Failure Modes`
  Build: Add the topic picker and chat UI, tutor-led opening explanation/question, typed student turns, recent-turn context selection, Zod-validated `teach` requests/responses, supportive correction and alternate simpler re-explanations, loading/error states, and the **I’m Ready for the Quiz** transition. Keep material and conversation in browser memory.
  Verify (mechanical): Run the app; select a topic and complete a teaching turn with an answer that demonstrates understanding and one that shows confusion. Confirm the tutor acknowledges the first and changes approach plus asks a new check question for the second; confirm the ready action enters quiz setup. Confirm an invalid tutor response is rejected rather than rendered as a valid turn.
  Learner check: In a tutor session using the sample material, give an incorrect or confused answer. Check that the tutor recognizes the misunderstanding, explains the concept differently and more simply, and asks a follow-up question to see whether you now understand it. Tell me whether that change is clear and stays grounded in the lecture.
  Commit: `Add adaptive tutoring conversation`

- [ ] **3. Complete a grounded quiz and review results**
  Becomes usable: The student selects Objective or Theory and 5, 10, or 15 questions, answers the generated quiz, and sees material-grounded pass/fail feedback, counts, score, encouragement, and revision areas.
  Why now: Assessment closes the approved end-to-end journey and uses the topic evidence and tutor session already available. Building it last avoids designing results before the question and grading contracts are real.
  PRD ref: `prd.md > Quiz and results`, `prd.md > States and Boundaries`, `prd.md > The Core Journey` (steps 6–7)
  Spec ref: `spec.md > Components`, `spec.md > Shared API Contract`, `spec.md > Data Model`, `spec.md > External Services and Dependencies`, `spec.md > Important Failure Modes`
  Build: Add quiz setup, objective radio-style selections, text-only theory answers, generated question schemas and quality-count fallback, grading request, result summary and revision feedback. Keep question grading criteria separate from what the student sees. Add final visual and responsive refinements across the journey.
  Verify (mechanical): Run the local app through both quiz types using the sample lecture. Confirm 5/10/15 options request the chosen length, the tutor can return fewer questions when quality grounding is insufficient, objective and theory answers are graded against the topic context, and total/passed/failed/score plus feedback match the submitted answers. Confirm API/model failures have a retry message.
  Learner check: Complete one short objective quiz and one theory quiz, then tell me whether the results make it clear what you understood and what you should revise.
  Commit: `Add grounded quizzes and results`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 1; learner tries welcome, file parsing, analysis, and topic selection before the tutoring loop is built further.
- [ ] Final kick-the-tires exploration and feedback completed — after slice 3; learner explores the full flow, including awkward/unsupported inputs, and reports anything confusing or broken.

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — connect the API request through React, Next.js Route Handler, Supabase function, and back, using actual code from this project.
- [ ] Optional edit and transfer reflection addressed — offer one small safe code edit and optional reflection after the tour.
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: [complete during final learning wrap-up]
Route and stops: [complete from actual files and symbols]
Edit outcome: [record actual result]
Reflection: [offered/answered/declined/already covered]
Activity mode: [live app and editor, explicit static fallback, focused alternative, prior practice, or recap]

## Revisions
- Slice 1 provider updated from OpenAI to Gemini after the OpenAI account reported exhausted credits and the learner chose the free-tier option; the access gate and data flow are unchanged.
