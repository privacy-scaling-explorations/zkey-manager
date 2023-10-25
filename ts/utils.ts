import * as path from 'path'
import * as fs from 'fs'
import * as shelljs from 'shelljs'

const genName = (
    circuitType: string,
    component: string,
    params: number[],
) => {
    const name = `${component}_${params.join('-')}_${circuitType}`
    return name
}

const genFilepaths = (
    dirpath: string,
    circuitType: string,
    component: string,
    params: number[],
) => {
    const name = path.join(
        dirpath,
        genName(circuitType, component, params),
    )

    return {
        base: name,
        circom: name + '.circom',
        r1cs: name + '.r1cs',
        dat: name + '.dat',
        wasm: name + '.wasm',
        wat: name + '.wat',
        sym: name + '.sym',
        c: name + '.c',
    }
}

const getPtauFromConfig = (
    config: any,
    outDir: string,
) => {
    let largestConstraints = 0
    for (const file of fs.readdirSync(outDir)) {
        if (file.endsWith('.r1cs')) {
            const filePath = path.join(outDir, file)
            const snarkjsCmd = `node ${config.snarkjsPath} r1cs info ${filePath}`
            const out = shelljs.exec(snarkjsCmd, { silent: true })
            const nConstraints = Number((out.stdout.match(/# of Constraints: (\d+)\n/))[1])
            const nPubInputs = Number((out.stdout.match(/# of Public Inputs: (\d+)\n/))[1])
            const nOutputs = Number((out.stdout.match(/# of Outputs: (\d+)\n/))[1])
            const c = nConstraints + nPubInputs + nOutputs
            if (c > largestConstraints) {
                largestConstraints = c
            }
        }
    }

    let tooLarge = false
    let powerNeeded = Math.floor(Math.log(largestConstraints) * Math.LOG2E) + 1
    if (powerNeeded > 28) {
        tooLarge = true
    }
    powerNeeded ++
    console.log(largestConstraints, powerNeeded)

    if (tooLarge) {
        console.error('Error: the circuit has more than 2 ** 28 constraints')
        return 1
    }

    return config.ptauFiles[powerNeeded.toString()]
}

const randomByteString = (length: number) => {
    const hex_alphabets = "0123456789abcdef"
    let random_string: string[] = []
    
    for(let i = 0; i < length; i++) {
        random_string.push(hex_alphabets[Math.floor(Math.random()*100) % 16])
    }
    
    return random_string.join('')
}

export {
    genName,
    genFilepaths,
    getPtauFromConfig,
    randomByteString
}
