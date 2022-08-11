
/* globals $,path,fs */
/* eslint-disable node/no-path-concat */

const { name: example } = path.parse(process.cwd())
const exRoot = path.resolve(__dirname, 'starters', example)
const command = process.argv.slice(process.argv.findIndex(_ => _ === '--') + 1)

if (!fs.existsSync(exRoot)) {
  console.log('Must be called from a directory under starters/.')
  process.exit()
}

await $`rm -rf ${exRoot}/node_modules/vite`
await $`rm -rf ${exRoot}/node_modules/.vite`

const template = require(path.join(exRoot, 'package.json'))

const { external, local } = template.devInstall
const dependencies = { ...external }

for (const localDep of Object.keys(local)) {
  for (const [dep, version] of Object.entries(
    require(path.join(__dirname, 'packages', localDep, 'package.json')).dependencies || [])
  ) {
    if (!Object.keys(local).includes(dep)) {
      dependencies[dep] = version
    }
  }
}

await createPackageFile(exRoot, dependencies)
await $`npm install -f`

for (const localDep of Object.keys(local)) {
  await $`rm -rf ${exRoot}/node_modules/${localDep}`
  await $`cp -r ${__dirname}/packages/${localDep} ${exRoot}/node_modules/${localDep}`
  if (localDep === 'fastify-dx') {
    await $`ln -s ${exRoot}/node_modules/${localDep}/index.mjs ${exRoot}/node_modules/.bin/dx`
  }
}

try {
  await $`${command}`
} finally {
  setImmediate(() => process.exit(0))
}

async function createPackageFile (exRoot, dependencies) {
  const { type, scripts, devDependencies, devInstall } = template
  await fs.writeFile(
    path.join(exRoot, 'package.json'),
    JSON.stringify({ type, scripts, dependencies, devDependencies, devInstall }, null, 2),
  )
}
