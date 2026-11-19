import { VideoAnalytics, AnalyticsSummary, PerformanceTier, VideoProject } from '../types';

export interface AnalyticsInsights {
  topPerformingVideo: VideoAnalytics | null;
  highestCtrVideo: VideoAnalytics | null;
  highestRetentionVideo: VideoAnalytics | null;
  formatComparison: Array<{
    format: string;
    videoCount: number;
    totalViews: number;
    avgCtr: number | null;
    avgPercentageViewed: number | null;
  }>;
  trafficBreakdown: Array<{
    source: string;
    videoCount: number;
    percentage: number;
  }>;
  whatWorked: string[];
  whatNeedsImprovement: string[];
  whatToTryNext: string[];
}

/**
 * Calculate summary metrics from entered video analytics records.
 * Only values entered by the creator are calculated.
 */
export function calculateAnalyticsSummary(analyticsList: VideoAnalytics[]): AnalyticsSummary {
  if (!analyticsList || analyticsList.length === 0) {
    return {
      totalVideos: 0,
      totalViews: 0,
      totalWatchTimeMinutes: 0,
      totalSubscribersGained: 0,
      averageCtr: null,
      averageViewDurationSeconds: null,
      averagePercentageViewed: null,
      engagementRate: null,
      hasReliableBaseline: false,
      baselineNote: 'No video records logged yet.',
      demoCount: 0,
      realCount: 0,
    };
  }

  let totalViews = 0;
  let totalWatchTime = 0;
  let totalSubs = 0;
  let ctrSum = 0;
  let ctrCount = 0;
  let avdSum = 0;
  let avdCount = 0;
  let apvSum = 0;
  let apvCount = 0;
  let totalLikes = 0;
  let totalComments = 0;
  let demoCount = 0;
  let realCount = 0;

  for (const item of analyticsList) {
    if (item.isDemoData || item.id.startsWith('test-va-')) {
      demoCount += 1;
    } else {
      realCount += 1;
    }

    if (typeof item.views === 'number') totalViews += item.views;
    if (typeof item.watchTimeMinutes === 'number') totalWatchTime += item.watchTimeMinutes;
    if (typeof item.subscribersGained === 'number') totalSubs += item.subscribersGained;

    if (typeof item.ctr === 'number' && !isNaN(item.ctr)) {
      ctrSum += item.ctr;
      ctrCount += 1;
    }

    if (typeof item.averageViewDurationSeconds === 'number' && !isNaN(item.averageViewDurationSeconds)) {
      avdSum += item.averageViewDurationSeconds;
      avdCount += 1;
    }

    if (typeof item.averagePercentageViewed === 'number' && !isNaN(item.averagePercentageViewed)) {
      apvSum += item.averagePercentageViewed;
      apvCount += 1;
    }

    if (typeof item.likes === 'number') totalLikes += item.likes;
    if (typeof item.comments === 'number') totalComments += item.comments;
  }

  const averageCtr = ctrCount > 0 ? Number((ctrSum / ctrCount).toFixed(1)) : null;
  const averageViewDurationSeconds = avdCount > 0 ? Math.round(avdSum / avdCount) : null;
  const averagePercentageViewed = apvCount > 0 ? Number((apvSum / apvCount).toFixed(1)) : null;

  // Engagement rate: (Likes + Comments) / Views * 100
  const engagementRate = totalViews > 0 
    ? Number((((totalLikes + totalComments) / totalViews) * 100).toFixed(2)) 
    : null;

  const hasReliableBaseline = analyticsList.length >= 3;
  const baselineNote = hasReliableBaseline
    ? `Personal channel baseline calculated from ${analyticsList.length} logged videos.`
    : `Not enough history for a reliable baseline (requires at least 3 videos; ${analyticsList.length} currently logged).`;

  return {
    totalVideos: analyticsList.length,
    totalViews,
    totalWatchTimeMinutes: Math.round(totalWatchTime),
    totalSubscribersGained: totalSubs,
    averageCtr,
    averageViewDurationSeconds,
    averagePercentageViewed,
    engagementRate,
    hasReliableBaseline,
    baselineNote,
    demoCount,
    realCount,
  };
}

/**
 * Determine performance tier for an individual video based on CTR and retention
 * Uses comparative evaluation against creator's personal history when available
 */
