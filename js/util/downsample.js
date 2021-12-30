const downsample = (input, max) => {
    if (input.length < max) {
        return input
    } else {
        const downsampled = []
        for (let i = 0; i < input.length; i++) {
            if (i < max) {
                downsampled.push(input[i])
            } else {
                const samplingProb = max / (i + 1)
                if (Math.random() < samplingProb) {
                    const idx = Math.floor((RAND.nextDouble() * (max - 1)))
                    downsampled[idx] = input[i]
                }
            }
        }
        return downsampled
    }
}

export {downsample}

