const fs = require('fs')
const jsonFile = './programs.json'
const inquirer = require('inquirer')
inquirer.registerPrompt("table", require("./inquirer-table-prompt/table-prompt"));
const chalk = require('chalk')
const execSync = require('child_process').execSync;
const open = require('open')
const QRcode = require('qrcode');
const upgrade = `winget upgrade --all --silent`

// Invoke commands from the shell

const nodeExec = (cmd) => execSync(cmd, { stdio: [0, 1, 2] })

const getBytes = (string) => Buffer.byteLength(string, 'utf8')

const bytesToSize = (bytes) => {

    let sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']

    if (bytes == 0) return '0 Byte'

    let i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)))

    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i]
}

// Gracefully exit the program

process.stdin.on
(
    'keypress', (_, key) =>
    {
        if (key.name === "escape" || key && key.name === "c" && key.ctrl)
        {
            if (key.name === "escape")
            {
                console.log(chalk.red(`\n\n\r  "ESCAPE", will now exit installer.js menu...\n`))
            }
            else
            {
                console.log(chalk.red(`\n\n\r  "CTRL+C", will now exit installer.js menu...\n`))
            }

            ui.exit(prompt)
        }
    }
)

// Reading the json file and returning the contents

const json = () => JSON.parse(fs.readFileSync(jsonFile))

const data = json()

const winget = data.winget[0]

const installing = []

const notInstalling = []

const allSoftware = []

/* Iterating over the winget object and pushing the software to the installing array if the install
property is true and to the notInstalling array if the install property is false. */

for (const key of Object.keys(winget)) {

    winget[key].forEach(software => (software.install === true) ? installing.push({name: software.name, id: software.id, install: software.install}) : null)

    winget[key].forEach(software => (software.install === false) ? notInstalling.push({name: software.name, id: software.id, install: software.install}) : null)

    winget[key].forEach(software => (software.name) ? allSoftware.push({name: software.name, id: software.id, install: software.install}) : null)

}

/**
 * It takes two arguments, a file path and some data, and writes the data to the file path
 * @param filePath - The path to the file you want to write to.
 * @param data - The data to be written to the file.
 */

const writefile = (filePath, data) => {

	fs.writeFile(filePath, JSON.stringify(data,null,4), (err) => {

		if (err) throw err

	})

}

/* Creating a command to run in the shell. */

const cmdToRun = `winget install -e -h --accept-source-agreements --accept-package-agreements --id ${installing.map(software => software.id).join(`; ${data.wingetInstall}`)}`.replace(/;/g, ' &&')

const cmdKb = bytesToSize(getBytes(cmdToRun))

/* Creating a new array with the contents of the two arrays. */

const appCount = [...installing, ...notInstalling]

let tableRows = () => {

    let software = []
    let softwareNames = allSoftware.map(software => software.name)
    let defaultValue = allSoftware.map(software => software.install)

    for (const name of softwareNames) {

        software.push({name: name, default: defaultValue[softwareNames.indexOf(name)]})

    }

    return software

}

const prompt = inquirer.prompt(
    [
        {
            type: "list",
            name: "winget",
            pageSize: 15,
            message: 'Automated programs installation using "winget" on win 10/11:\n',
            choices:
            [
                {
                    name: `${chalk.green("List")} - List of programs flagged to be installed.`,
                    value: 'list'
                },
                {
                    name: `${chalk.green("Installing")} - Install all the flagged programs.`,
                    value: 'install'
                },
                {
                    name: `${chalk.green("Not Installing")} - List of programs NOT flagged to be installed.`,
                    value: 'notInstalling'
                },
                {
                    name: `${chalk.green("Customize")} - Flag/Unflag program/s for installation process.`,
                    value: 'customize'
                },
                {
                    name: `${chalk.green("Copy command")} - Copy install command to clipboard.`,
                    value: 'copy'
                },
                {
                    name: `${chalk.green("QRcode")} - Generate QR code. (Max command size 3kb.)`,
                    value: 'qrcode'
                },
                new inquirer.Separator(),
                {
                    name: `${chalk.green("Upgrade")} - Upgrade all installed apps. (Requires admin privileges on a powershell terminal.)`,
                    value: 'upgrade'
                },
                {
                    name: `${chalk.green("Search")} - Search a package.`,
                    value: 'search'
                },
                {
                    name: `${chalk.green("Winget Run")} - Search package with Winget Run.`,
                    value: 'winrun'
                },
                new inquirer.Separator(),
                {
                    name: `${chalk.green("Exit")} - Exit installation script.`,
                    value: 'exit'
                }
            ]
        }
    ]
)

