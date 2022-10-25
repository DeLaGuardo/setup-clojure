import * as _core from '@actions/core'
import * as _exec from '@actions/exec'
import * as _io from '@actions/io'
import * as _tc from '@actions/tool-cache'
import * as _http from '@actions/http-client'
import * as _os from 'os'
import * as _fs from '../src/fs'
import {join} from 'path'
import {VERSION} from '../src/version'

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

jest.mock('../src/fs')
const fs: jest.Mocked<typeof _fs> = _fs as never

jest.mock('os')
const os: jest.Mocked<typeof _os> = _os as never

jest.mock('@actions/http-client', () => {
  return {
    HttpClient: jest.fn().mockImplementation(() => {
      return {
        get: jest.fn().mockImplementation(() => {
          return {
            readBody: jest.fn().mockResolvedValue('1.2.3 123qwe')
          }
        })
      }
    })
  }
})

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
    expect(io.mkdirP).toHaveBeenCalledWith('/tmp/usr/local/opt/ClojureTools')
    expect(exec.exec).toHaveBeenCalledWith('bash', [
      downloadPath,
      '--prefix',
      '/tmp/usr/local/opt/ClojureTools'
    ])
    expect(tc.cacheDir).toHaveBeenCalledWith(
      '/tmp/usr/local/opt/ClojureTools',
      'ClojureToolsDeps',
      `1.10.1-469-${VERSION}`
    )
    expect(core.exportVariable).toHaveBeenCalledWith(
      'CLOJURE_INSTALL_DIR',
      '/tmp/usr/local/opt/ClojureTools'
    )
    expect(core.addPath).toHaveBeenCalledWith(
      '/tmp/usr/local/opt/ClojureTools/bin'
    )
  })

  it('Install latest clojure tools deps', async () => {
    tc.downloadTool.mockResolvedValueOnce(downloadPath)
    tc.cacheDir.mockResolvedValueOnce(cachePath)

    await tdeps.setup('latest')

    expect(tc.downloadTool).toHaveBeenCalledWith(
      'https://download.clojure.org/install/linux-install-1.2.3.sh'
    )
    expect(io.mkdirP).toHaveBeenCalledWith('/tmp/usr/local/opt/ClojureTools')
    expect(exec.exec).toHaveBeenCalledWith('bash', [
      downloadPath,
      '--prefix',
      '/tmp/usr/local/opt/ClojureTools'
    ])
    expect(tc.cacheDir).toHaveBeenCalledWith(
      '/tmp/usr/local/opt/ClojureTools',
      'ClojureToolsDeps',
      `1.2.3-${VERSION}`
    )
    expect(core.exportVariable).toHaveBeenCalledWith(
      'CLOJURE_INSTALL_DIR',
      '/tmp/usr/local/opt/ClojureTools'
    )
    expect(core.addPath).toHaveBeenCalledWith(
      '/tmp/usr/local/opt/ClojureTools/bin'
    )
  })

  it('Supports macOS', async () => {
    os.platform.mockReturnValue('darwin')

    fs.readFile.mockResolvedValueOnce('install -D')
    fs.writeFile.mockResolvedValueOnce()

    tc.downloadTool.mockResolvedValueOnce(downloadPath)
    tc.cacheDir.mockResolvedValueOnce(cachePath)

    await tdeps.setup('latest')

    expect(tc.downloadTool).toHaveBeenCalledWith(
      'https://download.clojure.org/install/linux-install-1.2.3.sh'
    )
    expect(io.mkdirP).toHaveBeenCalledWith('/tmp/usr/local/opt/ClojureTools')
    expect(fs.writeFile).toHaveBeenCalledWith(
      join(__dirname, 'runner/download'),
      '$(brew --prefix coreutils)/bin/ginstall -D',
      'utf-8'
    )
    expect(exec.exec).toHaveBeenCalledWith('bash', [
      downloadPath,
      '--prefix',
      '/tmp/usr/local/opt/ClojureTools'
    ])
    expect(tc.cacheDir).toHaveBeenCalledWith(
      '/tmp/usr/local/opt/ClojureTools',
      'ClojureToolsDeps',
      `1.2.3-${VERSION}`
    )
    expect(core.exportVariable).toHaveBeenCalledWith(
      'CLOJURE_INSTALL_DIR',
      '/tmp/usr/local/opt/ClojureTools'
    )
    expect(core.addPath).toHaveBeenCalledWith(
      '/tmp/usr/local/opt/ClojureTools/bin'
    )
  })

  it('Uses version of clojure tools-deps installed in cache', async () => {
    tc.find.mockReturnValue(cachePath)

    await tdeps.setup('1.10.1.469')

    expect(core.exportVariable).toHaveBeenCalledWith(
      'CLOJURE_INSTALL_DIR',
      '/tmp/usr/local/opt/ClojureTools'
    )
    expect(core.addPath).toHaveBeenCalledWith(
      '/tmp/usr/local/opt/ClojureTools/bin'
    )
  })
})
