import io = require('@actions/io')
import os = require('os')
import fs = require('fs')
import path = require('path')

const toolDir = path.join(__dirname, 'runner', 'tools', 'leiningen')
const tempDir = path.join(__dirname, 'runner', 'temp', 'leiningen')

process.env['RUNNER_TOOL_CACHE'] = toolDir
process.env['RUNNER_TEMP'] = tempDir
import * as leiningen from '../src/leiningen'

describe('leiningen tests', () => {
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
      await leiningen.setup('1000')
    } catch {
      thrown = true
    }
    expect(thrown).toBe(true)
  })

  it('Install leiningen with normal version', async () => {
    await leiningen.setup('2.9.1')
    const clojureDir = path.join(toolDir, 'Leiningen', '2.9.1', os.arch())

    expect(fs.existsSync(`${clojureDir}.complete`)).toBe(true)
    expect(fs.existsSync(path.join(clojureDir, 'bin', 'lein'))).toBe(true)
  }, 100000)

  it('Install latest leiningen', async () => {
    await leiningen.setup('latest')
    const clojureDir = path.join(toolDir, 'Leiningen', 'latest.0.0', os.arch())

    expect(fs.existsSync(`${clojureDir}.complete`)).toBe(true)
    expect(fs.existsSync(path.join(clojureDir, 'bin', 'lein'))).toBe(true)
  }, 100000)

  it('Uses version of leiningen installed in cache', async () => {
    const clojureDir: string = path.join(
      toolDir,
      'Leiningen',
      '2.9.1',
      os.arch()
    )
    await io.mkdirP(clojureDir)
    fs.writeFileSync(`${clojureDir}.complete`, 'hello')
    await leiningen.setup('2.9.1')
    return
  })

  it('Doesnt use version of clojure that was only partially installed in cache', async () => {
    const clojureDir: string = path.join(
      toolDir,
      'Leiningen',
      '2.9.1',
      os.arch()
    )
    await io.mkdirP(clojureDir)
    let thrown = false
    try {
      await leiningen.setup('1000')
    } catch {
      thrown = true
    }
    expect(thrown).toBe(true)
    return
  })
})
