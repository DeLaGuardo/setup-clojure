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
if (!tempDirectory) {
    let baseLocation;
    if (process.platform === 'darwin') {
        baseLocation = '/Users';
    }
    else {
        baseLocation = '/home';
    }
    tempDirectory = path.join(baseLocation, 'actions', 'temp');
}
function setup(version) {
    return __awaiter(this, void 0, void 0, function* () {
        let toolPath = tc.find('ClojureLeiningen', utils.getCacheVersionString(version), os.arch());
        if (toolPath) {
            core.debug(`Leiningen found in cache ${toolPath}`);
        }
        else {
            let leiningenFile = yield tc.downloadTool(`https://raw.githubusercontent.com/technomancy/leiningen/${version}/bin/lein`);
            let tempDir = path.join(tempDirectory, 'temp_' + Math.floor(Math.random() * 2000000000));
            const leiningenDir = yield installLeiningen(leiningenFile, tempDir);
            core.debug(`Leiningen installed to ${leiningenDir}`);
            toolPath = yield tc.cacheDir(leiningenDir, 'ClojureLeiningen', utils.getCacheVersionString(version), os.arch());
        }
        core.exportVariable('LEIN_HOME', toolPath);
        core.addPath(path.join(toolPath, 'bin'));
    });
}
exports.setup = setup;
function installLeiningen(binScript, destinationFolder) {
    return __awaiter(this, void 0, void 0, function* () {
        yield io.mkdirP(destinationFolder);
        const bin = path.normalize(binScript);
        const binStats = fs.statSync(bin);
        if (binStats.isFile()) {
            const binDir = path.join(destinationFolder, 'leiningen', 'bin');
            yield io.mkdirP(binDir);
            yield io.mv(bin, path.join(binDir, `lein`));
            fs.chmodSync(path.join(binDir, `lein`), '0755');
            yield exec.exec('./lein', [], {
                cwd: path.join(destinationFolder, 'leiningen', 'bin'),
                env: {
                    'LEIN_HOME': path.join(destinationFolder, 'leiningen')
                }
            });
            return path.join(destinationFolder, 'leiningen');
        }
        else {
            throw new Error('Not a file');
        }
    });
}
