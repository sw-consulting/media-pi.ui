# Mediapi UI

[![.github/workflows/ci.yml](https://github.com/sw-consulting/media-pi.ui/actions/workflows/ci.yml/badge.svg)](https://github.com/sw-consulting/media-pi.ui/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/maxirmx/mediapi.ui/branch/main/graph/badge.svg)](https://codecov.io/gh/maxirmx/mediapi.ui)

Media Pi system frontend

## Accounts Tree Helper - Modular Architecture

The accounts tree helper has been refactored into focused, testable modules:

### Source Files
- `src/helpers/tree/tree.builder.js` - Tree construction logic
- `src/helpers/tree/tree.loader.js` - Lazy loading functionality  
- `src/helpers/tree/tree.state.js` - State management (save/restore)
- `src/helpers/tree/account.actions.js` - Account CRUD operations
- `src/helpers/tree/devicegroup.actions.js` - Device group CRUD operations
- `src/helpers/tree/tree.permissions.js` - User permission checking
- `src/helpers/accounts.tree.helpers.js` - Main entry point (backward compatibility)

### Test Files  
- `tests/tree/tree.builder.spec.js` - Tree construction tests (13 tests)
- `tests/tree/tree.loader.spec.js` - Lazy loading tests (6 tests)
- `tests/tree/tree.state.spec.js` - State management tests (8 tests)  
- `tests/tree/account.actions.spec.js` - Account actions tests (11 tests)
- `tests/tree/devicegroup.actions.spec.js` - Device group actions tests (11 tests)
- `tests/tree/tree.permissions.spec.js` - Permission tests (4 tests)
- `tests/accounts.tree.helpers.spec.js` - Integration tests (6 tests)

**Total: 59 tests** - All tests maintain backward compatibility while enabling focused, maintainable testing.
