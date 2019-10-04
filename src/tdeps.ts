import * as core from '@actions/core';
import * as io from '@actions/io';
import * as tc from '@actions/tool-cache';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as utils from './utils';

let tempDirectory = process.env['RUNNER_TEMP'] || '';

const IS_WINDOWS = process.platform === 'win32';

if (IS_WINDOWS) {
  throw new Error('Windows is not supported yet.');
}

if (!tempDirectory) {
  let baseLocation;

  if (process.platform === 'darwin') {
    baseLocation = '/Users';
  } else {
    baseLocation = '/home';
  }
  tempDirectory = path.join(baseLocation, 'actions', 'temp');
}

export async function setup(version: string): Promise<void> {
  let toolPath = tc.find(
    'ClojureToolsDeps',
    utils.getCacheVersionString(version),
    os.arch()
  );

  if (toolPath) {
    core.debug(`Clojure CLI found in cache ${toolPath}`);
  } else {
    let clojureToolsFile = await tc.downloadTool(
      `https://download.clojure.org/install/clojure-tools-${version}.tar.gz`
    );
    let tempDir: string = path.join(
      tempDirectory,
      'temp_' + Math.floor(Math.random() * 2000000000)
    );
    const clojureToolsDir = await installClojureToolsDeps(
      clojureToolsFile,
      tempDir,
      version
    );
    core.debug(`clojure tools deps installed to ${clojureToolsDir}`);
    toolPath = await tc.cacheDir(
      clojureToolsDir,
      'ClojureToolsDeps',
      utils.getCacheVersionString(version)
    );
  }

  const installDir = path.join(toolPath, 'lib', 'clojure');
  core.exportVariable('CLOJURE_INSTALL_DIR', installDir);
  core.addPath(path.join(toolPath, 'bin'));
}

async function installClojureToolsDeps(
  installScript: string,
  destinationFolder: string,
  version: string
): Promise<string> {
  await io.mkdirP(destinationFolder);

  const file = path.normalize(installScript);
  const stats = fs.statSync(file);
  if (stats.isFile()) {
    const binDir = path.join(destinationFolder, 'clojure', 'bin');
    const libDir = path.join(destinationFolder, 'clojure', 'lib');
    const manDir = path.join(
      destinationFolder,
      'clojure',
      'share',
      'man',
      'man1'
    );
    const clojureLibDir = path.join(libDir, 'clojure');
    const clojureLibexecDir = path.join(clojureLibDir, 'libexec');

    await tc.extractTar(file, destinationFolder);

    const sourceDir = path.join(destinationFolder, 'clojure-tools');

    await io.mkdirP(binDir);
    await io.mkdirP(manDir);
    await io.mkdirP(clojureLibexecDir);

    await io.mv(path.join(sourceDir, 'deps.edn'), clojureLibDir);
    await io.mv(path.join(sourceDir, 'example-deps.edn'), clojureLibDir);
    await io.mv(
      path.join(sourceDir, `clojure-tools-${version}.jar`),
      clojureLibexecDir
    );
    await readWriteAsync(
      path.join(sourceDir, 'clojure'),
      '"$CLOJURE_INSTALL_DIR"'
    );
    await io.mv(path.join(sourceDir, 'clj'), binDir);
    await io.mv(path.join(sourceDir, 'clojure'), binDir);
    await io.mv(path.join(sourceDir, 'clojure.1'), manDir);
    await io.mv(path.join(sourceDir, 'clj.1'), manDir);

    return `${destinationFolder}/clojure`;
  } else {
    throw new Error(`Not a file`);
  }
}

async function readWriteAsync(
  file: string,
  replacement: string
): Promise<void> {
  fs.readFile(file, 'utf-8', function(err, data) {
    if (err) throw err;

    var newValue = data.replace(/PREFIX/gim, replacement);

    fs.writeFile(file, newValue, 'utf-8', function(err) {
      if (err) throw err;
      console.log('filelistAsync complete');
    });
  });
}
