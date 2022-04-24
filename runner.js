const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const render = require("./render");

const forbiddenDirs = ["node_modules"];

class Runner {
    constructor() {
        this.testFiles = [];
    }

    async runTests() {
        for (let file of this.testFiles) {
            console.log(chalk.gray(`-----${file.shortName}`));
            const beforeEaches = [];
            // global - is a special variable/keyword inside node.js. This is a variable that is available at every file and shared between files.
            // if nodeJS can't find a particular variable in the local file, it will look for the different properties that are attached to the global variable.
            // if nodeJS can find it, it will reference that property.
            // this is how MochaJS does it.
            global.render = render;
            global.beforeEach = (func) => {
                beforeEaches.push(func);
            }
            global.it = async (description, func) => {
                beforeEaches.forEach(func => func());
                try {
                    await func();
                    console.log(chalk.green(`\tOK - ${description}`));
                } catch (err) {
                    const message = err.message.replace(/\n/g, "\n\t\t")
                    console.log(chalk.red(`\tERR - ${description}`));
                    console.log(chalk.red(`\t`, message)); 
                }
            };

            try {
                require(file.name);
            } catch (err) {
                console.log(chalk.red("ERR - Error loading file", file.name));
                console.log(chalk.red(err));
            }
        } 
    }

    async collectFiles(targetPath) {
        const files = await fs.promises.readdir(targetPath);
        
        for (let file of files) {
            const filepath = path.join(targetPath, file);
            const stats = await fs.promises.lstat(filepath);

            if (stats.isFile() && file.includes(".test.js")) {
               this.testFiles.push({ name: filepath, shortName: file }); 
            } else if (stats.isDirectory() && !forbiddenDirs.includes(file)) {
                const childFiles = await fs.promises.readdir(filepath);
                
                files.push(...childFiles.map(f => path.join(file, f)));
            }
        }
    }
}

module.exports = Runner;