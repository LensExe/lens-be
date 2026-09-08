#!/usr/bin/env node
/**
 * scripts/stack-secret.mjs -- put ONE secret into the .stacks tree, encrypted,
 * in a single step.
 *
 * The value never reaches your shell history, never appears on screen, and the
 * plaintext file is removed the moment the encrypted twin exists. Only the
 * `*.enc` file is left behind, and that is the file git tracks.
 *
 *   node scripts/stack-secret.mjs set dev/runtime/files/stripe-secret-key.key
 *   node scripts/stack-secret.mjs set dev/runtime/files/gcp-service-account.json --from-file ./sa.json
 *   node scripts/stack-secret.mjs set dev/runtime/env/app.env --multiline
 *   node scripts/stack-secret.mjs list
 *   node scripts/stack-secret.mjs show dev/runtime/files/stripe-secret-key.key
 *
 * Or through npm:  npm run secret:set -- dev/runtime/files/stripe-secret-key.key
 *
 * `show` decrypts TO DISK and never to stdout. A secret printed to a terminal is
 * a secret in a scrollback buffer, in a screen share and in a tmux log; the file
 * it writes is gitignored and can be deleted when the tool that needed it is
 * done.
 *
 * Decrypting needs the shared master identity -- see MASTER_KEY below.
 *
 * Node builtins only -- it runs before `npm ci` on a fresh machine.
 */

