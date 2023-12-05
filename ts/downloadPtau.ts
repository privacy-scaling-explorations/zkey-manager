import { ArgumentParser } from 'argparse'
import * as fs from 'fs'
import * as shelljs from 'shelljs'
import * as path from 'path'
import { ProofSystem, getPtauFromConfig } from './utils'

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

const downloadPtau = async (
    config: any,
    noClobber: boolean,
    proofSystem: ProofSystem
) => {
    // Find the number of constraints of the largest circuit
    const outDir = path.resolve('.', config.out)

    if (!fs.existsSync(outDir)) {
        console.error('Error: could not locate', outDir)
        return 1
    }

    const ptau = getPtauFromConfig(config, outDir, proofSystem)
    const ptauFilepath = path.join(outDir, 'powersOfTauCache', ptau.name)

    // Test 'powersOfTauCache' folder existence and try to create one if empty
    if (!fs.existsSync(path.join(outDir, 'powersOfTauCache'))) {
        fs.mkdirSync(path.join(outDir, 'powersOfTauCache'))
    }

    // Skip downloading if `-nc` flag raised and `.ptau` is at there
    if (noClobber && fs.existsSync(ptauFilepath)) {
        console.log(ptauFilepath, 'exists. Skipping.')
        return 0
    }

    // Download the file
    const cmd = `wget --quiet --show-progress --progress=bar:force:noscroll --tries=10 --output-document=${ptauFilepath} ${ptau.url}`
    console.log(`Connecting to ${ptau.url}`)
    console.log(`Saving to ${ptauFilepath}\n`)
    const out = shelljs.exec(cmd)

    // Do checksum testing if config file has
    const supportedAlgorithm = [
        'sha1', 'sha224', 'sha256',
        'sha384', 'sha512', 'crc',
        'md5', 'blake2b'
    ] // GNU coreutils v8.3

    if (ptau.hasOwnProperty('method') && ptau.hasOwnProperty('checksum')) {
        if (supportedAlgorithm.indexOf(ptau.method) < 0 ) {
            console.error("Unknown checksum algorithm:", ptau.method)
            return 1
        }

        let hashAlgorithm = ''
        switch (ptau.method) {
            case 'sha1':
                hashAlgorithm = 'sha1sum'
                break
            case 'sha224':
                hashAlgorithm = 'sha224sum'
                break
            case 'sha256':
                hashAlgorithm = 'sha256sum'
                break
            case 'sha384':
                hashAlgorithm = 'sha384sum'
                break
            case 'sha512':
                hashAlgorithm = 'sha512sum'
                break
            case 'crc':
                hashAlgorithm = 'cksum'
                break
            case 'md5':
                hashAlgorithm = 'md5sum'
                break
            case 'blake2b':
                hashAlgorithm = 'b2sum'
                break
            default:
                console.error(`Unknown checksum algorithm: ${ptau.method}`)
                break
        }

        const command = `echo "${ptau.checksum} ${ptauFilepath}" | ${hashAlgorithm} --check`
        const stdio = shelljs.exec(command, {silent: true})

        const regex = new RegExp(`${ptau.name}: OK`)
        if (stdio.stdout.match(regex) === null) {
            console.error(`Checksum testing is failed: ${ptauFilepath}`)
            return 1
        } else {
            console.log(`\n[Pass] checksum: ${ptau.name}`)
        }
    }

    return out.code
}

export {
    downloadPtau,
    configureSubparsers,
}
