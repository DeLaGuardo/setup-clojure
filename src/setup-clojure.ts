import * as core from '@actions/core'
import * as lein from './leiningen'
import * as boot from './boot'
import * as tdeps from './tdeps'

async function run(): Promise<void> {
  try {
    const Lein = core.getInput('lein')
    const Boot = core.getInput('boot')
    const Tdeps = core.getInput('tools-deps')

    if (Lein) {
      lein.setup(Lein)
    }

    if (Boot) {
      boot.setup(Boot)
    }

    if (Tdeps) {
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
