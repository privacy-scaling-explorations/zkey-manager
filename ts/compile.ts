import { ArgumentParser } from 'argparse'
import * as fs from 'fs'
import * as shelljs from 'shelljs'
import * as path from 'path'
import { genFilepaths } from './utils'

const configureSubparsers = (subparsers: ArgumentParser) => {
    const parser = subparsers.add_parser(
        'compile',
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
            help: 'Skip compilation if compiled files exist',
        }
    )

    parser.add_argument(
        '-m', '--max-old-space-size',
        { 
            required: false,
            default: 4096,
            action: 'store', 
            type: Number, 
            help: 'The value to set for the --max-old-space-size flag NODE_OPTIONS for circuit compilation',
        },
    )

    parser.add_argument(
        '-s', '--stack-size',
        { 
            required: false,
            default: 1073741,
            action: 'store', 
            type: Number, 
            help: 'The value to set for the NodeJS --stack-size flag for circuit compilation',
        },
    )

    parser.add_argument(
        '-p', '--prime',
        { 
            required: false,
            default: '21888242871839275222246405745257275088548364400416034343698204186575808495617',
            action: 'store', 
            type: 'str', 
            help: 'The elliptic curve group order. Defaults to that of BN254.',
        },
    )
}

const compile = async (
    config: any,
    noClobber: boolean,
    maxOldSpaceSize: number,
    stackSize: number,
    prime: string,
) => {
    const outDir = path.resolve('.', config.out)
    // Create outDir
    if (! fs.existsSync(outDir)) {
        fs.mkdirSync(outDir)
    }

    // Copy witness gen source files
    const circomRuntimePath = path.resolve('.', config.circomRuntimePath)
    const ffiasmPath = path.resolve('.', config.ffiasmPath)

    let cppPath = path.join(
        circomRuntimePath,
        'c',
        '*.cpp'
    )
    shelljs.exec(`cp ${cppPath} ${outDir}`)

    const hppPath = path.join(circomRuntimePath, 'c', '*.hpp')
    shelljs.exec(`cp ${hppPath} ${outDir}`)

    const buildZqFieldPath = path.join(ffiasmPath, 'src', 'buildzqfield.js')
    shelljs.exec(`node ${buildZqFieldPath} -q ${prime} -n Fr`)

    shelljs.exec(`mv fr.asm fr.cpp fr.hpp ${outDir}`)

    const frAsmPath = path.join(outDir, 'fr.asm')
    shelljs.exec(`nasm -felf64 ${frAsmPath}`)

    // Compile each circuit
    for (const c of config.circuits) {
        const template = path.join(
            path.resolve('./'),
            c.template,
        )
        const circuitSrc = `include "${template}"; ` +
            `component main = ${c.component}(${c.params.join(', ')});\n`

        const filepaths = genFilepaths(outDir, c['type'], c.component, c.params)

        let filesExist = true
        for (const key of Object.keys(filepaths)) {
            const filepath = filepaths[key]
            const exists = fs.existsSync(filepath)
            if (! exists) {
                filesExist = false
                break
            }
        }

        let shouldCompile = true

        if (noClobber && filesExist) {
            shouldCompile = false
        }

        if (!shouldCompile) {
            console.log(`Skipping ${c.component} with params ${c.params.toString()}`)
            continue
        }

        // Write the circom file
        fs.writeFileSync(filepaths.circom, circuitSrc)

        const compileCmd = `NODE_OPTIONS=--max-old-space-size=${maxOldSpaceSize}` + 
            ` node --stack-size=${stackSize} ${config.circomPath}` +
            ` ${filepaths.circom}` +
            ` -r ${filepaths.r1cs}` +
            ` -c ${filepaths.c}` +
            ` -w ${filepaths.wasm}` +
            ` -t ${filepaths.wat}` +
            ` -s ${filepaths.sym}`

        console.log(`Compiling ${c.component} (${c['type']}) with params ${c.params.toString()}`)
        shelljs.exec(compileCmd)

        const srcs = 
            path.join(path.resolve(outDir), 'main.cpp') + ' ' +
            path.join(path.resolve(outDir), 'calcwit.cpp') + ' ' +
            path.join(path.resolve(outDir), 'utils.cpp') + ' ' +
            path.join(path.resolve(outDir), 'fr.cpp') + ' ' +
            path.join(path.resolve(outDir), 'fr.o')

        const cmd = `g++ -pthread ${srcs} ` +
            `${filepaths.c} -o ${filepaths.base} ` + 
            `-lgmp -std=c++11 -O3 -fopenmp -DSANITY_CHECK`
        shelljs.exec(cmd, {silent: true})

    }
}

export {
    compile,
    configureSubparsers,
}
