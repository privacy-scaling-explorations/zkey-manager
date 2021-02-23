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
zkey-manager compile -c <CONFIG_FILE>
```

Set the `-nc` flag to avoid recompiling existing circuits.
