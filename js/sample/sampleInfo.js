import {igvxhr} from '../../node_modules/igv-utils/src/index.js'
import SampleInfoViewport from "./sampleInfoViewport.js";
import {appleCrayonRGB, appleCrayonRGBA, randomRGB, rgbStringLerp} from "../util/colorPalletes.js";
import { appleCrayonNames, distinctColorsPalette } from './sampleInfoPaletteLibrary.js'

let attributes
let attributeRangeLUT
let copyNumberDictionary = {}
let sampleDictionary

const sampleInfo =
    {
        getAttributes: key => {
            let sampleKey = copyNumberDictionary[ key ] || key
            return sampleDictionary[ sampleKey ]
        },

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

            // split file into sections: samples, sample-mapping, etc.
            const sections = string.split('#').filter(line => line.length > 0)

            // First section is always samples
            updateSampleDictionary(sections[0], sections.length > 0)

            // Establish the range of values for each attribute
            attributeRangeLUT = createAttributeRangeLUT(sampleDictionary)

            // If there are more sections look for the copy-number section
            if (sections.length > 1) {

                let found

                // copy-number
                found = sections.filter(string => string.startsWith('copynumber'))
                if (found.length > 0) {

                    // Get the copy-number section. It is one long string
                    let copyNumber = found[ 0 ]

                    // split into lines
                    copyNumber = copyNumber.split('\r').filter(line => line.length > 0)
                    copyNumber.shift()

                    for (const line of copyNumber) {
                        const [ a, b ] = line.split('\t')
                        copyNumberDictionary[ a ] = b
                    }

                }

                // color
                found = sections.filter(string => string.startsWith('colors'))
                if (found.length > 0) {

                    let colorSettings = found[ 0 ]

                    // split into lines
                    colorSettings = colorSettings.split('\r').filter(line => line.length > 0)
                    colorSettings.shift()

                    const clampLerpRGB = rangeString => {
                        const [ a, b ] = rangeString.split(':').map(string => parseFloat(string))
                        return `clampLerpRGB(${ a },${ b }`
                    }

                    const colorTable = colorSettings.map(setting => {

                        const mapped = setting.split('\t').map((token, index, array) => {

                            switch (index) {
                                case 0:
                                    return token.split(' ').join('_')
                                case 1:
                                    return 4 === array.length ? token.split(':').map(str => parseFloat(str)) : token
                                case 2:
                                    return `rgb(${ token })`
                                case 3:
                                    return `rgb(${ token })`
                            }

                        });

                        // [
                        //     "sil_width",
                        //     [
                        //         -0.1,
                        //         0.5
                        //     ],
                        //     "rgb(0,0,255)",
                        //     "rgb(255,0,0)"
                        // ]

                        if (4 === mapped.length && Array.isArray(mapped[ 1 ])) {

                            const [ a, b ] = mapped[ 1 ]
                            const [ attribute, _ignore_, rgbA, rgbB ] = mapped

                            const clampedLerpRGB = attributeValue => {
                                const interpolant = Math.min(Math.max(attributeValue, a), b)
                                return rgbStringLerp(rgbA, rgbB, interpolant)
                            }

                            return [ attribute, clampedLerpRGB ]
                        }

                        return mapped
                    })

                    console.log('done')

                }


            }

            await SampleInfoViewport.update(browser)

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
                const [ r, g, b ] = distinctColorsPalette[ Object.keys(attributeRangeLUT).indexOf(attribute) ]
                return `rgba(${r},${g},${b},${alpha})`

                // apple crayon
                // const index = Object.keys(attributeRangeLUT).indexOf(attribute)
                // const appleCrayonName = appleCrayonNames[ index ]
                // return appleCrayonRGBA(appleCrayonName, alpha)
            }

        },

        getSortedSampleKeysByAttribute : (sampleKeys, attribute, sortDirection) => {

            const numbers = sampleKeys.filter(key => {
                const value = sampleInfo.getAttributes(key)[ attribute ]
                return typeof value === 'number'
            })

            const strings = sampleKeys.filter(key => {
                const value = sampleInfo.getAttributes(key)[ attribute ]
                return typeof value === 'string'
            })

            const compare = (a, b) => {

                const aa = sampleInfo.getAttributes(a)[ attribute ]
                const bb = sampleInfo.getAttributes(b)[ attribute ]

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

function createAttributeRangeLUT(dictionary) {

    const lut= {}
    for (const value of Object.values(dictionary)) {

        for (const attribute of attributes) {

            let item = value[ attribute ]

            if (undefined === lut[ attribute ]) {
                lut[ attribute ] = []
            }

            lut[ attribute ].push(item)

        } // for (attributes)

    } // for (Object.values(sampleDictionary))

    // clean up oddball cases.
    const isNumber = element => typeof element === 'number'
    const isString = element => typeof element === 'string'

    // remove duplicates
    for (const key of Object.keys(lut)) {
        const multiples = lut[ key ]
        const set = new Set( multiples )
        const list = Array.from( set )

        if (true === list.some(isString) && true === list.some(isNumber)) {
            lut[ key ] = list.filter(item => !isString(item))
        } else {
            lut[ key ] = list
        }

        if (!lut[ key ].some(isString)) {
            const clone = lut[ key ].slice()
            lut[ key ] = [ Math.min(...clone), Math.max(...clone) ]
        }

    }

    return lut
}

function updateSampleDictionary(sampleTableAsString, doSampleMapping) {

    const lines = sampleTableAsString.split('\r')

    // discard "sampleTable"
    if (true === doSampleMapping) {
        lines.shift()
    }

    // shift attribute labels
    const scratch = lines.shift().split('\t')

    // discard "Linking_id"
    if (true === doSampleMapping) {
        scratch.shift()
    }

    attributes = scratch.map(label => label.split(' ').join('_'))

    const cooked = lines.filter(line => line.length > 0)

    for (const line of cooked) {

        const record = line.split('\t')
        const _key_ = record.shift()

        if (undefined === sampleDictionary) {
            sampleDictionary = {}
        }

        sampleDictionary[ _key_ ] = {}

        for (let i = 0; i < record.length; i++) {
            const obj = {}
            obj[ attributes[ i ] ] = "" === record[ i ] ? 'NA' : record[ i ]
            Object.assign(sampleDictionary[ _key_ ], obj)
        }

    } // for (lines)

    for (const [ key, record ] of Object.entries(sampleDictionary)) {
        sampleDictionary[ key ] = toNumericalRepresentation(record)
    }

}

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
export { sampleInfo, sampleDictionary }
