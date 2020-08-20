"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setup = void 0;
const core = __importStar(require("@actions/core"));
const io = __importStar(require("@actions/io"));
const tc = __importStar(require("@actions/tool-cache"));
const exec = __importStar(require("@actions/exec"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const utils = __importStar(require("./utils"));
const tempDirectory = utils.getTempDir();
const IS_WINDOWS = utils.isWindows();
function setup(version) {
    return __awaiter(this, void 0, void 0, function* () {
        let toolPath = tc.find('Leiningen', utils.getCacheVersionString(version), os.arch());
        if (toolPath && version !== 'latest') {
            core.info(`Leiningen found in cache ${toolPath}`);
        }
        else {
            const leiningenFile = yield tc.downloadTool(`https://raw.githubusercontent.com/technomancy/leiningen/${version === 'latest' ? 'stable' : version}/bin/lein${IS_WINDOWS ? '.ps1' : ''}`);
            const tempDir = path.join(tempDirectory, `temp_${Math.floor(Math.random() * 2000000000)}`);
            const leiningenDir = yield installLeiningen(leiningenFile, tempDir);
            core.debug(`Leiningen installed to ${leiningenDir}`);
            toolPath = yield tc.cacheDir(leiningenDir, 'Leiningen', utils.getCacheVersionString(version));
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
            yield io.mv(bin, path.join(binDir, `lein${IS_WINDOWS ? '.ps1' : ''}`));
            if (!IS_WINDOWS) {
                fs.chmodSync(path.join(binDir, `lein`), '0755');
            }
            yield exec.exec(`.${IS_WINDOWS ? '\\' : '/'}lein${IS_WINDOWS ? '.ps1' : ''} version`, [], {
                cwd: path.join(destinationFolder, 'leiningen', 'bin'),
                env: {
                    LEIN_HOME: path.join(destinationFolder, 'leiningen')
                }
            });
            return path.join(destinationFolder, 'leiningen');
        }
        else {
            throw new Error('Not a file');
        }
    });
}