import {
    existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync,
} from "node:fs"
import { homedir } from "node:os"
import {
    dirname, join, relative, resolve, sep,
} from "node:path"
import { createInterface } from "node:readline"
import { execFileSync, spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const STACKS_ROOT = join(REPO_ROOT, ".stacks")

/** The one age identity shared across every project of this owner. */
const MASTER_KEY = join(homedir(), ".lens-be", "key.txt")

const IS_WINDOWS = process.platform === "win32"

const USE_COLOR = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR
const paint = (code, text) => (USE_COLOR ? `[${code}m${text}[0m` : text)
const red = (text) => paint("31", text)
const green = (text) => paint("32", text)
const dim = (text) => paint("2", text)

/** Aborts with a readable message rather than a stack trace. */
const die = (message, hints = []) => {
    console.error(`\n${red("stack-secret:")} ${message}`)
    for (const hint of hints) {
        console.error(`  ${hint}`)
    }
    console.error("")
    process.exit(1)
}

/**
 * Resolves an executable by hand. `spawnSync` without a shell ignores PATHEXT on
 * Windows, and winget installs sops under Packages/ with a PATH entry that
 * already-open shells have not picked up yet.
 * @param command - bare command name, e.g. "sops".
 */
const resolveCommand = (command) => {
    const dirs = (process.env.PATH || "").split(IS_WINDOWS ? ";" : ":").filter(Boolean)
    if (IS_WINDOWS && process.env.LOCALAPPDATA) {
        const winget = join(process.env.LOCALAPPDATA, "Microsoft", "WinGet")
        dirs.push(join(winget, "Links"))
        const packages = join(winget, "Packages")
        if (existsSync(packages)) {
            for (const entry of readdirSync(packages)) {
                const packageDir = join(packages, entry)
                dirs.push(packageDir)
                try {
                    for (const nested of readdirSync(packageDir, { withFileTypes: true })) {
                        if (nested.isDirectory()) {
                            dirs.push(join(packageDir, nested.name))
                        }
                    }
                } catch {
                    // unreadable package dir -- another candidate may still match
                }
            }
        }
    }
    const extensions = IS_WINDOWS
        ? (process.env.PATHEXT || ".EXE;.CMD;.BAT").split(";").filter(Boolean)
        : [""]
    for (const dir of dirs) {
        for (const extension of extensions) {
            const candidate = join(dir, `${command}${extension}`)
            if (existsSync(candidate)) {
                return candidate
            }
        }
    }
    return null
}

/**
 * The sops format for a target path. Whole-file credentials are opaque and must
 * be binary, or sops tries to parse an ssh key as JSON and fails.
 * @returns "dotenv" | "json" | "yaml" | "binary"
 */
const formatFor = (file) => {
    if (file.endsWith(".env")) {
        return "dotenv"
    }
    // Never let sops infer: the file it is handed ends in `.enc`, so inference
    // falls back to binary and a JSON secret fails with "No binary data found in
    // tree" even though it encrypted perfectly well.
    if (/\.json$/.test(file)) {
        return "json"
    }
    if (/\.ya?ml$/.test(file)) {
        return "yaml"
    }
    return "binary"
}

/**
 * Turns a user-supplied path into an absolute path inside .stacks/, or dies.
 *
 * Path traversal is the whole point of the check: `set ../../.env` would
 * otherwise write a plaintext secret into the repo root, and `show` would
 * happily decrypt whatever it was pointed at.
 *
 * @param target - path as typed, with either separator, `.stacks/` optional.
 * @returns { plainPath, relPath } -- absolute, and repo-relative for messages.
 */
const resolveInStacks = (target) => {
    let plainPath
    if (target.startsWith(".stacks/") || target.startsWith(".stacks\\") || target.startsWith(".stack/") || target.startsWith(".stack\\")) {
        const normalised = target.replace(/^\.stacks?[\\/]/, "").split(/[\\/]/).join(sep)
        plainPath = resolve(STACKS_ROOT, normalised)
    } else if (target === ".env" || target.startsWith(".env") || !target.includes("/")) {
        // Hỗ trợ lưu trực tiếp tại thư mục root (ví dụ: .env)
        plainPath = resolve(REPO_ROOT, target)
    } else {
        const normalised = target.split(/[\\/]/).join(sep)
        plainPath = resolve(STACKS_ROOT, normalised)
    }

    if (plainPath !== REPO_ROOT && !plainPath.startsWith(REPO_ROOT + sep)) {
        die("refusing to touch anything outside the repository", [
            `${target} resolves to ${plainPath}`,
        ])
    }
    const relPath = relative(REPO_ROOT, plainPath).split(sep).join("/")
    return { plainPath, relPath }
}

/**
 * Reads a secret without echoing it. Falls back to a plain read when there is no
 * TTY (piped input), which is what CI does.
 * @param prompt - text shown before the cursor.
 */
const readHidden = (prompt) => new Promise((resolveValue) => {
    if (!process.stdin.isTTY) {
        let piped = ""
        process.stdin.setEncoding("utf8")
        process.stdin.on("data", (chunk) => {
            piped += chunk
        })
        process.stdin.on("end", () => resolveValue(piped))
        return
    }
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true,
    })
    // Swallow the echoed characters so the value never appears on screen, in a
    // scrollback buffer, or over a shoulder.
    let muted = false
    const original = rl._writeToOutput.bind(rl)
    rl._writeToOutput = (text) => {
        if (!muted) {
            original(text)
            return
        }
        if (text.includes(prompt)) {
            original(prompt)
        }
    }
    rl.question(prompt, (answer) => {
        rl.close()
        process.stdout.write("\n")
        resolveValue(answer)
    })
    muted = true
})

/** Reads every byte from stdin until EOF, for values that span lines. */
const readAllStdin = () => new Promise((resolveValue) => {
    let buffer = ""
    process.stdin.setEncoding("utf8")
    process.stdin.on("data", (chunk) => {
        buffer += chunk
    })
    process.stdin.on("end", () => resolveValue(buffer))
})

/** Encrypts `plainPath` to `plainPath + ".enc"`, then deletes the plaintext unless keep is true. */
const encryptInPlace = (sops, plainPath, relPath, options = {}) => {
    const encPath = `${plainPath}.enc`
    const format = formatFor(plainPath)
    const args = ["--encrypt"]
    if (format) {
        args.push("--input-type", format, "--output-type", format)
    }
    // --output, never shell redirection: a redirect on Windows writes CRLF and
    // sops then cannot parse its own metadata on the way back in.
    args.push("--output", encPath, plainPath)
    const result = spawnSync(sops, args, {
        cwd: REPO_ROOT,
        encoding: "utf8",
        env: { ...process.env, SOPS_AGE_KEY_FILE: MASTER_KEY },
    })
    if (result.status !== 0) {
        // Leave the plaintext where it is: deleting it here would lose a value
        // the operator has already typed once and may not have anywhere else.
        die(`sops failed to encrypt ${relPath}`, [
            (result.stderr || "").trim().split(/\r?\n/).slice(-3).join("\n  "),
            "",
            `the plaintext is still at ${relPath} -- fix the error and re-run`,
        ])
    }
    if (!options.keep) {
        rmSync(plainPath, { force: true })
    }
    return encPath
}

