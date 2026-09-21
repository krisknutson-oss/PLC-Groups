# Security Specification: Semester Lockout Tracker

## 1. Data Invariants
1. Administrator Access: The administrator (`kris.knutson@ma.org.tw` and any user with verified `admin` role) can read and write all authorized users, settings, and task submissions.
2. Verified User Access: A school user can only read their assigned group's form submissions and tasks if they are authenticated and their email has `status == 'verified'`.
3. Lockout Immutability: Once a task submission is marked as `completed`, it cannot be overwritten by regular users (enforcing single-submission lockout). Only an administrator can modify or reset a completed submission.
4. User Authorization Whitelist: A user document can only be created or modified by an administrator, ensuring only administrator-verified emails gain access.
5. Strict Schema Validation: All string fields must adhere to size limits and enum restrictions.

## 2. The Dirty Dozen Attack Payloads
1. Unauthenticated write to `/authorized_users/attacker` to self-authorize an email address. -> Expected: PERMISSION_DENIED.
2. Regular verified user attempting to grant themselves `role: "admin"`. -> Expected: PERMISSION_DENIED.
3. Unverified or pending user attempting to submit to `/task_submissions/test`. -> Expected: PERMISSION_DENIED.
4. Re-submitting or updating an existing `completed` task submission by a regular student/teacher to circumvent single-submission lockout. -> Expected: PERMISSION_DENIED.
5. Injected payload containing oversized response text (> 2000 characters) to exhaust storage. -> Expected: PERMISSION_DENIED.
6. Forged `userEmail` in task submission where `userEmail != request.auth.token.email`. -> Expected: PERMISSION_DENIED.
7. Attempting to delete settings at `/settings/global` by a non-admin. -> Expected: PERMISSION_DENIED.
8. Writing an invalid category enum (e.g., `category: "Hacked Category"`) to `/task_submissions`. -> Expected: PERMISSION_DENIED.
9. Attempting to query the entire `/authorized_users` list as an unverified user. -> Expected: PERMISSION_DENIED.
10. Writing a user record with an invalid email syntax format. -> Expected: PERMISSION_DENIED.
11. Attempting to update `adminEmail` setting without admin credentials. -> Expected: PERMISSION_DENIED.
12. Creating a group with an oversized name (> 100 chars) or invalid schema. -> Expected: PERMISSION_DENIED.
