/*
* Workaround for nodes archaic insistence that es modules have ".mjs" extensions or have "type=module" in package.json.
* This script will insert "type": "module" into the package.json of listed modules*
*/

const fs = require('fs')

const packages = ['html2canvas']

for (let p of packages) {
    forceESM(p)
}
function forceESM(packageName) {

    const packageJSON = require(`../../node_modules/${packageName}/package.json`)
    packageJSON['type'] = 'module'

    const outputFile = require.resolve(`../../node_modules/${packageName}/package.json`)
    fs.writeFileSync(outputFile, JSON.stringify(packageJSON, null, 2))


}

