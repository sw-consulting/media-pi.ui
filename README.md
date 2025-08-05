# Mediapi UI

[![CI workflow](https://github.com/maxirmx/mediapi.ui/actions/workflows/ci.yml/badge.svg)](https://github.com/maxirmx/mediapi.ui/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/maxirmx/mediapi.ui/branch/main/graph/badge.svg)](https://codecov.io/gh/maxirmx/mediapi.ui)

## Run with Docker

Build the image and start a container using the provided `Dockerfile`:

```bash
docker build -t mediapi-ui .
docker run --rm -p 8080:80 mediapi-ui
```

The container serves the compiled application through nginx and includes the custom error pages from `config/public`.
