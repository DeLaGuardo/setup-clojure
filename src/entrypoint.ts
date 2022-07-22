import * as core from '@actions/core'
import * as lein from './leiningen'
import * as boot from './boot'
import * as cli from './cli'
import * as bb from './babashka'
import * as cljKondo from './clj-kondo'
import * as cljstyle from './cljstyle'
import * as zprint from './zprint'
import * as utils from './utils'
import * as cache from './cache'

async function main(): Promise<void> {
  try {
    const {
      LEIN_VERSION,
      BOOT_VERSION,
      TDEPS_VERSION,
      CLI_VERSION,
      BB_VERSION,
      CLJ_KONDO_VERSION,
      CLJSTYLE_VERSION,
      ZPRINT_VERSION
    } = getTools()

    const tools = []

    const githubToken = core.getInput('github-token')
    const githubAuth = githubToken ? `token ${githubToken}` : undefined
    const IS_WINDOWS = utils.isWindows()

    if (LEIN_VERSION) {
      tools.push(lein.setup(LEIN_VERSION, githubAuth))
    }

    if (BOOT_VERSION) {
      tools.push(boot.setup(BOOT_VERSION, githubAuth))
    }

    if (CLI_VERSION) {
      tools.push(cli.setup(CLI_VERSION))
    }

    if (TDEPS_VERSION && !CLI_VERSION) {
      tools.push(cli.setup(TDEPS_VERSION))
    }

    if (BB_VERSION) {
      tools.push(bb.setup(BB_VERSION, githubAuth))
    }

    if (CLJ_KONDO_VERSION) {
      tools.push(cljKondo.setup(CLJ_KONDO_VERSION, githubAuth))
    }

    if (CLJSTYLE_VERSION) {
      if (IS_WINDOWS) {
        throw new Error('cljstyle on windows is not supported yet.')
      }
      tools.push(cljstyle.setup(CLJSTYLE_VERSION, githubAuth))
    }

    if (ZPRINT_VERSION) {
      tools.push(zprint.setup(ZPRINT_VERSION, githubAuth))
    }

    if (tools.length === 0) {
      throw new Error('You must specify at least one clojure tool.')
    }

    await Promise.all(tools)
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    core.setFailed(error)
  }
}

async function pre(): Promise<void> {
  if (!core.getBooleanInput('invalidate-cache')) {
    try {
      const {
        LEIN_VERSION,
        BOOT_VERSION,
        TDEPS_VERSION,
        CLI_VERSION,
        BB_VERSION,
        CLJ_KONDO_VERSION,
        CLJSTYLE_VERSION,
        ZPRINT_VERSION
      } = getTools()

      const IS_WINDOWS = utils.isWindows()
      const tools = []

      if (LEIN_VERSION) {
        tools.push(cache.restore(lein.identifier, LEIN_VERSION))
      }

      if (BOOT_VERSION) {
        tools.push(cache.restore(boot.identifier, BOOT_VERSION))
      }

      if (CLI_VERSION) {
        tools.push(cache.restore(cli.identifier, CLI_VERSION))
      }

      if (TDEPS_VERSION && !CLI_VERSION) {
        tools.push(cache.restore(cli.identifier, TDEPS_VERSION))
      }

      if (BB_VERSION) {
        tools.push(cache.restore(bb.identifier, BB_VERSION))
      }

      if (CLJ_KONDO_VERSION) {
        tools.push(cache.restore(cljKondo.identifier, CLJ_KONDO_VERSION))
      }

      if (CLJSTYLE_VERSION) {
        if (!IS_WINDOWS) {
          tools.push(cache.restore(cljstyle.identifier, CLJSTYLE_VERSION))
        }
      }

      if (ZPRINT_VERSION) {
        tools.push(cache.restore(zprint.identifier, ZPRINT_VERSION))
      }

      await Promise.all(tools)
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      core.debug(error)
    }
  }
}

async function post(): Promise<void> {
  try {
    const {
      LEIN_VERSION,
      BOOT_VERSION,
      TDEPS_VERSION,
      CLI_VERSION,
      BB_VERSION,
      CLJ_KONDO_VERSION,
      CLJSTYLE_VERSION,
      ZPRINT_VERSION
    } = getTools()

    const IS_WINDOWS = utils.isWindows()
    const tools = []

    if (LEIN_VERSION) {
      tools.push(cache.save(lein.identifier, LEIN_VERSION))
    }

    if (BOOT_VERSION) {
      tools.push(cache.save(boot.identifier, BOOT_VERSION))
    }

    if (CLI_VERSION) {
      tools.push(cache.save(cli.identifier, CLI_VERSION))
    }

    if (TDEPS_VERSION && !CLI_VERSION) {
      tools.push(cache.save(cli.identifier, TDEPS_VERSION))
    }

    if (BB_VERSION) {
      tools.push(cache.save(bb.identifier, BB_VERSION))
    }

    if (CLJ_KONDO_VERSION) {
      tools.push(cache.save(cljKondo.identifier, CLJ_KONDO_VERSION))
    }

    if (CLJSTYLE_VERSION) {
      if (!IS_WINDOWS) {
        tools.push(cache.save(cljstyle.identifier, CLJSTYLE_VERSION))
      }
    }

    if (ZPRINT_VERSION) {
      tools.push(cache.save(zprint.identifier, ZPRINT_VERSION))
    }

    await Promise.all(tools)
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    core.debug(error)
  }
}

export type Tools = {
  LEIN_VERSION: string | null | undefined
  BOOT_VERSION: string | null | undefined
  TDEPS_VERSION: string | null | undefined
  CLI_VERSION: string | null | undefined
  BB_VERSION: string | null | undefined
  CLJ_KONDO_VERSION: string | null | undefined
  CLJSTYLE_VERSION: string | null | undefined
  ZPRINT_VERSION: string | null | undefined
}

function getTools(): Tools {
  const LEIN_VERSION = core.getInput('lein')
  const BOOT_VERSION = core.getInput('boot')
  const TDEPS_VERSION = core.getInput('tools-deps')
  const CLI_VERSION = core.getInput('cli')
  const BB_VERSION = core.getInput('bb')
  const CLJ_KONDO_VERSION = core.getInput('clj-kondo')
  const CLJSTYLE_VERSION = core.getInput('cljstyle')
  const ZPRINT_VERSION = core.getInput('zprint')

  return {
    LEIN_VERSION,
    BOOT_VERSION,
    TDEPS_VERSION,
    CLI_VERSION,
    BB_VERSION,
    CLJ_KONDO_VERSION,
    CLJSTYLE_VERSION,
    ZPRINT_VERSION
  }
}

type SetupClojureActionState = 'pre' | 'main' | 'post' | 'in-progress'

function ensureCurrentState(): SetupClojureActionState {
  const st = core.getState('SETUP_CLOJURE')
  const result =
    st === 'pre' || st === 'main' || st === 'post' || st === 'in-progress'
      ? st
      : 'pre'
  core.saveState('SETUP_CLOJURE', 'in-progress')

  return result
}

function ensureNextState(prevState: 'pre' | 'main'): void {
  const nextState: SetupClojureActionState =
    prevState === 'pre' ? 'main' : 'post'
  core.saveState('SETUP_CLOJURE', nextState)
}

const entrypoints = {pre, main, post}

export async function run(): Promise<void> {
  const actionState = ensureCurrentState()

  if (actionState === 'in-progress') {
    core.setFailed('Previous phase was not completed correctly')
    return
  }

  const entrypoint = entrypoints[actionState]
  await entrypoint()

  if (actionState !== 'post') {
    ensureNextState(actionState)
  }
}
