"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const io = __importStar(require("@actions/io"));
const tc = __importStar(require("@actions/tool-cache"));
const exec = __importStar(require("@actions/exec"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const utils = __importStar(require("./utils"));
let tempDirectory = process.env['RUNNER_TEMP'] || '';
const IS_WINDOWS = process.platform === 'win32';
if (!tempDirectory) {
    let baseLocation;
    if (IS_WINDOWS) {
        baseLocation = process.env['USERPROFILE'] || 'C:\\';
    }
    else {
        if (process.platform === 'darwin') {
            baseLocation = '/Users';
        }
        else {
            baseLocation = '/home';
        }
    }
    tempDirectory = path.join(baseLocation, 'actions', 'temp');
}
function setup(version) {
    return __awaiter(this, void 0, void 0, function* () {
        let toolPath = tc.find('Boot', utils.getCacheVersionString(version), os.arch());
        if (toolPath && version !== 'latest') {
            core.info(`Boot found in cache ${toolPath}`);
        }
        else {
            let bootBootstrapFile = yield tc.downloadTool(`https://github.com/boot-clj/boot-bin/releases/download/latest/boot.sh`);
            let tempDir = path.join(tempDirectory, 'temp_' + Math.floor(Math.random() * 2000000000));
            const bootDir = yield installBoot(bootBootstrapFile, tempDir, version);
            core.debug(`Boot installed to ${bootDir}`);
            toolPath = yield tc.cacheDir(bootDir, 'Boot', utils.getCacheVersionString(version));
        }
        core.exportVariable('BOOT_HOME', toolPath);
        core.exportVariable('BOOT_VERSION', version);
        core.addPath(path.join(toolPath, 'bin'));
    });
}
exports.setup = setup;
function installBoot(binScript, destinationFolder, version) {
    return __awaiter(this, void 0, void 0, function* () {
        yield io.mkdirP(destinationFolder);
        const bin = path.normalize(binScript);
        const binStats = fs.statSync(bin);
        if (binStats.isFile()) {
            const binDir = path.join(destinationFolder, 'boot', 'bin');
            yield io.mkdirP(binDir);
            yield io.mv(bin, path.join(binDir, `boot`));
            fs.chmodSync(path.join(binDir, `boot`), '0755');
            let env = {};
            if (version === 'latest') {
                env = {
                    BOOT_HOME: path.join(destinationFolder, 'boot')
                };
            }
            else {
                env = {
                    BOOT_HOME: path.join(destinationFolder, 'boot'),
                    BOOT_VERSION: version
                };
            }
            yield exec.exec(`./boot ${version === 'latest' ? '-u' : '-V'}`, [], {
                cwd: path.join(destinationFolder, 'boot', 'bin'),
                env: env
            });
            return path.join(destinationFolder, 'boot');
        }
        else {
            throw new Error('Not a file');
        }
    });
}
