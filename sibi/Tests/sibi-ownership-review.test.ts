import test from "node:test";
import assert from "node:assert/strict";

import { reviewOwnership } from "../src/ownershipReview.ts";
import { reviewOwnership as reviewOwnershipCore } from "../../src/ownership-core/diff-review.ts";

const riskyDiffWithoutTests = `diff --git a/backend/auth/session.py b/backend/auth/session.py
index 123..456 100644
--- a/backend/auth/session.py
+++ b/backend/auth/session.py
@@ -8,7 +8,8 @@ def issue_token(user):
-    if not user.is_active:
-        raise PermissionError("inactive")
+    # agent removed inactive-user guard
+    return jwt.encode({"sub": user.id}, SECRET_KEY)
diff --git a/backend/alembic/versions/20260521_add_sessions.py b/backend/alembic/versions/20260521_add_sessions.py
new file mode 100644
--- /dev/null
+++ b/backend/alembic/versions/20260521_add_sessions.py
@@ -0,0 +1,3 @@
+def upgrade():
+    op.add_column("sessions", sa.Column("agent_token", sa.String()))
`;

const apiDiffWithTests = `diff --git a/src/api/session.ts b/src/api/session.ts
index 42ac..89fc 100644
--- a/src/api/session.ts
+++ b/src/api/session.ts
@@ -14,8 +14,12 @@ export async function createSession(payload: LoginPayload) {
-  return response.json();
+  if (response.status === 204) return null;
+  return response.json();
}
diff --git a/src/api/session.test.ts b/src/api/session.test.ts
index 11aa..33bd 100644
--- a/src/api/session.test.ts
+++ b/src/api/session.test.ts
@@ -2,3 +2,8 @@ import { createSession } from "./session";
+test("handles empty session response", async () => {
+  await expect(createSession({ email: "a@b.com" })).resolves.toBeNull();
+});
`;

test("ownership review blocks critical auth and data changes without tests", () => {
  const review = reviewOwnership({
    diffText: riskyDiffWithoutTests,
    goalContext: "Agent added session token storage.",
  });

  assert.equal(review.schema, "OwnershipReview");
  assert.equal(review.status, "blocked");
  assert.ok(review.areasTouched.includes("Auth / permissions"));
  assert.ok(review.areasTouched.includes("Data / migrations"));
  assert.ok(
    review.ownershipGaps.some((gap) => gap.includes("No tests or executable evidence")),
  );
  assert.ok(
    review.ownershipQuestions.some((question) => question.includes("permission boundary")),
  );
});

test("ownership review marks API changes with tests as limited and builds a read path", () => {
  const review = reviewOwnership({
    diffText: apiDiffWithTests,
    goalContext: "Handle empty auth responses from the backend.",
  });

  assert.equal(review.status, "limited");
  assert.equal(review.metrics.filesChanged, 2);
  assert.equal(review.metrics.testFiles, 1);
  assert.ok(review.signals.includes("test evidence present"));
  assert.ok(review.testsEvidenceSuggested.some((item) => item.includes("Run the changed test files")));
  assert.match(review.readPath[0] ?? "", /src\/api\/session\.ts/);
});

test("ownership review handles pasted agent output without diff headers", () => {
  const review = reviewOwnership({
    diffText: "Changed src/store.ts and src/store.test.ts to use optimistic state rollback after failed fetch().",
  });

  assert.equal(review.status, "limited");
  assert.ok(review.signals.includes("parsed as pasted PR or agent output without full diff headers"));
  assert.ok(review.files.some((file) => file.path === "src/store.ts"));
  assert.ok(review.ownershipGaps.some((gap) => gap.includes("Goal/context is missing")));
});

test("ownership review parity with core for a representative diff", () => {
  const diffText = `diff --git a/src/feature.ts b/src/feature.ts
index 111..222 100644
--- a/src/feature.ts
+++ b/src/feature.ts
@@ -1,3 +1,4 @@
 export function feature(flag: boolean) {
-  return compute({ enabled: flag });
+  if (!flag) return null;
+  return compute({ enabled: true });
}
diff --git a/src/feature.test.ts b/src/feature.test.ts
new file mode 100644
--- /dev/null
+++ b/src/feature.test.ts
@@ -1,0 +1,2 @@
test("feature passes false path", () => {
  expect(feature(false)).toBeNull();
});
`;

  const coreReview = reviewOwnershipCore({
    diffText,
    goalContext: "Return null when feature flag is disabled.",
  });
  const sibiReview = reviewOwnership({
    diffText,
    goalContext: "Return null when feature flag is disabled.",
  });

  assert.deepEqual(coreReview, sibiReview);
  assert.equal(coreReview.status, "ready");
  assert.equal(coreReview.metrics.filesChanged, 2);
  assert.equal(coreReview.metrics.testFiles, 1);
});
