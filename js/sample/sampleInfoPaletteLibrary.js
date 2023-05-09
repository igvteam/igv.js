// https://sashamaps.net/docs/resources/20-colors/
const distinctColorsPaletteSrcStrings =
    [
            'rgb(230, 25, 75)',
            'rgb(60, 180, 75)',
            'rgb(255, 225, 25)',
            'rgb(0, 130, 200)',
            'rgb(245, 130, 48)',
            'rgb(145, 30, 180)',
            'rgb(70, 240, 240)',
            'rgb(240, 50, 230)',
            'rgb(210, 245, 60)',
            'rgb(250, 190, 212)',
            'rgb(0, 128, 128)',
            'rgb(220, 190, 255)',
            'rgb(170, 255, 195)',
            'rgb(128, 128, 0)',
            'rgb(255, 215, 180)',
            'rgb(128, 128, 128)',
    ]

const distinctColorsPalette = distinctColorsPaletteSrcStrings.map(str => {
        const [ _0, g, _1] = str.split(',')
        const [ _2, r ] = _0.split('(')
        const [ b, _3 ] = _1.split(')')
        return [ r, g, b ]
})

export { distinctColorsPalette }