// ---------------------------------------------------------------------------
// commands
// ---------------------------------------------------------------------------

/** `set <path>` -- prompt for a value and leave only its encrypted twin. */
const commandSet = async (target, options) => {
    if (!target) {
        die("set needs a path under .stacks/", [
            "example: node scripts/stack-secret.mjs set dev/runtime/files/stripe-secret-key.key",
        ])
    }
    const { plainPath, relPath } = resolveInStacks(target)

    const sops = resolveCommand("sops")
    if (!sops) {
        die("sops is not installed", [
            "Windows:  winget install Mozilla.SOPS",
            "macOS:    brew install sops",
            "Linux:    https://github.com/getsops/sops/releases",
        ])
    }
    if (!existsSync(MASTER_KEY)) {
        die(`master identity not found at ${MASTER_KEY}`, [
            "restore it from your password manager, then re-run",
        ])
    }

    let value
    if (options.fromFile) {
        const source = resolve(options.fromFile.replace(/^~(?=[\\/]|$)/, homedir()))
        if (!existsSync(source)) {
            die(`--from-file not found: ${source}`)
        }
        value = readFileSync(source, "utf8")
        // Length only. Never the content.
        console.log(dim(`  read ${value.length} bytes from ${source}`))
    } else if (options.multiline) {
        const eof = IS_WINDOWS ? "Ctrl+Z then Enter" : "Ctrl+D"
        console.log(dim(`  paste the value for ${relPath}, then press ${eof}:`))
        value = await readAllStdin()
    } else {
        value = await readHidden(`  value for ${relPath} (hidden): `)
    }

    if (!value || value.trim() === "") {
        die("empty value -- nothing written", [
            "use --multiline for values that span lines,",
            "or --from-file <path> to read one from disk",
        ])
    }

    // sops' dotenv parser rejects CRLF outright, and a trailing newline inside
    // an API key is a common cause of an "invalid credentials" that is invisible
    // on screen. Normalise both.
    let content = value.replace(/\r\n/g, "\n")
    if (formatFor(plainPath) === "binary") {
        content = content.replace(/\n+$/, "")
    } else if (!content.endsWith("\n")) {
        content = `${content}\n`
    }

    const existed = existsSync(`${plainPath}.enc`)
    mkdirSync(dirname(plainPath), { recursive: true })
    writeFileSync(plainPath, content)
    encryptInPlace(sops, plainPath, relPath, options)

    console.log(`\n${green("ok")}  ${existed ? "replaced" : "created"} ${relPath}.enc`)
    if (!options.keep) {
        console.log(dim("    plaintext deleted; only the .enc file remains"))
    } else {
        console.log(dim("    plaintext preserved; .enc file created beside it"))
    }
    console.log(dim(`    commit it:  git add ${relPath}.enc`))
    console.log(dim("    other machines get it with:  git pull && npm run sync\n"))
}

/** `list` -- every secret in the repository and .stacks/, by name. */
const commandList = () => {
    const rootRows = []
    for (const entry of readdirSync(REPO_ROOT, { withFileTypes: true })) {
        if (!entry.isDirectory() && entry.name.endsWith(".enc")) {
            rootRows.push(entry.name.replace(/\.enc$/, ""))
        }
    }

    const stackRows = []
    if (existsSync(STACKS_ROOT)) {
        const walk = (dir) => {
            for (const entry of readdirSync(dir, { withFileTypes: true })) {
                const full = join(dir, entry.name)
                if (entry.isDirectory()) {
                    walk(full)
                } else if (entry.name.endsWith(".enc")) {
                    stackRows.push(
                        relative(STACKS_ROOT, full).split(sep).join("/").replace(/\.enc$/, ""),
                    )
                }
            }
        }
        walk(STACKS_ROOT)
    }

    if (rootRows.length === 0 && stackRows.length === 0) {
        console.log(dim("  no encrypted secrets yet"))
        return
    }

    const total = rootRows.length + stackRows.length
    console.log(`\n  ${total} secret(s) found\n`)

    if (rootRows.length > 0) {
        console.log(dim("  (root)/"))
        for (const row of rootRows.sort()) {
            console.log(`    ${row}`)
        }
    }

    if (stackRows.length > 0) {
        let lastStack = ""
        for (const row of stackRows.sort()) {
            const stack = row.split("/")[0]
            if (stack !== lastStack) {
                console.log(dim(`  ${stack}/`))
                lastStack = stack
            }
            console.log(`    ${row.slice(stack.length + 1)}`)
        }
    }
    console.log("")
}

