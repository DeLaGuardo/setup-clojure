import {pre, post, main} from './entrypoint'
import * as core from '@actions/core'

async function run(): Promise<void> {
  core.debug('=== Run pre-setup clojure ===')
  await pre()
  core.debug('=== Run setup clojure ===')
  await main()
  core.debug('=== Run post-setup clojure ===')
  await post()
}

run()
