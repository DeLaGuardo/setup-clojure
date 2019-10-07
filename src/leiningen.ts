import * as core from '@actions/core';
import * as io from '@actions/io';
import * as tc from '@actions/tool-cache';
import * as exec from '@actions/exec';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as utils from './utils';

let tempDirectory = process.env['RUNNER_TEMP'] || '';

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
        'ClojureLeiningen',
        utils.getCacheVersionString(version),
        os.arch()
    );

    if (toolPath) {
        core.debug(`Leiningen found in cache ${toolPath}`);
    } else {
        let leiningenFile = await tc.downloadTool(
            `https://raw.githubusercontent.com/technomancy/leiningen/${version}/bin/lein`
        );
        let tempDir: string = path.join(
            tempDirectory,
            'temp_' + Math.floor(Math.random() * 2000000000)
        );
        const leiningenDir = await installLeiningen(
            leiningenFile,
            tempDir
        );
        core.debug(`Leiningen installed to ${leiningenDir}`);
        toolPath = await tc.cacheDir(
            leiningenDir,
            'ClojureLeiningen',
            utils.getCacheVersionString(version),
            os.arch()
        );
    }

    core.exportVariable('LEIN_HOME', toolPath);
    core.addPath(path.join(toolPath, 'bin'));
}

async function installLeiningen(
    binScript: string,
    destinationFolder: string
): Promise<string> {
    await io.mkdirP(destinationFolder);

    const bin = path.normalize(binScript);
    const binStats = fs.statSync(bin);
    if (binStats.isFile()) {
        const binDir = path.join(destinationFolder, 'leiningen', 'bin');

        await io.mkdirP(binDir);

        await io.mv(bin, path.join(binDir, `lein`));
        fs.chmodSync(path.join(binDir, `lein`), '0755');

        await exec.exec(
            './lein',
            [],
            {
                cwd: path.join(destinationFolder, 'leiningen', 'bin'),
                env: {
                    'LEIN_HOME': path.join(destinationFolder, 'leiningen')
                }
            }
        );

        return path.join(destinationFolder, 'leiningen');
    } else {
        throw new Error('Not a file');
    }
}
