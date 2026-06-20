import { z } from 'zod'
import type { XDataset, XPost, XProfile } from '../types'

const X_DATA_PATH = '/data/marine-x-posts.json'
const X_SOURCE_URL = 'https://x.com/MarineChariot'

const optionalNumberSchema = z.coerce.number().optional()
const xPostUrlSchema = z.object({
  url: z.string().optional().default(''),
  expandedUrl: z.string().optional().default(''),
  displayUrl: z.string().optional().default(''),
  title: z.string().optional().default(''),
  description: z.string().optional().default(''),
}).passthrough()
const xPostSchema = z.object({
  id: z.union([z.string(), z.number()]),
  url: z.string().optional(),
  text: z.string().optional().default(''),
  createdAt: z.string().optional().default(''),
  lang: z.string().optional().default(''),
  conversationId: z.union([z.string(), z.number()]).optional(),
  likeCount: optionalNumberSchema,
  repostCount: optionalNumberSchema,
  replyCount: optionalNumberSchema,
  quoteCount: optionalNumberSchema,
  bookmarkCount: optionalNumberSchema,
  impressionCount: optionalNumberSchema,
  engagementCount: optionalNumberSchema,
  hashtags: z.array(z.string()).optional().default([]),
  urls: z.array(xPostUrlSchema).optional().default([]),
  referencedTweets: z.array(z.object({
    type: z.string().optional().default(''),
    id: z.union([z.string(), z.number()]),
  }).passthrough()).optional().default([]),
}).passthrough()
const xProfileSchema = z.object({
  id: z.union([z.string(), z.number()]),
  username: z.string().optional().default('MarineChariot'),
  name: z.string().optional().default('Marine Chariot'),
  description: z.string().optional().default(''),
  url: z.string().optional().default(X_SOURCE_URL),
  profileImageUrl: z.string().optional().default(''),
  verified: z.boolean().optional().default(false),
  verifiedType: z.string().nullable().optional().default(null),
  followersCount: optionalNumberSchema.default(0),
  followingCount: optionalNumberSchema.default(0),
  postCount: optionalNumberSchema.default(0),
  listedCount: optionalNumberSchema.default(0),
}).passthrough()
const xDatasetSchema = z.object({
  sourceUrl: z.string().optional().default(X_SOURCE_URL),
  fetchedAt: z.string().nullable().optional().default(null),
  profile: xProfileSchema.nullable().optional().default(null),
  posts: z.array(xPostSchema).optional().default([]),
  meta: z.object({
    status: z.string().optional().default('unknown'),
    message: z.string().optional(),
    username: z.string().optional(),
    requestedMaxPosts: optionalNumberSchema,
    pagesFetched: optionalNumberSchema,
    api: z.string().optional(),
  }).passthrough().optional().default({ status: 'unknown' }),
}).passthrough()

type ValidatedXPost = z.infer<typeof xPostSchema>
type ValidatedXProfile = z.infer<typeof xProfileSchema>

export async function loadMarineXData(): Promise<XDataset> {
  try {
    const response = await fetch(X_DATA_PATH)

    if (!response.ok) {
      return emptyXDataset(`X cache not found at ${X_DATA_PATH}`)
    }

    const dataset = validateXDataset(await response.json())

    return {
      sourceUrl: dataset.sourceUrl,
      fetchedAt: dataset.fetchedAt ?? null,
      profile: dataset.profile ? normalizeProfile(dataset.profile) : null,
      posts: dataset.posts.map(normalizePost),
      meta: {
        status: dataset.meta.status,
        message: dataset.meta?.message,
        username: dataset.meta?.username,
        requestedMaxPosts: dataset.meta?.requestedMaxPosts,
        pagesFetched: dataset.meta?.pagesFetched,
        api: dataset.meta?.api,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return emptyXDataset(message)
  }
}

function validateXDataset(value: unknown) {
  const result = xDatasetSchema.safeParse(value)

  if (!result.success) {
    throw new Error(`Invalid X cache shape at ${X_DATA_PATH}: ${formatZodIssues(result.error.issues)}`)
  }

  return result.data
}

function normalizeProfile(profile: ValidatedXProfile): XProfile {
  return {
    id: String(profile.id),
    username: profile.username,
    name: profile.name,
    description: profile.description,
    url: profile.url,
    profileImageUrl: profile.profileImageUrl,
    verified: profile.verified,
    verifiedType: profile.verifiedType,
    followersCount: numberOrZero(profile.followersCount),
    followingCount: numberOrZero(profile.followingCount),
    postCount: numberOrZero(profile.postCount),
    listedCount: numberOrZero(profile.listedCount),
  }
}

function normalizePost(post: ValidatedXPost): XPost {
  const engagementCount =
    post.engagementCount ??
    numberOrZero(post.likeCount) +
      numberOrZero(post.repostCount) +
      numberOrZero(post.replyCount) +
      numberOrZero(post.quoteCount) +
      numberOrZero(post.bookmarkCount)
  const id = String(post.id)

  return {
    id,
    url: post.url ?? `${X_SOURCE_URL}/status/${id}`,
    text: post.text ?? '',
    createdAt: post.createdAt ?? '',
    lang: post.lang ?? '',
    conversationId: String(post.conversationId ?? id),
    likeCount: numberOrZero(post.likeCount),
    repostCount: numberOrZero(post.repostCount),
    replyCount: numberOrZero(post.replyCount),
    quoteCount: numberOrZero(post.quoteCount),
    bookmarkCount: numberOrZero(post.bookmarkCount),
    impressionCount: numberOrZero(post.impressionCount),
    engagementCount: numberOrZero(engagementCount),
    hashtags: post.hashtags ?? [],
    urls: post.urls ?? [],
    referencedTweets: post.referencedTweets.map((tweet) => ({
      type: tweet.type,
      id: String(tweet.id),
    })),
  }
}

function emptyXDataset(message: string): XDataset {
  return {
    sourceUrl: X_SOURCE_URL,
    fetchedAt: null,
    profile: null,
    posts: [],
    meta: {
      status: 'empty-cache',
      message,
    },
  }
}

function formatZodIssues(issues: z.core.$ZodIssue[]) {
  return issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'cache'
      return `${path} ${issue.message}`
    })
    .join('; ')
}

function numberOrZero(value: number | undefined) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}
