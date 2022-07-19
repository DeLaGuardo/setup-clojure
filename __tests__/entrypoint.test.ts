import * as _core from '@actions/core'
import * as _lein from '../src/leiningen'
import * as _boot from '../src/boot'
import * as _cli from '../src/cli'
import * as _bb from '../src/babashka'
import * as _cljKondo from '../src/clj-kondo'
import * as _cljstyle from '../src/cljstyle'
import * as _zprint from '../src/zprint'
import * as _utils from '../src/utils'
import {run} from '../src/entrypoint'

jest.mock('@actions/core')
const core: jest.Mocked<typeof _core> = _core as never

jest.mock('../src/leiningen')
const lein: jest.Mocked<typeof _lein> = _lein as never

jest.mock('../src/boot')
const boot: jest.Mocked<typeof _boot> = _boot as never

jest.mock('../src/cli')
const cli: jest.Mocked<typeof _cli> = _cli as never

jest.mock('../src/babashka')
const bb: jest.Mocked<typeof _bb> = _bb as never

jest.mock('../src/clj-kondo')
const cljKondo: jest.Mocked<typeof _cljKondo> = _cljKondo as never

jest.mock('../src/cljstyle')
const cljstyle: jest.Mocked<typeof _cljstyle> = _cljstyle as never

jest.mock('../src/zprint')
const zprint: jest.Mocked<typeof _zprint> = _zprint as never

jest.mock('../src/utils')
const utils: jest.Mocked<typeof _utils> = _utils as never

describe('setup-clojure', () => {
  let inputs: Record<string, string> = {}

  beforeEach(() => {
    jest.resetAllMocks()
    inputs = {}
    core.getInput.mockImplementation(key => inputs[key])
    core.getState.mockImplementation(() => 'main')
  })

  it('sets up Leiningen', async () => {
    inputs['lein'] = '1.2.3'
    inputs['github-token'] = 'abc'

    await run()

    expect(lein.setup).toHaveBeenCalledWith('1.2.3', 'token abc')
  })

  it('sets up Boot', async () => {
    inputs['boot'] = '1.2.3'
    inputs['github-token'] = 'abc'

    await run()

    expect(boot.setup).toHaveBeenCalledWith('1.2.3', 'token abc')
  })

  it('sets up Clojure CLI tools from deprecated `tools-deps` option', async () => {
    inputs['tools-deps'] = '1.2.3'

    await run()

    expect(cli.setup).toHaveBeenCalledWith('1.2.3')
  })

  it('sets up Clojure CLI tools for Windows from deprecated `tools-deps` option', async () => {
    inputs['tools-deps'] = '1.2.3'
    utils.isWindows.mockReturnValue(true)

    await run()

    expect(cli.setupWindows).toHaveBeenCalledWith('1.2.3', undefined, undefined)
  })

  it('sets up Clojure CLI tools', async () => {
    inputs['cli'] = '1.2.3'

    await run()

    expect(cli.setup).toHaveBeenCalledWith('1.2.3')
  })

  it('sets up Clojure CLI tools for Windows', async () => {
    inputs['cli'] = '1.2.3'
    utils.isWindows.mockReturnValue(true)

    await run()

    expect(cli.setupWindows).toHaveBeenCalledWith('1.2.3', undefined, undefined)
  })

  it('sets up Babashka', async () => {
    inputs['bb'] = '1.2.3'
    inputs['github-token'] = 'abc'

    await run()

    expect(bb.setup).toHaveBeenCalledWith('1.2.3', 'token abc')
  })

  it('sets up clj-kondo', async () => {
    inputs['clj-kondo'] = '1.2.3'
    inputs['github-token'] = 'abc'

    await run()

    expect(cljKondo.setup).toHaveBeenCalledWith('1.2.3', 'token abc')
  })

  it('sets up cljstyle', async () => {
    inputs['cljstyle'] = '1.2.3'
    inputs['github-token'] = 'abc'

    await run()

    expect(cljstyle.setup).toHaveBeenCalledWith('1.2.3', 'token abc')
  })

  it('throws on cljstyle setup in Windows', async () => {
    inputs['cljstyle'] = '1.2.3'
    inputs['github-token'] = 'abc'
    utils.isWindows.mockReturnValue(true)

    await run()

    expect(core.setFailed).toHaveBeenCalledWith(
      'cljstyle on windows is not supported yet.'
    )
  })

  it('throws if none of Clojure tools is specified', async () => {
    await run()
    expect(core.setFailed).toHaveBeenCalledWith(
      'You must specify at least one clojure tool.'
    )
  })

  it('coerce non-Error exception to string', async () => {
    inputs['bb'] = '1.2.3'
    bb.setup.mockRejectedValueOnce('Unknown failure')

    await run()
    expect(core.setFailed).toHaveBeenCalledWith('Unknown failure')
  })

  it('sets up zprint', async () => {
    inputs['zprint'] = '1.2.3'
    inputs['github-token'] = 'abc'

    await run()

    expect(zprint.setup).toHaveBeenCalledWith('1.2.3', 'token abc')
  })
})
