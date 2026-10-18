---
doc: prd
status: approved
---

# AI Lecture Tutor — Product Requirements

A supportive AI tutor for university students who want to learn from their own lecture materials. This working title is temporary; the learner has not chosen a final app name. Builds on `scope.md > The Unique Kernel`, `Who It’s For`, and `The Core Loop`.

## The Core Journey

1. The student opens a warm welcome screen introducing the AI as their personal study tutor.
2. They choose Sign Up or Log In. Sign Up collects full name, email, password, and university name; Log In collects email and password. The prototype checks that required fields are filled, then takes the student to upload. It does not create or authenticate persistent accounts.
3. The student uploads one `.docx` or `.pptx` course material. The interface shows the file name and a friendly analysis state while the tutor reads it, identifies the main topics, and prepares it for study.
4. When analysis succeeds, the student sees a ready confirmation and the identified topics, then chooses one topic.
5. The tutor leads a text-based lesson: it explains a concept in simple terms, asks the student a question, evaluates the reply, and moves forward after demonstrated understanding or tries a simpler explanation after confusion or an incorrect answer. The student can choose **I’m Ready for the Quiz** when they want to finish the teaching portion.
6. The student chooses an objective or theory quiz and selects 5, 10, or 15 questions. The tutor generates the quiz from the uploaded material and the topic taught.
7. The student answers the quiz, then sees total questions, passed and failed counts, an overall score calculated as the percentage of questions passed, an encouraging message, and areas to revise.

Source: `scope.md > The Core Loop`, `What “Working” Looks Like`, and `The POC Boundary`.

## Screens and Layout

- **Welcome:** Warm tutor introduction and a short explanation of learning from lecture materials, with prominent **Sign Up** and **Log In** actions.
- **Sign Up / Log In:** Simple, focused forms with only the requested fields and clear validation messages.
- **Upload and topics:** One upload action; selected file name; analysis progress; then ready confirmation and a selectable list of key topics.
- **Tutoring session:** Readable conversational view. The AI tutor’s messages and the student’s typed replies appear in sequence. The student has a text input and send action, with **I’m Ready for the Quiz** available during the lesson.
- **Quiz setup and quiz:** Before generation, the student chooses objective or theory and 5, 10, or 15 questions. Objective questions use selectable options; theory questions use typed answers. Quiz progress and submitted answers remain clear.
- **Results:** A clear summary with the question count, passed and failed counts, overall score, encouragement, and revision areas.

## Look and Feel

Warm, premium, modern, calm, and trustworthy, with a sophisticated academic and technology feel. Navy anchors the background and major elements; deep violet accents the tutor and subtle gradients. Dark green supports positive states and learning progress; burgundy is reserved for restrained emphasis or warnings; gray supports text, borders, cards, and neutral areas. Use subtle gradients and lighting, rounded cards, clean typography, and generous spacing. Keep the welcome inviting and tutoring view focused and easy to read. Avoid an overly playful look, generic chatbot styling, and using every accent color everywhere.

Source: `scope.md > Inspiration & Identity` and learner direction shared during PRD discovery.

## Features and Behavior

### Welcome and lightweight entry

- The welcome message introduces the AI as the student’s personal tutor and explains that it helps them understand courses using their own lecture materials.
- Sign Up asks for full name, email address, password, and university name. Log In asks for email address and password.
- For this prototype, both forms validate required fields only. A complete form continues directly to the upload screen. No persistent accounts or credential checks are part of this experience.
- Missing required fields produce clear, friendly guidance and keep the form available for correction.

Source: `scope.md > The POC Boundary`; user decisions during PRD discovery.

### Upload, analysis, and topic selection

- Accept one `.docx` or `.pptx` material for the session.
- Show the selected file name and a friendly progress message such as “Your tutor is reading through your material…” while analysis runs.
- Show that the tutor is reading, identifying main topics, and preparing the material for tutoring.
- On success, confirm readiness and show key topics; the student selects one to begin.
- For unsupported or unprocessable files, explain the problem clearly and allow another file to be selected.

Source: `scope.md > The Core Loop` and `The POC Boundary`.

### AI-led tutoring session

- The tutor takes the lead after topic selection; it opens with a simple explanation grounded in the uploaded material rather than waiting for the student to start with a question.
- It teaches in short conversational turns, asks understanding questions, and accepts typed answers in the student’s own words.
- It evaluates each reply against the taught concept and the uploaded material. When the student demonstrates understanding, it acknowledges progress and moves the lesson forward. When the answer is incorrect or shows confusion, it acknowledges that supportively, explains the concept in a different and simpler way, and asks a follow-up question.
- The student may select **I’m Ready for the Quiz** at any point. This closes the teaching portion and starts quiz setup; the tutor does not force a quiz.
- Voice interaction is outside the POC.

