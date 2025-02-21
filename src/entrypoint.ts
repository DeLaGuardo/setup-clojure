import * as core from '@actions/core'
import * as cache from '@actions/cache'
import * as lein from './leiningen'
import * as boot from './boot'
import * as cli from './cli'
import * as bb from './babashka'
import * as cljKondo from './clj-kondo'
import * as cljfmt from './cljfmt'
import * as cljstyle from './cljstyle'
import * as zprint from './zprint'
import * as utils from './utils'
import process from 'node:process'
import * as path from 'path'
import os from 'os'
import {VERSION} from './version'

const cacheDir = process.env['RUNNER_TOOL_CACHE'] || ''

export async function main(): Promise<void> {
  const {
    LEIN_VERSION,
    BOOT_VERSION,
    TDEPS_VERSION,
    CLI_VERSION,
    BB_VERSION,
    CLJ_KONDO_VERSION,
    CLJFMT_VERSION,
    CLJSTYLE_VERSION,
    ZPRINT_VERSION
  } = getTools()

  const tools = []
  const invalidateCache = core.getBooleanInput('invalidate-cache')

  const githubToken = core.getInput('github-token')
  const githubAuthToken =
    githubToken?.length > 0 ? `Bearer ${githubToken}` : undefined

  try {
    if (LEIN_VERSION) {
      tools.push(
        setupTool(
          lein.identifier,
          LEIN_VERSION,
          invalidateCache,
          lein.setup.bind(null, LEIN_VERSION, githubAuthToken)
        )
      )
    }

    if (BOOT_VERSION) {
      tools.push(
        setupTool(
          boot.identifier,
          BOOT_VERSION,
          invalidateCache,
          boot.setup.bind(null, BOOT_VERSION, githubAuthToken)
        )
      )
    }

    if (CLI_VERSION) {
      tools.push(
        setupTool(
          cli.identifier,
          CLI_VERSION,
          invalidateCache,
          cli.setup.bind(null, CLI_VERSION, githubToken, githubAuthToken)
        )
      )
    }

    if (TDEPS_VERSION && !CLI_VERSION) {
      tools.push(
        setupTool(
          cli.identifier,
          TDEPS_VERSION,
          invalidateCache,
          cli.setup.bind(null, TDEPS_VERSION, githubToken, githubAuthToken)
        )
      )
    }

    if (BB_VERSION) {
      tools.push(
        setupTool(
          bb.identifier,
          BB_VERSION,
          invalidateCache,
          bb.setup.bind(null, BB_VERSION, githubAuthToken)
        )
      )
    }

    if (CLJ_KONDO_VERSION) {
      tools.push(
        setupTool(
          cljKondo.identifier,
          CLJ_KONDO_VERSION,
          invalidateCache,
          cljKondo.setup.bind(null, CLJ_KONDO_VERSION, githubAuthToken)
        )
      )
    }

    if (CLJFMT_VERSION) {
      tools.push(
        setupTool(
          cljfmt.identifier,
          CLJFMT_VERSION,
          invalidateCache,
          cljfmt.setup.bind(null, CLJFMT_VERSION, githubAuthToken)
        )
      )
    }

    if (CLJSTYLE_VERSION) {
      if (utils.isWindows()) {
        throw new Error('cljstyle on windows is not supported yet.')
      }
      tools.push(
        setupTool(
          cljstyle.identifier,
          CLJSTYLE_VERSION,
          invalidateCache,
          cljstyle.setup.bind(null, CLJSTYLE_VERSION, githubAuthToken)
        )
      )
    }

    if (ZPRINT_VERSION) {
      tools.push(
        setupTool(
          zprint.identifier,
          ZPRINT_VERSION,
          invalidateCache,
          zprint.setup.bind(null, ZPRINT_VERSION, githubAuthToken)
        )
      )
    }

    if (tools.length === 0) {
      throw new Error('You must specify at least one clojure tool.')
    }

    await Promise.all(tools)
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    core.debug(error)
    core.setFailed(error)
  }
}

async function setupTool(
  toolID: string,
  toolVersion: string,
  invalidateCache: boolean,
  setupFunction: () => Promise<void>
): Promise<void> {
  let cacheHit = false
  try {
    if (toolVersion !== 'latest' && !invalidateCache) {
      const res = await cache.restoreCache(
        getCachePaths(toolID),
        getCacheKey(toolID, toolVersion)
      )
      cacheHit = res !== undefined
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    core.debug(error)
  }

  await setupFunction()

  if (!cacheHit) {
    try {
      if (toolVersion !== 'latest') {
        await cache.saveCache(
          getCachePaths(toolID),
          getCacheKey(toolID, toolVersion)
        )
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      core.debug(error)
    }
  }
}

function getCacheKey(identifier: string, version: string): string {
  return `setupclojure-${os.platform()}-${VERSION}-${identifier}-${version}`
}

function getCachePaths(identifier: string): string[] {
  return [path.join(cacheDir, identifier)]
}

type Tools = {
  LEIN_VERSION: string | null | undefined
  BOOT_VERSION: string | null | undefined
  TDEPS_VERSION: string | null | undefined
  CLI_VERSION: string | null | undefined
  BB_VERSION: string | null | undefined
  CLJ_KONDO_VERSION: string | null | undefined
  CLJFMT_VERSION: string | null | undefined
  CLJSTYLE_VERSION: string | null | undefined
  ZPRINT_VERSION: string | null | undefined
  DEPS_EXE_VERSION: string | null | undefined
}

function getTools(): Tools {
  const LEIN_VERSION = core.getInput('lein')
  const BOOT_VERSION = core.getInput('boot')
  const TDEPS_VERSION = core.getInput('tools-deps')
  const CLI_VERSION = core.getInput('cli')
  const BB_VERSION = core.getInput('bb')
  const CLJ_KONDO_VERSION = core.getInput('clj-kondo')
  const CLJFMT_VERSION = core.getInput('cljfmt')
  const CLJSTYLE_VERSION = core.getInput('cljstyle')
  const ZPRINT_VERSION = core.getInput('zprint')
  const DEPS_EXE_VERSION = core.getInput('deps.exe')

  return {
    LEIN_VERSION,
    BOOT_VERSION,
    TDEPS_VERSION,
    CLI_VERSION,
    BB_VERSION,
    CLJ_KONDO_VERSION,
    CLJFMT_VERSION,
    CLJSTYLE_VERSION,
    ZPRINT_VERSION,
    DEPS_EXE_VERSION
  }
}
