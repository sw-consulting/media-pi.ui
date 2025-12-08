import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { cwd } from 'node:process'

const baseDir = join(cwd(), 'node_modules', '@sw-consulting')
const target = join(baseDir, 'tooling.ui.kit')
const srcPath = join(target, 'src')

if (!existsSync(srcPath)) {
  mkdirSync(baseDir, { recursive: true })
  if (existsSync(target)) {
    rmSync(target, { recursive: true, force: true })
  }
  try {
    execSync(
      `git clone --depth 1 --branch v1.0.0 https://github.com/sw-consulting/tooling.ui.kit.git ${target}`,
      { stdio: 'inherit' }
    )
  } catch (error) {
    console.error('Failed to clone @sw-consulting/tooling.ui.kit repository. Please check your network connection and git configuration.')
    throw error
  }
}
