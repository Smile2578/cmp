import typescript from '@rollup/plugin-typescript'
import terser from '@rollup/plugin-terser'
import resolve from '@rollup/plugin-node-resolve'

const production = process.env.BUILD === 'production'

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/consent.js',
    format: 'iife',
    name: 'CMP',
    sourcemap: !production
  },
  plugins: [
    resolve(),
    typescript({ tsconfig: './tsconfig.json', noEmit: false, declaration: false, outDir: 'dist' }),
    production && terser({
      compress: { passes: 2, drop_console: true },
      mangle: true
    })
  ]
}
