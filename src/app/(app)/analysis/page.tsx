import { Suspense } from "react";
import { AnalysisTab } from "../insights/_components/analysis/analysis-tab";
import styles from "../insights/_components/analysis/dark/analysis-dark.module.css";

/** The Analysis nav item. The list and the detail live in AnalysisTab. */
export default function AnalysisPage() {
  return (
    <div className={styles.shell}>
      <div className={styles.frame}>
        {/* useSearchParams() suspends until the automation or country query is known. */}
        <Suspense fallback={null}>
          <AnalysisTab />
        </Suspense>
      </div>
    </div>
  );
}
