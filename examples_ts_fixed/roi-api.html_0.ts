import type { CreateOpt, TrackLoad, TrackType } from '../js/igv';


import igv from "../js/igv"

const browser_config: CreateOpt =
{
    locus: "chr1:67,646,911-67,676,107",
    genome: "hg19",
    tracks:
        [
            {
                name: 'Some Features',
                url: 'https://s3.amazonaws.com/igv.org.test/data/roi/some_features.bed',
                indexed: false,
            }
        ]
}

const roi_configs =
    [
        {
            color: "rgba(237,72,155,0.25)",
            features:
                [
                    {
                        chr: "chr1",
                        start: 67655415,
                        end: 67655611
                    },
                    {
                        chr: "chr1",
                        start: 67664225,
                        end: 67666281
                    }
                ]
        },

    ];

(async () => {
    const browser = await igv.createBrowser((document.getElementById('myDiv') as HTMLElement), browser_config);
    (document.getElementById("roi-load-button") as HTMLElement).addEventListener('click', () => browser.loadROI(roi_configs));
    (document.getElementById("roi-clear-button") as HTMLElement).addEventListener('click', () => browser.clearROIs());
    (document.getElementById("roi-get-button") as HTMLElement).addEventListener('click', async () => {

        const div = (document.getElementById("user-defined-rois") as HTMLElement)
        div.innerHTML = ""
        const list = document.createElement("ul")
        div.appendChild(list)

        const rois = await browser.getUserDefinedROIs()
        if (rois) {
            for (let r of rois) {
                const li = document.createElement('li')
                li.innerText = `${r.chr}:${r.start + 1}-${r.end}`
                list.appendChild(li)
            }
        }
    })
})()

