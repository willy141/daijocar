const http = require("http")
const fs = require("fs")
const path = require("path")
const crypto = require("crypto")

const HOST = "127.0.0.1"
const PORT = Number(process.env.PORT) || 3000
const DATA_DIR = path.join(__dirname, "data")
const DB_FILE = path.join(DATA_DIR, "db.json")
const PUBLIC_DIR = path.join(__dirname, "public")
const COLLECTIONS = ["clients", "suppliers", "vehicles", "jobs"]

function emptyDatabase() {
  return { clients: [], suppliers: [], vehicles: [], jobs: [] }
}

function loadDatabase() {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(DB_FILE)) return emptyDatabase()
  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE, "utf8"))
    return Object.fromEntries(COLLECTIONS.map((name) => [name, Array.isArray(data[name]) ? data[name] : []]))
  } catch {
    throw new Error("No se pudo leer la base de datos. Conservá una copia de app/data/db.json antes de reemplazarla.")
  }
}

function saveDatabase(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const temp = `${DB_FILE}.tmp`
  fs.writeFileSync(temp, JSON.stringify(data, null, 2), "utf8")
  fs.renameSync(temp, DB_FILE)
}

function sendJson(res, status, value) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" })
  res.end(JSON.stringify(value))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = ""
    req.on("data", (chunk) => {
      body += chunk
      if (body.length > 1024 * 1024) {
        reject(Object.assign(new Error("El formulario supera el máximo de 1 MB."), { status: 413 }))
        req.destroy()
      }
    })
    req.on("end", () => {
      if (!body) return resolve({})
      try { resolve(JSON.parse(body)) }
      catch { reject(Object.assign(new Error("El contenido enviado no es JSON válido."), { status: 400 })) }
    })
    req.on("error", reject)
  })
}

function cleanRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw Object.assign(new Error("El registro debe ser un objeto."), { status: 400 })
  }
  const result = {}
  for (const [key, item] of Object.entries(value)) {
    if (key === "id" || key === "createdAt" || key === "updatedAt") continue
    if (typeof item === "string") result[key] = item.trim().slice(0, 5000)
    else if (typeof item === "number" && Number.isFinite(item)) result[key] = item
    else if (item === null) result[key] = ""
  }
  return result
}

function validate(resource, record) {
  const required = {
    clients: [["firstName", "Nombre"], ["lastName", "Apellido"]],
    suppliers: [["name", "Nombre o empresa"]],
    vehicles: [["make", "Marca"], ["plate", "Patente"]],
    jobs: [["vehicleId", "Vehículo"], ["description", "Trabajo realizado"], ["entryDate", "Fecha de ingreso"]]
  }[resource]
  for (const [field, label] of required) {
    if (!record[field]) throw Object.assign(new Error(`El campo «${label}» es obligatorio.`), { status: 400 })
  }
  if (resource === "vehicles" && record.plate) record.plate = record.plate.toUpperCase().replace(/\s+/g, " ")
  if (resource === "jobs") {
    record.status = record.status || "Pendiente"
    for (const field of ["laborCost", "partsCost"]) {
      const amount = Number(record[field] || 0)
      if (!Number.isFinite(amount) || amount < 0) throw Object.assign(new Error("Los importes deben ser números iguales o mayores que cero."), { status: 400 })
      record[field] = amount
    }
  }
  return record
}

function serveFile(req, res, pathname) {
  const routes = { "/": "index.html", "/styles.css": "styles.css", "/app.js": "app.js" }
  const name = routes[pathname]
  if (!name) return false
  const file = path.join(PUBLIC_DIR, name)
  const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8" }
  res.writeHead(200, { "Content-Type": types[path.extname(file)], "Cache-Control": "no-cache", "X-Content-Type-Options": "nosniff" })
  fs.createReadStream(file).pipe(res)
  return true
}

const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, `http://${HOST}:${PORT}`).pathname
  if (pathname.startsWith("/api/")) {
    try {
      const parts = pathname.split("/").filter(Boolean)
      const resource = parts[1]
      if (resource === "dashboard" && req.method === "GET") {
        const data = loadDatabase()
        return sendJson(res, 200, {
          clients: data.clients.length,
          suppliers: data.suppliers.length,
          vehicles: data.vehicles.length,
          openJobs: data.jobs.filter((job) => job.status !== "Finalizado").length,
          recentJobs: data.jobs.slice().sort((a, b) => (b.entryDate || "").localeCompare(a.entryDate || "")).slice(0, 6)
        })
      }
      if (!COLLECTIONS.includes(resource)) return sendJson(res, 404, { error: "Recurso inexistente." })
      const data = loadDatabase()
      const id = parts[2]
      if (req.method === "GET" && !id) return sendJson(res, 200, data[resource])
      if (req.method === "POST" && !id) {
        const record = validate(resource, cleanRecord(await readBody(req)))
        if (resource === "vehicles" && record.plate && data.vehicles.some((v) => v.plate.toLowerCase() === record.plate.toLowerCase())) {
          return sendJson(res, 409, { error: "Ya existe un vehículo registrado con esa patente." })
        }
        const now = new Date().toISOString()
        const created = { ...record, id: crypto.randomUUID(), createdAt: now, updatedAt: now }
        data[resource].push(created)
        saveDatabase(data)
        return sendJson(res, 201, created)
      }
      const index = data[resource].findIndex((item) => item.id === id)
      if (index < 0) return sendJson(res, 404, { error: "No se encontró el registro." })
      if (req.method === "PUT") {
        const record = validate(resource, cleanRecord(await readBody(req)))
        if (resource === "vehicles" && record.plate && data.vehicles.some((v) => v.id !== id && v.plate.toLowerCase() === record.plate.toLowerCase())) {
          return sendJson(res, 409, { error: "Ya existe un vehículo registrado con esa patente." })
        }
        data[resource][index] = { ...data[resource][index], ...record, updatedAt: new Date().toISOString() }
        saveDatabase(data)
        return sendJson(res, 200, data[resource][index])
      }
      if (req.method === "DELETE") {
        if (resource === "vehicles" && data.jobs.some((job) => job.vehicleId === id)) {
          return sendJson(res, 409, { error: "No se puede borrar el vehículo: tiene trabajos asociados." })
        }
        data[resource].splice(index, 1)
        saveDatabase(data)
        return sendJson(res, 200, { deleted: true })
      }
      return sendJson(res, 405, { error: "Método no permitido." })
    } catch (error) {
      return sendJson(res, error.status || 500, { error: error.message || "Error interno." })
    }
  }
  if (req.method === "GET" && serveFile(req, res, pathname)) return
  sendJson(res, 404, { error: "No encontrado." })
})

server.listen(PORT, HOST, () => {
  console.log(`DAIJOCAR listo en http://${HOST}:${PORT}`)
})

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)))
}
