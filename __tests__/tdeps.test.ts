import io = require('@actions/io')
import exec = require('@actions/exec')
import os = require('os')
import fs = require('fs')
import path = require('path')

const toolDir = path.join(__dirname, 'runner', 'tools', 'tdeps')
const tempDir = path.join(__dirname, 'runner', 'temp', 'tdeps')

process.env['RUNNER_TOOL_CACHE'] = toolDir
process.env['RUNNER_TEMP'] = tempDir
import * as tdeps from '../src/cli'

describe('tdeps tests', () => {
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
      await tdeps.setup('1000')
    } catch {
      thrown = true
    }
    expect(thrown).toBe(true)
  })

  it('Install clojure tools deps with normal version', async () => {
    await tdeps.setup('1.10.1.469')
    const clojureDir = path.join(
      toolDir,
      'ClojureToolsDeps',
      '1.10.1-469',
      os.arch()
    )

    expect(fs.existsSync(`${clojureDir}.complete`)).toBe(true)
    expect(fs.existsSync(path.join(clojureDir, 'bin', 'clojure'))).toBe(true)
  }, 100000)

  it('Install latest clojure tools deps', async () => {
    await tdeps.setup('latest')
    const clojureDir = path.join(
      toolDir,
      'ClojureToolsDeps',
      'latest.0.0',
      os.arch()
    )

    expect(fs.existsSync(`${clojureDir}.complete`)).toBe(true)
    expect(fs.existsSync(path.join(clojureDir, 'bin', 'clojure'))).toBe(true)
  }, 100000)

  it('Uses version of clojure tools-deps installed in cache', async () => {
    const clojureDir: string = path.join(
      toolDir,
      'ClojureToolsDeps',
      '1.10.1-469',
      os.arch()
    )
    await io.mkdirP(clojureDir)
    fs.writeFileSync(`${clojureDir}.complete`, 'hello')
    await tdeps.setup('1.10.1.469')
    return
  })

  it('Doesnt use version of clojure that was only partially installed in cache', async () => {
    const clojureDir: string = path.join(
      toolDir,
      'ClojureToolsDeps',
      '1.10.1-469',
      os.arch()
    )
    await io.mkdirP(clojureDir)
    let thrown = false
    try {
      await tdeps.setup('1000')
    } catch {
      thrown = true
    }
    expect(thrown).toBe(true)
    return
  })
})
