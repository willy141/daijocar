const resources = {
  clients: { singular: "cliente", title: "Clientes", fields: [
    ["firstName", "Nombre", "text", true], ["lastName", "Apellido", "text", true], ["phone", "Teléfono", "tel"], ["email", "Correo electrónico", "email"], ["address", "Dirección", "text", false, true], ["notes", "Notas", "textarea", false, true]
  ] },
  suppliers: { singular: "proveedor", title: "Proveedores", fields: [
    ["name", "Nombre o empresa", "text", true], ["contact", "Persona de contacto", "text"], ["category", "Rubro", "text"], ["phone", "Teléfono", "tel"], ["email", "Correo electrónico", "email"], ["address", "Dirección", "text", false, true], ["notes", "Notas", "textarea", false, true]
  ] },
  vehicles: { singular: "vehículo", title: "Vehículos", fields: [
    ["plate", "Patente", "text", true], ["make", "Marca", "text", true], ["model", "Modelo", "text"], ["year", "Año", "number"], ["clientId", "Cliente propietario", "client", false, true], ["intakeDate", "Fecha de ingreso", "date"], ["mileage", "Kilometraje", "number"], ["notes", "Notas", "textarea", false, true]
  ] },
  jobs: { singular: "orden de trabajo", title: "Órdenes de trabajo", fields: [
    ["vehicleId", "Vehículo / patente", "vehicle", true, true], ["entryDate", "Fecha de ingreso", "date", true], ["description", "Trabajo realizado o solicitado", "textarea", true, true], ["status", "Estado", "status"], ["laborCost", "Costo de mano de obra", "number"], ["partsCost", "Costo de repuestos", "number"], ["completionDate", "Fecha de finalización", "date"], ["notes", "Observaciones", "textarea", false, true]
  ] }
}
const state = { clients: [], suppliers: [], vehicles: [], jobs: [], dashboard: null, page: "inicio" }
const $ = (selector, root = document) => root.querySelector(selector)
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)]
const dialog = $("#record-dialog")
let toastTimer

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char])
}
function money(value) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(Number(value || 0))
}
function date(value) {
  if (!value) return "—"
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? escapeHtml(value) : parsed.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
}
function notify(message, error = false) {
  const box = $("#toast")
  box.textContent = message
  box.classList.toggle("error", error)
  box.classList.add("show")
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => box.classList.remove("show"), 3200)
}
async function api(resource, options = {}) {
  const response = await fetch(`/api/${resource}`, { headers: { "Content-Type": "application/json" }, ...options })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || "Ocurrió un error al guardar.")
  return result
}
async function load() {
  try {
    const [clients, suppliers, vehicles, jobs, dashboard] = await Promise.all([
      api("clients"), api("suppliers"), api("vehicles"), api("jobs"), api("dashboard")
    ])
    Object.assign(state, { clients, suppliers, vehicles, jobs, dashboard })
    render()
  } catch (error) { notify(error.message, true) }
}
function clientName(id) {
  const client = state.clients.find((item) => item.id === id)
  return client ? `${client.firstName} ${client.lastName}` : "Sin asignar"
}
function vehicleFor(id) { return state.vehicles.find((item) => item.id === id) }
function vehicleLabel(vehicle) {
  return vehicle ? `${vehicle.plate} · ${vehicle.make}${vehicle.model ? ` ${vehicle.model}` : ""}` : "Vehículo eliminado"
}
function statusMarkup(status) {
  const normalized = status === "En proceso" ? "proceso" : status === "Finalizado" ? "finalizado" : "pendiente"
  return `<span class="status status-${normalized}">${escapeHtml(status || "Pendiente")}</span>`
}
function emptyMarkup(label, detail) {
  return `<div class="empty"><div class="empty-icon">＋</div><strong>${label}</strong><span>${detail}</span></div>`
}
function tableMarkup(resource, records) {
  if (!records.length) return emptyMarkup(`Todavía no hay ${resources[resource].title.toLowerCase()}`, "Usá el botón de arriba para agregar el primer registro.")
  const heads = {
    clients: ["CLIENTE", "TELÉFONO", "CORREO", "DIRECCIÓN", ""],
    suppliers: ["PROVEEDOR", "CONTACTO / RUBRO", "TELÉFONO", "CORREO", ""],
    vehicles: ["VEHÍCULO", "PROPIETARIO", "INGRESO", "KILOMETRAJE", ""],
    jobs: ["PATENTE / VEHÍCULO", "TRABAJO", "INGRESO", "ESTADO", "TOTAL", ""]
  }[resource]
  const rows = records.map((record) => {
    if (resource === "clients") return `<tr><td class="primary-cell">${escapeHtml(record.firstName)} ${escapeHtml(record.lastName)}</td><td>${escapeHtml(record.phone || "—")}</td><td>${escapeHtml(record.email || "—")}</td><td>${escapeHtml(record.address || "—")}</td>${actions(resource, record)}</tr>`
    if (resource === "suppliers") return `<tr><td class="primary-cell">${escapeHtml(record.name)}</td><td>${escapeHtml([record.contact, record.category].filter(Boolean).join(" · ") || "—")}</td><td>${escapeHtml(record.phone || "—")}</td><td>${escapeHtml(record.email || "—")}</td>${actions(resource, record)}</tr>`
    if (resource === "vehicles") return `<tr><td><span class="plate">${escapeHtml(record.plate)}</span><div class="secondary-cell" style="margin-top:5px">${escapeHtml([record.make, record.model, record.year].filter(Boolean).join(" · "))}</div></td><td>${escapeHtml(clientName(record.clientId))}</td><td>${date(record.intakeDate)}</td><td>${record.mileage ? `${escapeHtml(record.mileage)} km` : "—"}</td>${actions(resource, record)}</tr>`
    const vehicle = vehicleFor(record.vehicleId)
    const total = Number(record.laborCost || 0) + Number(record.partsCost || 0)
    return `<tr><td><span class="plate">${escapeHtml(vehicle?.plate || "—")}</span><div class="secondary-cell" style="margin-top:5px">${escapeHtml(vehicle ? `${vehicle.make} ${vehicle.model || ""}` : "Vehículo")}</div></td><td class="primary-cell">${escapeHtml(record.description)}</td><td>${date(record.entryDate)}</td><td>${statusMarkup(record.status)}</td><td>${money(total)}</td>${actions(resource, record)}</tr>`
  }).join("")
  return `<div class="table-wrap"><table><thead><tr>${heads.map((heading) => `<th>${heading}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>`
}
function actions(resource, record) {
  return `<td><div class="actions"><button class="action" data-edit="${resource}" data-id="${record.id}">Editar</button><button class="action" data-delete="${resource}" data-id="${record.id}">Borrar</button></div></td>`
}
function render() {
  const d = state.dashboard || {}
  $("#stat-open").textContent = d.openJobs ?? state.jobs.filter((job) => job.status !== "Finalizado").length
  $("#stat-vehicles").textContent = d.vehicles ?? state.vehicles.length
  $("#stat-clients").textContent = d.clients ?? state.clients.length
  $("#stat-suppliers").textContent = d.suppliers ?? state.suppliers.length
  const recent = (d.recentJobs || state.jobs).slice(0, 6)
  $("#recent-table").innerHTML = tableMarkup("jobs", recent)
  for (const resource of Object.keys(resources)) {
    const query = $(`[data-search="${resource}"]`)?.value.trim().toLocaleLowerCase("es") || ""
    const rows = state[resource].filter((record) => JSON.stringify(record).toLocaleLowerCase("es").includes(query))
    $(`#table-${resource}`).innerHTML = tableMarkup(resource, rows)
    $(`#count-${resource}`).textContent = `${rows.length} ${rows.length === 1 ? "registro" : "registros"}`
  }
  bindRecordActions()
}
function setPage(page) {
  state.page = page
  $$(".page").forEach((element) => element.classList.toggle("active", element.id === `page-${page}`))
  $$(".nav-link").forEach((element) => element.classList.toggle("active", element.dataset.page === page))
  $("#crumb").textContent = ({ inicio: "Resumen", clientes: "Clientes", proveedores: "Proveedores", vehiculos: "Vehículos", trabajos: "Órdenes de trabajo" })[page]
}
function makeInput(field, record = {}) {
  const [name, label, type, required, full] = field
  const wrapper = document.createElement("div")
  wrapper.className = `field${full ? " full" : ""}`
  const labelElement = document.createElement("label")
  labelElement.htmlFor = `field-${name}`
  labelElement.textContent = `${label}${required ? " *" : ""}`
  let input
  if (type === "textarea") input = document.createElement("textarea")
  else if (["client", "vehicle", "status"].includes(type)) input = document.createElement("select")
  else input = document.createElement("input")
  input.id = `field-${name}`
  input.name = name
  input.required = Boolean(required)
  if (type === "number") { input.type = "number"; input.min = "0"; input.step = "1" }
  else if (["date", "email", "tel"].includes(type)) input.type = type
  else if (type === "text") input.type = "text"
  if (type === "client") {
    input.add(new Option("Sin asignar", ""))
    state.clients.forEach((client) => input.add(new Option(`${client.firstName} ${client.lastName}`, client.id)))
  }
  if (type === "vehicle") {
    input.add(new Option("Seleccioná una patente", ""))
    state.vehicles.forEach((vehicle) => input.add(new Option(vehicleLabel(vehicle), vehicle.id)))
  }
  if (type === "status") ["Pendiente", "En proceso", "Finalizado"].forEach((status) => input.add(new Option(status, status)))
  if (record[name] !== undefined && record[name] !== null) input.value = record[name]
  wrapper.append(labelElement, input)
  return wrapper
}
function openForm(resource, record = null) {
  if (resource === "jobs" && !state.vehicles.length) {
    notify("Primero registrá el vehículo para abrir una orden.", true)
    setPage("vehiculos")
    return
  }
  $("#form-eyebrow").textContent = record ? "EDITAR REGISTRO" : "NUEVO REGISTRO"
  $("#form-title").textContent = `${record ? "Editar" : "Agregar"} ${resources[resource].singular}`
  $("#save-record").innerHTML = `${record ? "Guardar cambios" : "Guardar registro"} <span>→</span>`
  const fields = $("#form-fields")
  fields.replaceChildren(...resources[resource].fields.map((field) => makeInput(field, record || {})))
  $("#record-form").dataset.resource = resource
  $("#record-form").dataset.id = record?.id || ""
  dialog.showModal()
}
function bindRecordActions() {
  $$('[data-create]').forEach((button) => button.onclick = () => openForm(button.dataset.create))
  $$('[data-edit]').forEach((button) => button.onclick = () => {
    const resource = button.dataset.edit
    const record = state[resource].find((item) => item.id === button.dataset.id)
    if (record) openForm(resource, record)
  })
  $$('[data-delete]').forEach((button) => button.onclick = async () => {
    const resource = button.dataset.delete
    const record = state[resource].find((item) => item.id === button.dataset.id)
    const description = resource === "clients" ? `${record.firstName} ${record.lastName}` : record.name || record.plate || record.description
    if (!confirm(`¿Borrar este registro?\n\n${description}`)) return
    try { await api(`${resource}/${record.id}`, { method: "DELETE" }); notify("Registro eliminado."); await load() }
    catch (error) { notify(error.message, true) }
  })
  $$('[data-go]').forEach((button) => button.onclick = () => setPage(button.dataset.go))
}

$("#navigation").addEventListener("click", (event) => {
  const button = event.target.closest("[data-page]")
  if (button) setPage(button.dataset.page)
})
$("#new-job").addEventListener("click", () => openForm("jobs"))
$(".content").addEventListener("input", (event) => {
  if (event.target.matches("[data-search]")) render()
})
$("#record-form").addEventListener("submit", async (event) => {
  event.preventDefault()
  const form = event.currentTarget
  const resource = form.dataset.resource
  const id = form.dataset.id
  const data = Object.fromEntries(new FormData(form).entries())
  if (resource === "jobs") {
    data.laborCost = Number(data.laborCost || 0)
    data.partsCost = Number(data.partsCost || 0)
  }
  try {
    await api(id ? `${resource}/${id}` : resource, { method: id ? "PUT" : "POST", body: JSON.stringify(data) })
    dialog.close()
    notify(id ? "Cambios guardados." : "Registro agregado.")
    await load()
  } catch (error) { notify(error.message, true) }
})
$("#close-dialog").onclick = () => dialog.close()
$("#cancel-dialog").onclick = () => dialog.close()
$("#today").textContent = new Date().toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
load()
