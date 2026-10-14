# Rotor SMS sync health

The enabled flag is not proof of execution. Display WAITING before the first run, HEALTHY when the latest run is within 36 hours, ERROR after a failed run, and STALE after 36 hours without a recorded run. Preserve read-only Rotor access and never send messages. Add deterministic unit tests.

No provider credentials are required for this status calculation.
