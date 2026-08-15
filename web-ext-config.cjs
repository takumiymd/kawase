module.exports = {
  ignoreFiles: [
    'docs',
    'test',
    'dist',
    'node_modules',
    'package.json',
    'package-lock.json',
    'web-ext-config.cjs',
    '.gitignore',
    '.amo-upload-uuid'
  ],
  build: {
    overwriteDest: true
  }
};
