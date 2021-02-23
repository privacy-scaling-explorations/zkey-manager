import { ArgumentParser } from 'argparse'
import * as fs from 'fs'
import * as shelljs from 'shelljs'
import * as path from 'path'
import { genFilepaths, getPtauFromConfig } from './utils'

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
}

const genZkeys = async (
    config: any,
    noClobber: boolean,
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

    console.log(`Using ${ptauFilepath} to generate initial zkey files`)
    for (const file of fs.readdirSync(outDir)) {
        if (file.endsWith('.r1cs')) {
            const filePath = path.join(outDir, file)
            const zkeyFilepath = path.join(
                outDir,
                file.slice(0, file.length - 5) + '.0.zkey',
            )

            if (noClobber && fs.existsSync(zkeyFilepath)) {
                console.log(zkeyFilepath, 'exists. Skipping.')
                continue
            }

            const cmd = `node ${config.snarkjsPath} zkey new ${filePath} ${ptauFilepath} ${zkeyFilepath}`
            console.log(`Generating ${zkeyFilepath}`)
            shelljs.exec(cmd)
        }
    }

    return 0
}

export {
    genZkeys,
    configureSubparsers,
}
