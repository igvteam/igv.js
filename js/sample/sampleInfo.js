import {igvxhr, FileUtils, IGVMath} from '../../node_modules/igv-utils/src/index.js'
import {
    appleCrayonRGB,
    rgbaColor,
    rgbStringHeatMapLerp, rgbStringLerp,
    rgbStringTokens
} from "../util/colorPalletes.js"
import {distinctColorsPalette} from './sampleInfoPaletteLibrary.js'
import TrackBase from "../trackBase.js"

const colorForNA = appleCrayonRGB('magnesium')
const sampleInfoFileHeaders = ['#sampleTable', '#sampleMapping', '#colors']

class SampleInfo {

    static emptySpaceReplacement = '|'

    sampleDictionary = {}
    attributeNames = []
    sampleMappingDictionary = {}
    colorDictionary = {}
    attributeRangeLUT = {}

    constructor(browser) {

        const found = browser.tracks.some(t => typeof t.getSamples === 'function')
        if (found.length > 0) {
            browser.sampleInfoControl.setButtonVisibility(true)
        }
        this.initialize()

    }

    initialize() {
        this.sampleInfoFiles = []
        this.attributeNames = []
        this.sampleDictionary = {}
        this.sampleMappingDictionary = {}
        this.colorDictionary = {}
        this.attributeRangeLUT = {}
        this.initialized = false
    }

    get attributeCount() {
        return this.attributeNames ? this.attributeNames.length : 0
    }

    isInitialized() {
        return this.initialized
    }

    hasAttributes() {
        return this.attributeCount > 0
    }

    getAttributes(sampleName) {

        const key = 0 === Object.keys(this.sampleMappingDictionary) ? sampleName : (this.sampleMappingDictionary[sampleName] || sampleName)
        return this.sampleDictionary[key]
    }

    async loadSampleInfoFile(path) {
        try {
            const string = await igvxhr.loadString(path)
            this.#processSampleInfoFileAsString(string)
            this.sampleInfoFiles.push(path)
        } catch (e) {
            console.error(e.message)
        }
    }

    #processSampleInfoFileAsString(string) {

        const sectionDictionary = createSectionDictionary(string)

        for (const [header, value] of Object.entries(sectionDictionary)) {
            switch (header) {
                case '#sampleTable':
                    this.#accumulateSampleTableDictionary(value)
                    break
                case '#sampleMapping':
                    this.#accumulateSampleMappingDictionary(value)
                    break
                case '#colors':
                    this.#accumulateColorScheme(value)
                    break

            }
        }

