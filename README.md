# zkey-manager

This utility simplifies the process of `zkey` file management for circuits
written in `circom`.

## Installation

```bash
npm i zkey-manager
```

## Configure circuits

See the `config.example.yml` file for an example.

## Compile circuits

```
zkey-manager compile -nc -c <CONFIG_FILE>
```

Set the `-nc` flag to avoid recompiling existing circuits.

## Download the Phase 1 `.ptau` file

This scans the `out` directory as configured in the config file for `.r1cs`
files, and downloads the `.ptau` file that is large enough to support `.zkey`
generation for each of the `.r1cs` files.

```
node build/index.js downloadPtau -nc -c <CONFIG_FILE>
```

## Generate the initial `.zkey` files

```
node build/index.js downloadPtau -nc -c <CONFIG_FILE>
```
