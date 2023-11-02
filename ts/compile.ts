import { ArgumentParser } from 'argparse'
import * as fs from 'fs'
import * as shelljs from 'shelljs'
import * as path from 'path'
import { genName, genFilepaths } from './utils'

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
}

const compile = async (
    config: any,
    configFileDir: string,
    noClobber: boolean,
) => {
    const outDir = path.resolve('.', config.out)
    // Create outDir
    if (! fs.existsSync(outDir)) {
        fs.mkdirSync(outDir)
    }
    // Compile each circuit
    for (const c of config.circuits) {
        const template = path.join(
            path.resolve('./'),
            c.template,
        )

        const pubInputs = c.pubInputs.join(',')

        const circuitSrc = `pragma circom 2.0.0;\ninclude "${template}";\n` +
            `component main {public [${pubInputs}]}= ${c.component}(${c.params.join(', ')});\n`

        const filepaths = genFilepaths(outDir, c.type, c.component, c.params)

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

        const compileFlags = config.circomFlags ||
            '--c --r1cs --sym --wasm --wat';
        const compileCmd = `${config.circomPath} ${compileFlags}` +
            ` -o ${config.out} ${filepaths.circom}`
        console.log()
        console.log(`Compiling ${c.component} (${c.type}) with params ${c.params.toString()}`)
        shelljs.exec(compileCmd)

        // Willing to use C codes to generate witness later
        if(compileFlags.includes('--c')) {
            const componentName = genName(c.type, c.component, c.params)

            shelljs.cd(
                path.join(
                    path.resolve(outDir),
                    componentName + '_cpp',
                ),
            )

            const makeCmdOut = shelljs.exec('make', {silent: false})

            if (makeCmdOut.stderr) {
                console.error(
                    'Error running the make command. Please check if all ' + 
                    'dependencies are present.'
                )
                console.error(makeCmdOut)
                console.error(makeCmdOut.stderr)
            }

            shelljs.mv(
                path.join(
                    path.resolve(outDir),
                    componentName + '_cpp',
                    componentName,
                ),
                path.resolve(outDir),
            )

            shelljs.mv(
                path.join(
                    path.resolve(outDir),
                    componentName + '_cpp',
                    componentName + '.dat',
                ),
                path.resolve(outDir),
            )

            shelljs.cd(configFileDir)
        }
    }
}

export {
    compile,
    configureSubparsers,
}
