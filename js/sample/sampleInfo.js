import {igvxhr, FileUtils, IGVMath} from '../../node_modules/igv-utils/src/index.js'
import SampleInfoViewport from "./sampleInfoViewport.js";
import {
    appleCrayonRGB,
    appleCrayonRGBA,
    randomRGB,
    rgbaColor,
    rgbStringHeatMapLerp, rgbStringLerp,
    rgbStringTokens
} from "../util/colorPalletes.js";
import {distinctColorsPalette} from './sampleInfoPaletteLibrary.js'

let attributeNames
let attributeNamesMap
let attributeRangeLUT
let sampleDictionary
let copyNumberDictionary
let colorDictionary = {}

const emptySpaceReplacement = '|'
const colorForNA = appleCrayonRGB('magnesium')

class SampleInfo {
    constructor(browser) {

        this.sampleInfoFiles = []

        const found = browser.findTracks(t => typeof t.getSamples === 'function')
        if (found.length > 0) {
            browser.sampleInfoControl.setButtonVisibility(true)
        }


        browser.on('trackorderchanged', ignore => {

            if (this.isInitialized()) {

                const found = browser.findTracks(track => typeof track.getSamples === 'function')

                if (found.length > 0) {
                    browser.layoutChange()
                }
            }
        })

    }

    initialize() {
        sampleDictionary = undefined
    }

    isInitialized() {
        return undefined !== sampleDictionary
    }

    getAttributeNames() {
        return attributeNames
    }

    getAttributes(sampleName) {

        const key = undefined === copyNumberDictionary ? sampleName : (copyNumberDictionary[sampleName] || sampleName)
        return sampleDictionary[key]
    }

    async loadSampleInfoFile(browser, path) {
        let string
        try {
            string = await igvxhr.loadString(path)
            this.processSampleInfoFileAsString(browser, string)
        } catch (e) {
            console.error(e.message)
        }

        if (false === FileUtils.isFile(path)) {
            this.sampleInfoFiles.push(path)
        }

        await SampleInfoViewport.update(browser)

        const found = browser.findTracks(t => typeof t.getSamples === 'function')
        if (found.length > 0) {
            browser.sampleInfoControl.setButtonVisibility(true)
        }

    }

    processSampleInfoFileAsString(browser, string) {

        // split file into sections: samples, sample-mapping, etc.
        const sections = string.split('#').filter(line => line.length > 0)

        // First section is always samples
        updateSampleDictionary(sections[0])

        // Establish the range of values for each attribute
        attributeRangeLUT = createAttributeRangeLUT(sampleDictionary)

        // If there are more sections look for the copy-number section
        if (sections.length > 1) {
            createSampleMappingTables(sections, 'copynumber')
            createColorScheme(sections)
        }

    }

    getAttributeColor(attribute, value) {

        // Use for diagnostic rendering
        // return randomRGB(180, 240)

        // if (value === 'NA') {
        //     console.log(`${ attribute } : ${ value }`)
        // }

        let color

        if ('-' === value) {

            color = appleCrayonRGB('snow')

        } else if (typeof value === "string" && colorDictionary[value]) {

            color = colorDictionary[value]()

        } else if (colorDictionary[attribute]) {

            color = colorDictionary[attribute](value)

        } else if (typeof value === "string") {

            color = 'NA' === value ? colorForNA : stringToRGBString(value)

        } else {

            // if ('%|Tumor|Nuclei' === attribute) {
            //     console.log(`${ attribute } : ${ value }`)
            // }

            const [min, max] = attributeRangeLUT[attribute]

            const lowerAlphaThreshold = 2e-1
            const alpha = Math.max((value - min) / (max - min), lowerAlphaThreshold)

            const [r, g, b] = distinctColorsPalette[Object.keys(attributeRangeLUT).indexOf(attribute)]
            color = `rgba(${r},${g},${b},${alpha})`

        }

        return color

    }

    getSortedSampleKeysByAttribute(sampleKeys, attribute, sortDirection) {

        const numbers = sampleKeys.filter(key => {
            const value = this.getAttributes(key)[attribute]
            return typeof value === 'number'
        })

        const strings = sampleKeys.filter(key => {
            const value = this.getAttributes(key)[attribute]
            return typeof value === 'string'
        })

        const compare = (a, b) => {

            const aa = this.getAttributes(a)[attribute]
            const bb = this.getAttributes(b)[attribute]

            if (typeof aa === 'string' && typeof bb === 'string') {
                return sortDirection * aa.localeCompare(bb)
            }

            if (typeof aa === 'number' && typeof bb === 'number') {
                return sortDirection * (aa - bb)
            }

        }

        numbers.sort(compare)
        strings.sort(compare)

        return -1 === sortDirection ? [...numbers, ...strings] : [...strings, ...numbers]

    }

    toJSON(trackJson) {
        for (const url of this.sampleInfoFiles) {
            trackJson.push({type: 'sampleinfo', url})
        }
    }
}

function createSampleMappingTables(sections, sectionName) {

    let found
    if ('copynumber' === sectionName) {
        found = sections.filter(string => string.startsWith(sectionName))
        if (found.length > 0) {

            // Get the copy-number section. It is one long string
            let copyNumber = found[0]

            // split into lines
            copyNumber = copyNumber.split(/[\r\n]/).filter(line => line.length > 0)
            copyNumber.shift()

            for (const line of copyNumber) {
                const [a, b] = line.split('\t')

                if (undefined === copyNumberDictionary) {
                    copyNumberDictionary = {}
                }
                copyNumberDictionary[a] = b
            }

        }
    }

}

