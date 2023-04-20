import {igvxhr} from '../../node_modules/igv-utils/src/index.js'
import SampleInfoViewport from "./sampleInfoViewport.js";

let attributes
let attributeRangeLUT
let copyNumberDictionary = {}
let sampleDictionary = {}

const sampleInfo =
    {
        loadSampleInfoFile: async (browser, path) => {
            let string
            try {
                string = await igvxhr.loadString(path)
                await sampleInfo.processSampleInfoFileAsString(browser, string)
            } catch (e) {
                console.error(e.message)
            }

        },

        processSampleInfoFileAsString: async (browser, string) => {
            const lines = string.split('\r').filter(line => line.length > 0)

            const sampleTable = []
            const copyNumber = []
            let isSampleTable = false
            let isCopyNumber = false
            for (const line of lines) {

                if (line.startsWith('#sampleTable')) {
                    isSampleTable = true
                    isCopyNumber = false
                }

                if (line.startsWith('#sampleMapping') || line.startsWith('#mutations') || line.startsWith('#colors')) {
                    isSampleTable = false
                    isCopyNumber = false
                }

                if (line.startsWith('#copynumber')) {
                    isSampleTable = false
                    isCopyNumber = true
                }

                if (false === isCopyNumber && true === isSampleTable) {
                    sampleTable.push(line)
                }

                if (true === isCopyNumber && false === isSampleTable) {
                    copyNumber.push(line)
                }
            }
            sampleTable.shift()
            copyNumber.shift()

            await sampleInfo.buildDictionaries(browser, sampleTable, copyNumber)
        },

        buildDictionaries: async (browser, sampleTable, copyNumber) => {

            const lines = sampleTable.slice()

            const scratch = lines.shift().split('\t')
            scratch.shift()

            attributes = scratch.map(label => label.split(' ').join('_'))

            // sampleDictionary = {}

            for (const line of lines) {

                const record = line.split('\t')
                const _key_ = record.shift()

                sampleDictionary[ _key_ ] = {}
                for (let i = 0; i < record.length; i++) {
                    const obj = {}
                    obj[ attributes[ i ] ] = record[ i ]
                    Object.assign(sampleDictionary[ _key_ ], obj)
                }

            } // for (lines)

            for (const [ key, value ] of Object.entries(sampleDictionary)) {
                sampleDictionary[ key ] = toNumericalRepresentation(value)
            }

            // copyNumberDictionary = {}
            for (const line of copyNumber) {
                const [ a, b ] = line.split('\t')
                copyNumberDictionary[ a ] = Object.assign({}, sampleDictionary[ b ])
            }

            sampleInfo.createAttributeRangeLUT()

            await SampleInfoViewport.update(browser)
        },

        createAttributeRangeLUT: () => {
            attributeRangeLUT = {}
            for (const value of Object.values(sampleDictionary)) {

                for (const attribute of attributes) {

                    let item = value[ attribute ]

                    if (undefined === item) {
                        console.log('whoops')
                    }

                    if (typeof item === 'number' || (item.length > 0 && 'NA' !== item)) {

                        if (undefined === attributeRangeLUT[ attribute ]) {
                            attributeRangeLUT[ attribute ] = []
                        }

                        attributeRangeLUT[ attribute ].push(item)

                    } // if (item.length > 0 && 'NA' !== item)

                } // for (labels)

            } // for (Object.values(sampleDictionary))

            // remove duplicates
            for (const key of Object.keys(attributeRangeLUT)) {
                const list = Array.from( new Set( attributeRangeLUT[ key ].slice()) )
                attributeRangeLUT[ key ] = sortArrayAndMinMax(list)
            }

        },

        getAttributeColor: (attribute, value) => {

            return stringToRGBString(typeof value === "string" ? value : value.toString())

            if (typeof value === "string") {
                return stringToRGBString(value)
            } else {

                // TODO: No need for any of this. Just map value -> color directly

                const [ min, max ] = attributeRangeLUT[ attribute ]
                const interpolant = (value - min) / (max - min)
                const str = interpolant.toString()
                return stringToRGBString(str)
            }


        }
    };


function toNumericalRepresentation(obj) {

    const result = Object.assign({}, obj)

    for (const [ key, value ] of Object.entries(result)) {
        if (typeof value === 'string' && !isNaN(value)) {
            result[key] = Number(value)
        }
    }

    return result
}

function sortArrayAndMinMax(array) {
    let result
    if (typeof array[0] === "number") {
        result = array.sort((a, b) => a - b)
        return [ result[ 0 ], result[ result.length - 1] ]
    } else if (typeof array[0] === "string") {
        return array.sort((a, b) => a.localeCompare(b))
    }


}

function stringToRGBString(str) {

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    let color = [];
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xff;
        color.push(value);
    }

    return `rgb(${color.join(', ')})`;
}

// identify an array that is predominantly numerical and replace string with undefined
export { sampleInfo, copyNumberDictionary }
