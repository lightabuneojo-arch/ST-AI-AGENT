---
doc: scope
status: approved
---

# AI Lecture Tutor (working title)

An AI study companion that teaches a university student from one uploaded course material and checks their understanding.

## The Unique Kernel
The tutor teaches from the learner’s own lecture material through an adaptive loop: it explains a concept, asks a question, and evaluates the student’s response. If the response shows confusion or is incorrect, it re-explains the concept using a different, simpler approach. It should feel like a supportive personal tutor, not a chatbot giving disconnected answers.

## Who It’s For
A university student who has lecture slides, notes, or other course material but struggles to understand difficult topics and tell whether they have learned them. Today, they may study the material on their own without a clear way to turn it into explanations or check their understanding.

## The Core Loop
The student uploads one course material, and the tutor identifies its key topics. For one selected topic, the tutor explains the concept in simple terms, asks the student a question, and evaluates their answer. If the student is confused or incorrect, the tutor tries a different, simpler explanation and checks understanding again. The session ends with a short practice quiz and feedback.

## Inspiration & Identity
The learner wants the AI to feel like an actual personal tutor rather than a generic chatbot. The tone should be encouraging and supportive, especially when a student is frustrated or gets an answer wrong.

## What “Working” Looks Like
In a short screen demo, a university student uploads one lecturer-provided course material, sees the tutor identify key topics, studies one difficult topic through a few adaptive teaching and question turns, then completes a short quiz and receives feedback. The compelling moment is seeing the tutor evaluate a confused or incorrect answer and explain the same concept differently and more simply.

## The POC Boundary
Build one end-to-end tutoring experience for one student, one course material, and one topic at a time. Include material analysis and key-topic identification, simple explanations grounded in the material, the explicit explain-question-evaluate-adapt loop, an encouraging tone, and a short end-of-session quiz with a score or feedback. Support one `.docx`, `.pptx`, or text-searchable `.pdf` file per session. Keep account setup minimal or mocked if the demo needs an entry point.

## Later
- A full personalized timetable, including use of the student’s activities and study availability.
- Flashcards and a full mock-exam system.
- Multiple courses and multiple uploaded materials.
- Advanced progress tracking.
- A full signup/login system.

## Explicitly Cut
- Predicting or promising the lecturer’s actual exam questions. The prototype can create a short practice quiz from the uploaded material, which demonstrates learning without implying access to the real exam.
