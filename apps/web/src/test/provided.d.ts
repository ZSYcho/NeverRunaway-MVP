// Values the anvil global setup hands to the flow tests (vitest.anvil.config.ts). Being a module
// (the export below) makes this an augmentation of vitest's types rather than a new declaration.
declare module 'vitest' {
  export interface ProvidedContext {
    anvilRpcUrl: string
  }
}

export {}