export function evaluateVideoPerformance(
  video: VideoAnalytics,
  channelBaseline?: { avgCtr: number | null; avgRetention: number | null; hasReliableBaseline: boolean }
): {
  tier: PerformanceTier;
  reasons: string[];
  badges: string[];
} {
  const reasons: string[] = [];
  const badges: string[] = [];

  const hasCtr = typeof video.ctr === 'number';
  const hasRetention = typeof video.averagePercentageViewed === 'number';
  const hasAvd = typeof video.averageViewDurationSeconds === 'number';
  const hasViews = typeof video.views === 'number';

  if (!hasCtr && !hasRetention && !hasAvd && !hasViews) {
    return {
      tier: 'Not Enough Data',
      reasons: ['Add CTR, views, or retention to evaluate.'],
      badges: ['Pending metrics'],
    };
  }

  let score = 0;

  // Comparative CTR evaluation
  if (hasCtr && video.ctr !== undefined) {
    if (channelBaseline?.hasReliableBaseline && channelBaseline.avgCtr !== null) {
      const diff = video.ctr - channelBaseline.avgCtr;
      if (diff >= 1.5) {
        score += 2;
        badges.push('High CTR');
        reasons.push(`Your CTR (${video.ctr}%) is higher than your recent channel average (${channelBaseline.avgCtr}%).`);
      } else if (diff >= -1.0) {
        score += 1;
        badges.push('Consistent CTR');
        reasons.push(`Your CTR (${video.ctr}%) is consistent with your channel average (${channelBaseline.avgCtr}%).`);
      } else {
        score -= 1;
        badges.push('CTR Below Baseline');
        reasons.push(`Your CTR (${video.ctr}%) is below your recent channel average (${channelBaseline.avgCtr}%).`);
      }
    } else {
      // Preliminary evaluation without assuming universal 5% guarantee
      if (video.ctr >= 7.5) {
        score += 2;
        badges.push('Strong Click-Through');
        reasons.push('Title & thumbnail generated strong preliminary click interest.');
      } else if (video.ctr >= 4.5) {
        score += 1;
        badges.push('Moderate Click-Through');
        reasons.push('Click interest is steady. Compare against future uploads once 3+ videos are logged.');
      } else {
        score -= 1;
        reasons.push('Click rate is modest. Testing a 3-word high-contrast thumbnail overlay may lift clicks.');
      }
    }
  }

  // Retention evaluation — strictly only when actual retention metrics exist!
  if (hasRetention && video.averagePercentageViewed !== undefined) {
    const isShort = video.format.toLowerCase().includes('short');
    if (channelBaseline?.hasReliableBaseline && channelBaseline.avgRetention !== null) {
      const diff = video.averagePercentageViewed - channelBaseline.avgRetention;
      if (diff >= 5.0) {
        score += 2;
        badges.push('High Retention');
        reasons.push(`Retention (${video.averagePercentageViewed}%) is higher than your recent channel average (${channelBaseline.avgRetention}%).`);
      } else if (diff >= -5.0) {
        score += 1;
        badges.push('Steady Retention');
        reasons.push(`Retention is in line with your recent channel average (${channelBaseline.avgRetention}%).`);
      } else {
        score -= 1;
        badges.push('Lower Retention');
        reasons.push(`Retention is below your channel average. Review the pacing in the first 15 seconds.`);
      }
    } else {
      const target = isShort ? 65 : 45;
      if (video.averagePercentageViewed >= target + 10) {
        score += 2;
        badges.push('Strong Watch Time');
        reasons.push(`Viewer retention (${video.averagePercentageViewed}%) remained high throughout.`);
      } else if (video.averagePercentageViewed >= target - 5) {
        score += 1;
        badges.push('Steady Watch Time');
        reasons.push(`Retention (${video.averagePercentageViewed}%) held steady.`);
      } else {
        score -= 1;
        reasons.push(`Early drop-off detected (${video.averagePercentageViewed}% avg viewed).`);
      }
    }
  }

  if (typeof video.subscribersGained === 'number' && video.subscribersGained > 15) {
    score += 1;
    badges.push('Subscriber Driver');
    reasons.push(`Converted ${video.subscribersGained} new subscribers directly.`);
  }

  let tier: PerformanceTier = 'Healthy';
  if (score >= 2) tier = 'Strong';
  else if (score <= -1) tier = 'Needs Attention';

  return { tier, reasons, badges };
}

/**
 * Generate deterministic insights answering:
 * "What worked?"
 * "What needs improvement?"
 * "What should I try next?"
 */
