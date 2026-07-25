# Interaction Diagrams

## Record-to-Slot Interaction

```mermaid
sequenceDiagram
    participant U as User
    participant R as RecordScreen
    participant C as AppProvider
    participant T as TodayScreen

    U->>R: Open current slot
    R-->>U: Display currentSlot
    U->>R: Save a record
    R->>C: addRecord
    C->>C: Store actual HH:mm as slotTime
    T->>T: Map records by exact slotTime
    T-->>U: Record may not match configured slot
```

Text alternative: RecordScreen displays the computed slot, but AppProvider stores the actual minute. TodayScreen performs an exact key lookup by configured slot, so a record captured between slot boundaries can disappear from the slot grid.

## Push Schedule Interaction

```mermaid
sequenceDiagram
    participant Cron as Thirty-minute cron
    participant Worker as Push Worker
    participant User as User

    Cron->>Worker: Run at minute 0
    Worker->>User: Send when remainder is below 30
    Cron->>Worker: Run at minute 30
    Worker->>User: Send again when remainder is below 30
```

Text alternative: For intervals longer than 30 minutes, the current remainder condition accepts both the exact boundary and the following 30-minute cron run, which can produce duplicate reminders.

## Media Lifecycle Interaction

```mermaid
sequenceDiagram
    participant R as RecordScreen
    participant D as IndexedDB
    participant C as AppProvider
    participant U as User

    R->>D: Save captured video
    U->>R: Retake, switch mode, close, or save
    R->>C: Save metadata only on final save
    C-->>D: No cleanup on current-record deletion
```

Text alternative: A captured video is written before the final record is saved. Retaking, switching mode, closing, or later deleting the record does not consistently delete the IndexedDB blob, so storage can accumulate orphaned media.

