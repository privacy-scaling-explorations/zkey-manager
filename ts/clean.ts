import { ArgumentParser } from 'argparse'
import * as path from 'path'
import * as shelljs from 'shelljs'

const configureSubparsers = (subparsers: ArgumentParser) => {
    const parser = subparsers.add_parser(
        'clean',
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
}

const clean = async (config: any) => {
    const outDir = path.resolve('.', config.out)
    console.log(`\n[Warning] '${outDir}' will be cleaned up except for *.ptau\n`)

    const excludedFolders = [outDir, path.join(outDir, 'powersOfTauCache')]
    shelljs.rm('-r', shelljs.find(outDir).filter(
        (file) => {
            if (excludedFolders.indexOf(file) >= 0) {
                return false // Will not be deleted
            } else if (file.match(/.ptau/)) {
                return false // Will not be deleted
            } else if (file.endsWith('.js')) {
                return false // Still be deleted by the parent folder `*_js`
            } else if (file.endsWith('.wasm')) {
                return false // Still be deleted by the parent folder `*_js`
            } else {
                console.log(`removed '${file}'`)
                return true // Deleting target
    }}))

    return 0;
}

export {
    clean,
    configureSubparsers,
}