function createColorScheme(sections) {

    const found = sections.filter(string => string.startsWith('colors'))

    if (found.length > 0) {

        let colorSettings = found[0]

        colorSettings = colorSettings.split(/[\r\n]/).filter(line => line.length > 0)
        colorSettings.shift()

        const mappingfunction = (token, index, array) => {

            let result
            switch (index) {
                case 0:
                    result = token.split(' ').join(emptySpaceReplacement)
                    break
                case 1:
                    result = token.includes(':') ? token.split(':').map(str => parseFloat(str)) : token
                    break
                case 2:
                    result = `rgb(${token})`
                    break
                case 3:
                    result = `rgb(${token})`
            }

            return result
        }

        const mappings = colorSettings.map(setting => {
            const list = setting.split('\t')
            const result = list.map(mappingfunction)
            return result
        })

        const triplets = mappings
            .filter(mapping => 3 === mapping.length && !mapping.includes('*'))
            .filter(([a, b, c]) => !Array.isArray(b))

        const tmp = {}
        for (const triplet of triplets) {
            const [attribute, value, rgb] = triplet
            if (undefined === tmp[attribute]) {
                tmp[attribute] = {}
            }
            tmp[attribute][value.toUpperCase()] = rgb
        }

        for (const [k, v] of Object.entries(tmp)) {
            const lut = Object.assign({}, v)
            colorDictionary[k] = attributeValue => {

                const key = attributeValue.toUpperCase()
                const color = lut[key] || appleCrayonRGB('snow')
                return color
            }
        }

        const clamped = mappings.filter(mapping => Array.isArray(mapping[1]))

        for (const cl of clamped) {
            const [a, b] = cl[1]
            const attribute = cl[0]

            if (3 === cl.length) {

                const [_r, _g, _b] = rgbStringTokens(cl[2])

                colorDictionary[attribute] = attributeValue => {
                    attributeValue = IGVMath.clamp(attributeValue, a, b)
                    const interpolant = (attributeValue - a) / (b - a)
                    return rgbaColor(_r, _g, _b, interpolant)
                }

            } else if (4 === cl.length) {

                const [a, b] = cl[1]
                const [attribute, ignore, rgbA, rgbB] = cl

                colorDictionary[attribute] = attributeValue => {
                    attributeValue = IGVMath.clamp(attributeValue, a, b)
                    const interpolant = (attributeValue - a) / (b - a)
                    return rgbStringHeatMapLerp(rgbA, rgbB, interpolant)
                }
            }
        }

        const wildCards = mappings.filter(mapping => 3 === mapping.length && mapping.includes('*'))

        for (const wildCard of wildCards) {

            if ('*' === wildCard[1]) {
                const [attribute, star, rgb] = wildCard

                colorDictionary[attribute] = attributeValue => {

                    if ('NA' === attributeValue) {
                        return colorForNA
                    } else {
                        const [min, max] = attributeRangeLUT[attribute]
                        const interpolant = (attributeValue - min) / (max - min)

                        const [r, g, b] = rgbStringTokens(rgb)
                        return rgbaColor(r, g, b, interpolant)
                    }

                }

            } else if ('*' === wildCard[0]) {
                const [star, attributeValue, rgb] = wildCard
                colorDictionary[attributeValue] = () => rgb
            }

        }

    }

}

function createAttributeRangeLUT(dictionary) {

    const lut = {}
    for (const value of Object.values(dictionary)) {

        for (const attribute of attributeNames) {

            let item = value[attribute]

            if (undefined === lut[attribute]) {
                lut[attribute] = []
            }

            lut[attribute].push(item)

        } // for (attributeNames)

    } // for (Object.values(sampleDictionary))

    // clean up oddball cases.
    const isNumber = element => typeof element === 'number'
    const isString = element => typeof element === 'string'

    // remove duplicates
    for (const key of Object.keys(lut)) {
        const multiples = lut[key]
        const set = new Set(multiples)
        const list = Array.from(set)

        if (true === list.some(isString) && true === list.some(isNumber)) {
            lut[key] = list.filter(item => !isString(item))
        } else {
            lut[key] = list
        }

        if (!lut[key].some(isString)) {
            const clone = lut[key].slice()
            lut[key] = [Math.min(...clone), Math.max(...clone)]
        }

    }

    return lut
}

function updateSampleDictionary(sampleTableAsString) {

    const lines = sampleTableAsString.split(/[\r\n]/)

    // discard "sampleTable"
    lines.shift()

    // shift attribute labels
    const scratch = lines.shift().split('\t')

    // discard "Linking_id"
    scratch.shift()

    attributeNames = scratch.map(label => label.split(' ').join(emptySpaceReplacement))

    attributeNamesMap = new Map(attributeNames.map((name, index) => [name, index]))

    const cooked = lines.filter(line => line.length > 0)

    for (const line of cooked) {

        const record = line.split('\t')
        const _key_ = record.shift()

        if (undefined === sampleDictionary) {
            sampleDictionary = {}
        }

        sampleDictionary[_key_] = {}

        for (let i = 0; i < record.length; i++) {
            const obj = {}

            if ("" === record[i]) {
                obj[attributeNames[i]] = '-'
            } else {
                obj[attributeNames[i]] = record[i]
            }

            Object.assign(sampleDictionary[_key_], obj)
        }

    } // for (lines)

    for (const [key, record] of Object.entries(sampleDictionary)) {
        sampleDictionary[key] = toNumericalRepresentation(record)
    }

}

function toNumericalRepresentation(obj) {

    const result = Object.assign({}, obj)

    for (const [key, value] of Object.entries(result)) {
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
export {sampleDictionary, emptySpaceReplacement, attributeNamesMap}

export default SampleInfo
