import React, { useMemo } from "react";
import Layout from "@theme/Layout";
import styles from "./BoardChangelog.module.css";

interface BoardItem {
  id: string;
  title: string;
  description: string;
  url: string;
  author: string;
  labels: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

// Helper function to get the start of the week (Sunday) for a given date
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}

// Helper function to format week range
function formatWeekRange(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };

  if (weekStart.getMonth() === weekEnd.getMonth()) {
    return `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${weekEnd.toLocaleDateString("en-US", options)}`;
  } else {
    return `${weekStart.toLocaleDateString("en-US", options)} - ${weekEnd.toLocaleDateString("en-US", options)}`;
  }
}

// Helper function to normalize status names for CSS classes
function normalizeStatus(status: string): string {
  const normalized = status.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (normalized.includes("todo") || normalized === "backlog") {
    return "todo";
  } else if (
    normalized.includes("inprogress") ||
    normalized.includes("progress")
  ) {
    return "inProgress";
  } else if (normalized.includes("done") || normalized.includes("complete")) {
    return "done";
  }

  return "unknown";
}

const BoardChangelog: React.FC = () => {
  // Load board data from static JSON file
  const boardData = useMemo(() => {
    try {
      // This path will be resolved at build time by Docusaurus
      return require("@site/static/data/board-changelog.json") as BoardItem[];
    } catch (error) {
      console.error("Error loading board changelog data:", error);
      return [];
    }
  }, []);

  // Group items by week
  const itemsByWeek = useMemo(() => {
    const grouped = new Map<string, BoardItem[]>();

    boardData.forEach((item) => {
      const itemDate = new Date(item.updatedAt);
      const weekStart = getWeekStart(itemDate);
      const weekKey = weekStart.toISOString().split("T")[0];

      if (!grouped.has(weekKey)) {
        grouped.set(weekKey, []);
      }
      grouped.get(weekKey)!.push(item);
    });

    // Sort weeks by date (newest first)
    const sortedWeeks = Array.from(grouped.entries()).sort(
      ([a], [b]) => new Date(b).getTime() - new Date(a).getTime(),
    );

    return sortedWeeks;
  }, [boardData]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    const statusCounts: Record<string, number> = {};

    boardData.forEach((item) => {
      const status = item.status || "Unknown";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    return {
      total: boardData.length,
      byStatus: statusCounts,
    };
  }, [boardData]);

  if (boardData.length === 0) {
    return (
      <Layout
        title="Board Activity"
        description="Weekly changelog of GitHub Project board activity"
      >
        <div className="container margin-vert--lg">
          <div className={styles.header}>
            <h1>Board Activity</h1>
            <p>
              Track project progress and updates from our GitHub Project board.
            </p>
          </div>
          <div className={styles.noItems}>
            No board data available. Board data is fetched during the build
            process.
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title="Board Activity"
      description="Weekly changelog of GitHub Project board activity"
    >
      <div className="container margin-vert--lg">
        <div className={styles.header}>
          <h1>Board Activity</h1>
          <p>
            Track project progress and updates from our GitHub Project board.
          </p>
        </div>

        {/* Summary Section */}
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <h3>{summary.total}</h3>
            <p>Total Items</p>
          </div>
          {Object.entries(summary.byStatus)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([status, count]) => (
              <div key={status} className={styles.summaryCard}>
                <h3>{count}</h3>
                <p>{status}</p>
              </div>
            ))}
        </div>

        {/* Weekly Sections */}
        {itemsByWeek.map(([weekKey, items]) => {
          const weekStart = new Date(weekKey);
          const weekRange = formatWeekRange(weekStart);

          return (
            <div key={weekKey} className={styles.weekSection}>
              <h2 className={styles.weekHeader}>Week of {weekRange}</h2>
              <div className={styles.cardGrid}>
                {items.map((item) => {
                  const statusClass = normalizeStatus(item.status);

                  return (
                    <div key={item.id} className={styles.card}>
                      <h3 className={styles.cardTitle}>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {item.title}
                        </a>
                      </h3>

                      <div className={styles.cardMeta}>
                        <div className={styles.cardMetaItem}>
                          <strong>By:</strong> {item.author}
                        </div>
                        <div className={styles.cardMetaItem}>
                          <strong>Updated:</strong>{" "}
                          {new Date(item.updatedAt).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </div>
                      </div>

                      <div className={styles.cardMeta}>
                        <span
                          className={`${styles.status} ${styles[statusClass]}`}
                        >
                          {item.status}
                        </span>
                        {item.labels.length > 0 && (
                          <div className={styles.cardLabels}>
                            {item.labels.map((label) => (
                              <span key={label} className={styles.label}>
                                {label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {item.description && (
                        <div className={styles.cardDescription}>
                          {item.description}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Layout>
  );
};

export default BoardChangelog;
