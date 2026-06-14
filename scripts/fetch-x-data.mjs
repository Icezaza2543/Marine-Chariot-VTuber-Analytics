import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const X_API_BASE = 'https://api.x.com/2'
const DEFAULT_USERNAME = 'MarineChariot'
const DEFAULT_OUT = 'public/data/marine-x-posts.json'
const DEFAULT_MAX_POSTS = 100
const DEFAULT_MAX_PAGES = 3

const args = parseArgs(process.argv.slice(2))
const env = loadEnvFiles(['.env.local', '.env'])
const username = String(args.username ?? env.X_USERNAME ?? DEFAULT_USERNAME).replace(/^@/, '')
const outputPath = resolve(String(args.out ?? DEFAULT_OUT))
const maxPosts = clampInt(Number(args.maxPosts ?? env.X_MAX_POSTS ?? DEFAULT_MAX_POSTS), 5, 500)
const maxPages = clampInt(Number(args.maxPages ?? env.X_MAX_PAGES ?? DEFAULT_MAX_PAGES), 1, 10)
const bearerToken = String(env.X_BEARER_TOKEN ?? '').trim()
const optional = Boolean(args.optional)

if (!bearerToken) {
  const message = 'X_BEARER_TOKEN is not set. Skipping X fetch and keeping the existing cache.'

  if (optional) {
    ensureCacheFile(outputPath, username, message)
    console.warn(message)
    process.exit(0)
  }

  console.error(`${message}\nSet X_BEARER_TOKEN in .env.local or Vercel env vars, then run npm run fetch:x.`)
  process.exit(1)
}

try {
  const profileResponse = await xFetch(`/users/by/username/${encodeURIComponent(username)}`, {
    'user.fields': 'created_at,description,location,profile_image_url,public_metrics,verified,verified_type,url',
  })
  const profile = profileResponse.data

  if (!profile?.id) {
    throw new Error(`X user @${username} was not found.`)
  }

  const posts = []
  let nextToken = undefined

  for (let page = 0; page < maxPages && posts.length < maxPosts; page += 1) {
    const params = {
      max_results: String(Math.min(100, maxPosts - posts.length)),
      exclude: 'retweets',
      'tweet.fields':
        'created_at,public_metrics,entities,lang,possibly_sensitive,referenced_tweets,conversation_id',
    }

    if (nextToken) {
      params.pagination_token = nextToken
    }

    const timeline = await xFetch(`/users/${profile.id}/tweets`, params)
    posts.push(...(timeline.data ?? []).map(normalizePost))
    nextToken = timeline.meta?.next_token

    if (!nextToken) {
      break
    }
  }

  const dataset = {
    sourceUrl: `https://x.com/${username}`,
    fetchedAt: new Date().toISOString(),
    profile: normalizeProfile(profile),
    posts: posts.slice(0, maxPosts),
    meta: {
      status: 'ok',
      username,
      requestedMaxPosts: maxPosts,
      pagesFetched: Math.ceil(posts.length / 100) || 1,
      api: 'X API v2 user timeline',
    },
  }

  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, `${JSON.stringify(dataset, null, 2)}\n`)
  console.log(`Fetched ${dataset.posts.length} X posts for @${username} -> ${outputPath}`)
} catch (error) {
  if (optional) {
    const message = error instanceof Error ? error.message : String(error)
    ensureCacheFile(outputPath, username, `X fetch failed: ${message}`)
    console.warn(`X fetch failed in optional mode: ${message}`)
    process.exit(0)
  }

  throw error
}

async function xFetch(path, params) {
  const url = new URL(`${X_API_BASE}${path}`)

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value))
    }
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      'User-Agent': 'marine-chariot-vtuber-analytics/1.0',
    },
  })

  if (!response.ok) {
    const resetAt = response.headers.get('x-rate-limit-reset')
    const retryHint = resetAt ? ` Rate limit resets at ${new Date(Number(resetAt) * 1000).toISOString()}.` : ''
    const body = await response.text()
    throw new Error(`X API ${response.status} ${response.statusText}.${retryHint} ${body}`)
  }

  return response.json()
}

function normalizeProfile(profile) {
  const metrics = profile.public_metrics ?? {}

  return {
    id: profile.id,
    username: profile.username,
    name: profile.name,
    description: profile.description ?? '',
    url: profile.url ?? `https://x.com/${profile.username}`,
    profileImageUrl: profile.profile_image_url ?? '',
    verified: Boolean(profile.verified),
    verifiedType: profile.verified_type ?? null,
    followersCount: numberOrZero(metrics.followers_count),
    followingCount: numberOrZero(metrics.following_count),
    postCount: numberOrZero(metrics.tweet_count),
    listedCount: numberOrZero(metrics.listed_count),
  }
}

function normalizePost(post) {
  const metrics = post.public_metrics ?? {}
  const urls = (post.entities?.urls ?? []).map((url) => ({
    url: url.url,
    expandedUrl: url.expanded_url ?? url.url,
    displayUrl: url.display_url ?? url.url,
    title: url.title ?? '',
    description: url.description ?? '',
  }))
  const hashtags = (post.entities?.hashtags ?? []).map((hashtag) => hashtag.tag)
  const likeCount = numberOrZero(metrics.like_count)
  const repostCount = numberOrZero(metrics.retweet_count)
  const replyCount = numberOrZero(metrics.reply_count)
  const quoteCount = numberOrZero(metrics.quote_count)
  const bookmarkCount = numberOrZero(metrics.bookmark_count)
  const impressionCount = numberOrZero(metrics.impression_count)

  return {
    id: post.id,
    url: `https://x.com/${username}/status/${post.id}`,
    text: post.text ?? '',
    createdAt: post.created_at ?? '',
    lang: post.lang ?? '',
    conversationId: post.conversation_id ?? post.id,
    likeCount,
    repostCount,
    replyCount,
    quoteCount,
    bookmarkCount,
    impressionCount,
    engagementCount: likeCount + repostCount + replyCount + quoteCount + bookmarkCount,
    hashtags,
    urls,
    referencedTweets: post.referenced_tweets ?? [],
  }
}

function ensureCacheFile(path, usernameValue, message) {
  if (existsSync(path)) {
    return
  }

  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(
    path,
    `${JSON.stringify(
      {
        sourceUrl: `https://x.com/${usernameValue}`,
        fetchedAt: null,
        profile: null,
        posts: [],
        meta: {
          status: 'empty-cache',
          message,
        },
      },
      null,
      2,
    )}\n`,
  )
}

function parseArgs(values) {
  return values.reduce((current, value, index) => {
    if (value === '--optional') {
      current.optional = true
      return current
    }

    if (value.startsWith('--')) {
      const rawKey = value.slice(2)
      const nextValue = values[index + 1]
      const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())

      if (nextValue && !nextValue.startsWith('--')) {
        current[key] = nextValue
      }
    }

    return current
  }, {})
}

function loadEnvFiles(files) {
  const loaded = { ...process.env }

  for (const file of files) {
    if (!existsSync(file)) {
      continue
    }

    const lines = readFileSync(file, 'utf8').split(/\r?\n/)

    for (const line of lines) {
      const trimmed = line.trim()

      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
        continue
      }

      const [key, ...rest] = trimmed.split('=')
      const value = rest.join('=').trim().replace(/^['"]|['"]$/g, '')
      loaded[key.trim()] = value
    }
  }

  return loaded
}

function clampInt(value, min, max) {
  if (!Number.isFinite(value)) {
    return min
  }

  return Math.min(Math.max(Math.round(value), min), max)
}

function numberOrZero(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}
