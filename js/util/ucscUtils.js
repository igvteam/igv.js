

function scoreShade(score) {
      return Math.max(0.1, score / 1000).toString();
}

export {scoreShade}