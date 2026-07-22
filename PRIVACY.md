# Privacy

TATWO-ULTRAWORK beta is local-first.

## Data handling

- Goal, Plan, Loop, and sandbox receipts are stored locally.
- The project does not include analytics or a hosted control plane.
- Gateway prompts are sent only to the adapter selected by the user.
- Provider authentication remains with the provider CLI or user-selected
  environment variable.
- TATWO does not intentionally read provider credential, session, SSH, browser
  profile, or keychain data.
- Restricted sandbox snapshots exclude common secret and tool-state names.

## User responsibility

Prompts sent to remote providers may be processed under that provider's terms.
Review project content before dispatch. Use synthetic data in public issues and
examples.

## Receipts

Receipts are evidence, not telemetry. Before sharing one, verify that it contains
no proprietary source, personal data, credentials, or private paths.
