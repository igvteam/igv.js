import type { CreateOpt, TrackLoad, TrackType } from '../js/igv';


import igv from "../dist/igv.esm.min.js"

const igvConfig = {
    reference: {
        gbkURL: "https://ftp.ncbi.nlm.nih.gov/genomes/archive/old_genbank/Fungi/Candida_dubliniensis_CD36_uid38659/FM992689.gbk"
    },
    tracks: [
        {
            name: "Annotations",
            type: "annotation",
            format: "gbk",
            url: "https://ftp.ncbi.nlm.nih.gov/genomes/archive/old_genbank/Fungi/Candida_dubliniensis_CD36_uid38659/FM992689.gbk",
        }
    ]
}

igv.createBrowser((document.getElementById('igvDiv') as HTMLElement), igvConfig)

