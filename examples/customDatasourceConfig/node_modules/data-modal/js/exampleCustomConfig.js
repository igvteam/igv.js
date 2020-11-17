const exampleCustomConfigurator = () => {

    return {

        isJSON: true,

        addIndexColumn: false,

        columns:
            [
                'url',
                'name'
            ],

        hiddenColumns:
            [
                'url'
            ],

        titles:
            {
                url: 'the url',
                name: 'say my name'
            },

        trackLoader: trackList => trackList,

        tracks:
            [
                {
                    url: "https://www.dropbox.com/s/ta01pnc9h39bphc/ENCFF421AQV.bigWig?dl=0",
                    name: "ENCFF421AQV.bigWig"
                },
                {
                    url: "https://www.dropbox.com/s/2n7fxvsp829f1f9/EsophagealAdenocarcinoma.seg.gz?dl=0",
                    name: "EsophagealAdenocarcinoma.seg.gz"
                },
                {
                    url: "https://www.googleapis.com/drive/v3/files/1rM76O3OHnM7WhRNDfTQOYVyx86D1hhmD?alt=media&supportsTeamDrives=true",
                    name: "ENCFF001EQU.bigWig"
                }
            ]

    }

}

export { exampleCustomConfigurator }
