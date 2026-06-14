import type { XDataset, XPost } from '../types'

const X_DATA_PATH = '/data/marine-x-posts.json'

export async function loadMarineXData(): Promise<XDataset> {
  try {
    const response = await fetch(X_DATA_PATH)

    if (!response.ok) {
      return emptyXDataset(`X cache not found at ${X_DATA_PATH}`)
    }

    const dataset = (await response.json()) as XDataset

    return {
      sourceUrl: dataset.sourceUrl ?? 'https://x.com/MarineChariot',
      fetchedAt: dataset.fetchedAt ?? null,
      profile: dataset.profile ?? null,
      posts: (dataset.posts ?? []).map(normalizePost),
      meta: {
        status: dataset.meta?.status ?? 'unknown',
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

function normalizePost(post: XPost): XPost {
  const engagementCount =
    post.engagementCount ??
    post.likeCount + post.repostCount + post.replyCount + post.quoteCount + post.bookmarkCount

  return {
    id: String(post.id),
    url: post.url,
    text: post.text ?? '',
    createdAt: post.createdAt ?? '',
    lang: post.lang ?? '',
    conversationId: post.conversationId ?? post.id,
    likeCount: numberOrZero(post.likeCount),
    repostCount: numberOrZero(post.repostCount),
    replyCount: numberOrZero(post.replyCount),
    quoteCount: numberOrZero(post.quoteCount),
    bookmarkCount: numberOrZero(post.bookmarkCount),
    impressionCount: numberOrZero(post.impressionCount),
    engagementCount: numberOrZero(engagementCount),
    hashtags: post.hashtags ?? [],
    urls: post.urls ?? [],
    referencedTweets: post.referencedTweets ?? [],
  }
}

function emptyXDataset(message: string): XDataset {
  return {
    sourceUrl: 'https://x.com/MarineChariot',
    fetchedAt: null,
    profile: null,
    posts: [],
    meta: {
      status: 'empty-cache',
      message,
    },
  }
}

function numberOrZero(value: number | undefined) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}
