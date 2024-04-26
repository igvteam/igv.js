/*
 * @author Jim Robinson Dec-2020
 */

/**
 * Implementation of "RemoteFile" for hic-straw that uses the igv.xhr object.  This object is google aware, and handle
 * oAuth and apiKey automatically.
 */

import {igvxhr} from '../../../../node_modules/igv-utils/src/index.js'

class IGVRemoteFile {


    constructor(args) {
        this.config = args
        this.url = args.path || args.url
    }


    async read(position, length) {

        const range = {start: position, size: length};

        return igvxhr.loadArrayBuffer(this.url, {range});

    }
}

export default IGVRemoteFile
