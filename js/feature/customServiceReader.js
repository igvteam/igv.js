import {igvxhr, StringUtils} from "../../node_modules/igv-utils/src/index.js"

const isString = StringUtils.isString


class CustomServiceReader {
    constructor(config) {
        this.config = config
    }

    async readFeatures(chr, start, end) {

        let url
        if (typeof this.config.url === 'function') {
            url = this.config.url({chr, start, end})
        } else {
            url = this.config.url
                .replace("$CHR", chr)
                .replace("$START", start)
                .replace("$END", end)
        }

        let config = Object.assign({}, this.config)
        if (this.config.body !== undefined) {
            if (typeof this.config.body === 'function') {
                config.body = this.config.body({chr, start, end})
            } else {
                config.body =
                    this.config.body
                        .replace("$CHR", chr)
                        .replace("$START", start)
                        .replace("$END", end)
            }
        }


        let features
        const data = await igvxhr.load(url, config)
        if (data) {
            if (typeof this.config.parser === "function") {
                features = this.config.parser(data)
            } else if (isString(data)) {
                features = JSON.parse(data)
            } else {
                features = data
            }
        }
        if (this.config.mappings) {
            let mappingKeys = Object.keys(this.config.mappings)
            for (let f of features) {
                for (let key of mappingKeys) {
                    f[key] = f[this.config.mappings[key]]
                }
            }
        }
        return features
    }
}

export default CustomServiceReader
