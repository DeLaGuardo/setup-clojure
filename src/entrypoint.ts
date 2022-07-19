import * as core from '@actions/core'
import * as lein from './leiningen'
import * as boot from './boot'
import * as cli from './cli'
import * as bb from './babashka'
import * as cljKondo from './clj-kondo'
import * as cljstyle from './cljstyle'
import * as zprint from './zprint'
import * as utils from './utils'

export async function run(): Promise<void> {
  try {
    const {
      LEIN_VERSION,
      BOOT_VERSION,
      TDEPS_VERSION,
      CLI_VERSION,
      CMD_EXE_WORKAROUND,
      BB_VERSION,
      CLJ_KONDO_VERSION,
      CLJSTYLE_VERSION,
      ZPRINT_VERSION
    } = utils.getTools()

    const tools = []

    const githubToken = core.getInput('github-token')
    const githubAuth = githubToken ? `token ${githubToken}` : undefined

    if (LEIN_VERSION) {
      tools.push(lein.setup(LEIN_VERSION, githubAuth))
    }

    const IS_WINDOWS = utils.isWindows()

    if (BOOT_VERSION) {
      tools.push(boot.setup(BOOT_VERSION, githubAuth))
    }

    if (CLI_VERSION) {
      if (IS_WINDOWS) {
        tools.push(
          cli.setupWindows(CLI_VERSION, CMD_EXE_WORKAROUND, githubAuth)
        )
      } else {
        tools.push(cli.setup(CLI_VERSION))
      }
    }

    if (TDEPS_VERSION && !CLI_VERSION) {
      if (IS_WINDOWS) {
        tools.push(
          cli.setupWindows(TDEPS_VERSION, CMD_EXE_WORKAROUND, githubAuth)
        )
      }
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
