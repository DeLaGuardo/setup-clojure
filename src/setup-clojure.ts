import * as core from '@actions/core'
import * as lein from './leiningen'
import * as boot from './boot'
import * as cli from './cli'
import * as bb from './babashka'
import * as utils from './utils'

const IS_WINDOWS = utils.isWindows()

async function run(): Promise<void> {
  try {
    const LEIN_VERSION = core.getInput('lein')
    const BOOT_VERSION = core.getInput('boot')
    const TDEPS_VERSION = core.getInput('tools-deps')
    const CLI_VERSION = core.getInput('cli')
    const BB_VERSION = core.getInput('bb')

    const githubToken = core.getInput('github-token')
    const githubAuth = githubToken ? `token ${githubToken}` : undefined

    if (LEIN_VERSION) {
      lein.setup(LEIN_VERSION, githubAuth)
    }

    if (BOOT_VERSION) {
      if (IS_WINDOWS) {
        throw new Error('Boot on windows is not supported yet.')
      }
      boot.setup(BOOT_VERSION, githubAuth)
    }

    if (CLI_VERSION) {
      if (IS_WINDOWS) {
        cli.setupWindows(CLI_VERSION)
      } else {
        cli.setup(CLI_VERSION)
      }
    }

    if (TDEPS_VERSION && !CLI_VERSION) {
      if (IS_WINDOWS) {
        cli.setupWindows(TDEPS_VERSION)
      }
      cli.setup(TDEPS_VERSION)
    }

    if (BB_VERSION) {
      await bb.setup(BB_VERSION, githubToken)
    }

    if (
      !BOOT_VERSION &&
      !LEIN_VERSION &&
      !TDEPS_VERSION &&
      !CLI_VERSION &&
      !BB_VERSION
    ) {
      throw new Error('You must specify at least one clojure tool.')
    }
  } catch (error) {
    core.setFailed((error as Error).message)
  }
}

run()
