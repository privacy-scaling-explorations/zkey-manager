import { ArgumentParser } from 'argparse'
import * as fs from 'fs'
import * as shelljs from 'shelljs'
import * as path from 'path'
import { genFilepaths, getPtauFromConfig, randomByteString } from './utils'

const configureSubparsers = (subparsers: ArgumentParser) => {
    const parser = subparsers.add_parser(
        'genZkeys',
        { add_help: true },
    )

    parser.add_argument(
        '-c',
        '--config',
        {
            required: true,
            action: 'store',
            type: 'str',
            help: 'The config file that specifies the circuit parameters. ' +
                  'See config.example.yml',
        }
    )

    parser.add_argument(
        '-nc',
        '--no-clobber',
        {
            required: false,
            action: 'store_true',
            help: 'Skip zkey generation if compiled files exist',
        }
    )

    parser.add_argument(
        '-ps',
        '--proof-system',
        {
            required: false,
            action: 'store',
            type: 'str',
            choices: ['groth16', 'plonk', 'fflonk'],
            default: 'groth16',
            help: 'Specify which proof system used to compile circuits',
        }
    )
}

const genZkeys = async (
    config: any,
    noClobber: boolean,
    proofSystem: string
) => {
    // Find the number of constraints of the largest circuit
    const outDir = path.resolve('.', config.out)

    if (!fs.existsSync(outDir)) {
        console.error('Error: could not locate', outDir)
        return 1
    }

    const ptau = getPtauFromConfig(config, outDir)

    const ptauFilepath = path.join(outDir, ptau.name)
    if (!fs.existsSync(ptauFilepath)) {
        console.error('Error: could not locate', ptauFilepath)
        return 1
    }

    console.log(`Using ${ptauFilepath} to generate zkey files`)

    for (const file of fs.readdirSync(outDir)) {
        if (file.endsWith('.r1cs')) {
            const r1csFilePath = path.join(outDir, file)
            if (proofSystem === 'groth16') {
                const zkeyFilePaths = [
                    path.join(outDir, file.slice(0, file.length - 5) + '.0.zkey'),
                    path.join(outDir, file.slice(0, file.length - 5) + '.1.zkey'),
                    path.join(outDir, file.slice(0, file.length - 5) + '.2.zkey'),
                    path.join(outDir, file.slice(0, file.length - 5) + '.3.zkey'),
                    path.join(outDir, file.slice(0, file.length - 5) + '.final.zkey'),
                ]
                if (noClobber && fs.existsSync(zkeyFilePaths[0])) {
                    console.log(zkeyFilePaths[0], 'exists. Skipping.')
                    continue
                }
                
                // Do 3 times of phase 2 ceremony contribution (Groth16 only)
                // 0th (i.e., setup)
                {
                    const cmd = `node ${config.snarkjsPath} groth16 setup ${r1csFilePath} ${ptauFilepath} ${zkeyFilePaths[0]}`
                    console.log(`Generating ${zkeyFilePaths[0]}`)
                    shelljs.exec(cmd)
                }
                
                // 1st
                {
                    const cmd = `node ${config.snarkjsPath} zkey contribute ${zkeyFilePaths[0]} ${zkeyFilePaths[1]} -e="${randomByteString(20)}" -n="1st zkey contribution"`
                    console.log(`Generating ${zkeyFilePaths[1]}`)
                    shelljs.exec(cmd)
                }
                
                // 2nd
                {
                    const cmd = `node ${config.snarkjsPath} zkey contribute ${zkeyFilePaths[1]} ${zkeyFilePaths[2]} -e="${randomByteString(20)}" -n="2nd zkey contribution"`
                    console.log(`Generating ${zkeyFilePaths[2]}`)
                    shelljs.exec(cmd)
                }
                
                // 3rd
                {
                    const cmd = `node ${config.snarkjsPath} zkey contribute ${zkeyFilePaths[2]} ${zkeyFilePaths[3]} -e="${randomByteString(20)}" -n="3rd zkey contribution"`
                    console.log(`Generating ${zkeyFilePaths[3]}`)
                    shelljs.exec(cmd)
                }
                
                // Finalize
                {
                    const VDF_iteration = 10;
                    const cmd = `node ${config.snarkjsPath} zkey beacon ${zkeyFilePaths[3]} ${zkeyFilePaths[4]} ${randomByteString(20)} ${VDF_iteration} -n="Final beacon phase 2"`
                    console.log(`Generating ${zkeyFilePaths[4]}`)
                    shelljs.exec(cmd)
                }
            } else if (proofSystem === 'plonk') {
                const zkeyFilePath = path.join(outDir, file.slice(0, file.length - 5) + '.final.zkey')
                if (noClobber && fs.existsSync(zkeyFilePath)) {
                    console.log(zkeyFilePath, 'exists. Skipping.')
                    continue
                }
                
                const cmd = `node ${config.snarkjsPath} plonk setup ${r1csFilePath} ${ptauFilepath} ${zkeyFilePath}`
                console.log(`Generating ${zkeyFilePath}`)
                shelljs.exec(cmd)
            } else if (proofSystem === 'fflonk') {
                const zkeyFilePath = path.join(outDir, file.slice(0, file.length - 5) + '.final.zkey')
                if (noClobber && fs.existsSync(zkeyFilePath)) {
                    console.log(zkeyFilePath, 'exists. Skipping.')
                    continue
                }
                
                const cmd = `node ${config.snarkjsPath} fflonk setup ${r1csFilePath} ${ptauFilepath} ${zkeyFilePath}`
                console.log(`Generating ${zkeyFilePath}`)
                shelljs.exec(cmd)
            } else {
                console.error('Wrong proof system name:', proofSystem)
                return 1
            }
        }
    }

    return 0
}

export {
    genZkeys,
    configureSubparsers,
}
