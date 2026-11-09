import { Suspense } from "react";
import { AnalysisTab } from "./_components/analysis/analysis-tab";
import styles from "./_components/analysis/dark/analysis-dark.module.css";

/** Insights. The list and the detail live in AnalysisTab. */
export default function InsightsPage() {
  return (
    <div className={styles.shell}>
      <div className={styles.frame}>
        {/* useSearchParams() suspends until the insights or country query is known. */}
        <Suspense fallback={null}>
          <AnalysisTab />
        </Suspense>
      </div>
    </div>
  );
}
