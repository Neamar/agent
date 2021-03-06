"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const util_1 = require("util");
const fs_1 = require("fs");
const os_1 = require("os");
const inquirer_1 = require("inquirer");
const randomstring = require("randomstring");
const mkdirp = require("mkdirp");
const log_1 = require("./log");
const assertExit_1 = require("./assertExit");
const dbackedApi_1 = require("./dbackedApi");
var DB_TYPE;
(function (DB_TYPE) {
    DB_TYPE["pg"] = "pg";
    DB_TYPE["mysql"] = "mysql";
})(DB_TYPE = exports.DB_TYPE || (exports.DB_TYPE = {}));
const readFilePromisified = util_1.promisify(fs_1.readFile);
const mkdirpPromisified = util_1.promisify(mkdirp);
const writeFilePromisified = util_1.promisify(fs_1.writeFile);
exports.getConfigFileContent = async (configDirectory) => {
    const filePath = path_1.resolve(configDirectory, 'config.json');
    const fileContent = await readFilePromisified(filePath, { encoding: 'utf-8' });
    const content = JSON.parse(fileContent);
    return content;
};
const mergeConfig = (configSource = {}, configToApply) => {
    const fields = [
        'agentId',
        'apikey',
        'publicKey',
        'dbType',
        'dbHost',
        'dbUsername',
        'dbPassword',
        'dbName',
    ];
    const mergedConfig = Object.assign({}, configSource);
    fields.forEach((fieldName) => {
        if (configToApply[fieldName]) {
            mergedConfig[fieldName] = configToApply[fieldName];
        }
    });
    return mergedConfig;
};
const saveAgentId = async (config) => {
    try {
        await mkdirpPromisified(config.configDirectory);
    }
    catch (e) { }
    const filePath = path_1.resolve(config.configDirectory, 'config.json');
    let configContent = {};
    try {
        const fileContent = await readFilePromisified(filePath, { encoding: 'utf-8' });
        try {
            configContent = JSON.parse(fileContent);
        }
        catch (e) {
            // the file is not a JSON file, do not save it and exit now
            log_1.default.error('Couldn\'t parse JSON config file, using temp agentId', { filePath, error: e.message });
            return;
        }
    }
    catch (e) { }
    configContent.agentId = config.agentId;
    try {
        await writeFilePromisified(filePath, JSON.stringify(configContent, null, 4));
    }
    catch (e) {
        log_1.default.error('Couldn\'t save JSON config file, using temp agentId', { filePath, error: e.message });
    }
};
exports.getConfig = async (commandLine) => {
    let config = {
        configDirectory: commandLine.configDirectory || '/etc/dbacked',
    };
    try {
        const configFileContent = await exports.getConfigFileContent(config.configDirectory);
        config = mergeConfig(config, configFileContent);
    }
    catch (e) { }
    config = mergeConfig(config, {
        apikey: process.env.DBACKED_APIKEY,
        publicKey: process.env.DBACKED_PUBLIC_KEY,
        dbType: process.env.DBACKED_DB_TYPE,
        dbHost: process.env.DBACKED_DB_HOST,
        dbUsername: process.env.DBACKED_DB_USERNAME,
        dbPassword: process.env.DBACKED_DB_PASSWORD,
        dbName: process.env.DBACKED_DB_NAME,
    });
    config = mergeConfig(config, {
        apikey: commandLine.apikey,
        publicKey: commandLine.publicKey,
        dbType: commandLine.dbType,
        dbHost: commandLine.dbHost,
        dbUsername: commandLine.dbUsername,
        dbPassword: commandLine.dbPassword,
        dbName: commandLine.dbName,
    });
    if (!config.agentId) {
        config.agentId = `${os_1.hostname()}-${randomstring.generate(4)}`;
        await saveAgentId(config);
    }
    if (!config.dumpProgramsDirectory) {
        config.dumpProgramsDirectory = '/tmp/dbacked_dumpers';
    }
    return config;
};
exports.getAndCheckConfig = async (commandLine) => {
    const config = await exports.getConfig(commandLine);
    [{
            field: config.apikey, arg: '--apikey', env: 'DBACKED_APIKEY', confName: 'apikey',
        }, {
            field: config.dbType, arg: '--db-type', env: 'DBACKED_DB_TYPE', confName: 'dbType',
        }, {
            field: config.dbHost, arg: '--db-host', env: 'DBACKED_DB_HOST', confName: 'dbHost',
        }, {
            field: config.dbUsername, arg: '--db-username', env: 'DBACKED_DB_USERNAME', confName: 'dbUsername',
        }, {
            field: config.dbName, arg: '--db-name', env: 'DBACKED_DB_NAME', confName: 'dbName',
        }].forEach(({ field, arg, env, confName, }) => {
        assertExit_1.default(field && field.length, `${arg}, ${env} env variable or ${confName} config field required`);
    });
    if (!config.publicKey) {
        log_1.default.warn('You didn\'t provide your public key via the --public-key or env varible DBACKED_PUBLIC_KEY or publicKey config key, this could expose you to a man in the middle attack on your backups');
    }
    return config;
};
const requiredResponse = (input) => !!input || 'Required';
exports.askForConfig = async (config) => {
    return inquirer_1.prompt([
        {
            type: 'input',
            name: 'apikey',
            default: config.apikey,
            async validate(apikey) {
                dbackedApi_1.registerApiKey(apikey);
                await dbackedApi_1.getProject();
                return true;
            },
        }, {
            type: 'list',
            name: 'dbType',
            default: config.dbType,
            message: 'DB type:',
            choices: ['pg', 'mysql'],
        }, {
            name: 'dbHost',
            message: 'DB host:',
            default: config.dbHost,
            validate: requiredResponse,
        }, {
            name: 'dbUsername',
            message: 'DB username:',
            default: config.dbUsername,
            validate: requiredResponse,
        }, {
            name: 'dbPassword',
            message: 'DB password: [OPTIONNAL]',
            default: config.dbPassword,
        }, {
            name: 'dbName',
            message: 'DB name:',
            default: config.dbName,
            validate: requiredResponse,
        }, {
            name: 'agentId',
            default: config.agentId,
            message: 'Server name [OPTIONNAL]',
        },
    ]);
};
//# sourceMappingURL=config.js.map