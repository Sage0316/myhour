# U5 Functional Design Plan

- [x] Analyze AI consent, privacy, signed access, and fallback.
- [x] Apply delegated recommendation: separate Worker and local fallback.
- [x] Define request lifecycle, rules, entities, and consent UI.
- [x] Generate all Functional Design artifacts.

## Question 1

What should happen when AI is unavailable or not consented?

A) Return a deterministic local direction without blocking wrap-up. (Recommended)

B) Block wrap-up until AI succeeds.

X) Other (please describe after `[Answer]:` tag below)

[Answer]: A — delegated recommended default