prompt.then((answers) =>
    {
        if (answers.winget === "list")
        {

            console.log(`\n${chalk.green("List of programs flagged to be installed:")}\n`)

            installing.forEach(software => { console.log(`- ${software.name}`) })

            console.log(chalk.green(`\n\r${installing.length} programs to be installed out of ${appCount.length}.\n`))

        }
        if (answers.winget === "install")
        {

            console.log(chalk.rgb(233, 36, 116)(`\n\rInstalling ${installing.length} programs of ${appCount.length} available.\n`))

            console.log(chalk.yellow(`If you want to exit the installation process, press "CTRL+C"\n`))

            // Winget install all software flagged to be installed

            installing.length > 0 ? nodeExec(cmdToRun) : console.log("No programs to install! .\n\rPlease use the 'Customize' option in the script menu, or edit 'programs.json'")

        }
        if (answers.winget === "notInstalling")
        {

            console.log(`\n${chalk.green("List of programs flagged to *NOT* be installed:")}\n`)

            notInstalling.forEach(software => { console.log(`- ${software.name}`) })

            console.log(chalk.green(`\n\r${notInstalling.length} programs *NOT* to be installed out of ${appCount.length}.\n`))

            console.log(chalk.rgb(233, 36, 116)(`If you want to add/remove programs,\n\rplease use the 'Customize' option in the script menu, or edit 'programs.json'`))

        }
        if (answers.winget === "customize")
        {

            const custom = inquirer
                .prompt(
                [
                    {
                        type: "table",
                        name: "installPlan",
                        message: "Choose the software you wish to install:",
                        pageSize: 1,
                        columns: [
                        {
                            name: "Install",
                            value: true
                        },
                        {
                            name: "Do not Install",
                            value: false
                        },
                        ],
                        rows: [
                            ...tableRows()
                        ]
                    }
                ])
                custom.then(answers => {

                    for (const key of Object.keys(winget)) {

                        winget[key].forEach((software,index) => {

                            winget[key][index]['install'] = answers.installPlan[index]

                        })

                        writefile(jsonFile, data)

                    }

                })

        }
        if (answers.winget === "copy")
        {
            if (!installing?.length) {

                console.log(chalk.red("\nNo programs to install! \n\rPlease use the 'Customize' option in the script menu, or edit 'programs.json'"))
            }
            else {

                console.log(chalk.rgb(233, 36, 116)(`\nPlease, copy the command below and run it in a terminal:\n\n\r${chalk.green(cmdToRun)}\n`))

            }


        }
        if (answers.winget === "qrcode")
        {

            console.log('\r')

            if (!installing?.length) {

                    console.log(chalk.red("You did not select any program to install, can't generate QR Code. \n\rPlease use the 'Customize' option in the script menu, or edit 'programs.json'."))
            }
            else {

                try {

                    QRcode.toString(cmdToRun,{type:'terminal', small: true}, function (err, url) {

                    url === undefined ? console.log(chalk.red(`The amount of data is too big to be stored in a QR Code, command is ${cmdKb}\n`)) : console.log(url)

                    })

                } catch (error) {

                    console.log(`The amount of data is too big to be stored in a QR Code\n`)

                }

            }

        }
        if (answers.winget === "upgrade")
        {

            nodeExec(upgrade)

        }
        if (answers.winget === "search")
        {

            const search = inquirer.prompt(
                [
                    {
                        type: "input",
                        name: "search",
                        message: "Package name:",
                        validate: (value) => { if (value.length) { return true } else { return "Please enter a valid package name." } }
                    }
                ]
            )
            search.then((answers) => {

                try {

                    console.log('\r')
                    nodeExec(`winget search -e -q "${answers.search}"`)

                } catch (error) {

                    console.log("")
                }

            })


        }
        if (answers.winget === "winrun")
        {

            const search = inquirer.prompt(
                [
                    {
                        type: "input",
                        name: "search",
                        message: "Package name:",
                        validate: (value) => { if (value.length) { return true } else { return "Please enter a valid package name." } }
                    }
                ]
            )
            search.then((answers) => {

                open(`https://winget.run/search?query=${answers.search.replace(/\s/g, '%20')}`)

            })


        }
        if (answers.winget === "exit")
        {

            process.exit(0)

        }

    }
)
.catch((error) =>
{

    if (error.isTtyError)
    {
        console.log(`Prompt couldn't be rendered in the current environment`)
    }

    else
    {
        console.log(`Something went wrong ${error}`)
    }

})
