export function runBeforeEmbeddedAction(embedded, beforeEmbeddedAction) {
  if (!embedded || typeof beforeEmbeddedAction !== 'function') return true
  return Promise.resolve(beforeEmbeddedAction())
    .then(result => result !== false)
    .catch(() => false)
}
