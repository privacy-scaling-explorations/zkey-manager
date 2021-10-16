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
            const m = out.stdout.match(/# of Constraints: (\d+)\n/)
            const c = Number(m[1])
            if (c > largestConstraints) {
                largestConstraints = c
            }
        }
    }

    let tooLarge = false
    let powerNeeded = 1
    while (2 ** powerNeeded < largestConstraints) {
        powerNeeded ++
        if (powerNeeded > 28) {
            tooLarge = true
        }
    }
    powerNeeded ++
    console.log(largestConstraints, powerNeeded)

    if (tooLarge) {
        console.error('Error: the circuit has more than 2 ** 28 constraints')
        return 1
    }

    return config.ptauFiles[powerNeeded.toString()]
}

export {
    genName,
    genFilepaths,
    getPtauFromConfig,
}
