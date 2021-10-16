#!/usr/bin/env node

import * as fs from 'fs'
import * as path from 'path'
import * as argparse from 'argparse'
import * as yaml from 'js-yaml'

import {
    compile,
    configureSubparsers as configureSubparsersForCompile,
} from './compile'

import {
    downloadPtau,
    configureSubparsers as configureSubparsersForDownloadPtau,
} from './downloadPtau'

import {
    genZkeys,
    configureSubparsers as configureSubparsersForGenZkeys,
} from './genZkeys'

const main = async () => {
    const parser = new argparse.ArgumentParser({ 
        description: 'zkey-manager: compile circom circuits and manage .zkey files',
    })

    const subparsers = parser.add_subparsers({
        title: 'Subcommands',
        dest: 'subcommand',
        required: true,
    })

    configureSubparsersForCompile(subparsers)
    configureSubparsersForDownloadPtau(subparsers)
    configureSubparsersForGenZkeys(subparsers)

    const args = parser.parse_args()
    
    const loadConfig = (configFile: string) => {
        try {
            return yaml.load(fs.readFileSync(configFile).toString())
        } catch {
            console.error('Error: could not read', args.config)
            return
        }
    }

    try {
        if (args.subcommand === 'compile') {
            const config = loadConfig(args.config)
            return (await compile(
                config,
                path.resolve(path.dirname(args.config)),
                args.no_clobber,
            ))
        } else if (args.subcommand === 'downloadPtau') {
            const config = loadConfig(args.config)
            return (await downloadPtau(
                config,
                args.no_clobber,
            ))
        } else if (args.subcommand === 'genZkeys') {
            const config = loadConfig(args.config)
            return (await genZkeys(
                config,
                args.no_clobber,
            ))
        }
    } catch (e) {
        console.error(e)
        return 1
    }
}

if (require.main === module) {
    main()
}

