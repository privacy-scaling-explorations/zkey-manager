import { ArgumentParser } from 'argparse'
import * as fs from 'fs'
import * as shelljs from 'shelljs'
import * as path from 'path'
import { genFilepaths, getPtauFromConfig } from './utils'

const configureSubparsers = (subparsers: ArgumentParser) => {
    const parser = subparsers.add_parser(
        'downloadPtau',
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
            help: 'Skip download if the .ptau file exists',
        }
    )
}

const downloadPtau = async (
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
    const ptauExists = fs.existsSync(ptauFilepath)
    if (noClobber && ptauExists) {
        console.log(ptauFilepath, 'exists. Skipping.')
        return 0
    }

    // Download the file
    const cmd = `wget --progress=bar:force:noscroll -O ${ptauFilepath} ${ptau.url}`
    const out = shelljs.exec(cmd)

    // TODO: perform checksum

    return out.code
}

export {
    downloadPtau,
    configureSubparsers,
}
