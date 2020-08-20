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
const lein = __importStar(require("./leiningen"));
const boot = __importStar(require("./boot"));
const tdeps = __importStar(require("./tdeps"));
const IS_WINDOWS = process.platform === 'win32';
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const Lein = core.getInput('lein');
            const Boot = core.getInput('boot');
            const Tdeps = core.getInput('tools-deps');
            // if (IS_WINDOWS) {
            //     throw new Error('Windows is not supported yet.');
            // }
            if (Lein) {
                lein.setup(Lein);
            }
            if (Boot) {
                boot.setup(Boot);
            }
            if (Tdeps) {
                tdeps.setup(Tdeps);
            }
            if (!Boot && !Lein && !Tdeps) {
                throw new Error('You must specify at least one clojure tool.');
            }
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
run();