/** `show <path>` -- decrypt TO DISK so a tool can read it. Never to stdout. */
const commandShow = (target) => {
    if (!target) {
        die("show needs a path under .stacks/")
    }
    const { plainPath, relPath } = resolveInStacks(target.replace(/\.enc$/, ""))
    const encPath = `${plainPath}.enc`
    if (!existsSync(encPath)) {
        die(`no such secret: ${relPath}.enc`, [
            "run `node scripts/stack-secret.mjs list` to see what exists",
        ])
    }
    const sops = resolveCommand("sops")
    if (!sops) {
        die("sops is not installed")
    }
    const format = formatFor(plainPath)
    const args = ["--decrypt"]
    if (format) {
        args.push("--input-type", format, "--output-type", format)
    }
    // --output: the plaintext goes to a gitignored file, not to this terminal.
    args.push("--output", plainPath, encPath)
    try {
        execFileSync(sops, args, {
            cwd: REPO_ROOT,
            stdio: "ignore",
            env: { ...process.env, SOPS_AGE_KEY_FILE: MASTER_KEY },
        })
    } catch {
        die(`could not decrypt ${relPath}`, [
            `is ${MASTER_KEY} the identity this file was encrypted for?`,
        ])
    }
    console.log(`${green("ok")}  decrypted to ${relPath}`)
    console.log(dim("    it is gitignored; delete it when you are done"))
}

const HELP = `
stack-secret -- encrypt and manage secrets using SOPS and age.

  set <path> [--from-file <f>] [--multiline] [--keep]   encrypt a secret (root .env or in .stacks/)
  show <path>                                           decrypt one TO DISK
  list                                                  list every secret by name

Options:
  --from-file <path>   Read secret value directly from an existing file
  --multiline          Paste multiline secret from stdin (EOF with Ctrl+D / Ctrl+Z)
  --keep, --keep-plain Keep original plaintext file after encrypting (default: deletes plaintext)

Examples:
  # Mã hoá file .env ở thư mục root (giữ lại file .env gốc):
  node scripts/stack-secret.mjs set .env --from-file .env --keep

  # Giải mã .env.enc ở root thành .env:
  node scripts/stack-secret.mjs show .env

  # Làm việc với .stacks:
  node scripts/stack-secret.mjs set dev/runtime/env/app.env --from-file .env
  node scripts/stack-secret.mjs show dev/runtime/env/app.env
  node scripts/stack-secret.mjs list
`

const main = async () => {
    const [command, ...rest] = process.argv.slice(2)
    if (!command || command === "--help" || command === "-h" || command === "help") {
        console.log(HELP)
        return
    }
    const fromFileAt = rest.indexOf("--from-file")
    const options = {
        multiline: rest.includes("--multiline"),
        fromFile: fromFileAt === -1 ? null : rest[fromFileAt + 1],
        keep: rest.includes("--keep") || rest.includes("--keep-plain"),
    }
    // Drop the flags AND the argument that belongs to --from-file, so
    // `set --from-file ./sa.json dev/...` does not mistake the source file for
    // the target path.
    const fromFileValueAt = fromFileAt === -1 ? -1 : fromFileAt + 1
    const positional = rest.filter(
        (arg, index) => !arg.startsWith("--") && index !== fromFileValueAt,
    )
    if (command === "set") {
        await commandSet(positional[0], options)
        return
    }
    if (command === "list") {
        commandList()
        return
    }
    if (command === "show") {
        commandShow(positional[0])
        return
    }
    die(`unknown command: ${command}`, ["run `node scripts/stack-secret.mjs --help`"])
}

main()
