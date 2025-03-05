import {main} from './entrypoint'

async function run(): Promise<void> {
  await main()
  process.exit()
}

run()
