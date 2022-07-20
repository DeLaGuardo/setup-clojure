import * as _core from '@actions/core'
import * as _exec from '@actions/exec'
import * as _io from '@actions/io'
import * as _fs from '../src/fs'
import * as _tc from '@actions/tool-cache'
import * as _os from 'os'
import {join} from 'path'
import {VERSION} from '../src/version'

import * as boot from '../src/boot'

const toolPath = join(__dirname, 'runner', 'tools', 'boot')
const tempPath = join(__dirname, 'runner', 'temp', 'boot')
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

jest.mock('../src/fs')
const fs: jest.Mocked<typeof _fs> = _fs as never

describe('boot tests', () => {
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
    await expect(boot.setup('1000')).rejects.toThrow(msg)
  })

  it('Install boot with normal version', async () => {
    tc.downloadTool.mockResolvedValueOnce(downloadPath)
    fs.stat.mockResolvedValueOnce({isFile: () => true} as never)
    tc.cacheDir.mockResolvedValueOnce(cachePath)

    await boot.setup('2.8.3')

    expect(io.mkdirP).toHaveBeenNthCalledWith(
      1,
      join(tempPath, 'temp_2000000000')
    )
    expect(io.mkdirP).toHaveBeenNthCalledWith(
      2,
      join(tempPath, 'temp_2000000000', 'boot', 'bin')
    )
    expect(exec.exec.mock.calls[0]).toMatchObject([
      './boot -V',
      [],
      {
        cwd: join(tempPath, 'temp_2000000000', 'boot', 'bin'),
        env: {
          BOOT_HOME: join(tempPath, 'temp_2000000000', 'boot'),
          BOOT_VERSION: '2.8.3'
        }
      }
    ])
    expect(tc.cacheDir).toHaveBeenCalledWith(
      join(tempPath, 'temp_2000000000', 'boot'),
      'Boot',
      `2.8.3-${VERSION}`
    )
    expect(core.exportVariable).toHaveBeenCalledWith(
      'BOOT_HOME',
      join(cachePath)
    )
    expect(core.addPath).toHaveBeenCalledWith(join(cachePath, 'bin'))
  })

  it('Install latest boot', async () => {
    tc.downloadTool.mockResolvedValueOnce(downloadPath)
    fs.stat.mockResolvedValueOnce({isFile: () => true} as never)
    tc.cacheDir.mockResolvedValueOnce(cachePath)

    await boot.setup('latest')

    expect(io.mkdirP).toHaveBeenNthCalledWith(
      1,
      join(tempPath, 'temp_2000000000')
    )
    expect(io.mkdirP).toHaveBeenNthCalledWith(
      2,
      join(tempPath, 'temp_2000000000', 'boot', 'bin')
    )
    expect(exec.exec.mock.calls[0]).toMatchObject([
      './boot -u',
      [],
      {
        cwd: join(tempPath, 'temp_2000000000', 'boot', 'bin'),
        env: {
          BOOT_HOME: join(tempPath, 'temp_2000000000', 'boot')
        }
      }
    ])
    expect(tc.cacheDir).toHaveBeenCalledWith(
      join(tempPath, 'temp_2000000000', 'boot'),
      'Boot',
      `latest.0.0-${VERSION}`
    )
    expect(core.exportVariable).toHaveBeenCalledWith(
      'BOOT_HOME',
      join(cachePath)
    )
    expect(core.addPath).toHaveBeenCalledWith(join(cachePath, 'bin'))
  })

  it('Uses version of boot installed in cache', async () => {
    tc.find.mockReturnValue(cachePath)
    await boot.setup('2.8.3')
    expect(core.exportVariable).toHaveBeenCalledWith(
      'BOOT_HOME',
      join(cachePath)
    )
    expect(core.addPath).toHaveBeenCalledWith(join(cachePath, 'bin'))
  })
})
