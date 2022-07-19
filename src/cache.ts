import * as cache from '@actions/cache'
import * as core from '@actions/core'
import * as path from 'path'
import {Tools, isWindows, isMacOS} from './utils'
import {VERSION} from './version'

const cacheDir = process.env['RUNNER_TOOL_CACHE'] || ''
const platform = isWindows() ? 'windows' : isMacOS() ? 'darwin' : 'linux'

export async function save(tools: Tools): Promise<void> {
  try {
    await cache.saveCache(getCachePaths(tools), getCacheKey(tools))
  } catch (err) {
    core.info('Can not save cache.')
  }
}

export async function restore(tools: Tools): Promise<void> {
  try {
    await cache.restoreCache(getCachePaths(tools), getCacheKey(tools), [])
  } catch (err) {
    core.info('Can not restore cache')
  }
}

function getCacheKey(tools: Tools): string {
  return `setup-clojure-${VERSION}-${platform}-${getIdentifiers(tools).join(
    '-'
  )}`
}

function getCachePaths(tools: Tools): string[] {
  return getIdentifiers(tools).map(tool => path.join(cacheDir, tool))
}

function getIdentifiers({
  LEIN_VERSION,
  BOOT_VERSION,
  TDEPS_VERSION,
  CLI_VERSION,
  BB_VERSION,
  CLJ_KONDO_VERSION,
  CLJSTYLE_VERSION,
  ZPRINT_VERSION
}: Tools): string[] {
  const identifiers = []

  if (LEIN_VERSION) {
    identifiers.push('Leiningen')
  }

  if (BOOT_VERSION) {
    identifiers.push('Boot')
  }

  if (TDEPS_VERSION || CLI_VERSION) {
    identifiers.push('ClojureToolsDeps')
  }

  if (BB_VERSION) {
    identifiers.push('Babashka')
  }

  if (CLJ_KONDO_VERSION) {
    identifiers.push('clj-kondo')
  }

  if (CLJSTYLE_VERSION) {
    identifiers.push('cljstyle')
  }

  if (ZPRINT_VERSION) {
    identifiers.push('zprint')
  }

  return identifiers
}
