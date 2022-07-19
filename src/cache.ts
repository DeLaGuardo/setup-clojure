import * as cache from '@actions/cache'
import * as core from '@actions/core'
import * as path from 'path'

const cacheDir = _getCacheDirectory()
const tools = [
  'Babashka',
  'Boot',
  'ClojureToolsDeps',
  'cljstyle',
  'clj-kondo',
  'Leiningen',
  'zprint'
]
const cachePaths = tools.map(tool => path.join(cacheDir, tool))
const cacheKey = `action-setup-clojure-tools-${tools.join('-')}`

export async function save(): Promise<void> {
  const cacheId = await cache.saveCache(cachePaths, cacheKey)

  if (cacheId !== -1) {
    core.info(`Cache saved with key: ${cacheKey}`)
  }
}

export async function restore(): Promise<void> {
  await cache.restoreCache(cachePaths, cacheKey, [
    'action-setup-clojure-tools-'
  ])
}

function _getCacheDirectory(): string {
  const cacheDirectory = process.env['RUNNER_TOOL_CACHE'] || ''
  return cacheDirectory
}
