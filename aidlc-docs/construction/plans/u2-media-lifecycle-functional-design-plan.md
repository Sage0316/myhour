# U2 Functional Design Plan

- [x] Analyze media persistence and capture lifecycle stories.
- [x] Apply delegated recommendation: lease-based resources and transactional metadata.
- [x] Define media state machine, cleanup, quota, and validation rules.
- [x] Define entities and capture UI adapter behavior.
- [x] Generate all Functional Design artifacts.

## Question 1

How should incomplete media be handled?

A) Keep it pending under a lease and delete it unless metadata commit succeeds. (Recommended)

B) Save every captured Blob permanently before metadata commit.

X) Other (please describe after `[Answer]:` tag below)

[Answer]: A — delegated recommended default
