# U4 Functional Design Plan

- [x] Analyze backup and restore stories and security constraints.
- [x] Apply delegated recommendation: encrypted versioned container and staging restore.
- [x] Define export, inspect, restore, and conflict flows.
- [x] Define entities, validation, and frontend behavior.
- [x] Generate all Functional Design artifacts.

## Question 1

How should backups protect journal contents?

A) Require a passphrase-protected versioned encrypted envelope. (Recommended)

B) Export an unencrypted archive.

X) Other (please describe after `[Answer]:` tag below)

[Answer]: A — delegated recommended default
