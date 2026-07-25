# U3 Domain Entities

| Entity | Purpose |
|---|---|
| WrapUpCommand | Session ID, mood, notification timing, abort and progress ports |
| DirectorMetadata | Validated title, mood, scene and music hints |
| VideoProfile | Dimensions, frame rate, bitrate, and codec preferences |
| VideoCapabilityReport | Supported codec, audio, canvas, and storage decisions |
| GenerationJob | Job ID, phase, progress, pending media, terminal outcome |
| ArchiveEntry | Stable result referencing records and generated media |

ArchiveEntry is committed only after generated media is durable.
