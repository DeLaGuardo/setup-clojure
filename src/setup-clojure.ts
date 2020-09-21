import * as core from '@actions/core'
import * as lein from './leiningen'
import * as boot from './boot'
import * as tdeps from './tdeps'
import * as utils from './utils'

const IS_WINDOWS = utils.isWindows()

async function run(): Promise<void> {
  try {
    const Lein = core.getInput('lein')
    const Boot = core.getInput('boot')
    const Tdeps = core.getInput('tools-deps')

    if (Lein) {
      lein.setup(Lein)
    }

    if (Boot) {
      if (IS_WINDOWS) {
        throw new Error('Boot on windows is not supported yet.')
      }
      boot.setup(Boot)
    }

    if (Tdeps) {
      if (IS_WINDOWS) {
        throw new Error('Clojure tools.deps on windows is not supported yet.')
      }
      tdeps.setup(Tdeps)
    }

    if (!Boot && !Lein && !Tdeps) {
      throw new Error('You must specify at least one clojure tool.')
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
