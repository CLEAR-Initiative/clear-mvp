import Link from "next/link";
import {
  DocsPage,
  DocsH2,
  DocsH3,
  InfoBox,
} from "../../_components/docs-page";

export const metadata = {
  title: "Tech Stack — CLEAR Docs",
  description:
    "A guided tour of the frameworks, libraries, and conventions that power CLEAR — Next.js 15, React 19, tRPC 11, Django, and Tailwind CSS 4.",
};

export default function TechStackPage() {
  return (
    <DocsPage
      title="Tech Stack"
      description="A guided tour of the frameworks, libraries, and conventions that power CLEAR — and, more importantly, why each choice was made for humanitarian operations at scale."
      badge="ARCHITECTURE"
    >
      <DocsH2 id="overview">Overview</DocsH2>
      <p>
        CLEAR is built on a modern TypeScript stack that prioritises end-to-end
        type safety, fast iteration, and the ability to run reliably in
        environments where bandwidth and infrastructure cannot be taken for
        granted. Every dependency was chosen deliberately: if a library does not
        directly serve the needs of humanitarian coordination teams, it is not
        in the dependency tree.
      </p>

      <DocsH2 id="core-framework">Core framework</DocsH2>
      <p>
        The application is a{" "}
        <strong>Next.js 15 App Router</strong> project running on{" "}
        <strong>React 19</strong>. The App Router gives us nested layouts,
        streaming server rendering, and fine-grained control over which parts of
        a page are rendered on the server versus the client. React 19 brings
        improved server component support and concurrent rendering features that
        keep the interface responsive even when the underlying data is complex.
      </p>
      <InfoBox type="info">
        Server components are the default in every route. We add the{" "}
        <code>&quot;use client&quot;</code> directive only when a component truly
        requires browser APIs — interactive forms, map views, drag-and-drop
        interfaces, and similar client-side behaviour. This keeps JavaScript
        bundles small and initial page loads fast, which matters greatly for
        field offices operating on constrained networks.
      </InfoBox>

      <DocsH2 id="api-layer">API layer — tRPC 11 with Zod</DocsH2>
      <p>
        All communication between the frontend and backend flows through{" "}
        <strong>tRPC 11</strong>, a framework for building fully type-safe APIs
        without writing REST endpoints or maintaining OpenAPI specifications.
        Every procedure is defined once and the TypeScript compiler enforces
        correctness from the database query all the way to the UI component that
        displays the result.
      </p>
      <p>
        Input validation is handled by <strong>Zod</strong> schemas attached to
        each tRPC procedure. If a request does not match the expected shape, it
        is rejected before any business logic executes. This eliminates an
        entire category of runtime errors and gives developers immediate
        feedback in their editor when a call site drifts out of sync with its
        procedure definition.
      </p>

      <DocsH3 id="data-flow">Data flow pattern</DocsH3>
      <p>
        How data moves through the application depends on whether you are in a
        server component or a client component:
      </p>
      <ul>
        <li>
          <strong>Server components</strong> call tRPC server callers directly —{" "}
          <code>api.router.procedure()</code>. These calls execute on the server
          during rendering, so there is no network round-trip and no loading
          state to manage. This is the preferred path for any data that can be
          fetched at render time.
        </li>
        <li>
          <strong>Client components</strong> use tRPC React hooks —{" "}
          <code>useQuery</code> and <code>useMutation</code>. These issue
          requests from the browser to the tRPC HTTP handler, returning typed
          data and providing built-in loading and error states. Use this path
          for interactions that happen after the initial render: form
          submissions, real-time polling, optimistic updates, and similar
          patterns.
        </li>
      </ul>
      <p>
        In both cases, <strong>types flow end-to-end</strong>. The Django API
        defines the shape of the data, Zod schemas validate it at the tRPC
        boundary, and React components consume the inferred types — all
        without a single manual type definition in between. If an API response
        changes shape, the compiler tells you everywhere that needs to change.
      </p>

      <InfoBox type="tip">
        For a complete list of available procedures and their inputs, see the{" "}
        <Link href="/docs/architecture/api">API Reference</Link>.
      </InfoBox>

      <DocsH2 id="database">Database — Django with PostgreSQL</DocsH2>
      <p>
        The <strong>Django API</strong> manages the database layer, providing
        models, migrations, and an admin interface. The database itself is{" "}
        <strong>PostgreSQL</strong>, chosen for its reliability, its rich
        support for JSON columns (useful for flexible survey response data),
        and its widespread availability on managed hosting platforms.
      </p>
      <p>
        Django models define the data schema and serve as the single source of
        truth. Django&apos;s built-in migration framework provides versioned,
        reviewable migration scripts for both development and production
        deployments.
      </p>

      <DocsH2 id="authentication">Authentication — Better Auth</DocsH2>
      <p>
        User authentication is handled by{" "}
        <strong>Better Auth</strong>, a lightweight, framework-agnostic
        authentication library that integrates cleanly with Next.js. Out of the
        box, CLEAR supports two authentication strategies:
      </p>
      <ul>
        <li>
          <strong>Email and password</strong> — the default for all deployments.
          No external service dependencies, no third-party callbacks to
          configure. Users sign up with an email address and a password, and
          they are in.
        </li>
        <li>
          <strong>GitHub OAuth</strong> — an optional addition for development
          teams that already use GitHub. Enable it by setting the{" "}
          <code>BETTER_AUTH_GITHUB_CLIENT_ID</code> and{" "}
          <code>BETTER_AUTH_GITHUB_CLIENT_SECRET</code> environment variables.
          See the{" "}
          <Link href="/docs/configuration#github-oauth">
            Configuration guide
          </Link>{" "}
          for instructions.
        </li>
      </ul>

      <DocsH2 id="styling">Styling — Tailwind CSS 4 and shadcn/ui</DocsH2>
      <p>
        The interface is styled with <strong>Tailwind CSS 4</strong> and built
        from <strong>shadcn/ui</strong> components using the{" "}
        <strong>new-york</strong> style variant. Icons come from the{" "}
        <strong>Lucide</strong> icon library. This combination provides a
        consistent, accessible design system without requiring a dedicated
        design team — a practical consideration for humanitarian technology
        projects where resources are directed toward operations, not pixel
        perfection.
      </p>
      <p>
        shadcn/ui components are not installed as a package dependency. Instead,
        they are copied into the codebase under <code>src/components/ui/</code>,
        which means you can customise any component freely without worrying
        about upstream updates overwriting your changes.
      </p>

      <DocsH2 id="project-structure">Project structure</DocsH2>
      <p>
        The codebase follows a clear, predictable layout. Understanding these
        directories will help you navigate the project and know exactly where to
        put new code.
      </p>
      <table>
        <thead>
          <tr>
            <th>Path</th>
            <th>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>src/app/(app)/</code></td>
            <td>
              Authenticated application pages. The <code>(app)</code> route group
              wraps these pages in the authenticated layout — sidebar
              navigation, session checks, and the main content shell.
            </td>
          </tr>
          <tr>
            <td><code>src/app/(auth)/</code></td>
            <td>
              Login and signup pages. The <code>(auth)</code> route group uses a
              minimal, centered layout with no sidebar — just the authentication
              form.
            </td>
          </tr>
          <tr>
            <td><code>src/app/docs/</code></td>
            <td>
              Public documentation (the pages you are reading now). No
              authentication required. Uses its own layout with a documentation
              sidebar and table of contents.
            </td>
          </tr>
          <tr>
            <td><code>src/server/api/routers/</code></td>
            <td>
              tRPC router definitions. Each file exports a router that groups
              related procedures — <code>crisis.ts</code>,{" "}
              <code>decision.ts</code>, <code>referral.ts</code>, and so on.
            </td>
          </tr>
          <tr>
            <td><code>src/server/services/</code></td>
            <td>
              Business logic services. Complex operations that involve multiple
              database queries, external API calls, or encryption live here,
              keeping tRPC routers thin and focused on input validation and
              response shaping.
            </td>
          </tr>
          <tr>
            <td><code>src/components/</code></td>
            <td>
              Shared UI components used across multiple pages. This includes
              shadcn/ui primitives in <code>src/components/ui/</code> and
              higher-level application components alongside them.
            </td>
          </tr>
          <tr>
            <td><code>src/server/api/django.ts</code></td>
            <td>
              The Django API proxy — the <code>djangoFetch</code> helper that
              tRPC routers use to communicate with the Django backend.
            </td>
          </tr>
        </tbody>
      </table>

      <DocsH3 id="route-groups">Route groups explained</DocsH3>
      <p>
        Next.js route groups — directories wrapped in parentheses like{" "}
        <code>(app)</code> and <code>(auth)</code> — allow different sections of
        the application to use different layouts without affecting the URL
        structure. A page at <code>src/app/(app)/crises/page.tsx</code> is
        accessible at <code>/crises</code>, not <code>/(app)/crises</code>. The
        parentheses are purely an organisational mechanism, invisible to users.
      </p>

      <DocsH3 id="path-alias">Path alias</DocsH3>
      <p>
        The project uses a path alias so that imports never need fragile
        relative paths like <code>../../../components</code>. Instead, the{" "}
        <code>~/</code> prefix maps to <code>./src/</code>, so you can write:
      </p>
      <pre><code>{`import { Button } from "~/components/ui/button";
import { api } from "~/trpc/server";`}</code></pre>
      <p>
        This alias is configured in <code>tsconfig.json</code> and works
        everywhere — server components, client components, tRPC routers, and
        utility modules.
      </p>

      <DocsH2 id="design-principles">Design principles</DocsH2>
      <p>
        Several architectural principles guide how the codebase evolves:
      </p>
      <ul>
        <li>
          <strong>Server-first rendering.</strong> Default to server components.
          Only add <code>&quot;use client&quot;</code> when you need browser
          APIs, event handlers, or stateful interactions. This keeps bundles
          small and pages fast.
        </li>
        <li>
          <strong>Type safety from API to UI.</strong> Zod schemas validate
          data at the tRPC boundary, tRPC propagates inferred types through
          the API layer, and React components consume them. No manual type
          duplication.
        </li>
        <li>
          <strong>Thin routers, rich services.</strong> tRPC procedures handle
          input validation and response formatting. Business logic — encryption,
          aggregation, external API orchestration — lives in dedicated service
          modules under <code>src/server/services/</code>.
        </li>
        <li>
          <strong>Practical defaults.</strong> Every feature should work out of
          the box with minimal configuration. Optional integrations (GitHub
          OAuth, Mapbox maps, KoBoToolbox) enhance the platform but are never
          required.
        </li>
      </ul>

      <DocsH2 id="next-steps">Next steps</DocsH2>
      <p>
        Now that you understand the technology foundations, explore how they come
        together in practice:
      </p>
      <ul>
        <li>
          <Link href="/docs/architecture/api">
            <strong>API Reference</strong>
          </Link>{" "}
          — the complete list of tRPC routers and procedures, with their inputs
          and authentication requirements
        </li>
        <li>
          <Link href="/docs/quickstart">
            <strong>Quickstart</strong>
          </Link>{" "}
          — set up a local development environment and see the stack in action
        </li>
        <li>
          <Link href="/docs/configuration">
            <strong>Configuration</strong>
          </Link>{" "}
          — environment variables, optional integrations, and deployment
          settings
        </li>
      </ul>
    </DocsPage>
  );
}
