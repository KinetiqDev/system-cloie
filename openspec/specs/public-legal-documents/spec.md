# public-legal-documents

Public, native Privacy Notice and Terms of Use pages providing readable, navigable, responsive, metadata-rich legal documents without runtime dependence on Markdown files.

## Requirements

### Requirement: Public native legal routes
The system SHALL provide public unauthenticated pages at `/privacy` and `/terms` that render the System CLOIE Privacy Notice and Terms of Use as native semantic web UI.

#### Scenario: Visitor opens the Privacy Notice
- **WHEN** an unauthenticated visitor requests `/privacy`
- **THEN** the system renders the Privacy Notice without requiring a session, role, or account state

#### Scenario: Visitor opens the Terms of Use
- **WHEN** an unauthenticated visitor requests `/terms`
- **THEN** the system renders the Terms of Use without requiring a session, role, or account state

#### Scenario: Authenticated session is present
- **WHEN** an authenticated user requests either legal route
- **THEN** the system renders the same public legal document and does not redirect to an account dashboard

### Requirement: Native content source boundary
The legal pages SHALL render from typed application content or native React structures and SHALL NOT import, parse, render, or load the repository Markdown references at runtime or build time.

#### Scenario: Legal route source inspection
- **WHEN** the legal route and feature modules are inspected or tested
- **THEN** no application import or loader references `docs/privacy-and-ToS/system-cloie-privacy-policy.md` or `docs/privacy-and-ToS/system-cloie-terms-of-use.md`

#### Scenario: Legal content is updated
- **WHEN** an authorized developer updates the legal document content
- **THEN** the change is made in the native typed content module and is deployable without a Markdown parsing step

### Requirement: Document metadata and approval status
Each legal page SHALL display its document title, document type, version, effective date, last-updated value, and the current institutional approval status represented by the native content.

#### Scenario: Draft values remain unresolved
- **WHEN** effective dates, contact details, retention periods, or other institutional values are not approved
- **THEN** the page visibly identifies the document as a draft or pending institutional approval and does not invent replacement values

#### Scenario: Approved values are supplied
- **WHEN** approved legal metadata is supplied in the native content
- **THEN** the page displays the supplied values without requiring changes to the page renderer

### Requirement: Long-form legal navigation
The legal pages SHALL provide a readable long-form layout with a semantic heading hierarchy, stable section anchors, a document table of contents, and responsive behavior for mobile viewports.

#### Scenario: Visitor navigates by table of contents
- **WHEN** a visitor activates a table-of-contents link
- **THEN** the browser navigates to the corresponding section anchor on the current legal document

#### Scenario: Visitor uses a mobile viewport
- **WHEN** a visitor reads either legal page below the responsive layout breakpoint
- **THEN** the document collapses to a usable single-column reading flow without horizontal page overflow

#### Scenario: Visitor uses keyboard navigation
- **WHEN** a visitor tabs through the legal page
- **THEN** document navigation, cross-links, and footer links expose visible focus states and remain reachable in DOM reading order

### Requirement: Cross-document and portal navigation
The legal experience SHALL provide links between Privacy Notice and Terms of Use and SHALL provide a route back to public role selection or another existing public entry point.

#### Scenario: Visitor moves between legal documents
- **WHEN** a visitor activates the Privacy Notice link from Terms of Use or the Terms of Use link from Privacy Notice
- **THEN** the system navigates to the corresponding public legal route

#### Scenario: Visitor returns to public entry
- **WHEN** a visitor activates a legal-page portal link
- **THEN** the system navigates to public role selection without requiring authentication

### Requirement: Static legal page metadata
The legal routes SHALL export unique SEO metadata appropriate to each document and SHALL remain compatible with static Server Component rendering.

#### Scenario: Search metadata is generated
- **WHEN** Next.js builds the legal routes
- **THEN** each route exposes a unique title and description and does not require request-time session data to generate metadata

#### Scenario: Publication status requires non-indexing
- **WHEN** the product decision marks draft legal pages as non-indexable
- **THEN** the route metadata can set the approved robots policy without changing the legal content renderer
