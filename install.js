module.exports = {
  run: [{
    method: "shell.run",
    params: {
      path: "app",
      message: "node -e \"require('fs').mkdirSync('data', { recursive: true })\""
    }
  }]
}
