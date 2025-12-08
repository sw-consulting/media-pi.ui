import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { cwd } from 'node:process'

const baseDir = join(cwd(), 'node_modules', '@sw-consulting')
const target = join(baseDir, 'tooling.ui.kit')
const srcPath = join(target, 'src')

// Read version from package.json
const packageJsonPath = join(cwd(), 'package.json')
let packageJson
try {
  packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
} catch (error) {
  console.error('Failed to read or parse package.json. Please ensure the file exists and is valid JSON.')
  throw error
}

const dependencySpec = packageJson.dependencies?.['@sw-consulting/tooling.ui.kit']
if (!dependencySpec) {
  throw new Error('Dependency @sw-consulting/tooling.ui.kit not found in package.json dependencies')
}

const parts = dependencySpec.split('#')
if (parts.length !== 2) {
  throw new Error(`Invalid dependency format for @sw-consulting/tooling.ui.kit: ${dependencySpec}. Expected format: github:owner/repo#version`)
}
const version = parts[1]

if (!existsSync(srcPath)) {
  mkdirSync(baseDir, { recursive: true })
  if (existsSync(target)) {
    rmSync(target, { recursive: true, force: true })
  }
  try {
    execSync(
      `git clone --depth 1 --branch ${version} https://github.com/sw-consulting/tooling.ui.kit.git ${target}`,
      { stdio: 'inherit' }
    )
  } catch (error) {
    console.error('Failed to clone @sw-consulting/tooling.ui.kit repository. Please check your network connection and git configuration.')
    throw error
  }
}
