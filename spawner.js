global.requireEsm = async function (url) {
  return await import(url);
};

global.discordJS = require("discord.js");
// global.telegramJS = require("telegram.js");

const originalExt = { ...require.extensions };
const { createRequire } = require("module");
const originalRequire = createRequire(__filename);
originalRequire.extensions = { ...originalExt };

global.originalRequire = originalRequire;
// imma modify some require extensions :)
const fs = require("fs-extra");
const axios = require("axios");
const { execSync } = require("child_process");
const path = require("path");

require.extensions[".txt"] = function (module, filename) {
  if (!fs.existsSync(filename)) {
    return "";
  }
  const file = fs.readFileSync(filename, "utf8");
  module.exports = file;
};
require.url = async function (url) {
  try {
    if (typeof url !== "string") {
      throw new TypeError(
        `The first argument (url) must be a string. Received ${typeof url}`
      );
    }
    const response = await axios.get(url);
    let fileContent = `${response.data}`;
    if (
      typeof response.data !== "string" &&
      typeof response.data !== "object"
    ) {
      throw new TypeError(
        `The url ${url} returned a non-string value. Received ${typeof response.data}`
      );
    } else if (typeof response.data === "object") {
      fileContent = JSON.stringify(response.data);
    }
    const filePath = `${__dirname}/require-${Date.now()}-${Math.floor(
      Math.random() * 1000000
    )}`;
    fs.writeFileSync(filePath, fileContent);
    const result = require(filePath);
    fs.unlinkSync(filePath);
    return result;
  } catch (error) {
    throw error;
  }
};

// Function to check if a package is installed
function isPackageInstalled(packageName) {
  try {
    const packagePath = path.join("node_modules", packageName);
    return fs.existsSync(packagePath);
  } catch (err) {
    return false;
  }
}
function ensureNPM(packageName) {
  if (!isPackageInstalled(packageName)) {
    try {
      console.log(`Installing ${packageName}...`);
      execSync(`npm install ${packageName}`, { stdio: "inherit" });

      console.log(`Running npm install to ensure it's audited...`);
      execSync("npm install", { stdio: "inherit" });
    } catch (err) {
      throw new Error(`Failed to install ${packageName}: ${err.message}`);
    }
  } else {
    console.log(`${packageName} is already installed.`);
  }
  return require(packageName);
}

require.ensure = function (moduleName) {
  if (moduleName.startsWith(".") || path.isAbsolute(moduleName)) {
    return require(moduleName);
  } else {
    return ensureNPM(moduleName);
  }
};
/*
const originalRequire = require;
const requireProxy = {
  apply(target, thisArg, argumentsList) {
    if (argumentsList[0] && !argumentsList[0].startsWith(".")) {
      ensureNPM(argumentsList[0]);
    }
    console.log("Module required:", argumentsList[0]);

    const requiredModule = Reflect.apply(target, thisArg, argumentsList);

    return requiredModule;
  },
};

require = new Proxy(originalRequire, requireProxy);
*/

// finally execute main file :)
require("ts-node").register();

const { secureRandom } = require("./CommandFiles/modules/unisym");

Math.randomOriginal = Math.random.bind(Math);
Math.random = secureRandom;

require("./Cassidy");
