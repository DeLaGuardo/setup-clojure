import * as cache from '@actions/cache'
import * as core from '@actions/core'
import * as path from 'path'
import os from 'os'
import {VERSION} from './version'

const cacheDir = process.env['RUNNER_TOOL_CACHE'] || ''

export async function save(identifier: string, version: string): Promise<void> {
  try {
    if (version !== 'latest') {
      await cache.saveCache(
        getCachePaths(identifier),
        getCacheKey(identifier, version)
      )
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    core.debug(error)
  }
}

export async function restore(
  identifier: string,
  version: string
): Promise<void> {
  try {
    if (version !== 'latest') {
      await cache.restoreCache(
        getCachePaths(identifier),
        getCacheKey(identifier, version),
        []
      )
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    core.debug(error)
  }
}

function getCacheKey(identifier: string, version: string): string {
  return `setupclojure-${os.platform()}-${VERSION}-${identifier}-${version}`
}

function getCachePaths(identifier: string): string[] {
  return [path.join(cacheDir, identifier)]
}
