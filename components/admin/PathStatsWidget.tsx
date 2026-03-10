'use client';

import { useEffect, useState } from 'react';
import type { PathStats } from '@/lib/paths/types';

export function PathStatsWidget() {
  const [stats, setStats] = useState<PathStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/paths/stats')
      .then((res) => res.json())
      .then((data) => setStats(data.stats))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-bg-secondary border border-border-default rounded-lg p-5 animate-pulse">
        <div className="h-4 w-24 bg-bg-tertiary rounded mb-4" />
        <div className="space-y-3">
          <div className="h-3 w-40 bg-bg-tertiary rounded" />
          <div className="h-3 w-32 bg-bg-tertiary rounded" />
          <div className="h-3 w-36 bg-bg-tertiary rounded" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="bg-bg-secondary border border-border-default rounded-lg p-5">
      <h2 className="text-sm font-semibold text-fg-primary uppercase tracking-wider mb-4">
        Self-Study Paths
      </h2>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-fg-secondary">Total paths generated</span>
          <span className="text-fg-primary font-medium">{stats.totalPaths}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-fg-secondary">Active paths</span>
          <span className="text-fg-primary font-medium">{stats.activePaths}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-fg-secondary">Completed</span>
          <span className="text-fg-primary font-medium">{stats.completedPaths}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-fg-secondary">Avg items per path</span>
          <span className="text-fg-primary font-medium">{stats.avgItemsPerPath}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-fg-secondary">Avg completion rate</span>
          <span className="text-fg-primary font-medium">{stats.avgCompletionRate}%</span>
        </div>

        {stats.topTopics.length > 0 && (
          <div className="pt-2 border-t border-border-default">
            <p className="text-xs text-fg-muted uppercase tracking-wider mb-2">
              Most requested topics
            </p>
            {stats.topTopics.map((topic, i) => (
              <div key={topic.topic} className="flex justify-between text-xs py-0.5">
                <span className="text-fg-secondary">
                  {i + 1}. {topic.topic}
                </span>
                <span className="text-fg-muted">{topic.count} paths</span>
              </div>
            ))}
          </div>
        )}

        {stats.topContentItems.length > 0 && (
          <div className="pt-2 border-t border-border-default">
            <p className="text-xs text-fg-muted uppercase tracking-wider mb-2">
              Most used content
            </p>
            {stats.topContentItems.slice(0, 3).map((item, i) => (
              <div key={i} className="flex justify-between text-xs py-0.5">
                <span className="text-fg-secondary truncate mr-2">
                  {i + 1}. {item.title}
                </span>
                <span className="text-fg-muted shrink-0">in {item.count} paths</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
