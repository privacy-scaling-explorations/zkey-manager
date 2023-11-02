import * as path from 'path'
import * as fs from 'fs'
import * as shelljs from 'shelljs'

export const ProofSystems = ["groth16", "plonk", "fflonk"] as const
type ProofSystem = typeof ProofSystems[number] 

// import * as shelljs_exec from 'shelljs.exec'
// const executeCommand = (
//     cmd: string,
//     silent?: boolean
// ): shelljs_exec.ShellJsExecResponse => {
//     console.log(`+ ${cmd}`)
//     return shelljs_exec.default(cmd, {silent: silent})
// }

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
    proofSystem: ProofSystem
) => {
    let maxDomainSize = 0

    for (const file of fs.readdirSync(outDir)) {
        if (file.endsWith('.r1cs')) {
            const filePath = path.join(outDir, file)
            
            const snarkjsCmd = `node ${config.snarkjsPath} r1cs info ${filePath}`
            const out = shelljs.exec(snarkjsCmd, { silent: true })
            
            const matchArray0 = out.stdout.match(/# of Constraints: (\d+)\n/)
            const matchArray1 = out.stdout.match(/# of Public Inputs: (\d+)\n/)
            const matchArray2 = out.stdout.match(/# of Outputs: (\d+)\n/)
            
            if ((matchArray0?.length !== 2) || (matchArray1?.length !== 2) || (matchArray2?.length !== 2)) {
                console.error(`Cannot read R1Cs information from ${filePath}`)
                return 1
            }
            
            const nC = Number(matchArray0[1]) // # of linear/non-linear constraints
            const nP = Number(matchArray1[1]) // # of public inputs
            const nO = Number(matchArray2[1]) // # of outputs
            
            // All the following domain sizes are approximate value not the exact one
            let currentDomainSize = 2 ** (Math.floor(Math.log(nC + nP + nO) * Math.LOG2E) + 1)

            if (proofSystem === "groth16") {
                // Pass, the formula above is intended for estimating Groth16's domain size 
            } else if (proofSystem === "plonk") {
                currentDomainSize = 4 * currentDomainSize // Assume SRS size needs 3n*G1
            } else if (proofSystem === "fflonk") {
                currentDomainSize = 16 * currentDomainSize // Assume SRS size needs 9n*G1
            }

            if (currentDomainSize > maxDomainSize) {
                maxDomainSize = currentDomainSize
            }
        }
    }

    const powerNeeded = Math.floor(Math.log(maxDomainSize) * Math.LOG2E) + 1
    if (powerNeeded > 28) {
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
    ProofSystem,
    genName,
    genFilepaths,
    getPtauFromConfig,
    randomByteString
}
