<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep one root Auth identity subscription with verified users and clear private query caches on sign-out; this prevents stale personal data on shared devices.
- Persist user plots in Cloud with owner-only writes and explicit read-only grants; UI controls are not the authorization boundary.
- Keep producer profiles owner-only, separate from plot sharing; granting land visibility must not grant personal profile access.
- Store validated presentation preferences locally under an account-scoped key; settings checks must remain read-only and explicitly distinguish checks from a full security audit.
- Reuse one validated producer profile form for signup and account editing; authenticated server functions derive the owner from verified context, while database validation also guards direct writes.
- Field sensors authenticate to the public ingest route with a per-sensor random key whose SHA-256 hash alone is stored; database triggers validate ownership and value ranges so device and manual writes share one guard.
