import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { readdir, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'

function excludePrivatePublicFiles(): Plugin {
  const removeIgnoredFiles = async (directory: string) => {
    const entries = await readdir(directory, { withFileTypes: true }).catch(
      () => [],
    )
    await Promise.all(
      entries.map(async (entry) => {
        const path = join(directory, entry.name)
        if (entry.isDirectory()) {
          await removeIgnoredFiles(path)
        } else if (entry.name === '.DS_Store' || entry.name.endsWith('.numbers')) {
          await rm(path, { force: true })
        }
      }),
    )
  }

  return {
    name: 'exclude-private-public-files',
    apply: 'build',
    closeBundle() {
      return removeIgnoredFiles(resolve('dist'))
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/office-calendar/' : '/',
  plugins: [react(), excludePrivatePublicFiles()],
}))
