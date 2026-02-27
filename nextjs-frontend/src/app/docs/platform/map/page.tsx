import Link from "next/link";
import {
  DocsPage,
  DocsH2,
  DocsH3,
  InfoBox,
} from "../../_components/docs-page";

export const metadata = { title: "Interactive Map — CLEAR Docs" };

export default function MapPage() {
  return (
    <DocsPage
      title="Interactive Map"
      description="Visualize crises geographically with a Mapbox GL-powered map — see where events are concentrated, how severe they are, and drill into details with a click."
      badge="PLATFORM"
    >
      <DocsH2 id="overview">Overview</DocsH2>
      <p>
        In humanitarian response, geography is everything. Where a crisis is
        happening determines which teams can respond, which supply routes are
        viable, and which populations are affected. The CLEAR interactive map
        gives your team a real-time geospatial view of all tracked crises,
        plotted on a full-featured map powered by{" "}
        <strong>Mapbox GL JS</strong>. Instead of scrolling through a list of
        crisis names, you can see the entire operational landscape at a
        glance — and immediately understand where the pressure points are.
      </p>

      <DocsH2 id="crisis-markers">Crisis markers and severity coloring</DocsH2>
      <p>
        Each crisis that has geographic coordinates is represented by a marker
        on the map. Markers are color-coded by severity so you can visually
        distinguish between situations that are being monitored and those that
        demand immediate action:
      </p>
      <table>
        <thead>
          <tr>
            <th>Severity</th>
            <th>Marker color</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>LOW</strong></td>
            <td>Blue — informational, low urgency</td>
          </tr>
          <tr>
            <td><strong>MEDIUM</strong></td>
            <td>Yellow — moderate concern, worth monitoring</td>
          </tr>
          <tr>
            <td><strong>HIGH</strong></td>
            <td>Orange — significant impact, active response likely required</td>
          </tr>
          <tr>
            <td><strong>CRITICAL</strong></td>
            <td>Red — catastrophic impact, immediate attention required</td>
          </tr>
        </tbody>
      </table>
      <p>
        This color scheme is designed to be intuitive even for staff who are
        seeing the map for the first time. Red means urgent; blue means calm.
        When you zoom out and see a cluster of red markers in a region, you
        know exactly where your organization&apos;s attention should be focused.
      </p>

      <DocsH2 id="interacting">Interacting with the map</DocsH2>

      <DocsH3 id="click-to-view">Click to view crisis details</DocsH3>
      <p>
        Click any marker on the map to open a popup with the crisis summary —
        including its title, type, severity, and current status. From the
        popup, you can navigate directly to the full{" "}
        <Link href="/docs/platform/crises#crisis-detail">
          crisis detail page
        </Link>{" "}
        to review the timeline, linked decisions, and alerts.
      </p>

      <DocsH3 id="zoom-and-pan">Zoom and pan</DocsH3>
      <p>
        The map supports standard interactions: scroll to zoom, click and drag
        to pan, and pinch to zoom on touch devices. Use these controls to focus
        on a specific region or zoom out for a global perspective. The map
        remembers your viewport position within the session, so navigating away
        and returning will bring you back to where you left off.
      </p>

      <InfoBox type="tip">
        When briefing leadership or coordinating across offices, the map view
        is often the most effective way to communicate the operational picture.
        Consider using it during stand-up meetings or situation reports to
        ground the discussion in geography.
      </InfoBox>

      <DocsH2 id="configuration">Configuration</DocsH2>

      <DocsH3 id="mapbox-token">Mapbox access token</DocsH3>
      <p>
        The interactive map requires a Mapbox access token to load map tiles
        and render the interface. You must set the{" "}
        <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> environment variable in your{" "}
        <code>.env.local</code> file:
      </p>
      <pre>
        <code>NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_token_here</code>
      </pre>
      <p>
        You can obtain a free token by creating an account at{" "}
        <strong>mapbox.com</strong>. The free tier includes a generous number of
        map loads per month, which is sufficient for most humanitarian
        deployments.
      </p>
      <InfoBox type="warning">
        Without a valid <code>NEXT_PUBLIC_MAPBOX_TOKEN</code>, the map page
        will not render. If you see a blank area where the map should be, check
        that your environment variable is set correctly and that the token has
        not expired or been revoked.
      </InfoBox>

      <DocsH3 id="environment-setup">Environment variable setup</DocsH3>
      <p>
        Add the token to your <code>.env.local</code> file at the project root.
        Because this variable uses the <code>NEXT_PUBLIC_</code> prefix, it is
        exposed to the browser — this is intentional, as Mapbox GL JS needs the
        token client-side to authenticate tile requests. The token is scoped to
        map rendering and does not grant access to any CLEAR data.
      </p>

      <DocsH2 id="technical-details">Technical details</DocsH2>

      <DocsH3 id="client-component">Client component with dynamic import</DocsH3>
      <p>
        Mapbox GL JS is a browser-only library — it relies on the{" "}
        <code>window</code> object and the WebGL rendering context, neither of
        which exist during server-side rendering. To handle this, the CLEAR map
        is implemented as a <strong>client component</strong> that is loaded
        using Next.js <code>dynamic()</code> with server-side rendering
        disabled:
      </p>
      <pre>
        <code>{`import dynamic from "next/dynamic";

const MapView = dynamic(() => import("./map-view"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});`}</code>
      </pre>
      <p>
        This pattern ensures that the Mapbox GL library is only loaded in the
        browser, preventing build errors and avoiding unnecessary server-side
        bundle weight. A skeleton placeholder is displayed while the map
        component loads, so users see a smooth loading experience rather than a
        blank screen.
      </p>

      <DocsH3 id="data-flow">Data flow</DocsH3>
      <p>
        When the map component mounts, it fetches crisis data from the CLEAR
        API and renders a marker for each crisis that has latitude and longitude
        coordinates. Crises without geographic data are excluded from the map
        view — they remain accessible through the{" "}
        <Link href="/docs/platform/crises#crisis-list">crisis list</Link> and{" "}
        <Link href="/docs/platform/dashboard">dashboard</Link>.
      </p>

      <InfoBox type="info">
        If a crisis does not appear on the map, verify that it has geographic
        coordinates assigned. You can add or update coordinates from the crisis
        detail page.
      </InfoBox>

      <DocsH2 id="best-practices">Best practices</DocsH2>
      <ul>
        <li>
          <strong>Assign coordinates to every crisis.</strong> The map is only
          as useful as the data behind it. When creating a crisis, always
          include latitude and longitude so it appears on the map and
          contributes to the geographic picture.
        </li>
        <li>
          <strong>Use the map for coordination.</strong> During multi-agency
          coordination calls, the map provides a shared geographic reference
          that helps all parties understand the operational landscape. Screen
          sharing the map view is often more effective than reading a list of
          locations.
        </li>
        <li>
          <strong>Monitor regional clusters.</strong> When multiple markers
          cluster in a single region, it may indicate compounding crises —
          for example, displacement caused by conflict overlapping with a food
          security emergency. These clusters deserve closer investigation.
        </li>
        <li>
          <strong>Keep your Mapbox token secure.</strong> While the token is
          exposed to the browser by design, restrict it to your deployment
          domains using Mapbox&apos;s URL restriction settings. This prevents
          unauthorized usage of your token on other websites.
        </li>
      </ul>

      <InfoBox type="tip">
        The map complements rather than replaces the{" "}
        <Link href="/docs/platform/crises">crisis list</Link> and{" "}
        <Link href="/docs/platform/dashboard">dashboard</Link>. Use all three
        views together: the dashboard for metrics, the list for detailed
        filtering, and the map for geographic context.
      </InfoBox>
    </DocsPage>
  );
}
