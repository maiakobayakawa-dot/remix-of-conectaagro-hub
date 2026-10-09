# Producer accounts and private plots
- [x] Connect plots to signed-in accounts and authorized read-only sharing.
- [x] Complete producer signup, login and session-aware menu.
- [x] Verify signed-out access guard, signup validation, existing tests and build.
- [ ] Verify signed-in save/reload and sharing/revocation end-to-end — blocked: no registered user; producer must create and confirm an account.

# Mobile presentation
- [x] Adapt layout, forms, navigation and touch targets for phones.
- [x] Add explicit save, send and continue actions using existing flows.
- [x] Verify public screens at 320/390/768/1280px; send diagnosis, continue, save application and note pass.

# Basic settings
- [x] Add settings to navigation, Portuguese/theme/style preferences, and read-only checks with accurate persistence limitations.
- [x] Verify preference save/reload, validation and signed-out checks; tests pass.

# Expanded producer account
- [ ] Add account entry to Settings and expand signup with optional contact, address and farming details.
- [ ] Add private account editing, email change and current-password-confirmed password change.
- [ ] Verify validation, account navigation and authenticated save/reload when an account is available.

# Plot guidance and notifications
- [ ] Add in-app guidance and notifications selectable by plot, clearly marked as simulated when using demonstration data.
- [ ] Verify plot switching and guidance display.

# Remix setup
- [x] Rescaffolded migration set: 0000_initial_schema.sql applied to the new database.
- [x] Managed Google Maps Platform connection linked to the remixed project.
