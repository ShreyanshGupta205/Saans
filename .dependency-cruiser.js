/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-lib-to-ui-or-app',
      comment: 'lib/ must never import from components/ or app/ (architectural boundary)',
      severity: 'error',
      from: {
        path: '^lib',
      },
      to: {
        path: '^(components|app)',
      },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json',
    },
  },
};
