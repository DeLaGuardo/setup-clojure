import * as _core from '@actions/core'
import * as _exec from '@actions/exec'
import * as _io from '@actions/io'
import * as _tc from '@actions/tool-cache'
import * as _os from 'os'
import {join} from 'path'

import * as tdeps from '../src/cli'

const toolPath = join(__dirname, 'runner', 'tools', 'tdeps')
const tempPath = join(__dirname, 'runner', 'temp', 'tdeps')
const downloadPath = join(__dirname, 'runner', 'download')
const cachePath = join(__dirname, 'runner', 'cache')

jest.mock('@actions/core')
const core: jest.Mocked<typeof _core> = _core as never

jest.mock('@actions/exec')
const exec: jest.Mocked<typeof _exec> = _exec as never

jest.mock('@actions/io')
const io: jest.Mocked<typeof _io> = _io as never

jest.mock('@actions/tool-cache')
const tc: jest.Mocked<typeof _tc> = _tc as never

jest.mock('os')
const os: jest.Mocked<typeof _os> = _os as never

describe('tdeps tests', () => {
  beforeAll(async () => {
    process.env['RUNNER_TOOL_CACHE'] = toolPath
    process.env['RUNNER_TEMP'] = tempPath
    os.arch.mockReturnValue('x64')
    os.platform.mockReturnValue('linux')
    jest.spyOn(global.Math, 'random').mockReturnValue(1)
  })

  afterAll(async () => {
    jest.spyOn(global.Math, 'random').mockRestore()
    jest.resetAllMocks()
    delete process.env['RUNNER_TOOL_CACHE']
    delete process.env['RUNNER_TEMP']
  })

  it('Throws if invalid version', async () => {
    const msg = 'Unexpected HTTP response: 403'
    tc.downloadTool.mockRejectedValueOnce(new Error(msg))
    await expect(tdeps.setup('1000')).rejects.toThrow(msg)
  })

  it('Install clojure tools deps with normal version', async () => {
    tc.downloadTool.mockResolvedValueOnce(downloadPath)
    tc.cacheDir.mockResolvedValueOnce(cachePath)

    await tdeps.setup('1.10.1.469')

    expect(tc.downloadTool).toHaveBeenCalledWith(
      'https://download.clojure.org/install/linux-install-1.10.1.469.sh'
    )
    expect(io.mkdirP).toHaveBeenCalledWith(join(tempPath, 'temp_2000000000'))
    expect(exec.exec).toHaveBeenCalledWith('bash', [
      downloadPath,
      '--prefix',
      join(tempPath, 'temp_2000000000')
    ])
    expect(tc.cacheDir).toHaveBeenCalledWith(
      join(tempPath, 'temp_2000000000'),
      'ClojureToolsDeps',
      '1.10.1-469-3-6'
    )
    expect(core.exportVariable).toHaveBeenCalledWith(
      'CLOJURE_INSTALL_DIR',
      join(cachePath, 'lib', 'clojure')
    )
    expect(core.addPath).toHaveBeenCalledWith(join(cachePath, 'bin'))
  })

  it('Install latest clojure tools deps', async () => {
    tc.downloadTool.mockResolvedValueOnce(downloadPath)
    tc.cacheDir.mockResolvedValueOnce(cachePath)

    await tdeps.setup('latest')

    expect(tc.downloadTool).toHaveBeenCalledWith(
      'https://download.clojure.org/install/linux-install.sh'
    )
    expect(io.mkdirP).toHaveBeenCalledWith(join(tempPath, 'temp_2000000000'))
    expect(exec.exec).toHaveBeenCalledWith('bash', [
      downloadPath,
      '--prefix',
      join(tempPath, 'temp_2000000000')
    ])
    expect(tc.cacheDir).toHaveBeenCalledWith(
      join(tempPath, 'temp_2000000000'),
      'ClojureToolsDeps',
      'latest.0.0-3-6'
    )
    expect(core.exportVariable).toHaveBeenCalledWith(
      'CLOJURE_INSTALL_DIR',
      join(cachePath, 'lib', 'clojure')
    )
    expect(core.addPath).toHaveBeenCalledWith(join(cachePath, 'bin'))
  })

  it('Uses version of clojure tools-deps installed in cache', async () => {
    tc.find.mockReturnValue(cachePath)

    await tdeps.setup('1.10.1.469')

    expect(core.exportVariable).toHaveBeenCalledWith(
      'CLOJURE_INSTALL_DIR',
      join(cachePath, 'lib', 'clojure')
    )
    expect(core.addPath).toHaveBeenCalledWith(join(cachePath, 'bin'))
  })
})