        this.initialized = true

    }

    getAttributeColor(attribute, value) {

        // Use for diagnostic rendering
        // return randomRGB(180, 240)
        ``
        // if (value === 'NA') {
        //     console.log(`${ attribute } : ${ value }`)
        // }

        let color

        if ('-' === value) {

            color = appleCrayonRGB('snow')

        } else if (typeof value === "string" && this.colorDictionary[value]) {

            color = this.colorDictionary[value]()

        } else if (this.colorDictionary[attribute]) {

            color = this.colorDictionary[attribute](value)

        } else if (typeof value === "string") {

            color = 'NA' === value ? colorForNA : stringToRGBString(value)

        } else {

            // if ('%|Tumor|Nuclei' === attribute) {
            //     console.log(`${ attribute } : ${ value }`)
            // }

            const [min, max] = this.attributeRangeLUT[attribute]

            const lowerAlphaThreshold = 2e-1
            const alpha = Math.max((value - min) / (max - min), lowerAlphaThreshold)

            const [r, g, b] = distinctColorsPalette[Object.keys(this.attributeRangeLUT).indexOf(attribute)]
            color = `rgba(${r},${g},${b},${alpha})`

        }

        return color

    }

    getSortedSampleKeysByAttribute(sampleKeys, attribute, sortDirection) {

        sortDirection = sortDirection || 1

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

    toJSON() {
        const json = []
        for (const url of this.sampleInfoFiles) {
            const raw = {url}
            const cooked = TrackBase.localFileInspection(raw)
            json.push(cooked)
        }
        return json
    }

    #accumulateSampleTableDictionary(lines) {

        // shift array with first item that is 'sample' or 'Linking_id'. Remaining items are attribute names
        const scratch = lines.shift().split('\t').filter(line => line.length > 0)

        // discard 'sample' or 'Linking_id'
        scratch.shift()

        const attributes = scratch.map(label => label.split(' ').join(SampleInfo.emptySpaceReplacement))

        const cooked = lines.filter(line => line.length > 0)

        let samples
        for (const line of cooked) {

            const record = line.split('\t')
            const _key_ = record.shift()

            if (undefined === samples) {
                samples = {}
            }

            samples[_key_] = {}

            for (let i = 0; i < record.length; i++) {
                const obj = {}

                if ("" === record[i]) {
                    obj[attributes[i]] = '-'
                } else {
                    obj[attributes[i]] = record[i]
                }

                Object.assign(samples[_key_], obj)
            }

        } // for (lines)

        for (const [key, record] of Object.entries(samples)) {
            samples[key] = toNumericalRepresentation(record)
        }

        // Establish the range of values for each attribute
        const lut = createAttributeRangeLUT(attributes, samples)
        accumulateDictionary(this.attributeRangeLUT, lut)

        // Ensure unique attribute names list
        const currentAttributeNameSet = new Set(this.attributeNames)
        for (const name of attributes) {
            if (!currentAttributeNameSet.has(name)) {
                this.attributeNames.push(name)
            }
        }

        accumulateDictionary(this.sampleDictionary, samples)
    }

    #accumulateSampleMappingDictionary(lines) {

        for (const line of lines) {
            const [key, value] = line.split('\t')
            this.sampleMappingDictionary[key] = value
        }
    }

    #accumulateColorScheme(colorSettings) {

        const mappingfunction = (token, index, array) => {

            let result
            switch (index) {
                case 0:
                    result = token.split(' ').join(SampleInfo.emptySpaceReplacement)
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
            this.colorDictionary[k] = attributeValue => {

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

                this.colorDictionary[attribute] = attributeValue => {
                    attributeValue = IGVMath.clamp(attributeValue, a, b)
                    const interpolant = (attributeValue - a) / (b - a)
                    return rgbaColor(_r, _g, _b, interpolant)
                }

            } else if (4 === cl.length) {

                const [a, b] = cl[1]
                const [attribute, ignore, rgbA, rgbB] = cl

                this.colorDictionary[attribute] = attributeValue => {
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

                this.colorDictionary[attribute] = attributeValue => {

                    if ('NA' === attributeValue) {
                        return colorForNA
                    } else {
                        const [min, max] = this.attributeRangeLUT[attribute]
                        const interpolant = (attributeValue - min) / (max - min)

                        const [r, g, b] = rgbStringTokens(rgb)
                        return rgbaColor(r, g, b, interpolant)
                    }

                }

            } else if ('*' === wildCard[0]) {
                const [star, attributeValue, rgb] = wildCard
                this.colorDictionary[attributeValue] = () => rgb
            }

        }

    }

}


function createSectionDictionary(string) {

    const dictionary = {}

    const lines = string.split(/\r?\n|\r/).map(line => line.trim()).filter(line => '' !== line)

    let currentHeader

    // If the first line does not start with a section header an initial #sampleTable is implied
    if (!sampleInfoFileHeaders.includes(lines[0])) {
        currentHeader = '#sampleTable'
        dictionary[currentHeader] = []
    }

    for (const line of lines) {

        if (sampleInfoFileHeaders.includes(line)) {
            currentHeader = line
            dictionary[currentHeader] = []
        } else if (currentHeader && false === line.startsWith('#')) {
            dictionary[currentHeader].push(line)
        }
    }

    return dictionary
}

function accumulateDictionary(accumulator, dictionary) {
    for (const [key, value] of Object.entries(dictionary)) {
        if (!(key in accumulator) || accumulator[key] !== value) {
            accumulator[key] = value
        }
    }
}


function createAttributeRangeLUT(names, dictionary) {

    const lut = {}
    for (const value of Object.values(dictionary)) {

        for (const attribute of names) {

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

    let hash = 0
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }

    let color = []
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xff
        color.push(value)
    }

    return `rgb(${color.join(', ')})`
}

export default SampleInfo
