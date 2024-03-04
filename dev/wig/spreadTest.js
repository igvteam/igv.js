

const testArray = []
for(let i=0; i<1000000; i++) {
    testArray.push(i)
}

const array1 = []
for(let i of testArray) {
    array1.push(i)
}


const array2 = []
array2.push(...testArray)