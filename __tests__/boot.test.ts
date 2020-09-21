import io = require('@actions/io')
import os = require('os')
import fs = require('fs')
import path = require('path')

const toolDir = path.join(__dirname, 'runner', 'tools', 'boot')
const tempDir = path.join(__dirname, 'runner', 'temp', 'boot')

process.env['RUNNER_TOOL_CACHE'] = toolDir
process.env['RUNNER_TEMP'] = tempDir
import * as boot from '../src/boot'

describe('boot tests', () => {
  beforeAll(async () => {
    await io.rmRF(toolDir)
    await io.rmRF(tempDir)
  }, 300000)

  afterAll(async () => {
    try {
      await io.rmRF(toolDir)
      await io.rmRF(tempDir)
    } catch {
      console.log('Failed to remove test directories')
    }
  }, 100000)

  it('Throws if invalid version', async () => {
    let thrown = false
    try {
      await boot.setup('1000')
    } catch {
      thrown = true
    }
    expect(thrown).toBe(true)
  })

  it('Install boot with normal version', async () => {
    await boot.setup('2.8.3')
    const clojureDir = path.join(toolDir, 'Boot', '2.8.3', os.arch())

    expect(fs.existsSync(`${clojureDir}.complete`)).toBe(true)
    expect(fs.existsSync(path.join(clojureDir, 'bin', 'boot'))).toBe(true)
  }, 100000)

  it('Install latest boot', async () => {
    await boot.setup('latest')
    const clojureDir = path.join(toolDir, 'Boot', 'latest.0.0', os.arch())

    expect(fs.existsSync(`${clojureDir}.complete`)).toBe(true)
    expect(fs.existsSync(path.join(clojureDir, 'bin', 'boot'))).toBe(true)
  }, 100000)

  it('Uses version of boot installed in cache', async () => {
    const clojureDir: string = path.join(toolDir, 'Boot', '2.8.3', os.arch())
    await io.mkdirP(clojureDir)
    fs.writeFileSync(`${clojureDir}.complete`, 'hello')
    await boot.setup('2.8.3')
    return
  })

  it('Doesnt use version of clojure that was only partially installed in cache', async () => {
    const clojureDir: string = path.join(toolDir, 'Boot', '2.8.3', os.arch())
    await io.mkdirP(clojureDir)
    let thrown = false
    try {
      await boot.setup('1000')
    } catch {
      thrown = true
    }
    expect(thrown).toBe(true)
    return
  })
})
