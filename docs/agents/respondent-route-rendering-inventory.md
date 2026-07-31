# Respondent Route Rendering Inventory

Issue #181 adds route-level loading geometry and role-scoped recovery for the respondent routes below. All listed routes remain Server Components; their existing authorization, eligibility, verification, and account-state reads are unchanged.

| Route family                                   | Loading boundary                                          | Geometry source                        | Recovery boundary            |
| ---------------------------------------------- | --------------------------------------------------------- | -------------------------------------- | ---------------------------- |
| `/student/evaluations`                         | `student/evaluations/loading.tsx`                         | Evaluation list geometry               | `student/error.tsx`          |
| `/student/evaluations/[id]`                    | `student/evaluations/[id]/loading.tsx`                    | Evaluation form geometry               | `student/error.tsx`          |
| `/student/history`                             | `student/history/loading.tsx`                             | Submission history table/card geometry | `student/error.tsx`          |
| `/student/history/[responseId]`                | `student/history/[responseId]/loading.tsx`                | Submitted response review geometry     | `student/error.tsx`          |
| `/student/profile`                             | `student/profile/loading.tsx`                             | Profile information card geometry      | `student/error.tsx`          |
| `/alumni/evaluations`                          | `alumni/evaluations/loading.tsx`                          | Evaluation list geometry               | `alumni/error.tsx`           |
| `/alumni/evaluations/[id]`                     | `alumni/evaluations/[id]/loading.tsx`                     | Evaluation form geometry               | `alumni/error.tsx`           |
| `/alumni/evaluations/[id]/submitted`           | `alumni/evaluations/[id]/submitted/loading.tsx`           | Submitted response review geometry     | `alumni/error.tsx`           |
| `/alumni/history`                              | `alumni/history/loading.tsx`                              | Submission history table/card geometry | `alumni/error.tsx`           |
| `/alumni/profile`                              | `alumni/profile/loading.tsx`                              | Profile information card geometry      | `alumni/error.tsx`           |
| `/industry-partner/evaluations`                | `industry-partner/evaluations/loading.tsx`                | Evaluation list geometry               | `industry-partner/error.tsx` |
| `/industry-partner/evaluations/[id]`           | `industry-partner/evaluations/[id]/loading.tsx`           | Evaluation form geometry               | `industry-partner/error.tsx` |
| `/industry-partner/evaluations/[id]/submitted` | `industry-partner/evaluations/[id]/submitted/loading.tsx` | Submitted response review geometry     | `industry-partner/error.tsx` |
| `/industry-partner/history`                    | `industry-partner/history/loading.tsx`                    | Submission history table/card geometry | `industry-partner/error.tsx` |
| `/industry-partner/profile`                    | `industry-partner/profile/loading.tsx`                    | Profile information card geometry      | `industry-partner/error.tsx` |

The route-level loading wrappers expose only structural placeholders with `role="status"`, `aria-busy="true"`, and role-neutral loading labels. Recovery UI preserves the parent authenticated shell, provides retry and dashboard navigation, and does not render exception messages or digests.
