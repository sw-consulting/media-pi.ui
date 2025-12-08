import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { cwd } from 'node:process'

const baseDir = join(cwd(), 'node_modules', '@sw-consulting')
const target = join(baseDir, 'tooling.ui.kit')
const srcPath = join(target, 'src')

if (!existsSync(srcPath)) {
  mkdirSync(baseDir, { recursive: true })
  rmSync(target, { recursive: true, force: true })
  execSync(
    `git clone --depth 1 https://github.com/sw-consulting/tooling.ui.kit.git ${target}`,
    { stdio: 'inherit' }
  )
}
