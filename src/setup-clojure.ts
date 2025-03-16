import {pre, post, main} from './entrypoint'

async function run(): Promise<void> {
  await pre()
  await main()
  await post()
}

run()
