import {igvxhr} from '../../node_modules/igv-utils/src/index.js'
import SampleInfoViewport from "./sampleInfoViewport.js";
import {appleCrayonRGB, appleCrayonRGBA, randomRGB} from "../util/colorPalletes.js";
import { appleCrayonNames, yet_another_palette } from './sampleInfoPaletteLibrary.js'

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

            for (const [ key, record ] of Object.entries(sampleDictionary)) {
                sampleDictionary[ key ] = toNumericalRepresentation(record)
            }

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

                    if (undefined === attributeRangeLUT[ attribute ]) {
                        attributeRangeLUT[ attribute ] = []
                    }

                    attributeRangeLUT[ attribute ].push(item)

                } // for (attributes)

            } // for (Object.values(sampleDictionary))


            // clean up oddball cases.
            const isNumber = element => typeof element === 'number'
            const isString = element => typeof element === 'string'

            // remove duplicates
            for (const key of Object.keys(attributeRangeLUT)) {
                const list = Array.from( new Set( attributeRangeLUT[ key ].slice()) )

                if (true === list.some(isString) && true === list.some(isNumber)) {
                    attributeRangeLUT[ key ] = list.filter(item => !isString(item))
                } else {
                    attributeRangeLUT[ key ] = list
                }

                if (!attributeRangeLUT[ key ].some(isString)) {
                    const clone = attributeRangeLUT[ key ].slice()
                    attributeRangeLUT[ key ] = [ Math.min(...clone), Math.max(...clone) ]
                }

            }

        },

        getAttributeColor: (attribute, value) => {

            // Use for diagnostic rendering
            // return randomRGB(180, 240)
            
            if ('NA' === value) {
                return appleCrayonRGB('snow')
            } else if (typeof value === "string") {
                return stringToRGBString(value)
            } else {

                const [ min, max ] = attributeRangeLUT[ attribute ]

                // a hack required to handle attributes that should have string values
                // but the actual data has 0 as well.
                if (0 === min && 0 === max) {
                    return appleCrayonRGB('snow')
                }

                const lowerAlphaThreshold = 2e-1
                const alpha = Math.max((value - min) / (max - min), lowerAlphaThreshold)

                // 20 distinct colors
                const [ r, g, b ] = yet_another_palette[ Object.keys(attributeRangeLUT).indexOf(attribute) ]
                return `rgba(${r},${g},${b},${alpha})`

                // apple crayon
                // const index = Object.keys(attributeRangeLUT).indexOf(attribute)
                // const appleCrayonName = appleCrayonNames[ index ]
                // return appleCrayonRGBA(appleCrayonName, alpha)
            }

        },

        getSortedSampleKeysByAttribute : (sampleKeys, attribute, sortDirection) => {

            const numbers = sampleKeys.filter(key => {
                const value = copyNumberDictionary[ key ][ attribute ]
                return typeof value === 'number'
            })

            const strings = sampleKeys.filter(key => {
                const value = copyNumberDictionary[ key ][ attribute ]
                return typeof value === 'string'
            })

            const compare = (a, b) => {

                const aa = copyNumberDictionary[ a ][ attribute ]
                const bb = copyNumberDictionary[ b ][ attribute ]

                if (typeof aa === 'string' && typeof bb === 'string') {
                    return sortDirection * aa.localeCompare(bb)
                }

                if (typeof aa === 'number' && typeof bb === 'number') {
                    return sortDirection * (aa - bb)
                }

            }

            numbers.sort(compare)
            strings.sort(compare)

            return -1 === sortDirection ? [ ...numbers, ...strings ] : [ ...strings, ...numbers ]

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
