import * as _core from '@actions/core'
import * as _exec from '@actions/exec'
import * as _io from '@actions/io'
import * as _fs from '../src/fs'
import * as _tc from '@actions/tool-cache'
import * as _os from 'os'
import {join} from 'path'
import {VERSION} from '../src/version'

const toolPath = join(__dirname, 'runner', 'tools', 'leiningen')
const tempPath = join(__dirname, 'runner', 'temp', 'leiningen')
const downloadPath = join(__dirname, 'runner', 'download')
const jarDownloadPath = join(__dirname, 'runner', 'download', 'leiningen.jar')
const cachePath = join(__dirname, 'runner', 'cache')

import * as leiningen from '../src/leiningen'

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

jest.mock('../src/fs')
const fs: jest.Mocked<typeof _fs> = _fs as never

describe('leiningen tests', () => {
  beforeEach(async () => {
    process.env['RUNNER_TOOL_CACHE'] = toolPath
    process.env['RUNNER_TEMP'] = tempPath
    os.arch.mockReturnValue('x64')
    os.platform.mockReturnValue('linux')
    jest.spyOn(global.Math, 'random').mockReturnValue(1)
  })

  afterEach(async () => {
    jest.spyOn(global.Math, 'random').mockRestore()
    jest.resetAllMocks()
    delete process.env['RUNNER_TOOL_CACHE']
    delete process.env['RUNNER_TEMP']
  })

  it('Throws if invalid version', async () => {
    const msg = 'Unexpected HTTP response: 403'
    tc.downloadTool.mockRejectedValueOnce(new Error(msg))
    await expect(leiningen.setup('1000')).rejects.toThrow(msg)
  })

  it('Install leiningen with normal version', async () => {
    // First call downloads lein script, second downloads the JAR
    tc.downloadTool.mockResolvedValueOnce(downloadPath)
    tc.downloadTool.mockResolvedValueOnce(jarDownloadPath)
    fs.stat.mockResolvedValueOnce({isFile: () => true} as never)
    tc.cacheDir.mockResolvedValueOnce(cachePath)

    await leiningen.setup('2.9.1')

    // Verify JAR was downloaded from GitHub releases
    expect(tc.downloadTool).toHaveBeenCalledWith(
      'https://github.com/technomancy/leiningen/releases/download/2.9.1/leiningen-2.9.1-standalone.jar',
      expect.any(String),
      undefined
    )

    expect(io.mkdirP).toHaveBeenNthCalledWith(
      1,
      join(tempPath, 'temp_2000000000')
    )
    expect(io.mkdirP).toHaveBeenNthCalledWith(
      2,
      join(tempPath, 'temp_2000000000', 'leiningen', 'bin')
    )
    // Verify self-installs directory was created
    expect(io.mkdirP).toHaveBeenNthCalledWith(
      3,
      join(tempPath, 'temp_2000000000', 'leiningen', 'self-installs')
    )
    // Verify JAR was moved to self-installs
    expect(io.mv).toHaveBeenCalledWith(
      jarDownloadPath,
      join(
        tempPath,
        'temp_2000000000',
        'leiningen',
        'self-installs',
        'leiningen-2.9.1-standalone.jar'
      )
    )
    expect(exec.exec.mock.calls[0]).toMatchObject([
      './lein version',
      [],
      {
        cwd: join(tempPath, 'temp_2000000000', 'leiningen', 'bin'),
        env: {
          LEIN_HOME: join(tempPath, 'temp_2000000000', 'leiningen')
        }
      }
    ])
    expect(tc.cacheDir).toHaveBeenCalledWith(
      join(tempPath, 'temp_2000000000', 'leiningen'),
      'Leiningen',
      `2.9.1-${VERSION}`
    )
    expect(core.exportVariable).toHaveBeenCalledWith(
      'LEIN_HOME',
      join(cachePath)
    )
    expect(core.addPath).toHaveBeenCalledWith(join(cachePath, 'bin'))
  })

  it('Install latest leiningen', async () => {
    // Mock fetch for getting latest version
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({tag_name: '2.12.0'})
    })

    // First call downloads lein script, second downloads the JAR
    tc.downloadTool.mockResolvedValueOnce(downloadPath)
    tc.downloadTool.mockResolvedValueOnce(jarDownloadPath)
    fs.stat.mockResolvedValueOnce({isFile: () => true} as never)
    tc.cacheDir.mockResolvedValueOnce(cachePath)

    await leiningen.setup('latest')

    // Verify latest version was fetched
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.github.com/repos/technomancy/leiningen/releases/latest',
      expect.any(Object)
    )

    // Verify JAR was downloaded with resolved version
    expect(tc.downloadTool).toHaveBeenCalledWith(
      'https://github.com/technomancy/leiningen/releases/download/2.12.0/leiningen-2.12.0-standalone.jar',
      expect.any(String),
      undefined
    )

    expect(io.mkdirP).toHaveBeenNthCalledWith(
      1,
      join(tempPath, 'temp_2000000000')
    )
    expect(io.mkdirP).toHaveBeenNthCalledWith(
      2,
      join(tempPath, 'temp_2000000000', 'leiningen', 'bin')
    )
    expect(exec.exec.mock.calls[0]).toMatchObject([
      './lein version',
      [],
      {
        cwd: join(tempPath, 'temp_2000000000', 'leiningen', 'bin'),
        env: {
          LEIN_HOME: join(tempPath, 'temp_2000000000', 'leiningen')
        }
      }
    ])
    expect(tc.cacheDir).toHaveBeenCalledWith(
      join(tempPath, 'temp_2000000000', 'leiningen'),
      'Leiningen',
      `latest.0.0-${VERSION}`
    )
    expect(core.exportVariable).toHaveBeenCalledWith(
      'LEIN_HOME',
      join(cachePath)
    )
    expect(core.addPath).toHaveBeenCalledWith(join(cachePath, 'bin'))
  })

  it('Uses version of leiningen installed in cache', async () => {
    tc.find.mockReturnValue(cachePath)
    await leiningen.setup('2.9.1')
    expect(core.exportVariable).toHaveBeenCalledWith(
      'LEIN_HOME',
      join(cachePath)
    )
    expect(core.addPath).toHaveBeenCalledWith(join(cachePath, 'bin'))
  })
})
