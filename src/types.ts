export type MetricKey =
  | 'views'
  | 'likes'
  | 'comments'
  | 'engagementRate'
  | 'viralScore'
  | 'retentionScore'

export type Granularity = 'year' | 'month' | 'week' | 'day'

export interface RawMarineRow {
  No: string
  Urls: string
  'Video Name': string
  View: string
  Like: string
  Comm: string
  published_date: string
  duration: string
  minute: string
  type: string
  'Engagement Rate': string
  'AVG View Duration': string
  'Views to Likes Ratio': string
}

export interface VideoRecord {
  id: number
  url: string
  title: string
  views: number
  likes: number
  comments: number
  publishedAt: Date
  publishedDate: string
  duration: string
  minutes: number
  contentType: string
  engagementRate: number
  avgViewDurationRatio: number
  viewsToLikesRatio: number
  tags: string[]
  retentionMinutes: number
  retentionScore: number
  viralScore: number
  uploadYear: number
  uploadMonth: number
  uploadWeek: number
  weekday: number
}

export interface DashboardFilters {
  dateStart: string
  dateEnd: string
  granularity: Granularity
  contentTypes: string[]
  years: number[]
  months: number[]
  weeks: number[]
  search: string
  tag: string
}

export interface KpiValue {
  label: string
  value: string
  rawValue: number
  delta: number
  tone: 'pink' | 'violet' | 'cyan' | 'green' | 'amber'
}

export interface MonthlyMetric {
  key: string
  label: string
  date: Date
  views: number
  likes: number
  comments: number
  videos: number
  engagementRate: number
  cumulativeViews: number
  cumulativeLikes: number
}

export interface ForecastPoint {
  key: string
  label: string
  views: number
  likes: number
  engagementRate: number
  linearViews: number
  smoothedViews: number
}

export interface ContentTypeMetric {
  contentType: string
  videos: number
  views: number
  likes: number
  comments: number
  avgViews: number
  avgEngagementRate: number
  growthRate: number
  bestMonth: string
  avgRetentionScore: number
  avgViralScore: number
  score: number
}

export interface YearlyMetric {
  year: number
  videos: number
  views: number
  likes: number
  comments: number
  avgViews: number
  engagementRate: number
  retentionScore: number
  viralScore: number
}

export interface EngagementMixMetric {
  contentType: string
  views: number
  likes: number
  comments: number
  likesPerThousandViews: number
  commentsPerThousandViews: number
  conversationShare: number
}

export interface DurationBucketMetric {
  bucket: string
  videos: number
  avgViews: number
  avgEngagementRate: number
  avgRetentionScore: number
}

export interface ScatterPoint {
  x: number
  y: number
  r: number
  title: string
  contentType: string
  views: number
  viralScore: number
}

export interface HeatmapCell {
  weekday: number
  weekdayLabel: string
  slot: string
  count: number
  viewsPerUpload: number
  engagementRate: number
  score: number
}

export interface TableSort {
  key: MetricKey | 'publishedAt' | 'title' | 'contentType'
  direction: 'asc' | 'desc'
}

export interface StrategyInsight {
  title: string
  body: string
  confidence: number
  tone: 'pink' | 'violet' | 'cyan' | 'green' | 'amber'
}

export interface XProfile {
  id: string
  username: string
  name: string
  description: string
  url: string
  profileImageUrl: string
  verified: boolean
  verifiedType: string | null
  followersCount: number
  followingCount: number
  postCount: number
  listedCount: number
}

export interface XPostUrl {
  url: string
  expandedUrl: string
  displayUrl: string
  title: string
  description: string
}

export interface XPost {
  id: string
  url: string
  text: string
  createdAt: string
  lang: string
  conversationId: string
  likeCount: number
  repostCount: number
  replyCount: number
  quoteCount: number
  bookmarkCount: number
  impressionCount: number
  engagementCount: number
  hashtags: string[]
  urls: XPostUrl[]
  referencedTweets: Array<{ type: string; id: string }>
}

export interface XDataset {
  sourceUrl: string
  fetchedAt: string | null
  profile: XProfile | null
  posts: XPost[]
  meta: {
    status: string
    message?: string
    username?: string
    requestedMaxPosts?: number
    pagesFetched?: number
    api?: string
  }
}

export interface SocialVideoMatch {
  videoId: number
  title: string
  publishedDate: string
  contentType: string
  matchedPostCount: number
  socialEngagement: number
  estimatedReach: number
  liftScore: number
  topPostText: string
  topPostUrl: string
}

export interface HashtagMetric {
  tag: string
  count: number
}

export interface SocialMonthlyMetric {
  key: string
  label: string
  posts: number
  engagement: number
}

export interface SocialAnalytics {
  sourceUrl: string
  fetchedAt: string | null
  status: 'ready' | 'empty' | 'error'
  statusMessage: string
  profile: XProfile | null
  postCount: number
  totalEngagement: number
  avgEngagement: number
  estimatedReach: number
  crossPromoPostCount: number
  crossPromoRate: number
  topPost: XPost | null
  topHashtags: HashtagMetric[]
  monthlyMetrics: SocialMonthlyMetric[]
  videoMatches: SocialVideoMatch[]
  strategicInsight: string
}

export interface AnalyticsBundle {
  records: VideoRecord[]
  filteredRecords: VideoRecord[]
  social: SocialAnalytics
  kpis: KpiValue[]
  monthlyMetrics: MonthlyMetric[]
  forecast: ForecastPoint[]
  contentMetrics: ContentTypeMetric[]
  yearlyMetrics: YearlyMetric[]
  engagementMix: EngagementMixMetric[]
  durationMetrics: DurationBucketMetric[]
  scatterPoints: ScatterPoint[]
  heatmap: HeatmapCell[]
  topVideos: VideoRecord[]
  allContentTypes: string[]
  allYears: number[]
  allMonths: number[]
  allWeeks: number[]
  nextContentRecommendation: ContentTypeMetric | null
  optimalFrequency: string
  bestPostingSlot: HeatmapCell | null
  projectedGrowthRate: number
  insights: StrategyInsight[]
  sectionInsights: {
    growth: string
    content: string
    duration: string
    timing: string
    videos: string
    social: string
  }
}
