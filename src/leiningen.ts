import * as core from '@actions/core';
import * as io from '@actions/io';
import * as tc from '@actions/tool-cache';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as utils from './utils';

let tempDirectory = process.env['RUNNER_TEMP'] || '';

const IS_WINDOWS = process.platform === 'win32';

if (!tempDirectory) {
  let baseLocation;
  if (IS_WINDOWS) {
    baseLocation = process.env['USERPROFILE'] || 'C:\\';
  } else {
    if (process.platform === 'darwin') {
      baseLocation = '/Users';
    } else {
      baseLocation = '/home';
    }
  }
  tempDirectory = path.join(baseLocation, 'actions', 'temp');
}

export async function setup(version: string): Promise<void> {
  let toolPath = tc.find(
    'ClojureLeiningen',
    utils.getCacheVersionString(version),
    os.arch()
  );

  if (toolPath) {
    core.debug(`Leiningen found in cache ${toolPath}`);
  } else {
    let leiningenFile = await tc.downloadTool(
      `https://raw.githubusercontent.com/technomancy/leiningen/${version}/bin/lein${
        IS_WINDOWS ? '.bat' : '-pkg'
      }`
    );
    let leiningenLib = await tc.downloadTool(
      `https://github.com/technomancy/leiningen/releases/download/${version}/leiningen-${version}-standalone.zip`
    );
    let tempDir: string = path.join(
      tempDirectory,
      'temp_' + Math.floor(Math.random() * 2000000000)
    );
    const leiningenDir = await installLeiningen(
      leiningenFile,
      leiningenLib,
      tempDir
    );
    core.debug(`clojure tools deps installed to ${leiningenDir}`);
    toolPath = await tc.cacheDir(
      leiningenDir,
      'ClojureLeiningen',
      utils.getCacheVersionString(version)
    );
  }

  core.exportVariable('LEIN_LIB_DIR', toolPath);
  core.addPath(path.join(toolPath, 'bin'));
}

async function installLeiningen(
  binScript: string,
  libFile: string,
  destinationFolder: string
): Promise<string> {
  await io.mkdirP(destinationFolder);

  const bin = path.normalize(binScript);
  const lib = path.normalize(libFile);
  const binStats = fs.statSync(bin);
  const libStats = fs.statSync(lib);
  if (binStats.isFile() && libStats.isFile()) {
    const binDir = path.join(destinationFolder, 'leiningen', 'bin');
    const libDir = path.join(destinationFolder, 'leiningen', 'libexec');

    await io.mkdirP(binDir);
    await io.mkdirP(libDir);

    await io.mv(bin, path.join(binDir, `lein${IS_WINDOWS ? '.bat' : ''}`));
    fs.chmodSync(path.join(binDir, `lein${IS_WINDOWS ? '.bat' : ''}`), '0755');

    await io.mv(lib, path.join(libDir, `leiningen-standalone.jar`));

    if (IS_WINDOWS) {
      await readWriteAsync(
        path.join(binDir, 'lein.bat'),
        '!LEIN_HOME!\\self-installs\\leiningen-!LEIN_VERSION!-standalone.jar',
        '!LEIN_LIB_DIR!\\libexec\\leiningen-standalone.jar'
      );
    } else {
      await readWriteAsync(
        path.join(binDir, 'lein'),
        '/usr/share/java/leiningen-$LEIN_VERSION-standalone.jar',
        '$LEIN_LIB_DIR/libexec/leiningen-standalone.jar'
      );
    }

    return path.join(destinationFolder, 'leiningen');
  } else {
    throw new Error('Not a file');
  }
}

async function readWriteAsync(
  file: string,
  toReplace: string,
  replacement: string
): Promise<void> {
  fs.readFile(file, 'utf-8', function(err, data) {
    if (err) throw err;

    var newValue = data.replace(toReplace, replacement);

    fs.writeFile(file, newValue, 'utf-8', function(err) {
      if (err) throw err;
    });
  });
}
