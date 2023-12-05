import { ArgumentParser } from 'argparse'
import * as path from 'path'
import { ProofSystem, genName } from './utils'
import * as fs from 'fs'
import * as shelljs from 'shelljs'

const configureSubparsers = (subparsers: ArgumentParser) => {
    const parser = subparsers.add_parser(
        'genProofs',
        { add_help: true }
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

const genProofs = async (
    config: any,
    noClobber: boolean,
    proofSystem: ProofSystem
) => {
    for (const eachCkt of config.circuits) {
        const cktFileName = genName(eachCkt.type, eachCkt.component, eachCkt.params)
        const wasmPath = path.join(
            path.resolve('.', config.out),
            `${cktFileName}_js`,
            `${cktFileName}.wasm`
        )
        const finalZkeyPath = path.join(
            path.resolve('.', config.out),
            `${cktFileName}_${proofSystem}.final.zkey`
        )
        const inputJsonPath = path.join(
            path.resolve('./'),
            eachCkt.inputJson
        )
        const proofJsonPath = path.join(
            path.resolve('.', config.out),
            `${cktFileName}_${proofSystem}.proof.json`
        )
        const publicJsonPath = path.join(
            path.resolve('.', config.out),
            `${cktFileName}_${proofSystem}.public.json`
        )
        const verifyKeyPath = path.join(
            path.resolve('.', config.out),
            `${cktFileName}_${proofSystem}.verification_key.json`
        )

        if (noClobber && (fs.existsSync(proofJsonPath) || fs.existsSync(publicJsonPath))) {
            console.log(
                cktFileName,
                'public.json & proof.json exists. Skipping.'
            )
            continue
        }

        {
            const cmd = `node ${config.snarkjsPath} ${proofSystem} fullprove ${inputJsonPath} ${wasmPath} ${finalZkeyPath} ${proofJsonPath} ${publicJsonPath}`
            console.log(`\nGenerating public.json and proof.json of ${cktFileName}`)
            if ((shelljs.exec(cmd)).code === 0) {
                console.log(`Saved '${publicJsonPath}'`)
                console.log(`Saved '${proofJsonPath}'`)
            } else {
                console.error(`[Error] Cannot generate public.json and proof.json of ${cktFileName}`)
                return 1
            }
        }

        {
            const cmd = `node ${config.snarkjsPath} zkey export verificationkey ${finalZkeyPath} ${verifyKeyPath}`
            console.log(`\nExport verification key of ${cktFileName}`)
            shelljs.exec(cmd)
        }

        {
            const cmd = `node ${config.snarkjsPath} ${proofSystem} verify ${verifyKeyPath} ${publicJsonPath} ${proofJsonPath}`
            console.log(`\nVerify the validity of input.json with respect to ${cktFileName}`)
            shelljs.exec(cmd)
        }
    }

    return 0;
}

export {
    genProofs,
    configureSubparsers,
}