Source: `scope.md > The Unique Kernel`, `The Core Loop`, and `The POC Boundary`.

### Quiz and results

- Before starting, the student chooses **Objective** or **Theory** and 5, 10, or 15 questions.
- The tutor generates the requested number of questions from the selected topic and uploaded material where possible. It prioritizes questions directly supported by the material, then uses application, reasoning, and more advanced questions based on the concepts taught when more questions are needed. If the requested count cannot be filled with quality questions from the material plus relevant application or reasoning questions, the tutor generates fewer questions rather than introducing unrelated content. It avoids knowledge completely outside the material.
- Objective questions present answer choices with one selectable answer; the tutor marks the selected answer passed or failed against the material.
- Theory questions accept typed responses. The tutor evaluates whether the answer shows sufficient understanding based primarily on the uploaded material, accepts reasonable wording variations, and briefly explains missing or incorrect concepts.
- Each result is passed or failed: an objectively correct answer or a theory answer demonstrating sufficient understanding passes.
- The results screen reports total answered, passed, failed, overall score as the percentage of questions passed, an encouraging message, and brief revision areas.

Source: `scope.md > The Core Loop` and `What “Working” Looks Like`; quiz decisions during PRD discovery.

## States and Boundaries

- **First visit:** Welcome screen offers Sign Up and Log In.
- **Form incomplete:** Identify missing required fields and let the student correct them.
- **No material selected:** Keep the upload action visible and explain that one `.docx` or `.pptx` file is needed to begin.
- **Analyzing:** Show the selected file and friendly progress text; make clear the tutor is reading, identifying topics, and preparing the lesson.
- **Unsupported or failed analysis:** Explain that the material could not be processed and offer upload retry.
- **Material ready:** Confirm success and display key topics for selection.
- **Tutoring:** Show tutor and student turns in order; keep typed reply and quiz-ready actions available.
- **Quiz:** Show the selected quiz type and question count, clear answer input, and progress through the quiz.
- **Quiz results:** Show all requested counts, score, encouragement, and revision areas.

Source: `scope.md > The POC Boundary`; upload and session decisions during PRD discovery.

## Product Decisions

- The student’s learning material is the primary source for tutoring and assessment, keeping the tutor grounded in what they were taught.
- The agent leads the lesson and adapts its next step to the student’s response; the student decides when to move to the quiz.
- Entry forms are a lightweight prototype gate with required-field checks only. Persistent account creation, password validation against stored credentials, and sessions are excluded.
- `.docx` and `.pptx` are the supported material formats for this POC.
- The quiz is student-configured for type and length: objective or theory, with 5, 10, or 15 questions.
- Theory responses are typed only. Voice answers are deferred because they add recording and audio-processing work that does not prove the core teaching loop.
- Encouraging, calm language is part of the tutoring experience, including when correcting misunderstandings.

## What We’re Building

A demonstrable end-to-end prototype covering the welcome and lightweight entry forms; one `.docx` or `.pptx` upload and analysis; key-topic selection; one AI-led, adaptive text tutoring session; a student-controlled transition to quiz setup; objective or typed-theory quiz generation at 5, 10, or 15 questions; and a material-grounded result summary with score and revision feedback.

## Deferred From the POC

- Real account creation, stored credentials, login verification, persistent sessions, email verification, password recovery, social login, profile editing, and account settings.
- Personalized study timetable, schedule collection, or study availability.
- Voice interaction or voice-note quiz answers.
- Flashcards, full mock exams, multiple courses or uploads, and advanced progress tracking.

These items do not need to be present to demonstrate the single adaptive tutoring loop.

## Possible Later Enhancements

Add real account management, study planning, voice answers, flashcards, broader exam practice, multiple course materials, and progress tracking after the focused tutoring experience works reliably.

## Non-Goals

- Predicting or promising the lecturer’s actual exam questions; quiz content is practice based on the uploaded material.
- A persistent student profile or study history.
- Voice-based interaction in this version.

Source: `scope.md > Explicitly Cut`, `Later`, and `The POC Boundary`.

## Open Questions

None blocking the product definition. Quiz length may be shorter than the selected count when the material and relevant application or reasoning questions cannot support more quality questions.

