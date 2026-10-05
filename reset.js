module.exports = {
  run: [{
    method: "shell.run",
    params: {
      path: "app",
      message: "node -e \"require('fs').rmSync('data/db.json', { force: true })\""
    }
  }, {
    method: "log",
    params: {
      text: "Base de datos reiniciada. Los datos volverán a crearse al iniciar el sistema."
    }
  }]
}
