module.exports = {
  version: "8.0.0",
  title: "DAIJOCAR | Taller mecánico",
  description: "Clientes, proveedores, vehículos y órdenes de trabajo",
  menu: async (kernel, info) => {
    const installed = info.exists("app/data")
    const running = {
      install: info.running("install.js"),
      start: info.running("start.js"),
      update: info.running("update.js"),
      reset: info.running("reset.js")
    }
    if (running.install) {
      return [{ default: true, icon: "fa-solid fa-plug", text: "Instalando", href: "install.js" }]
    }
    if (running.start) {
      const local = info.local("start.js")
      if (local && local.url) {
        return [
          { default: true, icon: "fa-solid fa-rocket", text: "Abrir sistema", href: local.url },
          { icon: "fa-solid fa-terminal", text: "Terminal", href: "start.js" }
        ]
      }
      return [{ default: true, icon: "fa-solid fa-terminal", text: "Iniciando", href: "start.js" }]
    }
    if (running.update) {
      return [{ default: true, icon: "fa-solid fa-rotate", text: "Actualizando", href: "update.js" }]
    }
    if (running.reset) {
      return [{ default: true, icon: "fa-solid fa-broom", text: "Reiniciando", href: "reset.js" }]
    }
    if (!installed) {
      return [{ default: true, icon: "fa-solid fa-plug", text: "Instalar", href: "install.js" }]
    }
    return [
      { default: true, icon: "fa-solid fa-power-off", text: "Iniciar", href: "start.js" },
      { icon: "fa-solid fa-rotate", text: "Actualizar", href: "update.js" },
      { icon: "fa-solid fa-broom", text: "Reiniciar base de datos", href: "reset.js", confirm: "Esto borrará clientes, proveedores, vehículos y trabajos guardados. ¿Continuar?" }
    ]
  }
}
