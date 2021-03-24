import * as core from '@actions/core'
import * as io from '@actions/io'
import * as tc from '@actions/tool-cache'
import * as exec from '@actions/exec'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as utils from './utils'

const tempDirectory = utils.getTempDir()

export async function setup(version: string): Promise<void> {
  let toolPath = tc.find(
    'ClojureToolsDeps',
    utils.getCacheVersionString(version),
    os.arch()
  )

  if (toolPath && version !== 'latest') {
    core.info(`Clojure CLI found in cache ${toolPath}`)
  } else {
    const clojureToolsFile = await tc.downloadTool(
      `https://download.clojure.org/install/clojure-tools${
        version === 'latest' ? '' : `-${version}`
      }.tar.gz`
    )
    const tempDir: string = path.join(
      tempDirectory,
      `temp_${Math.floor(Math.random() * 2000000000)}`
    )
    const clojureToolsDir = await installClojureToolsDeps(
      clojureToolsFile,
      tempDir
    )
    core.debug(`clojure tools deps installed to ${clojureToolsDir}`)
    toolPath = await tc.cacheDir(
      clojureToolsDir,
      'ClojureToolsDeps',
      utils.getCacheVersionString(version)
    )
  }

  const installDir = path.join(toolPath, 'lib', 'clojure')
  core.exportVariable('CLOJURE_INSTALL_DIR', installDir)
  core.addPath(path.join(toolPath, 'bin'))
}

export async function setupWindows(version: string): Promise<void> {
  const url = `download.clojure.org/install/win-install-${version}.ps1`
  exec.exec(`powershell -c "iwr -useb ${url} | iex"`, [], {
    input: Buffer.from('1')
  })
}

async function installClojureToolsDeps(
  installScript: string,
  destinationFolder: string
): Promise<string> {
  await io.mkdirP(destinationFolder)

  const file = path.normalize(installScript)
  const stats = fs.statSync(file)
  if (stats.isFile()) {
    const binDir = path.join(destinationFolder, 'clojure', 'bin')
    const libDir = path.join(destinationFolder, 'clojure', 'lib')
    const manDir = path.join(
      destinationFolder,
      'clojure',
      'share',
      'man',
      'man1'
    )
    const clojureLibDir = path.join(libDir, 'clojure')
    const clojureLibexecDir = path.join(clojureLibDir, 'libexec')

    await tc.extractTar(file, destinationFolder)

    const sourceDir = path.join(destinationFolder, 'clojure-tools')

    await io.mkdirP(binDir)
    await io.mkdirP(manDir)
    await io.mkdirP(clojureLibexecDir)

    await io.mv(path.join(sourceDir, 'deps.edn'), clojureLibDir)
    await io.mv(path.join(sourceDir, 'example-deps.edn'), clojureLibDir)
    await Promise.all(
      fs
        .readdirSync(sourceDir)
        .filter(f => f.endsWith('jar'))
        .map(
          async (f): Promise<void> =>
            await io.mv(path.join(sourceDir, f), clojureLibexecDir)
        )
    )
    await readWriteAsync(
      path.join(sourceDir, 'clojure'),
      '"$CLOJURE_INSTALL_DIR"'
    )
    await io.mv(path.join(sourceDir, 'clj'), binDir)
    await io.mv(path.join(sourceDir, 'clojure'), binDir)
    await io.mv(path.join(sourceDir, 'clojure.1'), manDir)
    await io.mv(path.join(sourceDir, 'clj.1'), manDir)

    return path.join(destinationFolder, 'clojure')
  } else {
    throw new Error(`Not a file`)
  }
}

async function readWriteAsync(
  file: string,
  replacement: string
): Promise<void> {
  fs.readFile(file, 'utf-8', function (err, data) {
    if (err) throw err

    const newValue = data.replace(/PREFIX/gim, replacement)

    fs.writeFile(file, newValue, 'utf-8', function (e) {
      if (e) throw e
    })
  })
}
