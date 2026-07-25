# U6 Functional Design Plan

- [x] Analyze schedule, idempotency, ownership, and delivery.
- [x] Apply delegated recommendation: versioned schedule and signed install requests.
- [x] Define domain flow, rules, entities, and settings UI.
- [x] Generate all Functional Design artifacts.

## Question 1

How should duplicate scheduled sends be prevented?

A) Reserve and complete a delivery key based on installation, schedule version, slot, and kind. (Recommended)

B) Rely only on Cron timing.

X) Other (please describe after `[Answer]:` tag below)

[Answer]: A — delegated recommended default