export function generateAnalyticsInsights(analyticsList: VideoAnalytics[]): AnalyticsInsights {
  if (!analyticsList || analyticsList.length === 0) {
    return {
      topPerformingVideo: null,
      highestCtrVideo: null,
      highestRetentionVideo: null,
      formatComparison: [],
      trafficBreakdown: [],
      whatWorked: [],
      whatNeedsImprovement: [],
      whatToTryNext: [],
    };
  }

  // Top videos by metric
  const sortedByViews = [...analyticsList].filter(v => typeof v.views === 'number').sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
  const sortedByCtr = [...analyticsList].filter(v => typeof v.ctr === 'number').sort((a, b) => (b.ctr ?? 0) - (a.ctr ?? 0));
  const sortedByRetention = [...analyticsList].filter(v => typeof v.averagePercentageViewed === 'number').sort((a, b) => (b.averagePercentageViewed ?? 0) - (a.averagePercentageViewed ?? 0));

  const topPerformingVideo = sortedByViews[0] || analyticsList[0];
  const highestCtrVideo = sortedByCtr[0] || null;
  const highestRetentionVideo = sortedByRetention[0] || null;

  // Format comparisons
  const formatMap = new Map<string, { count: number; totalViews: number; ctrSum: number; ctrCount: number; apvSum: number; apvCount: number }>();
  for (const item of analyticsList) {
    const fmt = item.format || 'Long-form';
    const entry = formatMap.get(fmt) || { count: 0, totalViews: 0, ctrSum: 0, ctrCount: 0, apvSum: 0, apvCount: 0 };
    entry.count += 1;
    if (typeof item.views === 'number') entry.totalViews += item.views;
    if (typeof item.ctr === 'number') {
      entry.ctrSum += item.ctr;
      entry.ctrCount += 1;
    }
    if (typeof item.averagePercentageViewed === 'number') {
      entry.apvSum += item.averagePercentageViewed;
      entry.apvCount += 1;
    }
    formatMap.set(fmt, entry);
  }

  const formatComparison = Array.from(formatMap.entries()).map(([format, data]) => ({
    format,
    videoCount: data.count,
    totalViews: data.totalViews,
    avgCtr: data.ctrCount > 0 ? Number((data.ctrSum / data.ctrCount).toFixed(1)) : null,
    avgPercentageViewed: data.apvCount > 0 ? Number((data.apvSum / data.apvCount).toFixed(1)) : null,
  }));

  // Traffic Source distribution
  const trafficMap = new Map<string, number>();
  let totalWithTraffic = 0;
  for (const item of analyticsList) {
    const src = item.trafficSource || 'YouTube Search';
    trafficMap.set(src, (trafficMap.get(src) || 0) + 1);
    totalWithTraffic += 1;
  }
  const trafficBreakdown = Array.from(trafficMap.entries()).map(([source, count]) => ({
    source,
    videoCount: count,
    percentage: Math.round((count / (totalWithTraffic || 1)) * 100),
  })).sort((a, b) => b.videoCount - a.videoCount);

  // Deterministic insights with comparative language
  const whatWorked: string[] = [];
  const whatNeedsImprovement: string[] = [];
  const whatToTryNext: string[] = [];

  const hasReliableBaseline = analyticsList.length >= 3;
  const ctrVideos = analyticsList.filter(v => typeof v.ctr === 'number');
  const avgChannelCtr = ctrVideos.length > 0 
    ? Number((ctrVideos.reduce((acc, v) => acc + (v.ctr || 0), 0) / ctrVideos.length).toFixed(1))
    : null;

  const viewsVideos = analyticsList.filter(v => typeof v.views === 'number');
  const avgChannelViews = viewsVideos.length > 0
    ? Math.round(viewsVideos.reduce((acc, v) => acc + (v.views || 0), 0) / viewsVideos.length)
    : null;

  if (!hasReliableBaseline) {
    whatWorked.push(
      `Preliminary analysis (${analyticsList.length} video${analyticsList.length > 1 ? 's' : ''} logged). Log at least 3 videos to establish a reliable personal channel baseline.`
    );
  }

  if (topPerformingVideo && typeof topPerformingVideo.views === 'number') {
    const comparisonText = avgChannelViews && topPerformingVideo.views > avgChannelViews && hasReliableBaseline
      ? ` (${topPerformingVideo.views.toLocaleString()} views vs your ${avgChannelViews.toLocaleString()} channel average)`
      : ` (${topPerformingVideo.views.toLocaleString()} views)`;
    whatWorked.push(
      `"${topPerformingVideo.videoTitle}" generated your strongest viewership to date${comparisonText}.`
    );
  }

  if (highestCtrVideo && typeof highestCtrVideo.ctr === 'number') {
    const ctrComparison = avgChannelCtr && highestCtrVideo.ctr > avgChannelCtr && hasReliableBaseline
      ? ` (higher than your recent channel average of ${avgChannelCtr}%)`
      : '';
    whatWorked.push(
      `Highest CTR achieved: ${highestCtrVideo.ctr}% on "${highestCtrVideo.videoTitle}"${ctrComparison}. The title hook and topic framing resonated effectively in feeds.`
    );
  }

  if (highestRetentionVideo && typeof highestRetentionVideo.averagePercentageViewed === 'number') {
    whatWorked.push(
      `Top retention rate: ${highestRetentionVideo.averagePercentageViewed}% on "${highestRetentionVideo.videoTitle}". The structured delivery held viewer attention.`
    );
  }

  // Format observations
  const shortsFormat = formatComparison.find(f => f.format.toLowerCase().includes('short'));
  const longFormat = formatComparison.find(f => !f.format.toLowerCase().includes('short'));

  if (shortsFormat && longFormat) {
    if (shortsFormat.avgPercentageViewed && longFormat.avgPercentageViewed) {
      whatWorked.push(
        `Shorts are averaging ${shortsFormat.avgPercentageViewed}% retention compared to ${longFormat.avgPercentageViewed}% on your longer formats.`
      );
    }
  }

  // Traffic source note
  if (trafficBreakdown.length > 0) {
    const topSource = trafficBreakdown[0];
    whatWorked.push(
      `Primary discovery channel: ${topSource.source} (${topSource.percentage}% of analyzed catalog).`
    );
  }

  // What needs improvement (comparative against creator's channel average when baseline exists)
  if (hasReliableBaseline && avgChannelCtr !== null) {
    const belowAvgCtr = analyticsList.filter(v => typeof v.ctr === 'number' && v.ctr < avgChannelCtr - 1.0);
    if (belowAvgCtr.length > 0) {
      whatNeedsImprovement.push(
        `${belowAvgCtr.length} video${belowAvgCtr.length > 1 ? 's have' : ' has'} CTR below your ${avgChannelCtr}% channel average. Testing alternative 3-word bold thumbnail text overlays can help lift feed clicks.`
      );
    }
  } else {
    const lowCtrVideos = analyticsList.filter(v => typeof v.ctr === 'number' && v.ctr < 4.5);
    if (lowCtrVideos.length > 0) {
      whatNeedsImprovement.push(
        `${lowCtrVideos.length} video${lowCtrVideos.length > 1 ? 's have' : ' has'} modest click-through (< 4.5%). Reworking the title hook line or testing higher contrast thumbnails may improve curiosity.`
      );
    }
  }

  const lowRetentionVideos = analyticsList.filter(v => typeof v.averagePercentageViewed === 'number' && v.averagePercentageViewed < 38);
  if (lowRetentionVideos.length > 0) {
    whatNeedsImprovement.push(
      `Early drop-off observed on ${lowRetentionVideos.length} video${lowRetentionVideos.length > 1 ? 's' : ''} (retention < 38%). Tighten introductions to under 5 seconds to deliver the promise immediately.`
    );
  }

  if (whatNeedsImprovement.length === 0) {
    whatNeedsImprovement.push('Consistent metrics across your videos. Watch for viewer drop-offs around the mid-point transition mark.');
  }

  // What to try next
  if (topPerformingVideo) {
    whatToTryNext.push(
      `Create a direct follow-up or "Part 2 / Advanced Guide" for your top video topic: "${topPerformingVideo.topic || topPerformingVideo.videoTitle}".`
    );
  }

  if (highestCtrVideo) {
    whatToTryNext.push(
      `Replicate the title style of "${highestCtrVideo.videoTitle}" on 2 future videos in your content planner.`
    );
  }

  if (shortsFormat && shortsFormat.videoCount > 0) {
    whatToTryNext.push(
      'Turn high-retention moments from your long-form videos into 30-second Shorts with quick B-roll transitions.'
    );
  } else {
    whatToTryNext.push(
      'Experiment with 1 Short this week to test discovery in the Shorts feed alongside your main videos.'
    );
  }

  return {
    topPerformingVideo,
    highestCtrVideo,
    highestRetentionVideo,
    formatComparison,
    trafficBreakdown,
    whatWorked,
    whatNeedsImprovement,
    whatToTryNext,
  };
}

/**
 * Format minutes into readable duration string (e.g. 120 mins -> 2h 0m)
 */
export function formatWatchTime(minutes: number): string {
  if (!minutes || minutes <= 0) return '0 min';
  const hours = Math.floor(minutes / 60);
  const remainingMins = Math.round(minutes % 60);
  if (hours === 0) return `${remainingMins} min`;
  if (remainingMins === 0) return `${hours} hrs`;
  return `${hours}h ${remainingMins}m`;
}

/**
 * Format seconds into mm:ss
 */
export function formatSecondsToTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Parse mm:ss or seconds string to numeric seconds
 */
export function parseTimeToSeconds(input: string): number | undefined {
  if (!input) return undefined;
  const trimmed = input.trim();
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    const mins = parseInt(parts[0], 10) || 0;
    const secs = parseInt(parts[1], 10) || 0;
    return mins * 60 + secs;
  }
  const parsed = Number(trimmed);
  return !isNaN(parsed) && parsed >= 0 ? Math.round(parsed) : undefined;
}
